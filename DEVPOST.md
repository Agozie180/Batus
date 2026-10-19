# Devpost answer sheet

Copy each section into the Devpost form. Edit the first section to add your own story if you want; everything else is ready.

## Project name
Batus

## Tagline
When your mind won't stop or your heart is hurting, your own music answers first, grounded in Qloo.

## Inspiration
When worry or heartbreak hits at night, the usual advice ("go for a walk", "try calming music") rarely sticks, and a chatbot's playlist feels generic. What actually helps many people is the music they already love: for many Nigerians that is gospel and praise, for others Afrobeats or R&B. Batus is built on one idea: cultural taste is the missing ingredient in comfort. If an agent knows what *this* person loves, it can meet them where they are in one tap.

[Optional: add one or two sentences of your own story here.]

## What it does
Batus is a comfort companion with two situations: **worry & overthinking** and **heartbreak**. You say what you are going through, how you want to feel (Calm me, Lift me up, Calm me, Lift me up), and the artists you love. Batus then:
- finds taste-matched music through Qloo, with live artist search as you type, mood-aware taste tags, and an optional location signal;
- adds a podcast and a show from the same taste;
- shows a **taste signature** and per-artist **match bars** built from Qloo's data;
- gives a short, tender message, optionally written by a Claude agent that uses Qloo as its tools;
- offers a breathing exercise and a private "write it, do not send it" box that is never saved;
- stops everything and points to human help if someone writes crisis language.

## What makes it Qloo-powered
Every recommendation comes from Qloo's taste graph (`/search`, `/v2/tags`, `/v2/insights`) across artists, podcasts and TV shows. The Claude agent calls Qloo as tools and chooses results **by Qloo ID only**; the code throws away any ID Qloo did not return. So the product cannot recommend an artist that Qloo did not surface for that person. Without Qloo there is nothing to recommend.

## How we built it
Next.js (App Router) on Vercel; a small Qloo client with defensive parsing and graceful degradation; a Claude tool-use agent (`find_artist`, `taste_matches`, `finish`); a deterministic fallback pipeline; a safety gate that runs before any other logic. 38 tests cover the thesis, fallbacks and safety rules. A self-audit (AUDIT.md) lists seven findings, each fixed and pinned by a test.

## Challenges we ran into
- Making "never invents music" *structural* rather than a prompt instruction, so we select by ID and filter by what the tools returned.
- Heartbreak is higher-risk than worry, so the safety gate is stricter and the wording never blames anyone or urges contacting an ex.
- Qloo returns taste, not audio, so playback is a search deep-link.

## Accomplishments we're proud of
- Live Qloo search that tells a person immediately whether Qloo knows their artists.
- One thesis enforced in code and proven by tests, including adversarial cases (invented IDs, injected prompts, seeds returned as picks).
- Two situations in one product that repaint the whole app and keep separate saved tastes.

## What we learned
Cultural intelligence is the difference between technically functional and actually good: the same sentence of comfort lands differently when the song that follows is one you would have chosen yourself.

## What's next
- Run the coverage script with a real key and publish the numbers for the artists users search most.
- Use Qloo's demographic and heatmap signals for local relevance.
- More situations (exam stress, grief) and more languages (Yoruba, Igbo, Hausa, Pidgin).
- An optional trusted-contact feature, with consent, for hard nights.

## Built with
Qloo API, Claude (tool use), Next.js, React, Vercel, Node.js

## Links
- Live demo: https://batus-woad.vercel.app
- Repo: https://github.com/Agozie180/Batus
- License: MIT (visible in the repo's About section)
- Demo video: https://youtu.be/zYwt6FCvSM0
