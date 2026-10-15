# Handoff: Batus (Qloo Agentic Hackathon)

Paste this file into a new chat to continue. Deadline: **31 Oct 2026, 4:45am (Lagos time)**.

## What it is
A comfort companion for people who overthink and worry. One tap, optional check-in text, then it surfaces the person's kind of praise/worship music, plus a podcast and a show, from Qloo's taste graph, with play links. Next.js (App Router) app, deployable on Vercel.

Thesis: Batus never invents music. Picks are chosen by Qloo ID and anything not returned by Qloo (or the person's own list) is dropped. Enforced in `lib/recommend.js` (`assertGrounded`) and `lib/agent.js` (`finalize`).

## Status (15 Oct 2026)
- Done: Next.js app, live Qloo artist typeahead, Claude agent with Qloo tools (optional), mood tags (worship/praise), location signal, podcast + TV extras, crisis gate, breathing exercise, saved taste profile, PWA manifest and icons, 26 passing tests, README, MIT license, `npm run coverage` script.
- Repo: https://github.com/Agozie180/Batus (public).
- **Not deployed yet. The real Qloo and Claude APIs have never been called from this build** (only local stand-ins). That is the biggest risk left.

## Run
```bash
npm install
cp .env.example .env.local     # QLOO_API_KEY (required for live), ANTHROPIC_API_KEY (optional agent)
npm run dev                    # http://localhost:3000
npm test                       # 26 tests, no network needed
```

## Layout
- `app/Batus.jsx` UI (client component): typeahead, modes, results, breathing, hearts
- `app/api/praise|search|health/route.js` API routes
- `lib/crisis.js` safety gate (runs first; no Qloo or Claude call after it fires)
- `lib/qloo.js` Qloo client (`/search`, `/v2/tags`, `/v2/insights`, header `X-Api-Key`)
- `lib/recommend.js` deterministic pipeline + grounding + extras
- `lib/agent.js` Claude tool-use loop (find_artist, taste_matches, finish)
- `lib/praise.js` orchestrator (gate → agent → fallback)
- `lib/companion.js` template wording, `lib/links.js` play links, `lib/sample.js` labelled sample data
- `scripts/coverage.mjs` checks Qloo's coverage of gospel artists, writes `COVERAGE.md`

## Next steps, in order
1. Get a Qloo API key (link in `.env.example`). Run `npm run dev`, tap the big button, open "How this was chosen". Fix any field-name mismatches in `lib/qloo.js` (`readList` / `toEntity`). Check that `signal.location.query` and tag filters are accepted (the code falls back if not).
2. Run `npm run coverage`, commit `COVERAGE.md`, and quote the real number in the README.
3. Add `ANTHROPIC_API_KEY`, confirm the agent works (badge "Claude agent" appears) and the model name in `.env.example` is valid for your account.
4. Deploy on Vercel (import repo, add env vars), check `/api/health`, put the live URL in the README links line and on Devpost.
5. Confirm the MIT license shows in the repo's About section and the repo is public.
6. Write the Devpost description from the README (problem, who it is for, what is Qloo-powered, limits). Submit with time to spare.

## Rules for this repo
- Commits and pushes authored by Agozie180 only (email `137266828+Agozie180@users.noreply.github.com`). No Co-Authored-By or Claude trailers.
- Never commit `.env*` or any API key.
- Keep personal details out of the public repo and README unless you choose to add them.
