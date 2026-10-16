# Batus design spec

The blueprint the code was built from. Written first, kept honest since.

## Thesis

> **Batus never invents music. It picks from the Qloo taste graph by ID, and anything that did not come back from Qloo (or from the person's own list) is thrown away in code.**

Why this thesis: the hackathon asks for the thing that "only works because it knows what people love". A language model alone will happily name an artist that does not exist or default to the same global names. Making grounding *structural* (IDs, not names) turns Qloo from a nice-to-have into the thing the product cannot work without.

## Who it is for

A person in a hard moment, awake and alone with a loud mind: waiting on results, worried about money and food, or heartbroken after a relationship ended. They already know what music calms them. They do not want a lecture, a wellness app or a generic playlist. They want their *own kind* of music, now, one tap away.

## Non-negotiable principle

**The model selects and explains. It never names.** The Claude agent receives Qloo IDs from its tools and may only return IDs. The app renders names from Qloo's data. A message that names a Qloo result is discarded.

## Situations and modes

| Situation | Mode | Qloo taste tags requested | Feel |
|---|---|---|---|
| Worry & overthinking | Calm me | calm, ambient, acoustic, worship | slow, breathe |
| Worry & overthinking | Lift me up | upbeat, dance, feel good | stand and move |
| Heartbreak | Calm me | heartbreak, sad | feel it, cry if needed |
| Heartbreak | Lift me up | uplifting, empowering | own your worth |

Tags are resolved at run time with `/v2/tags`; if a tag does not exist or the query is refused, the pipeline degrades (drop location, then drop tags) instead of failing.

## Data model (all request-scoped, nothing persisted server-side)

- `artists[]`: the person's own artists, optionally with a Qloo ID from typeahead
- `songs[]`: their own songs, rendered as play links only
- `theme`, `mode`, `location`, `text`: repaired by `resolvePair` / `cleanLocation`, never trusted
- Result: `picks[]`, `extras[]` (podcast, TV), `favourites[]`, `signature[]` (top Qloo tags), `trace[]`, `message`

## Verified platform constraints (design with them, not around them)

- Qloo returns **taste entities, not audio**. So playback is a search deep-link to YouTube / Spotify / Audiomack. No scraping, no keys, nothing stored.
- Qloo uses **404 for "no results"**. The client treats it as an empty list, not an error.
- Response shapes vary across Qloo versions. Readers accept the known variants.
- Vercel functions are short-lived and stateless. Rate limiting is best-effort; the agent has its own tighter per-visitor and global caps and falls back to the standard pipeline instead of refusing.

## Priority-ordered build (cut from the bottom)

- **P0** Safety gate that runs before everything. Qloo pipeline with grounding. One-tap flow. Sample mode when no key.
- **P1** Claude agent over Qloo tools with ID-only selection. Live Qloo typeahead. Heartbreak theme.
- **P2** Podcast and TV from the same taste. Taste signature. Location signal. Per-theme saved sound.
- **P3** Breathing exercise. "Write it, do not send it". PWA manifest.

## Non-goals (deliberately not built)

- No therapy, diagnosis, or medical advice. Not a replacement for people.
- No accounts, no database, no analytics, no storing check-in text.
- No audio hosting or streaming integration.
- No LLM-written song or artist names, ever.
- No contact-your-ex nudges; no promises that things will be okay.

## Day-0 probe plan (do first with a real key)

1. `npm run coverage`: does Qloo know the artists we care about?
2. Does `/v2/tags` resolve `heartbreak`, `sad`, `ballad`, `uplifting`, `empowering`, `calm`, `upbeat`; `/api/diagnose` shows it?
3. Is `signal.location.query` accepted for artists, and does it change results for Lagos?
4. Does the Claude model named in `.env.example` exist on the account?

## Submission checklist

See [README](../README.md) and [DEVPOST.md](../DEVPOST.md). Demo script: [DEMO.md](./DEMO.md). Self-audit: [AUDIT.md](../AUDIT.md).
