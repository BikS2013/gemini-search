# `@google/genai` SDK — Version, API-Key Resolution & File Search Availability

> Technical research (Overview depth) for the **Gemini File Search Store Navigator** greenfield
> project. Topic 3 from
> `docs/reference/investigation-gemini-store-navigator.md` → "Technical Research Guidance".
>
> **Purpose:** lock the new runtime-dependency pin (`@google/genai`), the explicit
> `GoogleGenAI` client construction (no env fallback), the File-Search-capable model set and
> its no-other-tools constraint, and the quota/limit numbers that drive error-handling design.
>
> **Research date:** 2026-06-20. **SDK package:** `@google/genai` (npm) / `googleapis/js-genai` (repo).

---

## 1. Version to pin (dependency-vetting summary)

| Field | Value |
|---|---|
| Package | `@google/genai` |
| Latest STABLE version | **`2.9.0`** |
| Released | **2026-06-19** (one day before this research; `dist-tag latest` = `2.9.0`) |
| `next` pre-release tag | `2.9.0-rc.0` (2026-06-16) — do NOT pin |
| License | **Apache-2.0** (compatible, permissive) |
| Runtime deps | `google-auth-library ^10.3.0`, `p-retry ^4.6.2`, `protobufjs ^7.5.4`, `ws ^8.18.0` |
| Optional peer | `@modelcontextprotocol/sdk ^1.25.2` (not required for File Search) |
| **Recommended pin** | **`"@google/genai": "^2.9.0"`** |

### Recency / cadence
The SDK ships frequently (roughly weekly minors: 2.6.0 → 2.7.0 → 2.8.0 → 2.9.0 across late
May–June 2026). `^2.9.0` accepts forward minor/patch updates within the `2.x` major, which
matches this fast cadence while protecting against a breaking `3.x`.

### Security-advisory status
- **No known GitHub Security Advisory or npm advisory** was surfaced for `@google/genai`
  itself at the version researched (confidence: MEDIUM — see Uncertainties; this was not
  confirmed by a live `npm audit` run in this isolated context).
- Runtime dependencies (`google-auth-library`, `protobufjs`, `ws`, `p-retry`) are all
  mainstream, actively-maintained Google/community packages on current major lines; no advisory
  was flagged in research.
- **Required action before pinning** (per the project's `dependency-validation` rule): run
  `npm view @google/genai version`, `npm audit`, and a GitHub Advisory check at scaffold time,
  then record the result (version, date, advisory status, license) in
  `Issues - Pending Items.md`. This document supplies the expected values; the live audit is
  the gate.

**Vetting-log line (ready to paste):**
> `@google/genai@^2.9.0` — latest stable 2.9.0 (2026-06-19), Apache-2.0, no known advisory at
> vet time; NEW runtime dependency for the Gemini data plane. Live `npm audit` + GitHub
> Advisory check pending at scaffold.

---

## 2. Explicit client construction — bypassing env precedence (no fallback)

### The precedence quirk (why we pass `{ apiKey }` explicitly)
When the SDK auto-resolves a key from the environment, **`GOOGLE_API_KEY` takes precedence over
`GEMINI_API_KEY`** if both are set. The default `new GoogleGenAI({})` reads `GEMINI_API_KEY`
(and `GOOGLE_API_KEY`) from `process.env`. This implicit ordering is exactly what the project's
**no-config-fallback rule** forbids: a per-profile key must be used deterministically, never
shadowed by ambient process env.

### Solution — construct with an explicit resolved key
Passing `apiKey` in `GoogleGenAIOptions` makes process-env ordering **irrelevant**. The
`apiKey` constructor option is the authoritative key; the SDK does not consult
`GOOGLE_API_KEY`/`GEMINI_API_KEY` when an explicit `apiKey` is supplied.

```typescript
import { GoogleGenAI } from '@google/genai';

/**
 * Build the Gemini data-plane client for a single resolved profile.
 * `apiKey` MUST already be resolved by the backend's 4-tier config chain
 * (shell env -> ~/.tool-agents/.env -> local .env -> CLI flag) and decrypted
 * from the per-profile credential store. NO env fallback happens here.
 */
export function makeGenAiClient(apiKey: string): GoogleGenAI {
  if (!apiKey || apiKey.trim() === '') {
    // No-fallback rule: never substitute a default; raise instead.
    throw new ConfigurationError('Gemini API key is missing for the selected profile.');
  }
  // Explicit apiKey => GOOGLE_API_KEY vs GEMINI_API_KEY env ordering is bypassed entirely.
  return new GoogleGenAI({ apiKey });
}
```

Notes:
- `GoogleGenAIOptions.apiKey` is `string | optional`; it is the **Gemini Developer API** path
  (not Vertex AI). Do **not** set `vertexai: true` / `project` / `location` for this project.
- This removes the need for the skill's documented "temporarily unset `GOOGLE_API_KEY`"
  workaround — construct with the resolved per-profile key instead.
- `ConfigurationError` mirrors the reference project's no-fallback discipline; substitute the
  project's actual error type when wiring the backend.

---

## 3. File-Search-capable models & the no-other-tools constraint

### Models that support the `fileSearch` tool (per current Gemini API docs)
- **Gemini 2.5 Pro**
- **Gemini 2.5 Flash-Lite**
- **Gemini 3 Flash Preview**
- **Gemini 3.1 Flash-Lite**
- **Gemini 3.1 Pro Preview**
- **Gemini 3.5 Flash**

> The investigation's reference list cited `gemini-2.5-flash` / `gemini-2.5-pro` as the
> File-Search models. Current docs (2026-06) show **2.5 Pro and 2.5 Flash-Lite plus the newer
> Gemini 3.x line**; `gemini-2.5-flash` was not explicitly listed in the current support table.
> **Recommendation for a default model:** use **`gemini-2.5-flash`** as the query default IF a
> live call confirms it accepts the `fileSearch` tool (it is the cost/speed sweet spot and was
> proven in the prior-art skill); otherwise fall back to **`gemini-2.5-pro`** (explicitly
> listed). Make the model configurable per `query` call (the `IGeminiBackend.query` opts
> already expose `model?`). Confirm the exact model id with a smoke test at implementation
> time — model availability shifts faster than docs. (Confidence: MEDIUM.)

### The no-other-tools constraint (error-handling relevant)
> "File Search cannot be combined with other tools like Grounding with Google Search, URL
> Context, etc. at this time."

- For the query path, send **only** the `fileSearch` tool in `tools[]`. Do not also pass
  `googleSearch`, `urlContext`, etc. — the request will be rejected.
- **Exception:** Gemini 3 models *do* support combining File Search with **custom function
  declarations** (function calling). This is out of scope for the MVP query renderer but worth
  noting for later agent-tool composition.
- Practical implication: the backend's `query()` builds a single-tool request:

```typescript
const response = await ai.models.generateContent({
  model,                                   // e.g. 'gemini-2.5-flash' (confirm) or 'gemini-2.5-pro'
  contents: prompt,
  config: {
    tools: [{ fileSearch: { fileSearchStoreNames: storeApiNames } }],
  },
});
```

---

## 4. Quotas / limits for error-handling design

### Per-file & store-size limits
| Limit | Value | Error-handling implication |
|---|---|---|
| Max file size per document | **100 MB** | Pre-validate file size before upload; surface a typed `FileTooLargeError`, not a raw API 4xx. |
| Store size — Free tier | **1 GB** total | Map quota-exceeded API errors to a typed store-full error per tier. |
| Store size — Tier 1 | **10 GB** total | " |
| Store size — Tier 2 | **100 GB** total | " |
| Store size — Tier 3 | **1 TB** total | " |
| Store backend overhead | Backend-computed size ≈ **~3×** input data size | Warn users their effective usage is ~3× raw bytes when nearing a tier cap. |
| Stores per project (soft) | **~10** (per prior-art skill / investigation note) | Surface store-count limit as a typed error on `createStore`; confirm current number at impl time (Confidence: LOW). |

### Supported file types
Broad coverage: **PDFs, Office documents, code files, and text/media formats**.
**Audio and video are NOT supported.** Validate MIME type before upload and reject unsupported
types with a clear message rather than letting the API fail mid-operation.

### Rate limits (requests/tokens) — for 429 backoff design
Exact numbers live on the AI Studio dashboard and shift; the docs page intentionally defers to
it. Representative current figures (Confidence: MEDIUM — secondary sources):

| Model / tier | RPM | TPM | RPD |
|---|---|---|---|
| Free — Gemini 2.5 Pro | ~5 | ~250,000 | ~100 |
| Free — Gemini 2.5 Flash | ~10 | ~250,000 | ~250 |
| Free — 2.5 Flash-Lite | ~15 | ~250,000 | ~1,000 |
| Tier 1 (billing on) | ~150–300 | ~1,000,000 | ~1,000 |

Error-handling guidance:
- Treat **HTTP 429** as the canonical rate-limit signal; do **not** hardcode the numbers above
  — they are advisory. Implement exponential backoff with jitter (the SDK already depends on
  `p-retry`, but the data-plane calls here are not auto-retried by default — add retry at the
  backend layer).
- Upload is a **long-running operation**: poll `ai.operations.get` until `done`; treat polling
  timeouts and `error` fields on the operation as typed upload failures.
- No separate documented File-Search-specific RPM/TPM beyond the per-model tier limits.

---

## Assumptions & Scope

| Assumption | Confidence | Impact if wrong |
|---|---|---|
| `2.9.0` is the right stable pin and `^2.9.0` is safe | HIGH | If a `2.x` minor breaks File Search wiring, narrow to a tighter range; low risk within a major. |
| Explicit `{ apiKey }` fully bypasses `GOOGLE_API_KEY`/`GEMINI_API_KEY` env ordering | HIGH | If the SDK still consulted env, the no-fallback guarantee would need the unset-env workaround; docs + SDK options confirm explicit key wins. |
| `gemini-2.5-flash` accepts `fileSearch` (proven in prior-art skill) | MEDIUM | If not, default to `gemini-2.5-pro` (explicitly listed) — already the documented fallback. |
| `~10 stores/project` soft limit still current | LOW | If higher/removed, the typed store-count guard is harmless; if lower, must adjust. |
| Rate-limit numbers (RPM/TPM/RPD) | MEDIUM | They are advisory only; design keys off HTTP 429, so exact values don't gate correctness. |
| No active security advisory for `@google/genai@2.9.0` | MEDIUM | A live `npm audit` at scaffold is the authoritative gate (flagged as required). |

**In scope:** version pin + advisory expectation, explicit client init, File-Search model set +
no-other-tools rule, quota/limit numbers for error handling.
**Out of scope (covered by Topics 1 & 2):** the grounding-metadata/citation response field
shape, and the store/document metadata field set — both flagged for deeper research.

## Uncertainties & Gaps
- **Exact File-Search-capable model ids** drift faster than docs; `gemini-2.5-flash` was not in
  the current support table though it is in prior-art. Confirm with a live smoke test.
- **Live advisory/audit status** could not be executed in this isolated context; values here are
  the expected baseline, not a substitute for `npm audit` at scaffold.
- **Precise RPM/TPM/RPD** are dashboard-driven and were taken from secondary sources; the
  official docs defer to AI Studio.
- **Stores-per-project** number is from prior art, not re-confirmed against current docs.

## Clarifying Questions for Follow-up
1. Which default query model should the navigator ship with — `gemini-2.5-flash` (pending
   confirmation) or the explicitly-listed `gemini-2.5-pro`?
2. Should the backend auto-retry 429s at the data-plane layer, or surface them to the
   CLI/API/Agent for the caller to handle?
3. Do we need to support the Gemini 3 "File Search + function calling" combination for the
   Agent surface, or keep File Search strictly single-tool for MVP?

## References
| # | Source | URL | Information |
|---|---|---|---|
| 1 | npm registry — `@google/genai/latest` | https://registry.npmjs.org/@google/genai/latest | latest 2.9.0, Apache-2.0, deps |
| 2 | npm registry dist-tags | https://registry.npmjs.org/@google/genai | `latest`=2.9.0, `next`=2.9.0-rc.0 |
| 3 | js-genai GitHub releases | https://github.com/googleapis/js-genai/releases | v2.9.0 released 2026-06-19; weekly cadence |
| 4 | Gemini API — File Search docs | https://ai.google.dev/gemini-api/docs/file-search | model support, no-other-tools rule, 100 MB/file, tier store sizes, ~3× overhead, supported formats, JS init |
| 5 | Gemini API — Using API keys | https://ai.google.dev/gemini-api/docs/api-key | `GOOGLE_API_KEY` precedence over `GEMINI_API_KEY` |
| 6 | Context7 — `/googleapis/js-genai` | (Context7) | `GoogleGenAIOptions.apiKey`, explicit `{ apiKey }` constructor, fileSearch upload/tool surface |
| 7 | Gemini rate-limit guides (secondary) | https://www.aifreeapi.com/en/posts/gemini-api-rate-limit | RPM/TPM/RPD figures (advisory) |

### Recommended for Deep Reading
- **Gemini File Search docs (Ref 4)** — authoritative for model support, the no-other-tools
  constraint, and all storage/file limits.
- **Context7 `/googleapis/js-genai` (Ref 6)** — authoritative SDK surface for client options and
  File Search methods; pair with Topics 1 & 2 research for the response/metadata field shapes.
