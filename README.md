# Batus: when your mind won't stop, your own praise music answers first

**Links:** Live demo: _add after deploy_ · Repo: this repo · Built for the [Qloo Agentic Hackathon](https://qloo.devpost.com/) (deadline 31 Oct 2026)

> **Batus never invents music. Every artist it suggests is either one you gave it or one the Qloo taste graph returned for you, and the code blocks anything else.**

Overthinking and worry don't arrive on a schedule. After a result you hoped for doesn't come, or when money and food feel uncertain, generic advice ("go for a walk", "try calming music") rarely sticks. What does work for many people is *their own* music. Batus is a small comfort companion that takes one tap, asks how you feel, and puts your kind of praise and worship music in front of you, local and international, with a link to play it right now.

Batus is built for a real audience: people in hard seasons, and especially listeners of Nigerian and international gospel, whose taste generic playlists rarely reflect.

## How it works

```
 check-in text ──► safety gate ──(crisis language?)──► stop, show human help
        │ no
        ▼
 your artists ──► Qloo /search ──► entity ids
                       │
                       ▼
        Qloo /v2/tags (gospel) + /v2/insights (taste graph)
                       │
                       ▼
   grounding check (assertGrounded) ──► picks + play links (YouTube / Spotify / Audiomack)
                       │
                       ▼
   short, warm, template-based message  (cannot name any music)
```

## What's used, and what's deliberately not

| Surface | Used | Notes |
|---|---|---|
| Qloo `GET /search` (`urn:entity:artist`) | Yes | Resolves each favourite artist to a Qloo entity |
| Qloo `GET /v2/tags` | Yes | Biases results toward the gospel taste tag; falls back cleanly if it fails |
| Qloo `GET /v2/insights` | Yes | Taste-graph recommendations from your artist signals |
| An LLM | No | The wording layer is deterministic templates. Music choice is Qloo's job, so the grounding rule can be proven by tests instead of trusted |
| Audio hosting / streaming APIs | No | Qloo returns taste, not audio. Batus deep-links to YouTube, Spotify and Audiomack searches |
| Accounts, database, analytics | No | Nothing about you is stored server-side |

## The thesis, enforced (not asserted)

| The system decides | The system is structurally prevented from |
|---|---|
| Which artists to show, from Qloo results and your own list | Showing any artist that is neither (`assertGrounded` throws; tested) |
| What to say, from fixed warm templates | Naming music in the message layer (templates have no music slots) |
| Whether to pause for safety | Running any recommendation code after crisis language is detected (tested: the Qloo client is never called) |

## Measured

| Claim | Result | Reproduce with |
|---|---|---|
| Behaviour tests pass (crisis gate, Qloo client, fallbacks, grounding, server) | 13 / 13 | `npm test` |
| Runs with no dependencies | `package.json` has none | `npm start` |

## Try it in 30 seconds

```bash
git clone <this repo> && cd batus
cp .env.example .env      # optional: add your QLOO_API_KEY
export $(cat .env | xargs)   # or set the variable your own way
npm start                 # http://localhost:3000
```

1. Tap **Both** under "Try a starter".
2. Tap **Results came out**, choose **Lift me up**, then **Start my praise break**.
3. To see the safety behaviour, type `I want to end my life` and start again. Batus pauses the music and shows human help.

Without `QLOO_API_KEY` the app runs in **sample mode**: a small fixed list, clearly labelled "Sample data (no Qloo key set)" in the UI. It is never passed off as live Qloo output.

## Deploy

A `Dockerfile` and `render.yaml` are included. On Render: New → Blueprint → this repo, then set `QLOO_API_KEY` in the dashboard. Any Node 20+ host works (`npm start`, honours `PORT`).

## Limitations, stated plainly

- **The live Qloo path has been verified against mocked responses only**, not yet against a real API key from this build. Response parsing is deliberately defensive and every Qloo step has a fallback, but expect to tune field names on first real run. Check the "How this was chosen" panel in the UI for what actually happened.
- Qloo returns artists, not songs. Playback is a search link on a streaming platform, so the first result may not be the exact track you want.
- Coverage of Nigerian gospel artists in Qloo has not been measured yet. If an artist isn't found, Batus tells you and still shows your own songs.
- The crisis screen is a conservative keyword check, not a clinical assessment. It can miss indirect wording and can show on harmless phrases.
- Mood modes (Calm / Lift me up) currently change the play-link search, not the Qloo query.

## Disclosures

Batus is a comfort companion, not therapy, diagnosis or medical advice. It does not replace people who care about you. If you may act on thoughts of harming yourself, contact local emergency services or a trusted person, and see [findahelpline.com](https://findahelpline.com). Check-in text is processed in memory to compose a reply and is never stored or logged. Your artist list lives in your browser's local storage only.

## License

MIT. See [LICENSE](./LICENSE).
