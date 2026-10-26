# TTS provider evaluation

This repository ships no cloud adapter or bundled local model. This protocol defines the evidence required before proposing one.

## Candidates

- Cloud: Azure Speech first for native word boundaries; Amazon Polly for speech marks; ElevenLabs for aligned timestamps.
- Local: Kokoro first, subject to verified alignment; Piper only after an explicit GPL compatibility decision.

## Fixed corpus

Use prose, headings, punctuation, numbers, URLs, emoji, code, and a roughly 20-minute document. Keep the corpus and expected boundaries versioned.

## Measure

- Prerequisites, license, and supported platforms
- First-audio latency and real-time factor
- CPU and memory on representative Windows, macOS, and Linux machines
- Median and p95 word-timing error against a manually checked sample
- Pause, cancel, resume, seek, rate changes, and network-loss recovery
- Chunk continuity on long documents
- Languages and voices
- Retention, privacy, data residency, and verified cost per 100,000 characters

## Promotion gate

- p95 timing error at most 150 ms
- cancellation within 250 ms
- no client-side secret
- a one-screen privacy and cost explanation
- tests for stale events, retries, fallback, and unsupported capabilities

Documentation alone does not select a winner. Record benchmark date, versions, hardware, region, plan, raw measurements, and unresolved unknowns.
