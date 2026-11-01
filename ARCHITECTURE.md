# Architecture — Brand Intelligence Agent

## Scope and runtime

Six React routes (`/`, `/brand`, `/studio`, `/verification`, `/correction`, `/report`) use TanStack Start. `src/router.tsx` supplies the query context; `src/routes/__root.tsx` provides the shell. Vite's existing Lovable configuration bundles the server for the Worker target; `src/server.ts` wraps catastrophic SSR errors. Do not introduce Node-only runtime dependencies or another router.

## Modules and server functions

| Module | Responsibility |
| --- | --- |
| `schemas.ts` | Shared Zod inputs, structured outputs, asset/findings types and correction cap |
| `brand-analysis.ts` | Grounding against submitted profile sources |
| `creative-generation.ts` | Profile fingerprint, format ratios, brand/brief prompt construction |
| `creative-verification.ts` | PNG inspection, rule coverage, conservative evidence normalization, status aggregation |
| `correction.ts` | Eligibility, revision coverage, conservative comparisons, prompt-free report DTO |
| `correction.server.ts` | Sequential loop, asset/hash provenance, partial-run retention |
| `providers.server.ts` | Meta fetch adapters, authentication, validation and per-call timeouts |
| `agent.functions.ts` | Public same-origin validated RPC boundaries |
| `store.ts` | Workspace-memory originals, findings, runs and per-run approval |
| `demo-data.ts` | Explicit hand-written illustrative fixtures only |

Active functions: `analyzeBrand`, `generateCreative`, `verifyCreative`, `runCorrectionLoop` (POST), and `getProviderStatus` (GET). UI handlers use `useServerFn`. Server orchestration calls provider helpers directly—not serialized RPC stubs. Dynamic provider imports stay inside handlers; server-only modules must not enter the client graph.

Legacy `runCreativeAgent` and unconfigured provider interfaces remain from the initial prototype. They are not the live correction implementation. Their cleanup is a review recommendation pending approval.

## Meta Model API integration

- `muse-spark-1.3`: `POST https://api.meta.ai/v1/responses` for text analysis, independent image inspection and separate revision planning.
- `muse-image-1.0`: `POST https://api.meta.ai/v1/images/generations` for originals and targeted regeneration.
- Existing server-only Bearer `META_MODEL_API_KEY`; no browser-to-Meta request.
- Responses envelope must be completed assistant `output_text`; image verification/planning additionally request strict JSON-schema output and apply local validation.
- Verification/planning send actual PNG data URLs as `input_image` with `input_text` metadata. The verifier never receives the generator prompt.
- Image calls request one base64 PNG, documented aspect-ratio size, and disabled image/web/shell search. Returned pixels are measured; requested size is not an exact pixel guarantee.
- Regeneration uses the original brand, brief and validated revision plan. No official image-edit contract was used, and no claim of pixel-preserving editing is made.

## Structured schemas and grounding

Profiles and briefs have length/count limits; the brief must belong to the profile. Analysis must preserve supplied identity/personality/colors/exclusions and quote actual sources. Creative records include asset/brief IDs, iteration, original bytes, model, endpoint, dimensions, time, source snapshots and unverified lettering/logo indicators.

Verification requires exactly one finding per rule, matching criterion and source, concrete observations, method, status, explanation and suggested correction when applicable. Unknown/duplicate/missing IDs and invalid envelopes fail. Unsupported or uncertain evidence becomes NEEDS_REVIEW. Reserved deterministic rule IDs cannot be supplied as brand rules.

## Agent state transitions

```text
Input -> [Generate original OR retain submitted original]
      -> Fresh independent verification + hash check
      -> Identify actionable REVISE findings
         | none -> Final report (PASS / REVISE / NEEDS_REVIEW)
         | eligible
         v
      Targeted Muse Spark plan (changes + preserved PASS attributes)
      -> Muse Image regeneration (attempt 1..3)
      -> Independent inspection of new PNG + hash check
      -> Compare rule outcomes
         | no meaningful improvement -> stop
         | no actionable violations -> stop
         | attempt 3 -> stop at limit
         | eligible and improved -> next plan

Any failure -> safe stop with completed records and available images
```

The input accepts a generated original plus analysis, or generation input plus analysis. The UI starts from an existing session original. Submitted verification results are not accepted as authoritative: the original is inspected anew before correction.

## Verification aggregation and eligibility

Aggregation is REVISE if any finding is REVISE; otherwise NEEDS_REVIEW if any finding needs review or coverage is empty; otherwise PASS. Human approval is independent.

Eligibility requires REVISE, actual nonempty evidence, a concrete instruction and a supported non-human method. Unsupported/uncertain language and `system:dimensions` metadata inconsistency are excluded. Review-only logo, typography, palette, product-fact and overlay requirements cannot trigger correction alone.

PNG signature/IHDR/IEND checks establish limited file structure. Header dimensions are compared with the record, and aspect ratio with the campaign format using rounding tolerance. These checks do not validate every chunk, CRC or decoded pixel.

## Bounded attempts and improvement

`MAX_CORRECTION_ITERATIONS = 3` means three corrections **after** the original. Each attempt stores number, plan/time/response ID, previous asset ID, regeneration mode, new asset, findings, corrected/remaining IDs, improvement flag and error.

Meaningful improvement requires an actionable REVISE→PASS transition, fewer actionable violations, no new REVISE finding and no lost prior PASS. REVISE→NEEDS_REVIEW is not a correction. The latest actual image never inherits an earlier verification result; failed new-image inspection leaves it NEEDS_REVIEW. Maximum attempts never imply PASS.

## Error handling and observability

Analysis times out after 45 seconds, generation after 180 seconds, verification and planning after 90 seconds. HTTP access/rate/provider failures and malformed output are handled without fabricated assets/findings. The loop returns a safe partial report on failure, with a stage-specific generic message instead of provider bodies or exception details. No automatic provider retry is performed.

Completed-run events record stage, timestamp, attempt, model, relevant rule IDs and decision. The UI shows a waiting state during execution and the timeline after the RPC completes; this is not a streaming progress feed. A dropped connection may lose the server's returned run because no durable job system exists.

## Security boundaries (design, not a security certification)

`src/start.ts` applies same-origin CSRF middleware to server-function requests. The current active agent functions are public actions on submitted input, not private saved-record reads; CSRF is not user authentication or a rate limiter. Generated auth attachment is registered but active functions do not require a user session. Add authenticated boundaries before introducing private persistence.

Credentials are read inside server adapters. Provider outputs are checked for credential echoes; endpoints/model IDs are fixed. Browser-visible `VITE_` values are public configuration only. An unused generated administrative client exists; active agent flows do not use it and require no admin key.

These are source-described boundaries, **not a completed security audit**. The available scan result is a stale supply-chain scan with no findings; no recent deep-scan result was available. Run a scan from the Security tab. The repository currently tracks `.env`; contents and historical credential exposure remain unverified. Do not place confidential brand information or secrets in submitted profiles/briefs or downloaded metadata; those inputs reach Meta and generation records expose their prompt locally.

## Session-only retention and provenance

`useSyncExternalStore` retains state in module memory, surviving navigation but not reload. Generated originals and revisions append with distinct IDs. Verification records carry actual-image SHA-256 and response IDs; correction records link each attempt to its predecessor. There are no application-table reads, background seeds or durable asset saves.

Run approvals are separately keyed and cannot alter model verdicts. Reports include original/final images, all attempts and rule evidence, excluding generator prompts; original Studio metadata downloads intentionally include the generation prompt. Download before reloading. Large inline images and repeated reports can consume browser memory; no pagination or durable archive exists.

## Tests and readiness

Six test files cover routing, provider boundaries, grounded analysis, generation transport/PNG checks, independent verification, and correction eligibility/limits/failures/provenance. Most provider tests are mocked contracts, not proof of live model accuracy. Previously verified live Halden and controlled-case results are recorded separately in `PHASE2-STATUS.md`.

See `SUBMISSION_READINESS.md` for actual commands/results, remaining code-review items, build verification limits and submission blockers.