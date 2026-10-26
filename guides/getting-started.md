# Getting started

## Computer: no installation

1. Download and unzip Petal Reader.
2. Open `PetalReader.html` in a modern browser.
3. Paste text, drag in a file, or choose **Open file**.
4. Press Play or double-click a word.

Microsoft Edge usually offers the broadest selection of natural voices. The app itself works from `file://` and needs no server.

## Windows setup

Run `Setup Petal Reader.cmd` to create Desktop and Start-menu shortcuts and install the included VS Code extension. If you move the folder, run setup again.

The script is readable at `tools/setup.ps1`. It creates local shortcuts, invokes VS Code when available, and marks OneDrive copies for offline use.

## Phone or tablet

Open <https://SophieTse18.github.io/petal-reader/>. On iPhone use Safari's **Share → Add to Home Screen**. On Android use Chrome's **Install app** or **Add to Home screen**.

Browser speech may pause when the screen locks. Use [audio export](audio-export.md) for background listening.

## VS Code

Install `vscode-extension/petal-reader-markdown-1.0.0.vsix`, open a Markdown file, and run **Read Aloud in Preview**. The extension reads rendered Markdown rather than punctuation and source syntax.

## Troubleshooting

- No sound: test another voice and check system volume.
- Robotic voice: choose a downloaded premium voice or an online natural voice.
- Voice list still loading: wait a few seconds; some browsers load voices asynchronously.
- Highlight drifts: the selected voice may not provide word boundaries, so Petal Reader estimates timing.
- Saved document is missing: browser storage may be disabled, full, or cleared.
