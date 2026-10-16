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

## Known gaps (not fixed, stated plainly)

- Rate limiting is per serverless instance, so it is a speed bump, not a boundary.
- The agent's prose is guarded (checked for Qloo names) but is still model-written text. Picks are structurally grounded; prose is not.
- The crisis check is keyword-based and will miss indirect wording.
- The live Qloo and Claude calls have not yet been exercised with real keys from this build.
