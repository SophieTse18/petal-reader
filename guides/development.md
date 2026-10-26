# Development

## Requirements

- Current LTS Node.js
- Python 3.9 or newer
- No runtime package install is required for the app or tests

## Source and generated files

Canonical files live under `src/`. `tools/build.py` concatenates them in a fixed manifest order and produces:

- `PetalReader.html`
- `docs/` PWA files
- `vscode-extension/media/`
- deterministic `vscode-extension/*.vsix`

Do not edit generated files directly. Change `src/` or the relevant extension source and rebuild.

## Commands

```bash
npm test
python3 tools/build.py
python3 tools/build.py --check
```

`--check` builds in a temporary directory and reports stale committed outputs without mutating the checkout.

## Commit expectations

Each commit should leave the app runnable and all applicable tests passing. Include regenerated artifacts in the same commit as their source change. Do not add cloud keys, browser-side secrets, telemetry, or paid-service calls.

## Manual smoke check

Open `PetalReader.html`, load `samples/Sample - Study Notes.md`, play, pause, seek, change speed, select a voice, double-click a word, reload, and confirm restoration. Real OS voice behavior remains a manual check because CI uses deterministic mocks.
