# Petal Reader

Petal Reader reads text and Markdown aloud while highlighting each word. It keeps the original zero-install experience: `PetalReader.html` is a complete app you can open directly, without an account or runtime dependency.

[Try the live app](https://SophieTse18.github.io/petal-reader/) · [Download the latest release](https://github.com/SophieTse18/petal-reader/releases/latest)

## Start in 60 seconds

1. Download this repository as a ZIP and unzip it.
2. Open `PetalReader.html` in Microsoft Edge, Chrome, Safari, or Firefox.
3. Paste text or open a `.md`, `.txt`, or `.html` file.
4. Press Play. Double-click a word to start from that point.

The app works offline with voices installed on your device. Some browser voices marked **online** send the text being spoken to Microsoft or Google.

## What it does

- Highlights the current word and sentence without modifying the document.
- Plays, pauses, stops, seeks, skips 30 seconds, and changes speed from 0.5× to 2×.
- Builds a chapter list and timeline markers from headings.
- Opens Markdown, text, and sanitized HTML.
- Restores your document, position, voice, speed, and reading options locally.
- Falls back to estimated highlighting when a voice does not provide word boundaries.
- Runs as a single HTML file, installable web app, or VS Code Markdown-preview add-on.

## Choose how to use it

| Experience | Best for | Install | Network |
| --- | --- | --- | --- |
| `PetalReader.html` | Reading on a computer | None | Optional |
| [Web/PWA](https://SophieTse18.github.io/petal-reader/) | Phone and tablet home screen | Browser install | First load; voices vary |
| VS Code add-on | Markdown preview | Install the included VSIX | Optional |
| Audio export | Files that keep playing with the screen locked | Python; `edge-tts` for natural voices | Edge engine only |

Windows users can run `Setup Petal Reader.cmd` for shortcuts and VS Code installation. See [Getting started](guides/getting-started.md) for every platform.

## Voices and privacy

Petal Reader uses the browser's Web Speech API. Offline voices keep text on your device. Online voices can send text to the voice provider. Enable **Offline voices only** when the text must not leave your device.

The optional `edge-tts` audio exporter uses an unofficial client for Microsoft Edge's online speech service. The Windows engine is local but only available on Windows. See [Voices and privacy](guides/voices-and-privacy.md) and [Audio export](guides/audio-export.md).

## VS Code

Install `vscode-extension/petal-reader-markdown-1.0.0.vsix`, open a Markdown file, and choose **Read Aloud in Preview**. The preview player supports highlighting, chapters, seeking, voice selection, and keyboard controls.

## Keyboard controls

- `Ctrl` + `Enter`: play or pause
- `Ctrl` + `[` / `Ctrl` + `]`: back or forward 30 seconds
- `Space`: play or pause when you are not typing
- `Esc`: pause
- Arrow keys on the timeline: move five seconds

## Guides

- [Getting started](guides/getting-started.md)
- [Voices and privacy](guides/voices-and-privacy.md)
- [Audio export](guides/audio-export.md)
- [Development](guides/development.md)
- [Architecture](guides/architecture.md)
- [TTS provider evaluation](guides/tts-provider-evaluation.md)

## Development

Files under `src/` are canonical. `PetalReader.html`, `docs/`, extension media, and the VSIX are generated and committed so users do not need build tools.

```bash
npm test
python3 tools/build.py --check
```

After changing `src/` or build inputs, run `python3 tools/build.py` and commit the generated outputs. See [Development](guides/development.md) and [CONTRIBUTING.md](CONTRIBUTING.md).

## Security and conduct

Please read [SECURITY.md](SECURITY.md) before reporting a vulnerability and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before participating.

## License

[MIT](LICENSE). Free to use, modify, and share.
