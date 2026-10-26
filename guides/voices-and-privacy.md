# Voices and privacy

Petal Reader ships one production speech provider: the browser's Web Speech API. It does not include cloud credentials, analytics, accounts, or telemetry.

## Offline voices

Voices marked **offline** synthesize on the device after any required voice download. Enable **Offline voices only** to prevent Petal Reader from selecting an online browser voice.

- Windows: Settings → Time & language → Speech
- macOS/iPhone: Accessibility → Spoken Content → Voices
- Android: Text-to-speech output → install voice data

## Online voices

A browser may send the spoken text to its voice service for voices marked **online**. The provider can be Microsoft, Google, Apple, or another browser/OS vendor. Their terms and retention rules apply.

Petal Reader does not send text itself, but it cannot make an online browser voice local. Avoid online voices for confidential material.

## Highlight accuracy

Some voices emit exact word-boundary events. Others do not; Petal Reader estimates timing from the text and measured speaking rate. Estimated highlighting is intentionally labeled by behavior and must not be treated as exact alignment.

## Audio export

The `edge` exporter sends text to Microsoft's speech service through the unofficial `edge-tts` package. The `windows` exporter uses installed Windows voices locally. See [Audio export](audio-export.md).
