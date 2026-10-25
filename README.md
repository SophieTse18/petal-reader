# 🌸 Petal Reader: a free read-aloud app

Petal Reader reads text aloud and highlights each word in yellow as it's spoken. It runs from **one HTML file** with no internet, no account, no install and no cost.

- **The app** (`PetalReader.html`): paste or open anything and listen.
- **A VS Code add-on**: listen to Markdown files right inside VS Code's **preview**, with a little player in the bottom-right corner.
- **Phone options**: turn notes into audio tracks, or install the app on your phone's home screen.

**Try it online :** https://YOUR-USERNAME.github.io/petal-reader/ (works offline after the first visit)

### Features
- Yellow highlight on the word being spoken, plus a soft tint on the current sentence.
- **Double-click any word** to start reading from exactly there. Single clicks never move your place.
- Play / pause / stop, back and forward 30 seconds, speed from 0.5× to 2×.
- A **time bar** you can drag or scroll, with **chapter marks** for every heading. Hover a mark to see its name and start time.
- **Total Estimated Time** that follows your speed and learns how fast each voice really talks.
- Paste keeps formatting, colours and code highlighting. Opens `.md`, `.txt` and `.html` files.
- Picks the most natural-sounding voices on your device first, and labels each one online or offline.
- Pastel dark theme, with a light “Paper page” option.

---

## Download and set up

### Option 1: just use it (any computer: Windows, Mac, Linux)
1. On this GitHub page, click the green **Code** button → **Download ZIP**.
2. Unzip it anywhere (e.g. your Documents folder).
3. Double-click **`PetalReader.html`**. It opens in your browser and works offline.

Or download only `PetalReader.html` from the [latest release](https://github.com/YOUR-USERNAME/petal-reader/releases/latest). That single file is the whole app.

### Option 2: full setup on Windows (shortcuts + VS Code add-on)
1. Download and unzip as above, into a folder you'll keep (e.g. `Documents\PetalReader`).
2. Double-click **`Setup Petal Reader.cmd`**.
   - If Windows shows “Windows protected your PC”, click **More info → Run anyway**. The script only creates shortcuts and installs the add-on; you can read it in `tools/setup.ps1`.
3. Setup does three things:
   - creates **Petal Reader** shortcuts on your Desktop and in the Start menu (they open the app in a clean Microsoft Edge window);
   - installs the **VS Code add-on**, if VS Code is installed;
   - if the folder is inside OneDrive, marks it **“Always keep on this device”** so it works offline.
4. To pin it to the taskbar: **Start → All apps → Petal Reader → right-click → Pin to taskbar**.

If you move the folder later, run `Setup Petal Reader.cmd` again.

### What's in this folder
| File / folder | What it is |
| --- | --- |
| `PetalReader.html` | **The app.** Everything is inside this one file. |
| `Setup Petal Reader.cmd` | Windows one-click setup: shortcuts, VS Code add-on, offline mode. |
| `Make Audio (drop a file here).cmd` | Windows: drag a `.md` or `.txt` file onto it to make audio tracks. |
| `samples/` | `Sample - Study Notes.md` to try things out. |
| `vscode-extension/` | The VS Code add-on (`.vsix` installer and its source). |
| `docs/` | The phone / web version, published with GitHub Pages. |
| `assets/` | Icons. |
| `tools/` | Setup, audio maker, icon maker and the build script. |
| `Audio/` | Created on your computer when you make audio tracks (not uploaded to GitHub). |

---

## 1. Using Petal Reader

### Getting text in
- **Paste** with `Ctrl+V` (`Cmd+V` on Mac). Formatting, fonts, sizes, bold, line breaks, colours and code highlighting are kept. `Ctrl+Shift+V` pastes plain text.
- **Open file**, or **drag a file onto the window**: `.md`, `.txt` or `.html`. Markdown is shown formatted, so the reader never says “hashtag hashtag”.
- **Format Markdown**: pasted raw Markdown (`# Heading`, `**bold**`, `- lists`)? Click this to turn it into formatted text.
- If pasted text comes in dark and hard to read, Petal Reader switches to the light **Paper page**. Use the **Night page / Paper page** button to choose yourself.
- Your text, place, voice and speed are saved automatically in your browser, on your computer only.

### Listening
| Control | What it does |
| --- | --- |
| **▶ / ❚❚** (big gradient button) | Play / pause |
| **■** | Stop and go back to the start |
| **⟲30 / 30⟳** | Back / forward 30 seconds |
| **Time bar** | Click or **drag** to move; **scroll the mouse wheel** over it to step 5 seconds. While you drag, the highlight and page follow. |
| **Marks on the time bar** | Your **headings**. Tall pink = main sections, lilac = sub-sections, small blue = smaller ones. Hover to see the name and start time. |
| **Double-click any word** | Starts reading **from exactly that word**. |
| **Single click / selecting text** | Safe: it never moves your place. |
| **Speed** | 0.5× to 2× with the slider, the presets, or the speed pill in the player. |

The side panel also has the **Chapters** list (numbered 1, 1.1, 2 … with start times; click to jump) and **Reading options**: *Follow along* (auto-scroll), *Read code blocks*, *Read web addresses* (off = says “link”) and *Read emoji*.

### Keyboard shortcuts
| Keys | Action |
| --- | --- |
| `Ctrl` + `Enter` | Play / pause (works even while typing) |
| `Space` | Play / pause (when you're not typing) |
| `Ctrl` + `[` and `Ctrl` + `]` | Back / forward 30 seconds |
| `←` / `→` on the time bar | Back / forward 5 seconds |
| `Esc` | Pause |

---

## 2. Voices: getting the most human sound

Petal Reader uses the voices your browser and computer provide, and puts the **most natural ones first** (“✨ Most natural”).

| Where | Voices | Quality | Internet? |
| --- | --- | --- | --- |
| **Microsoft Edge** (recommended; the Windows shortcut uses it) | Microsoft **Natural** voices, e.g. Natasha & William (Australia), Ava, Andrew, Emma, Brian (US), Sonia, Ryan (UK) | ⭐⭐⭐⭐⭐ Very human | Needs internet |
| Google Chrome | “Google US/UK English” | ⭐⭐⭐ OK | Needs internet |
| Windows built-in | Microsoft David, Zira, Mark | ⭐⭐ Robotic | Offline |
| macOS / iPhone | Siri, Premium and Enhanced voices | ⭐⭐⭐⭐ Natural | Offline once downloaded |
| Android | Google text-to-speech voices | ⭐⭐⭐⭐ Good | Offline once downloaded |

- If you're using an online voice and the internet drops, Petal Reader switches to an offline voice by itself. Tick **Offline voices only** to never use online voices.
- **More Windows voices:** Settings → *Time & language* → *Speech* → *Manage voices* → **Add voices**. Same standard quality, more accents.
- **Natural offline voices on Windows (unofficial, advanced):** [NaturalVoiceSAPIAdapter](https://github.com/gexgd0419/NaturalVoiceSAPIAdapter) unlocks Windows 11's Narrator natural voices for other apps. It needs administrator rights and its author warns it may stop working after Windows updates. Use at your own risk.
- **Mac:** System Settings → Accessibility → Spoken Content → System voice → Manage Voices → download a Premium or Enhanced voice.

**Privacy:** offline voices keep everything on your device. Online voices (Edge Natural, Google) send the text being read to Microsoft or Google to be spoken.

---

## 3. The VS Code add-on (read Markdown in preview mode)

### Install
- **Windows:** `Setup Petal Reader.cmd` installs it for you.
- **Any computer:** in VS Code open **Extensions** (`Ctrl+Shift+X`) → `…` menu at the top → **Install from VSIX…** → choose `vscode-extension/petal-reader-markdown-1.0.0.vsix` (also attached to each [release](https://github.com/YOUR-USERNAME/petal-reader/releases/latest)).
- If VS Code was already open, reload it: `Ctrl+Shift+P` → **Developer: Reload Window**.

### Use
1. Open any `.md` file.
2. Click the **▶ circle icon** at the top right of the editor (**Read Aloud in Preview**). The normal preview (`Ctrl+Shift+V`) works too.
3. Use the **player in the bottom-right corner of the preview**:
   - **▶ / ❚❚**, **⟲30 / 30⟳**, **■**, elapsed / total time and the current chapter.
   - A **time bar with chapter marks** for every `#`, `##`, `###`: hover, drag or scroll.
   - **Settings (sliders) button**: voice, speed, Total Estimated Time, a Chapters list and options (*Follow along*, *Read code blocks*, *Double-click a word to read from it*).
   - **⌄** shrinks the player to a tiny play button; **⌃** brings it back.
4. **Double-click any word in the preview** to read from there.

It reads only what the preview shows, never the Markdown symbols. Code blocks are skipped unless you switch them on. While the add-on is on, double-clicking a word in the preview means “read from here” instead of VS Code's usual “jump to editor” (you can switch this off in the settings).

**Keys (preview focused):** `Ctrl+Enter` play/pause · `Ctrl+[` / `Ctrl+]` back/forward 30 s · `Esc` pause.

**Natural voices in VS Code:** VS Code can only use the computer's built-in voices. Click the **speaker icon** at the top right of the editor (**Open in Petal Reader (natural voices)**), or right-click a `.md` file in the Explorer. The file opens in Petal Reader in Microsoft Edge, with its Natural voices.

**Remove:** Extensions → *Petal Reader: Read Markdown Aloud* → **Uninstall**.

---

## 4. Listening on your phone

### Option A: install the app on your home screen
1. On your phone, open **https://YOUR-USERNAME.github.io/petal-reader/**
2. **iPhone (Safari):** Share → **Add to Home Screen**. **Android (Chrome):** ⋮ menu → **Install app** (or *Add to Home screen*).
3. It opens like a normal app and works offline. Paste text or use **Open file** (e.g. `.md` files from Files, iCloud or OneDrive), then press ▶ or double-tap a word.

For natural voices on the phone:
- **iPhone:** Settings → Accessibility → Spoken Content → Voices → English → download an **Enhanced** or **Premium** voice.
- **Android:** Settings → *Text-to-speech output* → Google → install voice data.

Browsers pause speech when the screen locks or you switch apps (Petal Reader keeps the screen awake while reading). For listening with the screen off, use Option B.

### Option B: turn notes into audio tracks (needs Python)
1. Install [Python 3](https://www.python.org/downloads/) (on Windows, tick **Add python.exe to PATH**).
2. **Windows:** drag a `.md` or `.txt` file onto **`Make Audio (drop a file here).cmd`**. The first time, it offers to install **edge-tts**, a small free add-on for natural voices (needs internet while making the audio). Say **N** to use the offline Windows voices instead.
   **Mac / Linux:** `python3 -m pip install edge-tts`, then `python3 tools/make_audio.py "My Notes.md"`.
3. You get one track per chapter plus a playlist in `Audio/My Notes/` (`01 - Introduction.mp3`, `02 - Methods.mp3`, …).
4. Copy them to your phone, or put the folder in OneDrive / iCloud / Google Drive and play them from that app.

More options:
```bash
python tools/make_audio.py "My Notes.md" --voice en-AU-WilliamMultilingualNeural --rate 1.25
```
- `--voice`: e.g. `en-AU-NatashaNeural` (default), `en-US-AvaMultilingualNeural`, `en-GB-SoniaNeural`; for offline Windows voices a name like `Zira`.
- `--rate 0.5`–`2` speed · `--one-file` a single track · `--keep-code` also read code · `--engine windows` force offline (Windows only) · `--list-voices`.

> edge-tts is an unofficial, open-source tool that uses the same service as Microsoft Edge's Read Aloud. It's widely used for personal listening, but Microsoft could change the service at any time.

---

## 5. Troubleshooting

| Problem | Fix |
| --- | --- |
| No sound | Check the volume, then press **Test voice** in the side panel. Try another voice. |
| It sounds robotic | You're offline or not in Edge. Use Microsoft Edge while online and choose a voice marked **Natural**. |
| Voice list says “Loading…” | Wait a few seconds; Edge loads its Natural voices in the background. |
| Highlight runs slightly ahead or behind | Some voices (e.g. Chrome's Google voices) don't report word positions, so Petal Reader estimates. Edge voices are exact. |
| Pasted text is hard to see | Click **Night page / Paper page**. |
| “Too large to auto-save” | Very large documents still read fine; they just aren't remembered after closing. |
| “Windows protected your PC” on setup | Click **More info → Run anyway**. |
| VS Code player doesn't appear | Make sure you're looking at the **preview**, not the editor. Reload the window and check the add-on is enabled. |
| Shortcut stopped working after moving the folder | Run `Setup Petal Reader.cmd` again. |

---

## 6. For developers

`PetalReader.html` is the single source of truth: HTML, CSS and JavaScript in one file, with no dependencies and no build step needed to use it. The shared reading engine sits between the `==PETAL-CORE-BEGIN==` and `==PETAL-CORE-END==` markers.

After editing it, run:

```bash
python tools/build.py
```

This regenerates:
- `vscode-extension/media/` and the `.vsix` add-on (preview UI source: `vscode-extension/src/`);
- `docs/`, the phone / web version published by GitHub Pages.

`tools/make-icons.ps1` (Windows PowerShell) redraws the icons in `assets/`.

How it works, briefly: text is read with the browser's built-in [Web Speech API](https://developer.mozilla.org/docs/Web/API/SpeechSynthesis). Words are highlighted with the [CSS Custom Highlight API](https://developer.mozilla.org/docs/Web/API/CSS_Custom_Highlight_API), so your text is never modified. Speech is sent in sentence-sized pieces for reliable pausing, seeking and speed changes.

Contributions are welcome: open an issue or a pull request.

## License

[MIT](LICENSE). Free to use, change and share.
