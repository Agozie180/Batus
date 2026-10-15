# Batus: when your mind won't stop or your heart is hurting, your own music answers first

[![CI](https://github.com/Agozie180/Batus/actions/workflows/ci.yml/badge.svg)](https://github.com/Agozie180/Batus/actions/workflows/ci.yml) ![tests](https://img.shields.io/badge/tests-70%20passing-brightgreen) ![license](https://img.shields.io/badge/license-MIT-blue) ![Qloo](https://img.shields.io/badge/powered%20by-Qloo-f2b04c)

| | |
|---|---|
| **Live demo** | _add your Vercel URL after deploy_ |
| **Repo** | [github.com/Agozie180/Batus](https://github.com/Agozie180/Batus) (MIT) |
| **Event** | [Qloo Agentic Hackathon](https://qloo.devpost.com/), deadline 31 Oct 2026 |
| **Devpost answers** | [DEVPOST.md](./DEVPOST.md) |
| **Design spec** | [docs/DESIGN.md](./docs/DESIGN.md) |
| **90-second demo script** | [docs/DEMO.md](./docs/DEMO.md) |
| **Self-audit** | [AUDIT.md](./AUDIT.md) |

> **Batus never invents music. It picks from the Qloo taste graph by ID, and the code throws away anything that did not come back from Qloo or from the person's own list.**

Overthinking and worry don't arrive on a schedule. After a result you hoped for doesn't come, or when money and food feel uncertain, generic advice ("go for a walk", "try calming music") rarely sticks. What does help many people is *their own* music. Batus takes one tap, asks what you are going through, and puts your kind of music in front of you with a link to play it right now. Two situations are supported today:

| Going through | Modes | What Batus asks Qloo for |
|---|---|---|
| **Worry & overthinking** | *Calm me* · *Lift me up* | Artists matching your taste, nudged by music mood tags Qloo resolves at run time (calm, ambient, acoustic / upbeat, dance, feel good) |
| **Heartbreak** (a breakup, from either side) | *Let it out* (sad songs to feel) · *Lift me up* (empowering, uplifting) | The same, with sad / heartbreak / ballad / soul or empowering / uplifting tags |

**No artist is hard-coded.** Every artist comes from the person (typeahead backed by Qloo search) or from Qloo's taste graph, in any genre, language or country. With no seed artists at all, Batus asks Qloo from the mood alone. Batus then builds **a set of real songs for what you are going through**: it pulls tracks by the artists Qloo returned (public iTunes Search API, with 30-second previews) and selects and orders them for your situation. With the Claude key on, Claude reads your check-in and the numbered song list and chooses by id, with a one-line reason per song (an invented id is dropped). Without it, mood words in titles pick them. You can add songs to **your own playlists**, one per mood, saved on your device.

It then goes a step further and suggests something to listen to or watch from the same taste, and shows a **taste signature** (the top tags Qloo attached to your matches) with a match bar for each artist.

**Who it is for:** people in hard seasons, such as worry about money and results or the end of a relationship, whose personal taste (any genre, any country) generic playlists and LLM answers rarely reflect.

## Why Qloo is the difference

| A chatbot alone | Batus |
|---|---|
| Guesses what "calming music" means; defaults to the same global names | Asks Qloo what people with *your* taste love, nudged by mood and place |
| Can invent an artist that does not exist | Cannot: it recommends by Qloo ID and the code drops any ID that Qloo did not return |
| Music only | Music, plus podcasts and TV matched by the same taste signals |
| Forgets you | Heart a match and it joins your taste profile (kept in your browser) for next time |

## How it works

```
 check-in text ──► safety: keywords ► Claude screener ──(crisis?)──► stop. Human help only.
        │ no
        ▼
 your artists ──► Qloo /search (live typeahead picks give Qloo ids up front)
        │
        ├─ Claude agent ON ─► tools: find_artist · taste_matches (artist | podcast | tv_show) · finish
        │                      Claude chooses by ID, writes one warm message
        │                      code keeps only IDs the tools returned
        │
        └─ Claude agent OFF / fails ─► deterministic pipeline:
              /v2/tags (music mood tags) + /v2/insights (+ location)
              degrade: drop location → drop tags
        ▼
 assertGrounded ──► artists + extras shown FIRST ──► (second request, signed) real songs + previews (iTunes Search) ──► your playlists
```

## What's used, and what's deliberately not

| Surface | Used | Notes |
|---|---|---|
| Qloo `GET /search` | Yes | Powers the live artist typeahead and ID resolution |
| Qloo `GET /v2/tags` | Yes | Resolves mood keywords to music tags (first two found per mode) |
| Qloo `GET /v2/insights` | Yes | Artists, podcasts and TV shows; optional `signal.location.query` for local relevance |
| Claude (tool use) | Optional | Runs the agent loop and writes the message. Off if `ANTHROPIC_API_KEY` is unset, and the app still works fully |
| iTunes Search API (public, no key) | Yes | Real tracks (and 30-second previews) of artists Qloo chose; the set is picked from these. Optional: without it, YouTube/Spotify search links |
| Streaming accounts | No | Full songs open on YouTube or Spotify via links |
| Accounts, database, analytics | No | Nothing about you is stored server-side |

## The thesis, enforced (not asserted)

| The system decides | The system is structurally prevented from |
|---|---|
| Which artists, podcasts and shows to show, from Qloo results plus your own list | Showing anything else. `assertGrounded` throws; the agent's chosen IDs are filtered against what its own tool calls returned (tested) |
| What to say, via Claude or fixed templates | Naming music in that message. A message that contains a Qloo result's name is discarded and replaced by template wording (tested) |
| Whether to pause for safety | Running any music logic after crisis language. Three layers: wide keyword patterns (slang, disguised spelling, any input field) stop everything with no outside call; then Claude screens the check-in as crisis / concern / ok before any recommendation work (it can only add safety; if it is down the keyword layer still applies); then the song picker and agent can raise the same screen. Softer distress adds a caring note with help links above the music. All tested, including prompt-injection text |
| What a heartbreak message may say | Urging contact with an ex, blaming anyone, or promising it will be okay (templates tested; the agent prompt forbids it) |
| Which artists count as "yours" | Echoing them back as recommendations |

## Measured

| Claim | Result | Reproduce with |
|---|---|---|
| Behaviour tests (crisis gate, Qloo client, fallbacks, agent loop, grounding) | 70 / 70 passing | `npm test` |
| Production build | Passes, 0 known dependency vulnerabilities | `npm run build && npm audit` |
| End-to-end over real HTTP: UI → API → agent → Qloo/Claude tools → UI | Exercised against a local stand-in for both services | see Limitations |
| Self-audit: findings fixed and pinned by tests | 7 findings, see [AUDIT.md](./AUDIT.md) | `npm test` |
| Live Qloo + songs self-test | Run it on your deployment | open `/api/diagnose` (real status per call, never shows your key) |
| Qloo coverage of artists you care about | **Not measured yet** | `QLOO_API_KEY=… npm run coverage` writes `COVERAGE.md` |

## Try it in 30 seconds

Live: open the demo link above and pick what you are going through, tap **Find my music**, preview songs and add them to a playlist. No setup needed: with no artists, Batus starts from the mood.

Locally:

```bash
git clone https://github.com/Agozie180/Batus && cd Batus
npm install
cp .env.example .env.local     # add QLOO_API_KEY (and optionally ANTHROPIC_API_KEY)
npm run dev                    # http://localhost:3000
npm test
```

Things to try:
0. Switch between **Worry & overthinking** and **Heartbreak**. Each keeps its own saved sound, and the mood tags sent to Qloo change.
1. Type "Sinach" in *Favourite artists*. Suggestions come live from Qloo, with a photo when Qloo has one.
2. Choose **Calm me**, then **Lift me up** with the same artists and open *How this was chosen* to see the mood tag change.
3. Set **Near** to a city and compare the matches.
4. Tap ♡ on a match, reload the page, and it is in your sound.
5. Press **Find my music** and meet the **Write it, do not send it** box. It is never sent or saved.
6. Type `I want to end my life` and start. Batus stops the music and shows human help.

Without `QLOO_API_KEY` the app runs in **sample mode**: a small fixed list, labelled "Sample data (no Qloo key set)" in the UI, never passed off as live Qloo output.

## Deploy to Vercel

1. Import this repo at [vercel.com/new](https://vercel.com/new). The Next.js preset needs no changes.
2. Add environment variables: `QLOO_API_KEY` (required for live data) and `ANTHROPIC_API_KEY` (optional, turns on the agent).
3. Deploy. Check `/api/health`: it reports `{"qloo":true,"agent":true}` when both keys are active.

## Limitations, stated plainly

- **The live Qloo and Claude calls have been exercised only against local stand-ins that mimic their documented responses, not against the real services from this build.** Response parsing is defensive and every Qloo step has a fallback, but expect small tuning on the first real run. Check *How this was chosen* in the UI for what actually happened.
- Qloo's coverage of any particular artist is unmeasured until `npm run coverage` is run with a key. If Qloo does not know an artist, Batus says so and falls back to the mood alone.
- Songs come from Apple's public iTunes Search API. Which of them fit your situation is decided by Claude (when on) from titles and what it knows of the songs, or by mood words in titles when off. Neither hears the audio or reads lyrics, so a pick can miss. Previews are 30 seconds; full songs open on YouTube or Spotify.
- If something shows "Qloo problem", open `/api/diagnose`: it shows the real HTTP status from each call.
- The AI agent's wording is instructed and checked (its message is discarded if it names a Qloo result) but it is still model-written text. Picks are structurally grounded; prose is only guarded.
- When the Claude writer is on, your check-in text is sent to Claude to compose the reply. You can turn it off in the app. Crisis text is never sent.
- Mood tags (`sad`, `heartbreak`, `ballad`, `empowering`, `calm`...) are looked up in Qloo at run time and only music-genre tags are used. Which ones Qloo has is unverified until a real key is used (`/api/diagnose` shows it); if none resolve, Batus matches on your artists alone.
- The crisis screen is a conservative keyword check, not a clinical assessment. It can miss indirect wording and can show on harmless phrases.
- Rate limiting is best-effort per serverless instance.

## Disclosures

Batus is a comfort companion, not therapy, diagnosis or medical advice. It does not replace people who care about you. If you may act on thoughts of harming yourself, contact local emergency services or a trusted person, and see [findahelpline.com](https://findahelpline.com). Batus never stores or logs check-in text. Your artist list lives in your browser's local storage only.

## License

MIT. See [LICENSE](./LICENSE).
