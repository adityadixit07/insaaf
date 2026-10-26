# Insaaf (इंसाफ) — evidence for gig workers

Built for the **Meta Global AI Developer Hackathon** (Oct 26 – Nov 4) · Track: **Indie Developer** · Theme: **Build for Your World**

## The problem

Delivery and rideshare platforms penalize workers (pay deductions, cancellation strikes, deactivation) based almost entirely on a customer's complaint. The worker's side of the story — a locked gate, a flooded street, a flat tyre, a package that really was handed over intact — rarely gets checked against any evidence before the penalty lands. Appeals, when they exist, are a vague text box into a support queue.

## What Insaaf does

A worker who's been penalized picks the defense that matches what actually happened, photographs the proof, and optionally explains it by voice in their own language. Before anything is drafted:

1. **SAM 3.1** checks the photo against that specific defense (`"locked gate or closed building entrance"`, `"flat tire or broken down two-wheeler"`, etc.) with a pixel-accurate mask + confidence — not a guess.
2. **Muse Voice Transcribe** turns an optional voice note into text, so a worker who'd rather speak than type isn't excluded.
3. A deterministic geo + time check flags when another worker reported the *same kind* of issue nearby in the last 24 hours — corroborating pattern evidence (e.g. a flooded route), not noise to dismiss.
4. **Muse Spark** reads all three signals — never raw pixels, never the worker's claim alone — and drafts a calm, factual, submit-ready appeal, an **appeal-strength score (1–5)**, and a **recommended next action** (submit now / add more evidence / escalate to a safety helpline).

This is an agent with a visible second reasoning step, not a one-shot wrapper: it doesn't just verify, it tells the worker what to do next and is honest when the photo doesn't back up the claim — a case with no SAM match comes back as "needs more evidence," strength 1/5, with appeal text that says so plainly instead of inventing visual detail.

## Why this instead of a civic-complaint app

The first draft of this project was a "photograph a pothole" municipal-complaint app. It worked, but the idea itself is a hackathon cliché (SeeClickFix, FixMyStreet, every Indian smart-city hackathon has one). The verification *pipeline* — cross-check photo evidence against a claim with SAM 3.1, take voice input, flag corroborating patterns, have Spark draft only on what the evidence supports — was the genuinely useful part, so it was kept and retargeted at gig workers, where nobody is building this and the stakes (a worker's livelihood) are real.

## Architecture

```
Next.js 16 (App Router, TypeScript, Tailwind)
├── /file               worker-facing capture flow (client component)
├── /cases               map + stats of filed appeals
├── /api/file-case       POST: runs the full verification + drafting pipeline
├── /api/cases           GET: lists stored cases
├── src/lib/meta-client.ts   all Meta Model API calls live here
├── src/lib/store.ts         JSON file store + pattern detection (data/cases.json, gitignored)
└── src/lib/wav-recorder.ts  browser-side WAV encoder (no ffmpeg needed anywhere)
```

All three Meta models are called **server-side only** (`src/lib/meta-client.ts`) — `MODEL_API_KEY` never reaches the browser.

## Setup

```bash
npm install
cp .env.example .env.local   # add your Meta Model API key
npm run dev
```

Open `http://localhost:3000/file` to file a case, `/cases` to see the map.

Two standalone scripts in `scripts/` are useful for debugging your own key against the real API without going through the UI:

```bash
MODEL_API_KEY=... node scripts/smoke-test-sam.mjs path/to/photo.jpg
MODEL_API_KEY=... node scripts/smoke-test-spark.mjs
```

## What's actually been verified live (not just claimed)

Everything below was run against the real Meta Model API during development, not mocked:

- `sam-3.1` segmentation calls, parsed with `@meta-sam/parser` — field names (`box.left/top/right/bottom/objectId/confidence`, `mask.mask.width/height`) confirmed from live responses, not guessed from docs.
- The SVG mask overlay math (nested `<svg>` positioned at the box, `viewBox` sized to the mask's own raster) was checked against a real decoded mask and renders pixel-accurate.
- `muse-spark-1.3` structured-output drafting via `chat.completions.create` + `response_format: json_schema` — confirmed working, and `reasoning_effort: "minimal"` cut token spend from 1586 to 551 tokens on a representative call with no observed quality loss.
- The full `/api/file-case` → `AppealResult` flow was driven end-to-end in a real browser against the live API, including the "no match" path (SAM finds nothing → Spark honestly reports low strength and asks for more evidence, instead of fabricating support for the worker's claim).
- `muse-voice-transcribe-1.0`: the `POST /v1/asr/transcribe` call itself (auth, multipart shape, response parsing) was confirmed live with a synthetic WAV -- request/response match `transcribeVoiceNote` exactly. **Not yet tested:** the browser's mic capture → WAV encoding (`wav-recorder.ts`) with a real human voice, on a real device. That's the one piece to try before the demo.

## Budget strategy ($150 API credit)

- **Keep your coding agent off this budget.** The Meta-hosted `muse-wonder-1.0` coding model shares the same `MODEL_API_KEY` pool as this app's runtime calls. Build with a separate Claude Code session (billed to its own plan) and reserve the full $150 for the app's actual inference — the calls judges will exercise live.
- `reasoning_effort: "minimal"` on every Muse Spark drafting call.
- `mask_encoding: "one_bit"` on every SAM 3.1 call for the smallest mask payloads.
- The pattern-match check (`findSimilarRecentCase`) is pure deterministic geo-math, not an LLM call.

## What's left before submission

- [ ] Test the voice note end-to-end with a real recording on the device you'll demo with (browser mic permissions + WAV encoding haven't been exercised live yet).
- [ ] Record the 3-minute demo: file a case with strong matching evidence (full strength, "submit now") → file one with no evidence (honest "needs more evidence") → show the map and stats on `/cases`.
- [ ] Push to a **public** GitHub repo and add every team member before the Nov 4, 9:00 PM ET deadline.

## Why this fits the rules

- New work, built entirely during the event window.
- Not on the banned list: not medical/health advice, not a basic RAG app, not a simple image analyzer (it's a multi-model verification + agentic drafting pipeline), not an education chatbot, job screener, nutrition coach, personality analyzer, or sports coach.
- Uses three distinct Meta Model API models meaningfully (SAM 3.1, Muse Spark, Muse Voice Transcribe) in one coherent agent, not as a single wrapped API call.
