# Architecture

Petal Reader separates maintainable source from dependency-free distribution.

```text
src/app/template.html + styles + providers + reader + app
                         |
                         v
tools/build.py -> PetalReader.html -> docs/index.html
               -> VS Code media    -> deterministic VSIX
```

## Runtime responsibilities

- The text index maps rendered DOM ranges to spoken words, sentences, chapters, and estimated time.
- `Reader` owns transport state, chunking, seeking, highlighting, recovery, and stale-event rejection.
- `SpeechProvider` owns synthesis sessions, voice metadata, cancellation, and raw timing events.
- `BrowserSpeechProvider` is the only shipped production provider.
- UI code renders state and options without calling Web Speech directly.

## Provider contract

A provider creates sessions with `start`, `pause`, `resume`, `cancel`, and `dispose`. Sessions emit normalized start, boundary, end, and error events. Capability metadata declares alignment, audio delivery, network use, privacy, and transport support.

Cancellation increments the reader session token and disposes the provider session, so delayed events cannot update a newer playback run.

## Invariants

- Browser speech remains the account-free default.
- No secret is stored in source, generated output, or browser storage.
- A provider without alignment cannot claim exact word highlighting.
- Remote synthesis requires a separate privacy and deployment decision.
- Generated artifacts are deterministic and checked in CI.
