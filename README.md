# Brand Intelligence Agent

**From brand identity to evidence-backed creative, with bounded autonomous correction and human approval.**

A Startup Track project prepared for the Meta Global AI Developer Hackathon 2026. The application uses real Meta Model API calls to analyze brand guidelines, generate campaign images, independently inspect the actual images, and regenerate only when supported violations justify it.

## The problem

Generating a polished marketing image does not establish brand compliance. Colors, prohibited objects, tone and campaign requirements can drift. A generator's explanation is not evidence that its output satisfies the rules, and uncertain checks must not become automatic approval.

## Our solution

Brand Intelligence Agent separates creation from verification. It turns supplied brand information into structured rules, creates an original PNG, inspects that exact image in a separate model invocation, and retains evidence for every decision. An autonomous loop targets actionable violations while preserving compliant attributes, stops conservatively, and leaves human-review requirements visible.

## Why this is an autonomous AI agent

After the user starts **Run Self-Correction**, the server chooses whether revision is justified, asks a reasoning model for a targeted plan, regenerates, independently verifies the new image and compares outcomes—without a user writing each revision prompt. There are at most **three correction attempts after the original**. It stops on no actionable violations, no meaningful improvement, the attempt limit or API failure. It never forces PASS or grants human approval.

## System architecture

```text
React workspace / six TanStack routes
              |
     validated server-function POSTs
              |
  Shared Zod schemas + provider adapters
       |                       |
 Muse Spark 1.3            Muse Image 1.0
 analysis / planner       original + regeneration
       |
 independent actual-image inspection + PNG checks
       |
 evidence / comparison / report / human decision
```

React 19, TypeScript, TanStack Start/Router/Query, Vite, Tailwind CSS and shadcn/Radix controls provide the application shell. Lovable Cloud supplies environment configuration; creative assets and findings currently remain only in workspace memory. See [ARCHITECTURE.md](ARCHITECTURE.md) for boundaries and state transitions.

## Meta models and API contracts

| Role | Model | Endpoint |
| --- | --- | --- |
| Brand analysis, visual verification, revision planning | `muse-spark-1.3` | `POST https://api.meta.ai/v1/responses` |
| Original images and targeted regeneration | `muse-image-1.0` | `POST https://api.meta.ai/v1/images/generations` |

Bearer authentication uses server-only `META_MODEL_API_KEY`. Verification and planning attach the actual PNG as `input_image` alongside structured `input_text`. The image generator is different from the verifier; both are Meta services, not independent vendors. Regeneration is **text-only**, not direct image-to-image editing.

Official references: [Responses](https://dev.meta.ai/docs/protocols/responses), [image generation](https://dev.meta.ai/docs/image-generation), [image understanding](https://dev.meta.ai/docs/image-understanding), [structured output](https://dev.meta.ai/docs/structured-output). Confirm ongoing account/model access in Meta Playground; access and pricing can change.

## Workflows

### Brand analysis
1. Enter a brand profile and select **Analyze Brand with AI**.
2. Muse Spark returns structured identity and rule JSON.
3. Validation rejects invented profile values, ungrounded source quotes and malformed output.
4. Save the profile, then continue to Creative Studio. Edited profiles invalidate stale analysis; generation reuses analysis only when the profile fingerprint matches.

### Creative generation
1. Submit objective, exact campaign message, audience, format and visual direction.
2. Muse Image receives the saved brand/brief and matching validated analysis, when available.
3. The returned original PNG, measured dimensions, model, timestamps and immutable source record are retained with downloads.
4. Generation alone does not establish compliance. A local logo is not attached to this text-only image request; exact lettering, logos and product facts remain unverified.

### Independent verification methodology
1. Select a generated original with saved validated rules and choose **Verify Creative**.
2. A separate Muse Spark invocation inspects the exact original PNG—not the generator prompt.
3. Every supplied rule must appear once with status, concrete evidence, explanation, method and next action.
4. PNG signature/header/end checks and aspect-ratio arithmetic supplement visual findings. They are not full CRC/decompression certification.
5. `REVISE` takes precedence; otherwise any uncertain/review-only finding yields `NEEDS_REVIEW`. Only complete evidence-backed passing coverage can yield `PASS`.

### Autonomous self-correction
The loop freshly verifies the original and checks the asset ID and SHA-256. Only evidenced, supported `REVISE` findings with concrete instructions are eligible. `NEEDS_REVIEW` alone and image/record inconsistencies do not trigger regeneration. Muse Spark plans only eligible changes and describes each passing attribute to preserve. Muse Image then regenerates using the original brand, brief, rules and plan. Each actual new PNG is independently reverified.

A corrected rule must become `PASS`; downgrading a violation to uncertainty is not improvement. New violations or lost passing rules prevent an improvement claim. Original and revised assets are never overwritten. The report includes attempts, rules, evidence, provenance and a separate human approval decision; its JSON excludes generator prompts.

## Evidence and human-review safeguards

- Missing or uncertain evidence is review, never manufactured PASS.
- Exact HEX compliance, logo reference/placement, exact typography, factual claims and deterministic overlays require further human or specialized checks.
- SHA-256 ties findings to inspected bytes; it does not prove semantic correctness.
- Hand-written examples are labeled demo; fictional sample inputs can still produce genuine live AI results.
- Human approval does not change the AI verification verdict.
- Models can introduce extra copy and vary between inspections; use supporting records before approving claims.

## Installation and environment setup

Prerequisites: Node.js **22.12+** (tested here with 22.23.4), Bun (tested with 1.4.4), network access to the package registry, and Meta model access for live calls. `bun.lock` is the reproducible dependency lockfile; use Bun rather than generating a second lockfile.

```sh
git clone YOUR_REPOSITORY_URL
cd YOUR_REPOSITORY_DIRECTORY
bun install --frozen-lockfile
cp .env.example .env.local
# Replace placeholders locally; never commit private values.
bun run dev
```

Use the local address printed by Vite; the Lovable workspace preview runs on port 8080. In Lovable, configure the Meta credential through the secret form, not a source file. Never prefix a private Meta credential with `VITE_`: that prefix is browser-visible.

The existing global auth-attacher initializes the generated Cloud client for RPC calls, so local development also requires your own public `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` values even though these workflows do not read private saved records. `.env.example` documents optional SSR counterparts and legacy/helper-only variables. No admin/service-role key is needed; it is not available through Lovable Cloud and must not be requested for this demo.

**Repository hygiene caveat:** the audit found `.env` tracked. Its contents were not inspected or certified as credential-free. This prevents claiming all repository history is free of credentials. Review with the Security tab and approve repository hygiene changes before publishing source; `.env.local` is ignored. Example placeholders are intentionally unusable.

### Tests and production build

```sh
bun run test
bun run build
```

The build uses the existing `@lovable.dev/vite-tanstack-config` and Cloudflare-targeted server setup; retain its plugins and server entry. The Lovable editor runs build/type checks automatically. This preparation did **not** manually execute a production build: see [SUBMISSION_READINESS.md](SUBMISSION_READINESS.md) for precise validation status. A frozen-lockfile install succeeded in a clean source copy without `.env` or repository metadata.

## Demo walkthrough

1. Open Brand Intelligence; analyze and save the fictional Halden Outdoor profile with real Muse Spark.
2. Generate a campaign in Creative Studio with Muse Image and download the original/record.
3. Inspect it in Brand Verification. The previously verified Halden original had zero actionable violations and remained NEEDS_REVIEW.
4. Show the previously verified **Controlled test — Bottle exclusion** case: a deliberately noncompliant plastic bottle in a forest, not a Halden output.
5. Show its real loop: two exclusion rule findings were REVISE; one regeneration removed the bottle; independent reverification passed those findings while five review checks remained.
6. Compare original/latest evidence and show the downloadable report and separate human decision.

See [DEMO_SCRIPT.md](DEMO_SCRIPT.md) for a timed recording script and prerequisites. Controlled assets/reports from live validation are not seeded demo rows or bundled replay fixtures; download them from the live session before reloading. Do not imply a replay is a newly completed call.

## Known limitations

- Session-only retention: reload discards workspace state. Download originals, generation records and reports first.
- Long sequential correction requests can exceed hosting request limits; no durable background job or recovery mechanism exists.
- PNG checks are limited; visual judgments are fallible, not certified OCR, palette, logo or factual-claim proof.
- Text-only regeneration may change composition or add unsupplied copy. Model output is not approval.
- Legacy unconfigured agent interfaces remain alongside the live path; they are not used by the working correction screen. No code cleanup or dependency update was performed during this review.
- Stale dashboard/demo wording and source hygiene issues are documented for approval, not silently fixed.
- Repository visibility, publishing and submission completion are unverified.

## Hackathon development disclosure

The stated hackathon development window is **October 26–November 4, 2026**. This project's conversation and milestone evidence document application-specific work completed on **November 1, 2026**: the brand workspace, structured rule validation, live Meta adapters, independent evidence checks, bounded correction, reporting and submission documents. This is not a claim that work occurred on every day of the window or that development after November 1 is complete. Confirm organizer eligibility requirements and retain dated repository history before submission.

Development was AI-assisted using Lovable. Third-party infrastructure and dependencies—including React, TanStack, Vite, TypeScript, Tailwind, Radix/shadcn patterns, Lucide, Zod, Vitest, the Cloud client and Lovable tooling—pre-exist this project and are not original hackathon inventions. Meta models are hosted external services, not models trained by this team. Dependency licenses and notices must be respected; no dependency/license compliance audit is claimed. No performance, customer, revenue or accuracy metrics are invented.

## Documentation

- [Architecture](ARCHITECTURE.md)
- [Three-minute demo script](DEMO_SCRIPT.md)
- [Submission readiness and blockers](SUBMISSION_READINESS.md)
- [Milestone validation record](PHASE2-STATUS.md)
