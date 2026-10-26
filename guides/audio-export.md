# Audio export

The exporter converts Markdown or text into numbered audio tracks and an M3U playlist.

```bash
python3 tools/make_audio.py "My Notes.md"
```

## Engines

- `edge`: natural online voices; requires the `edge-tts` package and a network connection; writes MP3.
- `windows`: installed Windows voices through PowerShell; Windows only; writes WAV.
- `auto`: chooses `edge` when available and online, otherwise Windows on Windows. On macOS/Linux it stops with a clear message instead of invoking a Windows engine.

Install the online engine with `python3 -m pip install edge-tts`.

## Common options

```bash
python3 tools/make_audio.py notes.md --voice en-AU-NatashaNeural --rate 1.25
python3 tools/make_audio.py notes.md --one-file
python3 tools/make_audio.py notes.md --list-voices
```

Use `--keep-code` to read fenced code blocks. The default skips them. Output is written below `Audio/` unless another output location is selected by the tool.

The Edge route is an unofficial client and can change without notice. Do not use it for text you are unwilling to send to a remote speech service.
