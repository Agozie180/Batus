# Self-audit

Findings from reviewing Batus against its own thesis and against common web and LLM-app risks. Each fix is pinned by a test that fails on the pre-fix code.

| # | Finding | Risk | Fix | Pinned by |
|---|---|---|---|---|
| 1 | Third-party image URLs from Qloo were placed straight into the page | `javascript:`/`data:`/`http:` URLs or CSS injection through an image field | `safeImage` allows `https:` only; UI uses `<img referrerPolicy="no-referrer">` with an initial as fallback | `recommend.test.js` "image URLs must be https" |
| 2 | Check-in text was placed in the agent prompt as-is | A visitor could close our `<checkin>` tag and write instructions that look like the system's | Angle brackets stripped from every untrusted string put in the prompt | `agent.test.js` "close our `<checkin>` tag" |
| 3 | `find_artist` accepted any name | The agent (or an injected instruction) could add its own taste seeds, quietly steering "your" taste | Only names from the person's own list can become seeds | `agent.test.js` "cannot add its own taste seeds" |
| 4 | Every check-in could trigger a multi-call Claude run | Cost abuse: one visitor or script could drain the key | Per-visitor and global agent caps; over the cap, Batus silently falls back to the standard Qloo pipeline | route logic (best-effort per serverless instance) |
| 5 | A model could pick IDs that its tools never returned | Ungrounded recommendations | IDs filtered against the set its own tool calls returned; seed IDs cannot be returned as picks | `agent.test.js` THESIS tests |
| 6 | A model message could name music | Prose could slip in an ungrounded name | Message discarded if it contains any Qloo result's name; template wording used instead | `agent.test.js` "names music" |
| 7 | Crisis detection missed heartbreak-adjacent phrasing | A person in acute distress getting a song suggestion | Added "can't live without", "nothing to live for", "life is over", "want the pain to stop" | `themes.test.js` safety gate |

## Round 9 findings (16 Oct 2026)

| # | Finding | Fix | Pinned by |
|---|---|---|---|
| 8 | Songs were always the same: pool was each artist's top hits, own artists excluded, fixed ranking | Deep catalogues, own + Qloo artists, mood scoring with jitter, `exclude`, re-roll | `songs.test.js` (mood differs, deep track wins, exclude, own artists, Claude candidate cap) |
| 9 | One check-in could spend up to 9 iTunes searches (limit is about 20 a minute per IP) | 6 per check-in, shared Next data cache for 6 h | build config |
| 10 | Handoff claimed "not deployed" while the app is live | Corrected; live `/api/diagnose` result recorded | Handoff.md |

## Round 10 findings (19 Oct 2026, from root)

| # | Finding | Fix | Pinned by |
|---|---|---|---|
| 11 | The agent only ran when the person had added artists, so a judge tapping the button on a fresh page never saw it | Agent can start from the mood alone (only when the person gave no artists, so it still cannot add its own seeds) | `round10.test.js` "starts from the mood alone", "NOT a loophole" |
| 12 | In agent mode the Qloo mood tags were lost, so the "What Qloo added" card and per-song Qloo reasons were generic | Agent returns the tags it used | `round10.test.js` |
| 13 | The model could override the person's chosen mood by passing its own `vibe` to Qloo | `vibe` removed; the chosen mood always sets the tags | `round10.test.js` "vibe is ignored" |
| 14 | Agent time budget (24 s) plus fallback could exceed the 30 s function limit | Budget 18 s, 5 turns, independent tool calls run in parallel | build config |
| 15 | `finish` in the same step as other tool calls dropped those calls | Other calls run first, then finish | `round10.test.js` |
| 16 | Apple's per-IP rate limit is the single point of failure for songs | Deezer public search as a second source, only when Apple returns nothing | `round10.test.js` |
| 17 | `/api/diagnose` revealed the Qloo key's length and never tested Claude | Length removed; real Claude call added when a key is set (reports wrong model names plainly) | `round10.test.js` |
| 18 | Songs added after toggling mood went to the wrong playlist | Playlist follows the mood the result was made for | UI |

## Known gaps (not fixed, stated plainly)

- Rate limiting is per serverless instance, so it is a speed bump, not a boundary.
- The agent's prose is guarded (checked for Qloo names) but is still model-written text. Picks are structurally grounded; prose is not.
- The crisis check is keyword-based and will miss indirect wording.
- Live Qloo search, tags and insights are verified on the deployment; the Claude agent, film/book queries, the popularity filter and the Deezer source are verified against stand-ins only until a key is set and `/api/diagnose` is re-run.
