# Batus Handoff

Paste this file into a new chat to continue. Deadline: **31 Oct 2026, 4:45am (Lagos time)**.

## What it is
A comfort companion for people who overthink, worry, or are heartbroken. One tap, optional check-in text, then it surfaces the person's own kind of music (praise/worship for worry; sad or uplifting songs in any genre for heartbreak), plus a podcast and a show, from Qloo's taste graph, with play links. Next.js (App Router), deployable on Vercel.

Thesis: Batus never invents music. Picks are chosen by Qloo ID and anything not returned by Qloo (or the person's own list) is dropped. Enforced in `lib/recommend.js` (`assertGrounded`) and `lib/agent.js` (`finalize`).

## Status (15 Oct 2026)
- Done: two themes (Worry & overthinking, Heartbreak) with Calm/Lift and Let it out/Move on modes, per-theme saved sound and page repaint, live Qloo artist typeahead, Claude agent with Qloo tools (optional, per-visitor and global caps), mood tags, location signal, podcast + TV extras, taste signature chips, "Start here" hero pick, crisis gate (extended for heartbreak phrasing), breathing exercise, "Write it, do not send it" box (local only), skeleton loader, PWA manifest + icons, **61 passing tests**, CI workflow, README, DEVPOST.md answer sheet, docs/DESIGN.md, docs/DEMO.md (90s script), AUDIT.md (7 findings fixed and pinned), MIT license, `npm run coverage` script.
- Round 3 (15 Oct, after user feedback "Qloo shows not available / toy / poor heartbreak songs"): rebuilt `lib/qloo.js` on how working Qloo clients behave (5 req/s gate, retry 429/5xx, 15s timeout, cache, real status in errors, music-tag-only mood tags, mood-only mode with no artists); removed ALL hard-coded artists/starters (international, API-driven); real songs + 30s previews per Qloo artist via iTunes Search (`lib/songs.js`); per-mood playlists (add/remove/copy/download) in the browser; `/api/diagnose` shows each call's real status.
- Round 4: songs are no longer dumped per artist. `lib/songpick.js` builds a candidate pool of real tracks by Qloo's artists and selects an ordered "set" for the person's situation: Claude chooses by id with a reason per song (invented ids dropped; check-in text only sent if AI toggle on), or a mood-word title match without a key. UI: "A set chosen for what you are going through" with Add whole set to playlist.
- Round 5 (UX review fixes): spinner + step text + 40s timeout + Try again; notice when an artist is unknown to Qloo (`unmatched`); new check-in clears text; no-AI reasons come from Qloo mood tag + taste match (title-word reasons removed, weak lexicon words dropped); Apple Music link opens the exact track (YouTube/Spotify are labelled "Find on" searches); "Show N more songs"; dev-speak removed from copy; heartbreak second mode renamed "Lift me up" (consistent with Worry); stronger selected states + aria-pressed; empty gap above playlists fixed; mood tags resolved in parallel (faster). 57 tests.
- Round 6 (safety): crisis gate widened ("I wish for death", "wanna dieee", "k1ll myself", "kms", "tired of living", "I hope I die", etc.; normalises curly quotes, stretched letters, number swaps); also scans the songs/artists fields; model backstop: Claude's `concern` flag (song picker + agent) turns the response into the crisis screen. False-positive guard tests ("I'd die for this song"). 61 tests.
- Repo: https://github.com/Agozie180/Batus (public).
- **Not deployed yet. The real Qloo and Claude APIs have never been called from this build** (only local stand-ins). Biggest risk left.
- LICENSE says "Copyright (c) 2026 Chiagozie"; change it if you want a different name.

## Run
```bash
npm install
cp .env.example .env.local     # QLOO_API_KEY (required for live), ANTHROPIC_API_KEY (optional agent)
npm run dev                    # http://localhost:3000
npm test                       # 61 tests, no network needed
```

## Layout
- `app/Batus.jsx` main client component; `app/config.js` UI copy per theme; `app/components/` (ArtistSearch, Result, Breathe, ParkIt, Avatar)
- `app/api/praise|search|health/route.js` API routes (body cap, rate limit, agent caps)
- `lib/crisis.js` safety gate (runs first; no Qloo or Claude call after it fires)
- `lib/qloo.js` Qloo client (`/search`, `/v2/tags`, `/v2/insights`, header `X-Api-Key`)
- `lib/recommend.js` deterministic pipeline + grounding + extras + taste signature
- `lib/agent.js` Claude tool-use loop (find_artist, taste_matches, finish)
- `lib/praise.js` orchestrator (gate → agent → fallback)
- `lib/songs.js` iTunes songs + previews; `lib/diagnose.js` + `app/api/diagnose`; `app/components/Playlists.jsx`, `SongRow.jsx`, `app/usePlayer.js`
- `lib/themes.js` theme/mode model and Qloo tag keywords; `lib/companion.js` template wording; `lib/links.js` play links; `lib/sample.js` labelled sample data
- `scripts/coverage.mjs` checks Qloo coverage of gospel artists, writes `COVERAGE.md`
- `DEVPOST.md` paste-ready submission answers; `docs/DEMO.md` video script

## Next steps, in order
0. FIRST: deploy/run with the key and open `/api/diagnose`. If a step fails it prints the real status (401/403 = bad key or not redeployed after setting env; 429 = rate limit). Send me that output.
1. Run `npm run dev`, tap Find my music, open "How this was chosen". Fix any field-name mismatches in `lib/qloo.js` (`readList` / `toEntity`).
2. Check which heartbreak tags Qloo resolves (`sad`, `heartbreak`, `ballad`, `empowering`, `calm`, `upbeat`; see the trace and /api/diagnose) and adjust `MODE_INFO` in `lib/themes.js` if they miss.
3. Run `npm run coverage`, commit `COVERAGE.md`, quote the real number in README.
4. Add `ANTHROPIC_API_KEY`, confirm the "Claude agent" badge appears and the model name in `.env.example` is valid for your account.
5. Deploy on Vercel (import repo, add env vars), check `/api/health`, put the live URL in README, DEVPOST.md and the Devpost form.
6. Confirm the MIT license shows in the repo About and the repo is public; set About description and topics.
7. Record the demo video from `docs/DEMO.md`; paste answers from `DEVPOST.md`. Submit with time to spare.

## Rules for this repo
- Commits and pushes authored by Agozie180 only (email `137266828+Agozie180@users.noreply.github.com`). No Co-Authored-By or Claude trailers.
- Never commit `.env*` or any API key.
- Keep personal details out of the public repo unless you choose to add them.
