# Demo script — maximum 3 minutes

**Target runtime: 2 minutes 50 seconds. English narration.** Use genuine screen recordings and previously verified images/findings. Trim waiting time with an explicit “API wait shortened” caption; never simulate a successful call or relabel stored evidence as a new request.

## Recording prerequisites

- A working Meta key with Muse Spark 1.3 and Muse Image 1.0 access.
- Analyze, save, generate and inspect Halden in one session; download image, record and findings before reload.
- Capture the actual controlled case's correction session and downloadable report before reload. It is **not bundled into the repository** and the app has no import/replay button. Previously verified files were retained temporarily during development, not shipped as permanent replay fixtures. If those recordings/files are unavailable, reproduce a clearly labeled controlled test through a maintainer's isolated fixture procedure before filming; do not pretend an absent session can be restored through the UI.
- **Controlled test procedure (in the app):** analyze a fictional strict profile that forbids plastic bottles in forest imagery → in Studio, fill in the brief and use **Upload controlled test PNG** (labeled "User-supplied controlled test image", never Muse-generated) → verify it on Verification → run Self-Correction only if evidence-backed REVISE findings appear (the server allows one round for controlled tests; the timeline shows "Configured round limit: 1") → download PNGs and the JSON report before reloading. Show the upload label on screen.
- Capture original/revised PNGs, actual rule evidence, activity timeline and final NEEDS_REVIEW result. Do not expose generation prompts or private profile details; keep keys, secret forms and environment files off camera.
- Edit separate real sessions together only with explicit captions identifying recorded results. Do not use the hand-written demo verification tab as proof of live analysis.

## Timed narration and screen actions

### 0:00–0:18 — Introduction
**Screen:** Brand Intelligence screen and fictional Halden profile.

**Say:** “This is Brand Intelligence Agent. Creating a marketing image is easy; establishing whether it follows a brand is harder. Our agent separates generation from actual-image verification, corrects evidenced violations, and leaves uncertain decisions to people.”

### 0:18–0:40 — Real brand analysis
**Screen:** Click Analyze Brand with AI; cut the wait explicitly; show completed Muse Spark rules and source quotes. Save Brand Profile.

**Say:** “Muse Spark 1.3 turns the submitted identity, colors and exclusions into structured rules. Every rule must cite supplied information. The application rejects ungrounded values rather than silently accepting invented brand facts.”

### 0:40–1:02 — Real creative generation
**Screen:** Creative Studio brief → Generate Creative → returned PNG and original download. Caption the recorded original if showing earlier evidence.

**Say:** “Muse Image 1.0 generates a real PNG from the brand and campaign brief. We preserve the original image and its source record. Generation is not approval; the logo and lettering still need checks.”

### 1:02–1:25 — Independent verification
**Screen:** Verify Creative → evidence cards and human requirements for Halden. Use actual run counts only, if displayed.

**Say:** “A separate Muse Spark call inspects the actual PNG, not the generator's prompt. It provides evidence for each rule, with deterministic format and ratio checks. Halden has no actionable violation in this recorded run, so the agent makes no correction. Its status remains NEEDS_REVIEW.”

### 1:25–1:43 — Controlled violation
**Screen:** Caption “Controlled test — deliberately noncompliant fixture; not Halden.” Show the plastic bottle original and actual REVISE findings `vr-02`, `vr-03`.

**Say:** “To demonstrate correction honestly, we used a separate controlled fixture. Plastic bottles are forbidden, and the verifier sees a large clear bottle with a blue cap. Two rule findings identify the same visible object and supply concrete removal instructions.”

### 1:43–2:13 — Autonomous correction and reverification
**Screen:** Run Self-Correction → explicit wait cut → activity timeline → original/latest comparison.

**Say:** “One click starts a bounded loop. Muse Spark plans targeted changes while preserving passing attributes. Muse Image regenerates—not directly edits—the scene. The new actual PNG is independently inspected again. This recorded run used one correction attempt; the hard limit is three after the original.”

### 2:13–2:35 — Before-and-after evidence
**Screen:** Bottle original vs empty mossy stump/forest; corrected IDs and final findings. Caption “Recorded verified run: one regeneration.”

**Say:** “The bottle is absent in the revised image. Both exclusion findings become PASS, while the realistic scene and file checks remain passing. Overall status is still NEEDS_REVIEW: exact palette, logo, typography, claims and overlays remain human-review requirements.”

### 2:35–2:50 — Safeguards and conclusion
**Screen:** Verification Report, download report, human decision with NEEDS_REVIEW visible.

**Say:** “The report retains originals, attempts, rule evidence and image hashes. Human approval is separate and never rewrites the AI verdict. The agent stops on uncertainty without actionable violations, no improvement, failure or its attempt limit. Our goal is traceable creative decisions, not manufactured compliance.”

## Verified evidence reference

- Halden recorded original: `7a450737-3718-4627-bfa0-bb698d3e65b9`; latest readiness-session inspection from Milestone 4: 7 PASS, 0 REVISE, 18 NEEDS_REVIEW, zero corrections. Earlier inspections have different passing/review counts; use the counts on the recording, not a blended summary.
- Controlled original: `3388ddcb-c121-43a2-957d-2951f2420f9b`; original verification 4 PASS, 2 REVISE, 5 NEEDS_REVIEW.
- Recorded revised image: `5f6e8665-0503-4af1-b0b1-bc31bac9a608`; final verification 6 PASS, 0 REVISE, 5 NEEDS_REVIEW after one attempt. Both bottle-exclusion rules passed. Two separate one-attempt controlled runs were performed during validation; do not imply this is two attempts in one loop.
- Original SHA-256: `42e95d38412d7f0ea688bc5b1d9326d05458dde8f9cb7eb3b8554c7762c00cea`.
- Revised SHA-256: `4e1055482445b209a3df087b8806894f85b8c91de81093ea83141ca4ded38be4`.

No final PASS, benchmark, customer traction or submission-completion claim is supported. A script is prepared; a finished video has not been produced or uploaded.