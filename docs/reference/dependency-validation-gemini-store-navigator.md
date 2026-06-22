---
status: clean
mode: fix
package_manager: npm@11.12.1
ecosystem: node
iterations_run: 1
deprecations_initial: 0
deprecations_final: 0
vulnerabilities_initial: 0
vulnerabilities_final: 0
target_path: /Users/giorgosmarinos/aiwork/agent-platform/gemini-search
validated_at: 2026-06-20T21:55:00Z
last_validated_commit: null
replaced_modules: []
touched_source_files: []
---

# Dependency Validation — Gemini File Search Store Navigator

## 1. Summary

Both npm manifests (root `package.json` and `API/package.json`) were validated on 2026-06-20 using npm@11.12.1 on Node 25.9.0. Zero deprecation warnings surfaced during install in either manifest, zero transitive deprecated packages were found in either dependency tree, and both `npm audit` runs returned zero vulnerabilities across all severity levels. No replacements were applied; no source files were modified. The project's dependency trees are clean.

---

## 2. Initial State

### Manifest A — Root (`/gemini-search/package.json`) — 130 packages audited

| Package | Current Version | Wanted | Latest | Scope | Deprecated? | Severity |
|---|---|---|---|---|---|---|
| `@google/genai` | 2.9.0 | 2.9.0 | 2.9.0 | direct | No | — |
| `@langchain/anthropic` | 1.5.0 | 1.5.0 | 1.5.0 | direct | No | — |
| `@langchain/core` | 1.2.0 | 1.2.0 | 1.2.0 | direct | No | — |
| `@langchain/google-genai` | 2.2.0 | 2.2.0 | 2.2.0 | direct | No | — |
| `@langchain/langgraph` | 1.4.4 | 1.4.4 | 1.4.4 | direct | No | — |
| `@langchain/ollama` | 1.3.0 | 1.3.0 | 1.3.0 | direct | No | — |
| `@langchain/openai` | 1.5.1 | 1.5.1 | 1.5.1 | direct | No | — |
| `chalk` | 5.6.2 | 5.6.2 | 5.6.2 | direct | No | — |
| `commander` | 14.0.3 | 14.0.3 | **15.0.0** | direct | No | — |
| `dotenv` | 17.4.2 | 17.4.2 | 17.4.2 | direct | No | — |
| `langchain` | 1.5.0 | 1.5.0 | 1.5.0 | direct | No | — |
| `zod` | 4.4.3 | 4.4.3 | 4.4.3 | direct | No | — |
| `@types/node` | 25.9.4 | 25.9.4 | **26.0.0** | devDirect | No | — |
| `tsx` | 4.22.4 | 4.22.4 | 4.22.4 | devDirect | No | — |
| `typescript` | 6.0.3 | 6.0.3 | 6.0.3 | devDirect | No | — |
| `vitest` | 4.1.9 | 4.1.9 | 4.1.9 | devDirect | No | — |

**Transitive tree:** 0 deprecated packages found across all 130 packages.

### Manifest B — API (`/gemini-search/API/package.json`) — 212 packages audited

| Package | Current Version | Wanted | Latest | Scope | Deprecated? | Severity |
|---|---|---|---|---|---|---|
| `@google/genai` | 2.9.0 | 2.9.0 | 2.9.0 | direct | No | — |
| `express` | 5.2.1 | 5.2.1 | 5.2.1 | direct | No | — |
| `pino` | 10.3.1 | 10.3.1 | 10.3.1 | direct | No | — |
| `pino-http` | 11.0.0 | 11.0.0 | 11.0.0 | direct | No | — |
| `swagger-ui-express` | 5.0.1 | 5.0.1 | 5.0.1 | direct | No | — |
| `uuid` | 14.0.1 | 14.0.1 | 14.0.1 | direct | No | — |
| `yaml` | 2.9.0 | 2.9.0 | 2.9.0 | direct | No | — |
| `zod` | 4.4.3 | 4.4.3 | 4.4.3 | direct | No | — |
| `@types/express` | 5.0.6 | 5.0.6 | 5.0.6 | devDirect | No | — |
| `@types/node` | 25.9.4 | 25.9.4 | **26.0.0** | devDirect | No | — |
| `@types/supertest` | 7.2.0 | 7.2.0 | 7.2.0 | devDirect | No | — |
| `@types/swagger-ui-express` | 4.1.8 | 4.1.8 | 4.1.8 | devDirect | No | — |
| `supertest` | 7.2.2 | 7.2.2 | 7.2.2 | devDirect | No | — |
| `tsx` | 4.22.4 | 4.22.4 | 4.22.4 | devDirect | No | — |
| `typescript` | 6.0.3 | 6.0.3 | 6.0.3 | devDirect | No | — |
| `vitest` | 4.1.9 | 4.1.9 | 4.1.9 | devDirect | No | — |

**Transitive tree:** 0 deprecated packages found across all 212 packages.

---

## 3. Replacements Applied

No replacements were applied. Zero deprecated packages were found; no security vulnerabilities were found. The `fix` loop terminated after one validation pass with nothing to change.

---

## 4. Manual Review Needed

### Informational only — major-version upgrades available (not deprecations)

The following packages have newer major versions available. Neither is deprecated in the registry; these are recorded for awareness only and do not require action before this report's `status: clean` determination.

| Package | In Manifest | Installed | Latest | Manifests Affected | Notes |
|---|---|---|---|---|---|
| `commander` | `^14.0.3` | 14.0.3 | 15.0.0 | Root only | Major bump; not deprecated. Check commander changelog before upgrading — major releases historically break option-parsing APIs. |
| `@types/node` | `^25.5.0` | 25.9.4 | 26.0.0 | Root + API | Major type-definition bump tracking Node 26. Not deprecated. Upgrade when project targets Node 26. |

Neither item blocks the `clean` verdict. They are captured here so the team can schedule intentional major-version upgrades.

---

## 5. Security Audit

Both manifests audited with `npm audit --json` (npm 7+ format, `auditReportVersion: 2`).

| Manifest | Packages Audited | Info | Low | Moderate | High | Critical | Total |
|---|---|---|---|---|---|---|---|
| Root (`/gemini-search`) | 184 (prod 82 / dev 103 / opt 59) | 0 | 0 | 0 | 0 | 0 | **0** |
| API (`/gemini-search/API`) | 266 (prod 129 / dev 138 / opt 59) | 0 | 0 | 0 | 0 | 0 | **0** |

No advisories. No vulnerable packages. No remediation needed.

---

## 6. Final State

Both manifests are **clean** after one validation pass:

- Zero deprecation warnings during install (both manifest A and B).
- Zero deprecated packages anywhere in either transitive dependency tree.
- Zero vulnerabilities reported by `npm audit` for either manifest.
- No files were modified; no packages were replaced.
- Two major-version upgrades (`commander@15`, `@types/node@26`) are available but are not deprecations; they are flagged for informational review only.

**Per-manifest verdicts:**

| Manifest | Status | Deprecations | Vulnerabilities |
|---|---|---|---|
| Root `package.json` | clean | 0 | 0 |
| `API/package.json` | clean | 0 | 0 |

---

## 7. Commands Run

All commands run on 2026-06-20 in UTC. Exit codes captured.

| # | Command | Working Directory | Exit Code |
|---|---|---|---|
| 1 | `npm install` | `/gemini-search` | 0 |
| 2 | `npm install` | `/gemini-search/API` | 0 |
| 3 | `npm install --prefer-online` | `/gemini-search` | 0 |
| 4 | `npm install --prefer-online` | `/gemini-search/API` | 0 |
| 5 | `npm outdated --json` | `/gemini-search` | 1 (expected — packages behind latest major) |
| 6 | `npm outdated --json` | `/gemini-search/API` | 1 (expected — packages behind latest major) |
| 7 | `npm audit --json` | `/gemini-search` | 0 |
| 8 | `npm audit --json` | `/gemini-search/API` | 0 |
| 9 | `npm install --force` | `/gemini-search` (deprecation grep) | 0 |
| 10 | `npm install --force` | `/gemini-search/API` (deprecation grep) | 0 |
| 11 | `npm view <pkg> deprecated` (16 root packages) | `/gemini-search` | all 0 |
| 12 | `npm view <pkg> deprecated` (16 API packages) | `/gemini-search/API` | all 0 |
| 13 | `npm ls --all --json` (transitive deprecated scan) | `/gemini-search` | 0 |
| 14 | `npm ls --all --json` (transitive deprecated scan) | `/gemini-search/API` | 0 |

Note: `npm outdated` exits with code 1 whenever any package is behind `latest`, even if it is within the semver range and not deprecated. This is expected npm behaviour and does not indicate an error.
