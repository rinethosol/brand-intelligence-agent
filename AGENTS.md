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
