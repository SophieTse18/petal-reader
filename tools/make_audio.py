"""Turn a Markdown (.md) or text (.txt) file into audio files you can listen to on your phone.

Easiest: drag a file onto "Make Audio (drop a file here).cmd" in the Petal Reader folder.
Or run:   python tools/make_audio.py "My Notes.md" [options]

Each chapter (heading) becomes its own numbered track, plus a playlist:
    Audio/My Notes/01 - Introduction.mp3
    Audio/My Notes/02 - Methods.mp3 ...
The Audio folder is inside OneDrive, so the tracks show up in the OneDrive app on your phone.

Engines (--engine):
  windows  Offline. Uses the voices installed in Windows (Settings > Time & language > Speech > Add voices).
           Saves .wav files.
  edge     Online. The same natural voices as Microsoft Edge's Read Aloud (e.g. en-AU-NatashaNeural).
           Saves .mp3 files. Needs internet and the free edge-tts package:  python -m pip install edge-tts
           (edge-tts is an unofficial open-source client for Edge's read-aloud service.)
  auto     edge when edge-tts is installed and you're online, otherwise windows. (default)

Options:
  --voice NAME     edge: e.g. en-AU-NatashaNeural, en-AU-WilliamNeural, en-US-AvaMultilingualNeural
                   windows: part of a voice name, e.g. Zira, Mark, Catherine
  --rate 1.25      speed from 0.5 to 2 (default 1)
  --one-file       one single track instead of one per chapter
  --keep-code      also read code blocks (skipped by default)
  --list-voices    show the voices you can use
"""
import argparse
import asyncio
import os
import pathlib
import re
import socket
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
DEFAULT_EDGE_VOICE = "en-AU-NatashaNeural"

EMOJI = re.compile("[\U0001F000-\U0001FAFF←-⇿■-◿☀-➿⬀-⯿️‍]")


def clean_inline(s):
    s = re.sub(r"!\[([^\]]*)\]\([^)]*\)", lambda m: ("Image: " + m.group(1)) if m.group(1) else "", s)
    s = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", s)
    s = re.sub(r"<(https?://[^>]+)>", "link", s)
    s = re.sub(r"https?://\S+|www\.\S+", "link", s)
    s = re.sub(r"`([^`]*)`", r"\1", s)
    s = re.sub(r"<[^>]+>", "", s)
    s = re.sub(r"(\*\*|__|\*|_|~~|==)(?=\S)(.+?)(?<=\S)\1", r"\2", s)
    s = EMOJI.sub("", s)
    s = s.replace("\\", "")
    return re.sub(r"\s+", " ", s).strip()


def end_sentence(s):
    return s if not s or s[-1] in ".!?:;," else s + "."


def markdown_chapters(text, keep_code=False):
    """Return [(title, spoken_text)] split at the top-level headings."""
    text = text.replace("\r\n", "\n").replace("\r", "\n").lstrip("﻿")
    text = re.sub(r"\A---\n.*?\n(---|\.\.\.)\n", "", text, flags=re.S)
    lines = text.split("\n")
    heads, fenced = [], False
    for l in lines:
        if re.match(r"^\s*(```|~~~)", l):
            fenced = not fenced
        elif not fenced:
            m = re.match(r"^\s{0,3}(#{1,6})\s+\S", l)
            if m:
                heads.append(len(m.group(1)))
    split_at = 0
    if heads:
        top = min(heads)
        split_at = top + 1 if heads.count(top) == 1 and len(heads) > 1 else top

    chapters, title, paras, para, in_code = [], None, [], [], False

    def flush_para():
        if para:
            paras.append(end_sentence(" ".join(para)))
            para.clear()

    def flush_chapter():
        flush_para()
        body = " ".join(p for p in paras if p)
        if body.strip():
            chapters.append((title, body))
        paras.clear()

    for line in lines:
        if re.match(r"^\s*(```|~~~)", line):
            in_code = not in_code
            flush_para()
            continue
        if in_code:
            if keep_code and line.strip():
                paras.append(end_sentence(line.strip()))
            continue
        m = re.match(r"^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$", line)
        if m:
            level, heading = len(m.group(1)), clean_inline(m.group(2))
            flush_para()
            if level == split_at:
                flush_chapter()
                title = heading
            elif level < split_at and title is None and not chapters:
                title = heading  # the document title names the opening track
            paras.append(end_sentence(heading))
            continue
        if not line.strip():
            flush_para()
            continue
        if re.match(r"^\s*([-*_])(\s*\1){2,}\s*$", line):
            flush_para()
            continue
        if "|" in line and re.match(r"^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$", line):
            continue
        if "|" in line and line.strip().startswith("|"):
            flush_para()
            cells = [clean_inline(c) for c in line.strip().strip("|").split("|")]
            paras.append(end_sentence(", ".join(c for c in cells if c)))
            continue
        if re.match(r"^\s*([-*+]|\d+[.)])\s+", line):
            flush_para()
            line = re.sub(r"^\s*([-*+]|\d+[.)])\s+(\[[ xX]\]\s+)?", "", line)
            paras.append(end_sentence(clean_inline(line)))
            continue
        line = re.sub(r"^\s*>\s?", "", line)
        cleaned = clean_inline(line)
        if cleaned:
            para.append(cleaned)
    flush_chapter()
    return chapters


def text_chapters(text):
    paras = [re.sub(r"\s+", " ", p).strip() for p in re.split(r"\n\s*\n", text)]
    return [(None, " ".join(end_sentence(p) for p in paras if p))]


def safe_name(s, fallback):
    s = re.sub(r"\s+", " ", re.sub(r'[\\/:*?"<>|]+', " ", s or "")).strip().rstrip(".")
    return (s[:60].strip() or fallback)


def online(host="speech.platform.bing.com", port=443, timeout=3):
    try:
        socket.create_connection((host, port), timeout=timeout).close()
        return True
    except OSError:
        return False


def have_edge_tts():
    try:
        import edge_tts  # noqa: F401
        return True
    except ImportError:
        return False


# ---------------------------------------------------------------- edge (online, natural voices)
async def edge_save(text, voice, rate, path):
    import edge_tts
    pct = int(round((rate - 1) * 100))
    await edge_tts.Communicate(text, voice, rate=f"{pct:+d}%").save(str(path))


async def edge_list():
    import edge_tts
    voices = await edge_tts.list_voices()
    for v in sorted(voices, key=lambda v: v["ShortName"]):
        if v["Locale"].startswith("en-"):
            print(f'  {v["ShortName"]:<34} {v["Gender"]}')
    print("  (English voices shown; any voice from 'edge-tts --list-voices' works.)")


# ---------------------------------------------------------------- windows (offline)
WINDOWS_PS = r"""
param([string]$TextFile, [string]$OutFile, [string]$Voice, [double]$Rate, [switch]$List)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Media.SpeechSynthesis.SpeechSynthesizer, Windows.Media.SpeechSynthesis, ContentType = WindowsRuntime]
$null = [Windows.Storage.Streams.DataReader, Windows.Storage.Streams, ContentType = WindowsRuntime]
if ($List) { [Windows.Media.SpeechSynthesis.SpeechSynthesizer]::AllVoices | ForEach-Object { '  {0,-40} {1}' -f $_.DisplayName, $_.Language }; exit 0 }
$asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } | Select-Object -First 1
function Await($op, [Type]$type) { $t = $asTask.MakeGenericMethod($type).Invoke($null, @($op)); $t.Wait(-1) | Out-Null; $t.Result }
$synth = New-Object Windows.Media.SpeechSynthesis.SpeechSynthesizer
if ($Voice) {
  $v = [Windows.Media.SpeechSynthesis.SpeechSynthesizer]::AllVoices | Where-Object { $_.DisplayName -like "*$Voice*" } | Select-Object -First 1
  if ($v) { $synth.Voice = $v } else { Write-Host "  Voice '$Voice' not found, using $($synth.Voice.DisplayName)." }
}
try { $synth.Options.SpeakingRate = [Math]::Min(6, [Math]::Max(0.5, $Rate)) } catch { }
$text = [IO.File]::ReadAllText($TextFile, [Text.Encoding]::UTF8)
$stream = Await ($synth.SynthesizeTextToStreamAsync($text)) ([Windows.Media.SpeechSynthesis.SpeechSynthesisStream])
$size = [uint32]$stream.Size
$reader = New-Object Windows.Storage.Streams.DataReader ($stream.GetInputStreamAt(0))
$null = Await ($reader.LoadAsync($size)) ([uint32])
$bytes = New-Object byte[] $size
$reader.ReadBytes($bytes)
[IO.File]::WriteAllBytes($OutFile, $bytes)
"""


def run_windows_ps(args):
    with tempfile.NamedTemporaryFile("w", suffix=".ps1", delete=False, encoding="utf-8-sig") as f:
        f.write(WINDOWS_PS)
        script = f.name
    try:
        return subprocess.run(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script] + args,
                              capture_output=True, text=True)
    finally:
        os.unlink(script)


def windows_save(text, voice, rate, path):
    with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False, encoding="utf-8") as f:
        f.write(text)
        tf = f.name
    try:
        r = run_windows_ps(["-TextFile", tf, "-OutFile", str(path), "-Voice", voice or "", "-Rate", str(rate)])
        if r.stdout.strip():
            print(r.stdout.rstrip())
        if r.returncode != 0 or not path.exists():
            raise RuntimeError((r.stderr or r.stdout or "Windows speech failed").strip())
    finally:
        os.unlink(tf)


# ---------------------------------------------------------------- main
def main():
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(errors="replace")
        except (AttributeError, ValueError):
            pass
    ap = argparse.ArgumentParser(description="Turn a Markdown or text file into audio tracks.")
    ap.add_argument("file", nargs="?")
    ap.add_argument("--engine", choices=["auto", "edge", "windows"], default="auto")
    ap.add_argument("--voice", default="")
    ap.add_argument("--rate", type=float, default=1.0)
    ap.add_argument("--one-file", action="store_true")
    ap.add_argument("--keep-code", action="store_true")
    ap.add_argument("--out", default=str(ROOT / "Audio"))
    ap.add_argument("--list-voices", action="store_true")
    a = ap.parse_args()
    a.rate = min(2.0, max(0.5, a.rate))

    engine = a.engine
    if engine == "auto":
        engine = "edge" if have_edge_tts() and online() else "windows"
    if engine == "edge" and not have_edge_tts():
        sys.exit("The edge engine needs the edge-tts package. Install it with:  python -m pip install edge-tts")

    if a.list_voices:
        print(f"Voices for the {engine} engine:")
        if engine == "edge":
            asyncio.run(edge_list())
        else:
            print(run_windows_ps(["-List"]).stdout.rstrip())
        return

    if not a.file:
        ap.print_help()
        return
    src = pathlib.Path(a.file)
    if not src.exists():
        sys.exit(f"File not found: {src}")
    text = src.read_text(encoding="utf-8", errors="replace")
    is_md = src.suffix.lower() in (".md", ".markdown", ".mdown", ".mkd")
    chapters = markdown_chapters(text, a.keep_code) if is_md else text_chapters(text)
    if a.one_file or len(chapters) == 1:
        chapters = [(src.stem, " ".join(body for _, body in chapters))]
    if not chapters or not chapters[0][1].strip():
        sys.exit("There is no readable text in that file.")

    ext = ".mp3" if engine == "edge" else ".wav"
    voice = a.voice or (DEFAULT_EDGE_VOICE if engine == "edge" else "")
    out_dir = pathlib.Path(a.out) / safe_name(src.stem, "Audio")
    out_dir.mkdir(parents=True, exist_ok=True)
    print(f"Making {len(chapters)} track(s) with the {engine} engine{(' (' + voice + ')') if voice else ''} at {a.rate}x...")

    playlist = []
    for i, (title, body) in enumerate(chapters, 1):
        name = f"{i:02d} - {safe_name(title, src.stem if len(chapters) == 1 else f'Part {i}')}{ext}"
        path = out_dir / name
        print(f"  {name}")
        if engine == "edge":
            asyncio.run(edge_save(body, voice, a.rate, path))
        else:
            windows_save(body, voice, a.rate, path)
        playlist.append(name)
    (out_dir / "Playlist.m3u").write_text("#EXTM3U\n" + "\n".join(playlist) + "\n", encoding="utf-8")
    print(f"\nDone! Saved to: {out_dir}")
    print("These files sync to the OneDrive app on your phone, ready to play.")


if __name__ == "__main__":
    main()
