<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Agent schemas (zod) live in `src/lib/agent/schemas.ts`; UI and server share them so payloads stay structured JSON.
- AI providers (reasoning, image, verifier) are adapters in `src/lib/agent/providers.server.ts`, loaded only inside server functions; credentials never reach the browser.
- Unconfigured providers must return an explicit error, never fabricated results; demo data lives only in `demo-data.ts` and is always labeled in the UI.
- The verifier must be a separate provider from the generator, and the correction loop is bounded by `MAX_CORRECTION_ITERATIONS`.
- Brand analysis uses the documented Meta Responses input/output contract through the provider adapter; shared parsing rejects ungrounded values so the UI receives only validated analysis, never raw provider payloads.
- The first brand-analysis action is a public same-origin server function protected by CSRF, not a user-data read; it receives only the submitted profile and does not persist it. Add endpoint authentication before introducing private saved data.
- Creative generation uses a separate public CSRF-protected POST function and the documented Meta Images contract; it must not invoke the unconfigured correction/verifier loop because generation alone does not establish compliance.
- Original PNGs and immutable profile/brief/prompt metadata are retained in workspace session history with downloads; no persisted private-data reads are introduced. Analysis may be reused only when its content fingerprint matches the submitted profile, avoiding stale guidelines.
- Independent verification uses its own Muse Spark image-understanding invocation with the exact original PNG and saved profile/brief/rules, never the generator prompt; strict rule coverage, byte-derived PNG checks and conservative review guardrails prevent missing evidence from becoming PASS.
- Live verification records are attached to original asset IDs and image hashes in session history; human checks remain separate and verification never runs automatic correction or grants approval.
- Correction orchestration reuses the generation/verification provider helpers, not server-function RPC stubs; it freshly verifies submitted originals and checks image hashes before planning to prevent stale or forged findings from triggering revisions.
- Correction plans use a separate Muse Spark image invocation with complete actionable/PASS rule coverage; text-only Muse Image regeneration retains the original brief and profile, and conservative rule-level comparisons stop regressions or uncertainty from counting as improvement.
- Correction reports retain immutable assets and every attempt in session history; approvals are keyed by run and remain separate from model verdicts, and downloadable reports omit generator prompts.
- Public server functions enforce bounded request-size checks (HTTP Content-Length middleware plus pre-Zod measurement, separate text/image limits in `request-limits.ts`) so oversized payloads never reach schema parsing; vulnerable transitive packages are pinned via package.json overrides, never by globally overriding the app's direct zod.
- Controlled-test originals are user-supplied PNGs built by `controlled-original.ts` with distinct model/endpoint/sourceLabel provenance enforced by `GeneratedCreativeSchema`; they reuse verification and correction unchanged, and revisions must be Muse Image outputs, so a user image is never presented as Muse-generated.
- Correction round limits are derived server-side from original provenance in `correctionRoundLimit` (controlled tests 1, otherwise `MAX_CORRECTION_ITERATIONS`) and recorded as `maxAttempts`, so the browser cannot raise them.
