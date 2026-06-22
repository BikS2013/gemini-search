---
status: completed
mode: write-and-run
scope_slug: gemini-store-navigator-api
language: TypeScript
framework: vitest + supertest
test_command_full: cd API && npx vitest run
test_command_scope: cd API && npx vitest run test/auth.test.ts test/error-mapping.test.ts test/pagination.test.ts
test_dir: /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/API/test
target_path: /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/API
test_files_owned:
  - API/test/auth.test.ts
  - API/test/error-mapping.test.ts
  - API/test/pagination.test.ts
tests_added: 80
tests_updated: 0
tests_run: 80
tests_passed: 80
tests_failed: 0
implementation_gaps: 0
built_at: 2026-06-20T18:55:44Z
last_built_commit: null
---

# Test Build — Gemini Store Navigator HTTP API

## 1. Summary

All 80 new tests pass (0 failures, 0 implementation gaps). Three new test files were created under `API/test/` covering static-auth opt-in behavior, typed-error → HTTP status mapping, pagination utilities, Page shape from both store and document routes, and profile selection. The existing `API/test/app.test.ts` (12 tests) was not modified. Framework is vitest v4.1.9 with supertest v7.2.2; all tests use a fake `backendFactory` that returns stub `IGeminiBackend` implementations — no live `@google/genai` calls and no real API key required.

## 2. Scope Resolved

**Source files covered:**

- `API/src/auth/static-auth.ts` — `staticAuthMiddleware`
- `API/src/app.ts` — `buildApp` wiring (gate ordering, pre-auth routes)
- `API/src/errors/error-middleware.ts` — `errorMiddleware`, `toApiError`
- `API/src/util/pagination.ts` — `parsePage`, `asQueryString`, `getParam`
- `API/src/routes/stores.ts` — `resolveProfile`, `storesRouter`
- `API/src/routes/documents.ts` — `documentsRouter`
- `API/src/routes/query.ts` — `queryRouter`

**Referenced core types (read-only):**
- `src/core/errors.ts` — `RateLimitError`, `FileTooLargeError`, `UnsupportedMimeTypeError`, `StoreLimitError`, `UploadOperationError`
- `src/config/config-error.ts` — `ConfigurationError`
- `src/core/backend/backend.ts` — `IGeminiBackend` interface

## 3. Existing Coverage

From `API/test/app.test.ts` (untouched — 12 tests):

| Symbol | Existing test file |
|---|---|
| `staticAuthMiddleware` | app.test.ts — 3 tests (pass-through, 401 missing, 401 accepted) |
| `storesRouter` | app.test.ts — 3 tests (listStores pagination, POST validation, DELETE 204) |
| `queryRouter` | app.test.ts — 2 tests (query result, ?raw=true) |
| `errorMiddleware` | app.test.ts — 2 tests (RateLimitError→429, FileTooLargeError→413) |
| `healthRouter` | app.test.ts — 1 test |
| `openapiRouter` | app.test.ts — 1 test |

**Gaps identified (before this build):**
- Auth: wrong header value distinct from missing, multiple allowed values, custom header name, error body structure
- Error mapping: `ConfigurationError→500`, `UnsupportedMimeTypeError→422`, `StoreLimitError→409`, `UploadOperationError→502`, unknown error→500 INTERNAL
- Pagination util: `parsePage` unit (defaults, boundary, invalid inputs), `asQueryString`, `getParam`
- Documents route: pagination forwarding, Page shape, URL-encoded store name
- Profile selection: header > query precedence, blank header/query fallback, all data-plane routes

## 4. Plan

### auth.test.ts — 20 tests

| target_symbol | category | test_file | test_name | intent |
|---|---|---|---|---|
| staticAuthMiddleware | unit | auth.test.ts | data route succeeds without any auth header | Gate disabled when values=[] — any request passes |
| staticAuthMiddleware | unit | auth.test.ts | data route succeeds even when a (correct) header is sent | Disabled gate ignores headers |
| staticAuthMiddleware | unit | auth.test.ts | data route succeeds even when a wrong header value is sent | Disabled gate ignores wrong headers |
| healthRouter | unit | auth.test.ts | /health is accessible without auth header | Health bypasses gate when disabled |
| staticAuthMiddleware | error_path | auth.test.ts | missing header returns 401 STATIC_AUTH_FAILED | Enabled gate blocks headerless request |
| staticAuthMiddleware | error_path | auth.test.ts | wrong header value returns 401 STATIC_AUTH_FAILED | Enabled gate blocks wrong value |
| staticAuthMiddleware | unit | auth.test.ts | correct header value allows access (200) | Enabled gate passes correct value |
| staticAuthMiddleware | unit | auth.test.ts | correct header allows POST /stores/:name/query | Gate applies to all data-plane routes |
| healthRouter | unit | auth.test.ts | /health bypasses auth gate even with secret configured | Health pre-auth even with gate enabled |
| openapiRouter | unit | auth.test.ts | /openapi bypasses auth gate even with secret configured | OpenAPI pre-auth even with gate enabled |
| staticAuthMiddleware | unit | auth.test.ts | first/second/last secret is accepted | Multiple allowed values — all work |
| staticAuthMiddleware | error_path | auth.test.ts | a value not in the list is rejected with 401 | Wrong value rejected from multi-value set |
| staticAuthMiddleware | unit | auth.test.ts | correct value in the custom header is accepted | Custom header name is respected |
| staticAuthMiddleware | error_path | auth.test.ts | correct value in the DEFAULT header name is rejected when custom header configured | Wrong header name rejected |
| staticAuthMiddleware | error_path | auth.test.ts | missing custom header returns 401 | Custom-name gate blocks missing header |
| staticAuthMiddleware | unit | auth.test.ts | error body includes code, message, and correlationId fields | 401 body structure conforms to error envelope |

### error-mapping.test.ts — 22 tests

| target_symbol | category | test_file | test_name | intent |
|---|---|---|---|---|
| errorMiddleware | unit | error-mapping.test.ts | returns 429 with RATE_LIMITED code | RateLimitError maps to 429 |
| errorMiddleware | unit | error-mapping.test.ts | includes Retry-After header when retryAfterMs is provided | Retry-After is set and calculated correctly (ceil/1000) |
| errorMiddleware | unit | error-mapping.test.ts | rounds up sub-second retryAfterMs to 1 | max(1, ceil(ms/1000)) floor at 1 second |
| errorMiddleware | unit | error-mapping.test.ts | omits Retry-After header when retryAfterMs is undefined | No retryAfterMs → no header |
| errorMiddleware | unit | error-mapping.test.ts | response error body contains correlationId | Error envelope always has correlationId |
| errorMiddleware | unit | error-mapping.test.ts | returns 500 with CONFIG_MISSING code | ConfigurationError maps to 500 |
| errorMiddleware | unit | error-mapping.test.ts | error body contains the configuration error message | CONFIG_MISSING message propagated |
| errorMiddleware | unit | error-mapping.test.ts | ConfigurationError thrown from createStore also maps to 500 | Mapping applies on all routes |
| errorMiddleware | unit | error-mapping.test.ts | returns 413 with PAYLOAD_TOO_LARGE code | FileTooLargeError maps to 413 |
| errorMiddleware | unit | error-mapping.test.ts | error message describes the size violation | 413 message is descriptive |
| errorMiddleware | unit | error-mapping.test.ts | returns 422 with UNPROCESSABLE_ENTITY code | UnsupportedMimeTypeError maps to 422 |
| errorMiddleware | unit | error-mapping.test.ts | error message includes the unsupported MIME type | 422 message names the MIME type |
| errorMiddleware | unit | error-mapping.test.ts | returns 409 with CONFLICT code | StoreLimitError maps to 409 |
| errorMiddleware | unit | error-mapping.test.ts | StoreLimitError without detail still maps to 409 | Optional detail doesn't affect mapping |
| errorMiddleware | unit | error-mapping.test.ts | returns 502 with UPSTREAM_ERROR code | UploadOperationError maps to 502 |
| errorMiddleware | unit | error-mapping.test.ts | UploadOperationError with no operationError still maps to 502 | Optional operationError doesn't affect mapping |
| errorMiddleware | error_path | error-mapping.test.ts | plain Error maps to 500 INTERNAL and hides the real message | Unknown errors don't leak implementation details |
| errorMiddleware | error_path | error-mapping.test.ts | non-Error thrown value maps to 500 INTERNAL | Non-Error throws are also caught |
| errorMiddleware | unit | error-mapping.test.ts | 400 BAD_REQUEST from missing displayName is passed through | ApiError pass-through |
| errorMiddleware | unit | error-mapping.test.ts | 400 BAD_REQUEST from missing filePath is passed through | ApiError pass-through |
| errorMiddleware | unit | error-mapping.test.ts | 400 BAD_REQUEST from missing prompt is passed through | ApiError pass-through |

### pagination.test.ts — 38 tests

| target_symbol | category | test_file | test_name | intent |
|---|---|---|---|---|
| parsePage | unit | pagination.test.ts | returns defaultPageSize when pageSize is absent | Absent pageSize uses default |
| parsePage | unit | pagination.test.ts | returns defaultPageSize when pageSize is an empty string | Empty string treated as absent |
| parsePage | unit | pagination.test.ts | parses a valid integer pageSize string | Normal case |
| parsePage | unit | pagination.test.ts | parses pageSize of 1 (minimum valid) | Lower boundary |
| parsePage | unit | pagination.test.ts | parses pageSize equal to maxPageSize (boundary) | Upper boundary |
| parsePage | error_path | pagination.test.ts | throws BAD_REQUEST for non-numeric pageSize | Invalid string |
| parsePage | error_path | pagination.test.ts | throws BAD_REQUEST for zero pageSize | Zero rejected |
| parsePage | error_path | pagination.test.ts | throws BAD_REQUEST for negative pageSize | Negative rejected |
| parsePage | error_path | pagination.test.ts | throws BAD_REQUEST for float pageSize | Float rejected |
| parsePage | error_path | pagination.test.ts | throws BAD_REQUEST when pageSize exceeds maxPageSize | Exceeds max |
| parsePage | unit | pagination.test.ts | passes pageToken through unchanged | Opaque cursor forwarded |
| parsePage | unit | pagination.test.ts | passes pageToken undefined when absent | No cursor → undefined |
| parsePage | unit | pagination.test.ts | returns both pageSize and pageToken together | Combined params |
| asQueryString | unit | pagination.test.ts | returns the string as-is | String input |
| asQueryString | unit | pagination.test.ts | returns undefined for undefined input | Undefined case |
| asQueryString | unit | pagination.test.ts | returns undefined for a number | Non-string scalar |
| asQueryString | unit | pagination.test.ts | returns undefined for null | Null case |
| asQueryString | unit | pagination.test.ts | returns the first element when given a string array | Array case |
| asQueryString | unit | pagination.test.ts | returns undefined for an empty array | Empty array |
| asQueryString | unit | pagination.test.ts | returns undefined for an array of numbers | Number array |
| getParam | unit | pagination.test.ts | returns the param value when present | Normal case |
| getParam | error_path | pagination.test.ts | throws BAD_REQUEST ApiError when param is absent | Missing param |
| getParam | error_path | pagination.test.ts | throws BAD_REQUEST ApiError when param is an empty string | Empty string param |
| storesRouter | unit | pagination.test.ts | returns { items, nextPageToken } with null nextPageToken | Page shape with last page |
| storesRouter | unit | pagination.test.ts | returns nextPageToken from the backend when present | Page shape with cursor |
| storesRouter | unit | pagination.test.ts | forwards pageSize and pageToken to backend.listStores | Forwarding wiring |
| storesRouter | unit | pagination.test.ts | uses defaultPageSize when pageSize is omitted | Default forwarded |
| storesRouter | error_path | pagination.test.ts | returns 400 when pageSize exceeds maxPageSize | Validation via HTTP |
| storesRouter | error_path | pagination.test.ts | returns 400 for non-integer pageSize | Validation via HTTP |
| documentsRouter | unit | pagination.test.ts | returns { items, nextPageToken } with null nextPageToken | Document page shape |
| documentsRouter | unit | pagination.test.ts | returns nextPageToken from the backend when present | Document cursor |
| documentsRouter | unit | pagination.test.ts | forwards storeName, pageSize, and pageToken to backend.listDocuments | Document forwarding wiring |
| documentsRouter | unit | pagination.test.ts | decodes URL-encoded store name | URL-encoded param decoding |
| resolveProfile | unit | pagination.test.ts | uses X-Gemini-Nav-Profile header when provided | Header profile selection |
| resolveProfile | unit | pagination.test.ts | uses ?profile= query param when header is absent | Query profile selection |
| resolveProfile | unit | pagination.test.ts | header takes precedence over ?profile= query param | Header > query precedence |
| resolveProfile | unit | pagination.test.ts | falls back to config.geminiProfile when neither header nor query is present | Config default fallback |
| resolveProfile | unit | pagination.test.ts | ignores a blank (whitespace-only) header and uses config default | Whitespace header ignored |
| resolveProfile | unit | pagination.test.ts | ignores a blank ?profile= and uses config default | Whitespace query ignored |
| resolveProfile | unit | pagination.test.ts | profile selection works on document routes too | Wiring on documentsRouter |
| resolveProfile | unit | pagination.test.ts | profile selection works on query route too | Wiring on queryRouter |

## 5. Files Owned

| File | Reason |
|---|---|
| `API/test/auth.test.ts` | new — static-auth gate behavior |
| `API/test/error-mapping.test.ts` | new — typed-error → HTTP status mapping |
| `API/test/pagination.test.ts` | new — pagination utils + Page shape + profile selection |

`API/test/app.test.ts` was NOT modified (existing 12-test suite, read-only).

## 6. Test Run Results

Command: `cd /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/API && npx vitest run test/auth.test.ts test/error-mapping.test.ts test/pagination.test.ts`

Exit code: 0

```
 Test Files  3 passed (3)
      Tests  80 passed (80)
   Start at  21:55:44
   Duration  305ms (transform 130ms, setup 0ms, import 339ms, tests 296ms, environment 0ms)
```

All 80 tests passed. Breakdown by file:

| File | Tests |
|---|---|
| `test/auth.test.ts` | 20 passed |
| `test/error-mapping.test.ts` | 22 passed |
| `test/pagination.test.ts` | 38 passed |

## 7. Implementation Gaps

None. All tested behaviors are correctly implemented. No failures were observed.

## 8. Manual Review Needed

**Shared infra not modified (as required):**

- `API/vitest.config.ts` — The test config includes `['test/**/*.test.ts']`, which already picks up all three new files without modification. No change needed.
- `API/package.json` — No new dependencies were required (supertest and vitest were already installed). No change needed.
- `API/tsconfig.json` — `test/` directory is in the `exclude` list. This is correct for compilation; vitest does not require test files in `include`. No change needed.

**One potential concern worth noting for a human review:**

The `vitest.config.ts` does not configure `onUnhandledRejection: 'error'` (or equivalent). The current tests all `await` their supertest calls so this is not immediately risky, but if a future test omits `await` on a rejected promise, the runner may report a pass even if the assertion didn't run. This is a shared-infrastructure change and was intentionally not made. The project team should consider adding:
```ts
// vitest.config.ts
test: {
  include: ['test/**/*.test.ts'],
  // Recommended: fail on unhandled promise rejections
  // dangerouslyIgnoreUnhandledErrors: false  // already the default in vitest
}
```
Vitest's default behavior does catch unhandled rejections, so this is low-priority — noted for awareness only.

## 9. Commands Run

| # | Command | Exit code |
|---|---|---|
| 1 | `cd /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/API && npx vitest run test/auth.test.ts test/error-mapping.test.ts test/pagination.test.ts` | 0 |
