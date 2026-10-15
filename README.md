# Batus: when your mind won't stop or your heart is hurting, your own music answers first

**Links:** Live demo: _add your Vercel URL after deploy_ · Repo: [github.com/Agozie180/Batus](https://github.com/Agozie180/Batus) · Built for the [Qloo Agentic Hackathon](https://qloo.devpost.com/)

> **Batus never invents music. It picks from the Qloo taste graph by ID, and the code throws away anything that did not come back from Qloo or from the person's own list.**

Overthinking and worry don't arrive on a schedule. After a result you hoped for doesn't come, or when money and food feel uncertain, generic advice ("go for a walk", "try calming music") rarely sticks. What does help many people is *their own* music. Batus takes one tap, asks what you are going through, and puts your kind of music in front of you with a link to play it right now. Two situations are supported today:

| Going through | Modes | What Batus asks Qloo for |
|---|---|---|
| **Worry & overthinking** | *Calm me* (slow worship) · *Lift me up* (praise, dance) | Gospel + worship or praise taste, so praise and worship from Nigeria and abroad |
| **Heartbreak** (a breakup, from either side) | *Let it out* (sad songs to feel and cry to) · *Move on* (uplifting, own your worth) | Heartbreak or uplifting taste, in **any genre** your seed artists point to (Afrobeats, R&B, gospel for healing...) |

It then goes a step further and suggests something to listen to or watch from the same taste.

**Who it is for:** people in hard seasons, such as worry about money and results or the end of a relationship, whose taste (often Nigerian and international gospel, Afrobeats, R&B) generic playlists and LLM answers rarely reflect.

## Why Qloo is the difference

| A chatbot alone | Batus |
|---|---|
| Guesses what "calming music" means; defaults to the same global names | Asks Qloo what people with *your* taste love, nudged by mood (worship vs praise) and place |
| Can invent an artist that does not exist | Cannot: it recommends by Qloo ID and the code drops any ID that Qloo did not return |
| Music only | Music, plus podcasts and TV matched by the same taste signals |
| Forgets you | Heart a match and it joins your taste profile (kept in your browser) for next time |

## How it works

```
 check-in text ──► safety gate ──(crisis language?)──► stop. Human help only. No Qloo, no Claude call.
        │ no
        ▼
 your artists ──► Qloo /search (live typeahead picks give Qloo ids up front)
        │
        ├─ Claude agent ON ─► tools: find_artist · taste_matches (artist | podcast | tv_show) · finish
        │                      Claude chooses by ID, writes one warm message
        │                      code keeps only IDs the tools returned
        │
        └─ Claude agent OFF / fails ─► deterministic pipeline:
              /v2/tags (gospel + worship|praise) + /v2/insights (+ location)
              degrade: drop location → drop tags
        ▼
 assertGrounded ──► picks + extras + play links (YouTube / Spotify / Audiomack)
```

## What's used, and what's deliberately not

| Surface | Used | Notes |
|---|---|---|
| Qloo `GET /search` | Yes | Powers the live artist typeahead and ID resolution |
| Qloo `GET /v2/tags` | Yes | Resolves `gospel` plus a mood tag (`worship` for Calm, `praise` for Lift me up) |
| Qloo `GET /v2/insights` | Yes | Artists, podcasts and TV shows; optional `signal.location.query` for local relevance |
| Claude (tool use) | Optional | Runs the agent loop and writes the message. Off if `ANTHROPIC_API_KEY` is unset, and the app still works fully |
| Audio hosting / streaming APIs | No | Qloo returns taste, not audio. Batus deep-links to platform searches |
| Accounts, database, analytics | No | Nothing about you is stored server-side |

## The thesis, enforced (not asserted)

| The system decides | The system is structurally prevented from |
|---|---|
| Which artists, podcasts and shows to show, from Qloo results plus your own list | Showing anything else. `assertGrounded` throws; the agent's chosen IDs are filtered against what its own tool calls returned (tested) |
| What to say, via Claude or fixed templates | Naming music in that message. A message that contains a Qloo result's name is discarded and replaced by template wording (tested) |
| Whether to pause for safety | Running any music logic or calling Claude after crisis language is detected (tested: neither Qloo nor Claude is called). Heartbreak raises risk, so phrases like "can't live without her" and "I just want the pain to stop" also trip the gate |
| What a heartbreak message may say | Urging contact with an ex, blaming anyone, or promising it will be okay (templates tested; the agent prompt forbids it) |
| Which artists count as "yours" | Echoing them back as recommendations |

## Measured

| Claim | Result | Reproduce with |
|---|---|---|
| Behaviour tests (crisis gate, Qloo client, fallbacks, agent loop, grounding) | 34 / 34 passing | `npm test` |
| Production build | Passes, 0 known dependency vulnerabilities | `npm run build && npm audit` |
| End-to-end over real HTTP: UI → API → agent → Qloo/Claude tools → UI | Exercised against a local stand-in for both services | see Limitations |
| Qloo coverage of Nigerian and international gospel artists | **Not measured yet** | `QLOO_API_KEY=… npm run coverage` writes `COVERAGE.md` |

## Try it in 30 seconds

Live: open the demo link above and tap **Start my praise break**. A starter profile is already filled in.

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
5. Type `I want to end my life` and start. Batus stops the music and shows human help.

Without `QLOO_API_KEY` the app runs in **sample mode**: a small fixed list, labelled "Sample data (no Qloo key set)" in the UI, never passed off as live Qloo output.

## Deploy to Vercel

1. Import this repo at [vercel.com/new](https://vercel.com/new). The Next.js preset needs no changes.
2. Add environment variables: `QLOO_API_KEY` (required for live data) and `ANTHROPIC_API_KEY` (optional, turns on the agent).
3. Deploy. Check `/api/health`: it reports `{"qloo":true,"agent":true}` when both keys are active.

## Limitations, stated plainly

- **The live Qloo and Claude calls have been exercised only against local stand-ins that mimic their documented responses, not against the real services from this build.** Response parsing is defensive and every Qloo step has a fallback, but expect small tuning on the first real run. Check *How this was chosen* in the UI for what actually happened.
- Coverage of Nigerian gospel artists in Qloo is unmeasured until `npm run coverage` is run with a key. If Qloo does not know an artist, Batus says so and still shows your own songs.
- Qloo returns artists, shows and podcasts, not tracks. Playback is a platform search link, so the first result may not be the exact song you want.
- The AI agent's wording is instructed and checked (its message is discarded if it names a Qloo result) but it is still model-written text. Picks are structurally grounded; prose is only guarded.
- When the Claude writer is on, your check-in text is sent to Claude to compose the reply. You can turn it off in the app. Crisis text is never sent.
- Heartbreak taste tags (`heartbreak`, `sad`, `uplifting`, `empowering`) are looked up in Qloo at run time. Which tags Qloo actually has is unverified until a real key is used; if none resolve, Batus falls back to your seed artists alone.
- The crisis screen is a conservative keyword check, not a clinical assessment. It can miss indirect wording and can show on harmless phrases.
- Rate limiting is best-effort per serverless instance.

## Disclosures

Batus is a comfort companion, not therapy, diagnosis or medical advice. It does not replace people who care about you. If you may act on thoughts of harming yourself, contact local emergency services or a trusted person, and see [findahelpline.com](https://findahelpline.com). Batus never stores or logs check-in text. Your artist list lives in your browser's local storage only.

## License

MIT. See [LICENSE](./LICENSE).
