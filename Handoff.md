# Handoff: Batus (Qloo Agentic Hackathon)

Paste this file into a new chat to continue. Deadline: **31 Oct 2026, 4:45am (Lagos time)**.

## What it is
A comfort companion for people who overthink and worry. One tap, optional check-in text, then it surfaces the person's kind of praise/worship music (via Qloo's taste graph) with play links. Thesis: music is only ever the person's own artists or Qloo's results; enforced in `lib/recommend.js` (`assertGrounded`).

## Status (14 Oct 2026)
- Done: server, UI, Qloo client, crisis gate, sample mode, 13 passing tests, README, MIT license, Dockerfile, render.yaml.
- Local only. Not yet deployed. Not yet pushed to GitHub.
- The live Qloo path is verified against mocked responses only. **Never run with a real key yet.**

## Run
```bash
npm test
QLOO_API_KEY=... npm start   # http://localhost:3000, sample mode if no key
```

## Layout
- `server.js` HTTP server, `/api/praise`, `/api/health`, static files
- `lib/crisis.js` safety gate (runs first; no recommendation code after it fires)
- `lib/qloo.js` Qloo client (`/search`, `/v2/tags`, `/v2/insights`, header `X-Api-Key`)
- `lib/recommend.js` pipeline + grounding rule
- `lib/companion.js` template wording (cannot name music)
- `lib/links.js` YouTube/Spotify/Audiomack search deep-links
- `lib/sample.js` labelled offline demo data
- `public/` UI (vanilla JS)

## Next steps, in order
1. Get a Qloo API key (link in `.env.example`) and run once for real. Open "How this was chosen" in the UI and fix any field-name mismatches in `lib/qloo.js` (`readList` / `toEntity`).
2. Test whether Qloo knows the Nigerian gospel artists you care about. If coverage is thin, note it honestly in the README.
3. Create the GitHub repo (public), push, and confirm the MIT license shows in the repo's About section (hackathon requirement).
4. Deploy (Render blueprint is ready), set `QLOO_API_KEY`, put the live URL in the README links line and the Devpost form.
5. Improve Qloo use for judges: feed the mood into the query (e.g. tag filters for worship vs praise), add a Nigeria location signal if the API supports it.
6. Fill in the Devpost write-up (README is laid out as the answer sheet), and submit with time to spare.

## Rules for this repo
- Commits and pushes authored by Agozie180 only. No Co-Authored-By or Claude trailers.
- Never commit `.env` or any API key.
- Keep personal details out of the public repo and README unless you choose to add them.
