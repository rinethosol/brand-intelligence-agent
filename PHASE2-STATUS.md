# Phase 2 status — November 1, 2026

## Milestone 4: bounded autonomous correction — November 1, 2026
- Added public same-origin CSRF-protected POST `runCorrectionLoop`. Its server-only `executeCorrectionLoop` reuses exactly the generation and verification adapters behind `generateCreative` and `verifyCreative`, rather than nesting RPC calls. Existing brand analysis, generation and independent verification are preserved.
- Added `planRevisionWithMeta`: a separate Muse Spark 1.3 Responses invocation inspects the actual previous PNG plus profile, original brief, rules and independent findings. Strict JSON-schema output has targeted changes and all passing attributes to preserve; shared validation rejects missing, duplicate, ineligible or unrelated rule IDs. No generator prompt is sent to the verifier or planner.
- Extended `generateCreativeWithMeta` with an internal targeted revision option. Uses existing Muse Image 1.0 Images generation contract, original brand/brief/rules and validated plan. **This is text-only regeneration, not direct image editing.** No unconfirmed image-edit API was called.
- Original images are freshly verified, with asset-ID and byte-derived SHA-256 validation, before eligibility. Only supported REVISE findings with evidence and concrete corrections trigger attempts; review-only findings and image/metadata inconsistencies do not. No attempt is triggered by NEEDS_REVIEW alone.
- Maximum **three correction attempts after the original**, each followed by independent actual-image inspection. Only confirmed REVISE→PASS transitions count as correction; no new REVISE or lost PASS may count as meaningful improvement. Stops for no actionable violations, no improvement, attempt limit or failure. Newly generated images with failed inspection stay NEEDS_REVIEW, never inherit a verdict. API errors return safely retained partial history without provider bodies or exception details.
- Updated Self-Correction and Verification Report without redesign: preserved original/latest images, full original/final findings, corrected and remaining violations, human requirements, model/timestamp/rule activity, all plans/attempts and image downloads. JSON report includes originals, all attempts, brand rules, evidence, final result and separately keyed human approval; generator prompts are omitted. No automatic approval. Demo verification remains on its separate tab.

### Actual live validation
- Halden original `7a450737-3718-4627-bfa0-bb698d3e65b9` was inspected again: **NEEDS_REVIEW, 7 PASS / 0 REVISE / 18 NEEDS_REVIEW**, zero correction attempts. No violation was fabricated. Model judgments can vary between independent runs.
- Created a separate, clearly labeled **Controlled test — Bottle exclusion** fixture using real Muse Image: large transparent ribbed plastic bottle with blue cap on a stump in a forest. Target profile explicitly forbids plastic water bottles. This deliberate negative fixture is not a compliant campaign or Halden output; its actual generation prompt and original bytes remained intact in the test session.
- Independently verified the fixture through the application: **REVISE, 4 PASS / 2 REVISE / 5 NEEDS_REVIEW**. Rules `vr-02` and `vr-03` both concern the same bottle exclusion (two rule findings, not two distinct objects). Evidence: “Large clear ribbed plastic water bottle with blue screw cap occupying center foreground” and “Transparent bottle standing upright on tree stump from bottom center to upper center.” Both supplied concrete removal instructions.
- **Two actual controlled correction attempts occurred across two separate one-attempt runs.** The first completed but exposed a selection bug: adding the revision shifted the selected creative and hid that original's report. Selection was pinned to the original and the same controlled fixture was run again; the second run's full comparison, downloaded report and approval flow were verified. Neither run attempted more than one regeneration; no hidden retries.
- Recorded second run original: `3388ddcb-c121-43a2-957d-2951f2420f9b`, 1600×1600 PNG, SHA-256 `42e95d38412d7f0ea688bc5b1d9326d05458dde8f9cb7eb3b8554c7762c00cea`.
- Recorded final: `5f6e8665-0503-4af1-b0b1-bc31bac9a608`, 1600×1600 PNG, SHA-256 `4e1055482445b209a3df087b8806894f85b8c91de81093ea83141ca4ded38be4`. **NEEDS_REVIEW, 6 PASS / 0 REVISE / 5 NEEDS_REVIEW**. Both exclusion findings became PASS. Reverification described a mossy stump, forest trail, plants and natural debris with no bottle shapes or imagery. Original remained byte-for-byte unchanged. Scene, PNG format, measured dimensions and ratio stayed passing.
- Final image visually inspected: bottle absent, realistic forest and stump retained, headline added. Additional model-generated copy still requires claim/typography review; removal of the bottle is **not overall brand approval**. Five human-review requirements remain: exact palette, logo, typography, factual claims and overlays.
- UI flow verified end-to-end: run → original/latest evidence → report download → human approval. Approving kept NEEDS_REVIEW unchanged. Desktop/mobile screenshots inspected, no horizontal overflow, zero browser errors, zero key matches in monitored browser responses, zero direct browser-to-Meta requests.
- **70 tests / 6 files passed**, including 17 correction tests: PASS skip, review-only skip, evidenced correction, three-attempt cap, no improvement, uncertainty/regression, generation and verification failures, partial-image retention, original preservation, hash/model provenance, ineligible evidence, separate approval, planner exact-image contract and credential echo, targeted Muse Image reuse. Existing analysis/generation/verification/routing tests passed. Latest automatic build: build OK.

### Limitations
- Regeneration can change composition or introduce extra copy; it does not preserve pixels as direct editing would. Rule-level independent reverification is mandatory, and review-only claims remain unresolved.
- Visual findings are model-reported and fallible; no certified OCR, logo reference matching, exact palette/overlay certification or claim substantiation was added. No new durable saved data, auth or background-job system. Reports/assets survive navigation in this workspace session, not a reload.
- Calls are sequential and individually timed out (generation 180 seconds; planner/verifier 90 seconds). A long three-attempt request may exceed hosting request limits; dropped connections cannot recover a server run without durable job storage. No overall PASS is promised or forced.
- Live correction demonstrated successfully on the controlled case; Halden appropriately needed no autonomous correction. Three attempts and failure modes were exercised with mocks, not paid live failures.

## Milestone 3: independent evidence-based verification — November 1, 2026
- Added public same-origin CSRF-protected POST `verifyCreative` and server-only `verifyCreativeWithMeta`; no private-record reads, new credentials, UI redesign or automatic correction were introduced.
- Verified official image-input contract at https://dev.meta.ai/docs/image-understanding, https://dev.meta.ai/docs/models, https://dev.meta.ai/docs/protocols/responses/ and https://dev.meta.ai/docs/structured-output. Verifier **muse-spark-1.3**, endpoint **POST https://api.meta.ai/v1/responses**, existing server-only Bearer key. This is a separate model/invocation from the Muse Image generator, not an independent vendor.
- Original PNG goes verbatim in a user message `content` as `{ type: input_image, image_url: data:image/png;base64,... }` alongside `input_text` containing the saved profile, campaign brief, validated rule IDs and generation metadata. The generator prompt is excluded. Meta documents PNG input, up to 50 images and 50 MB per inline image; the app uses one image within its existing tighter size bound.
- Verification uses documented Responses `text.format` JSON Schema with `strict: true` for `findings`, `observed_text` and `image_observations`, then shared Zod validation. Early prompt-only responses omitted image_observations and were rejected without saving; schema-constrained responses subsequently completed.
- Requires every validated rule exactly once; rejects unknown, duplicate, missing and reserved rule IDs, mismatched criteria, extra fields and malformed/partial responses. Empty/uncertain evidence becomes NEEDS_REVIEW, not PASS. REVISE requires evidence and a correction. No invented numeric confidence or fixed passing scores.
- Deterministic format/header dimensions/aspect-ratio checks are computed from original bytes, not trusted metadata. Header checks are not full PNG CRC/decompression certification. Palette/overlays remain review-only without a deterministic composition layer; visual resemblance never proves exact HEX compliance. Logo positioning/identity, typography, factual claims and ambiguous/nonvisual rules remain human checks.
- Findings contain rule ID, source criterion/guideline, status, visible evidence, explanation, method and next action. Overall aggregation gives REVISE precedence, otherwise NEEDS_REVIEW if any rule needs review; only full evidence-backed coverage could yield PASS. Verification is attached to original asset ID and SHA-256 in session history with downloadable JSON.
- Brand Verification now shows actual originals, saved rules and live findings; demo examples use a separate tab. Creative Studio links to original verification. Failures clear loading without generating fallback findings; no automatic retries or corrections. Previous successful inspection remains timestamped when a later attempt fails.

### Actual Milestone 3 evidence
- Full brand-analysis → generation → verification UI flow preserved working Muse Spark analysis and Muse Image generation. The first verification response was invalid and rejected. Following the request-schema repair, a genuine live inspection of the preserved prior Halden original completed through the UI.
- Inspected original `7a450737-3718-4627-bfa0-bb698d3e65b9`, 1600×1600 PNG. Verification hash independently matches the original bytes: `bdcfcc6c1596b90d8029228f95483a7afbbe390c3e9513ba179840517dbaa0ea`.
- Actual UI result: **NEEDS_REVIEW**, **25 findings: 8 PASS, 0 REVISE, 17 NEEDS_REVIEW**. Pass findings include apparent natural lighting, absence of fantasy scenery/neon colors/handshakes/plastic bottles, plus PNG/dimension/aspect checks. These visual judgments are not proof of real shooting location or physical light-source provenance.
- Evidence identifies the rust-jacket hiker, misty autumn forest, off-white headline, top-left “Halden Outdoor” and empty dark-green bottom-left rectangle. Logo review flags the placement discrepancy but is not certified without a logo reference. Image text “New Autumn Trail Jacket — Lightweight. Sustainable. Packable.” was observed, not accepted as substantiated product facts. Exact palette, typography, claims, real location, brand tone and audience relevance remain review items.
- Screen and mobile screenshots inspected; original remained byte-for-byte unchanged, demo/live tabs stayed separate, and no horizontal overflow. Browser checks: zero page errors, zero key matches in browser request/response content or headers, zero direct browser-to-Meta calls.
- Automated tests: **5 files / 53 tests passed**. Cover actual image transmission, structured output settings, strict rule IDs, missing/uncertain evidence, unsupported checks, corrections, status aggregation, PNG dimensions/aspect, HTTP/network/timeout failures and preservation of existing analysis/generation tests. Run command: `bunx vitest run src/test/creative-verification.test.ts src/test/creative-generation.test.ts src/test/brand-analysis.test.ts src/test/agent-boundary.test.ts src/test/app-routing.test.tsx`. Latest automatic build: build OK.
- Limitations: visual evidence is model-reported and fallible, not externally corroborated forensic proof; no certified OCR, logo reference matching, palette/overlay composition checks, product-claim substantiation, durable saved verification or automatic correction. Session originals without saved validated analysis must be regenerated after brand analysis before live verification. Multimodal-input skill guidance informed transport; official Meta documentation—not the Lovable Gateway contract—governs this request.

## Milestone 2: live Meta creative generation — November 1, 2026
- Official contract verified from rendered Meta documentation: https://dev.meta.ai/docs/image-generation and https://dev.meta.ai/docs/api-reference/images/create-image. The website-fetch service could not read the site; browser inspection successfully read the full feature page.
- Model: `muse-image-1.0`. Endpoint: `POST https://api.meta.ai/v1/images/generations`. Authentication: server-only Bearer `META_MODEL_API_KEY`; no new key was requested.
- JSON request: `model`, `prompt`, `n: 1`, `size`, `response_format: b64_json`, `output_format: png`, and documented `tool_enablement` disabling reference search/web search/shell for this fictional brand. No streaming, provider substitution or automatic retry.
- Meta supports PNG, JPEG and WebP; default is WebP. `size` is a WxH aspect-ratio request, NOT an exact pixel-size guarantee; aspect ratios beyond 16:1 are rejected. The app requests 1:1, 9:16, 4:5 and 16:9 for its existing formats and measures actual PNG dimensions.
- Documented response: `created`, `data[].b64_json` (or temporary signed `url` if requested), `output_format`, `background`, `usage`. The adapter validates the one-image response, base64, PNG signature/header/end marker, and dimensions before returning original bytes.
- Added `generateCreative`, a public same-origin CSRF-protected POST server function with bounded brand/brief validation, no private-record reads. Server-only `generateCreativeWithMeta` constructs the prompt from current brand/profile guidelines, approved colors, exclusions and all campaign brief fields. Saved validated analysis is reused only when its profile-content fingerprint matches.
- Generate Creative now displays real returned PNGs separately from demo mockups, plus unverified logo/text status, original image download and metadata download. Original images, full prompt, profile/brief snapshots, analysis, model, timestamps, dimensions and usage are retained in session history. Navigation retains originals; reload does not. Durable storage was not added.
- Added loading, 3-minute timeout, access/rate/API/network failures and invalid-response handling. Failures never replace an existing original with a demo or fabricated success. The timeout does not establish that Meta cancelled billing; the error warns before a new request.

### Actual Milestone 2 verification
- A real Halden Outdoor brand analysis completed after these changes, with 17 validated rules carried into generation. An earlier analysis check failed to reach success within the browser wait; the separate later request completed. Existing analysis contract and limits were not changed.
- A genuine Muse Image request completed through the studio. Original ID: `7a450737-3718-4627-bfa0-bb698d3e65b9`. Returned PNG decoded in the browser at **1600 × 1600**, despite requested size 1024x1024 (documented aspect-ratio semantics).
- Visually inspected original: single hiker on a misty autumn forest trail wearing a rust jacket, with “Weather-ready. City-ready.” headline, matching the brief's core scene/message. The model also added unsupplied product copy (“Lightweight…Packable”) and a blank logo area. These are **not** certified compliant; independent verification/post-processing remains required, and the original is preserved without corrections.
- The studio showed the original image and downloads, removed the demo preview notice, retained the exact image bytes after navigation, and had no mobile horizontal overflow. Browser checks found zero page errors, zero Meta credential matches in outgoing requests/response bodies, and zero direct browser requests to Meta.
- Automated tests: **4 files / 30 tests passed** (`creative-generation`, `brand-analysis`, `agent-boundary`, `app-routing`). Tests cover request shape, actual profile/brief prompt values, grounding, format ratios, snapshot retention, unverified logo/text status, invalid responses, missing keys, HTTP failures and timeout. Mocked tests are separate from the successful live request above.
- Automatic build: build OK. The existing design and all page sharing metadata are preserved.
- No blocker remains for initial live generation. Deferred: independent image verification, deterministic logo/text insertion, correction orchestration and durable saved assets. Image-generation skill prompt guidance informed the prompt; the explicitly requested Meta API was used instead of Lovable's default image provider.

## Live brand analysis milestone — November 1, 2026
- Created `analyzeBrand`, a POST server function in `src/lib/agent/agent.functions.ts`, backed by `analyzeBrandWithMeta` in the server-only provider adapter.
- `META_MODEL_API_KEY` was saved using the secure secret form. Lovable Cloud is connected; this milestone does not add durable profile storage or user logins.
- Official contract confirmed at https://dev.meta.ai/docs/protocols/responses and https://dev.meta.ai/docs/quickstart: POST https://api.meta.ai/v1/responses, Bearer authentication, model `muse-spark-1.3`, `instructions` plus string `input`, nested `output[].content[]` / `output_text` parsing.
- Non-streaming follows Meta's documented examples by omitting `stream`; explicit `false` was not needed. Temperature is 0.2 and maximum output tokens 8192. No assistant history is sent.
- Validates required profile fields, input bounds and HEX colors. Strict Zod output checks reject extra fields, duplicate rule IDs, invented colors/personality/prohibited elements and sources not quoted from supplied input.
- Handles rate limits, access failures, other HTTP errors, incomplete envelopes, invalid model JSON, unreadable responses, and a 45-second timeout. Provider bodies and keys are never logged or returned. No fabricated fallback or automatic retry is used.
- Added Analyze Brand with AI, loading/success/error states, actual AI JSON and source-linked rules in the existing profile panel. User-entered/sample data stays separate; edits invalidate stale analysis. Existing manual saving and other pages are preserved.

### Actual verification
- First live Halden Outdoor request completed through the browser UI: genuine validated response with 14 rules and colors #1F3B2D, #E8DCC4, #D9622B. UI displayed results without page errors. Editing cleared stale results; manual Save Brand Profile worked.
- Second live request completed during secrecy verification: 139 browser responses checked, no configured Meta key found in their bodies or outgoing request URL/body; no browser request went directly to Meta. Credential headers are created only server-side.
- `bunx vitest run src/test/brand-analysis.test.ts src/test/agent-boundary.test.ts src/test/app-routing.test.tsx`: 3 files / 15 tests passed. Mocked tests are contract/error tests, not evidence of live calls; live evidence is the separate UI runs above.
- Latest automatic build: build OK. All six content routes retain their individual sharing metadata.
- No blockers remain for initial live text-only brand analysis. Logo image analysis, generation, independent visual verification, durable storage, auth, and revision orchestration are not implemented by this milestone. Existing creative/report results remain labeled demo. The analysis function is public and CSRF-protected; it does not read saved private records.

## Historical boundary review (superseded for brand analysis)
The sections below record the earlier stopped integration review, before the user supplied Playground settings and the official Responses contract became accessible. Its missing-key/documentation statements no longer describe the current brand-analysis integration.

## API verification
Meta confirms a Muse Spark developer access path and later public-preview Meta Model API announcements. The official material accessible during this review did not establish an exact request endpoint, authentication header, API model identifier, or structured JSON contract. This is a documentation verification limitation, not a claim that the API does not exist.

Official references reviewed:
- https://ai.meta.com/blog/introducing-muse-spark-msl/
- https://www.threads.com/@aiatmeta/post/Dakz6zQEYmg
- https://developers.meta.com/resources/videos/build-and-deploy-with-muse-spark/
- https://developers.meta.com/blog/meta-connect-recap/

Confirmed endpoint: **not verified**. Confirmed API model identifier: **not verified**. Authentication: **not verified**.

## Credentials
`META_MUSE_SPARK_API_KEY` is the existing application's intended secret name, not a verified Meta credential specification. It is not configured. No usable Meta connection was available in the workspace. The managed Lovable key is not a substitute for Muse Spark credentials. Do not paste keys into chat.

## Working features
- Brand and brief validation and in-memory editing.
- Page navigation and session-only approval controls.
- Honest not-configured provider errors.
- Three new boundary tests; all four tests including existing routing pass.

## Not implemented or verified
- Live Muse Spark API calls, grounded brand analysis, JSON response parsing, timeout/retry behavior and model-error handling.
- Explicit persisted orchestration states and model-response audit history.
- Real creative generation and independent visual verification; all displayed creative/report results remain labeled demo content.
- Durable storage of profiles, briefs, runs, reports or approvals; Lovable Cloud remains unconnected because integration stopped before backend implementation.
- Three revision attempts after initial generation: the existing loop permits three total generation attempts (only two revisions). This remains a known discrepancy, not a completed feature.
- Actionable-only revision decisions and enriched verifier evidence/confidence/correction contract.

## Test results
Command: `bunx vitest run src/test/agent-boundary.test.ts src/test/app-routing.test.tsx`

Result: **2 files passed, 4 tests passed**.
- Missing Muse Spark credentials: passing boundary test.
- Invalid brand profile color: passing validation test.
- Unconnected image generator and verifier: passing honest-error test.
- Existing root routing: passing.

Failed model response, invalid JSON response, live verification failure, maximum revision attempts and durable approval persistence tests are deferred with their implementations. These tests do not represent live API verification.

## Files
Created: `src/test/agent-boundary.test.ts`, `roadmap.md`, `PHASE2-STATUS.md`.

Modified: `src/routes/index.tsx`, `brand.tsx`, `studio.tsx`, `verification.tsx`, `correction.tsx`, `report.tsx` (social metadata only; no visible interface changes).

Project memory records the no-redesign and evidence-based integration requirements. Provider adapters and business workflow were left unchanged.

## Exact next action
Open Meta's developer account at https://dev.meta.ai/ and provide its official Muse Spark API documentation link or an exported non-secret documentation/quickstart showing endpoint, authentication, model ID, request/response structure and JSON capabilities. Confirm that your account has access. Once verified, the key can be collected in a secure secret form and Lovable Cloud enabled for durable storage. No credential should be included in the documentation upload.