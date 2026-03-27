# ⬡ Subliminal Forge v2

A fully static, browser-based multi-layer subliminal affirmation music mixer. Upload a track, load affirmations across 3 independent layers with different textures and masking modes, add a binaural focus tone, and export a real mixed WAV — all in your browser, no backend, no accounts, no cloud.

---

## What's New in v2

- **3 independent subliminal layers** — each with its own affirmations, volume, speed, density, texture, and mode
- **5 masking textures** — Tone Burst, Soft Whisper, Deep Mask, Airy Hiss, Pulse Bed (all generated via Web Audio API)
- **Focus / Binaural layer** — generated stereo tone pairs for focus, calm, sleep, and deep modes
- **Session save / load / reset** via localStorage — affirmations, mixer settings, and presets are stored
- **6 preset packs** — Focus, Confidence, Discipline, Recovery, Gym, Study
- **Improved export engine** — DynamicsCompressor limiter + WaveShaper soft clip + peak normalization pass
- **Better VU meters** — animated horizontal bars for Music, Sub Mix, and Master
- **Better mobile UX** — larger touch targets, improved card layout, sticky header, safe area padding
- **Improved PWA** — better manifest, theme color, offline caching

---

## Deploy on GitHub Pages

### 1. Create a repository

Go to [github.com/new](https://github.com/new). Make it **public**. Name it anything (e.g. `subliminal-forge`).

### 2. Upload files

Upload everything maintaining the folder structure:

```
index.html
styles.css
script.js
manifest.webmanifest
service-worker.js
README.md
icons/
  icon-192.png
  icon-512.png
```

**Via GitHub web UI:** drag and drop all files onto the repository page.

**Via git:**
```bash
git init
git add .
git commit -m "Subliminal Forge v2"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/subliminal-forge.git
git push -u origin main
```

### 3. Enable GitHub Pages

1. Go to your repo → **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: **main** · Folder: **/ (root)**
4. Save

Your app: `https://YOUR_USERNAME.github.io/subliminal-forge/`

Takes 1–2 minutes to go live.

---

## Icons

The manifest references `icons/icon-192.png` and `icons/icon-512.png`.

Create an `icons/` folder and add two PNG files. Any square image works. Free tools: [favicon.io](https://favicon.io), Canva, or any image editor.

The app still works without icons — the PWA install prompt just won't show a custom image.

---

## Use on iPhone

1. Open Safari and go to your GitHub Pages URL
2. Wait for it to fully load
3. Tap the **Share** button (box with arrow)
4. Tap **Add to Home Screen**
5. Name it and tap **Add**

Open from your Home Screen — runs full-screen like a native app.

---

## How to Use

### 1. Upload a Track
Tap the upload zone. Select an MP3 or WAV. The file is decoded in your browser and never leaves your device.

### 2. Set Up Layers
Each of the 3 subliminal layers has:
- **Enable toggle** — turn the layer on/off
- **Texture** — the audio style of the subliminal signal
- **Preset Pack** — load built-in affirmations
- **Affirmations textarea** — type, paste, or edit freely
- **Normalize** — splits a pasted paragraph into clean lines
- **Volume / Speed / Density / Spacing** — control how the layer sounds
- **Mode** — Audible Practice, Low Masked, Silent Fast

Use all 3 layers for a rich multi-layered effect. Example setup:
- Layer 1: Focus affirmations · Tone Burst · Low Masked
- Layer 2: Confidence affirmations · Soft Whisper · Silent Fast
- Layer 3: Identity statements · Deep Mask · Silent Fast

### 3. Focus Layer (optional)
Enables a stereo tone pair. Through headphones, the brain perceives the difference as a beat frequency (binaural beat effect). Choose:
- **Focus** — 40 Hz Gamma
- **Calm** — 10 Hz Alpha
- **Sleep** — 4 Hz Theta
- **Deep** — 2 Hz Delta
- **High Alert** — 60 Hz High Gamma

**Important:** headphones are required for the binaural beat effect. On speakers, you hear both carrier tones but the perceived beat is reduced.

### 4. Play
Tap the play button. All enabled layers render live via Web Audio API.

### 5. Save / Load Session
- **Save** — stores all affirmation text, layer settings, and mixer values in your browser's localStorage
- **Load** — restores a saved session. **Note: the audio file is not stored.** You must re-upload it each session (browser security prevents storing large audio blobs in localStorage reliably across all devices).
- **Reset** — clears all saved data and returns to defaults

### 6. Export WAV
1. Type a filename (default: `subliminal_mix`)
2. Tap **Export WAV**
3. The app renders everything offline via `OfflineAudioContext` — no server, no upload
4. A `.wav` file downloads to your device (on iPhone: Files app → Downloads)

---

## Masking Textures Explained

| Texture | Description |
|---|---|
| **Tone Burst** | Short FM-modulated tone bursts. Clear, slightly audible at higher volumes. |
| **Soft Whisper** | Bandpass-filtered noise bursts shaped to mimic whisper frequency profiles. |
| **Deep Mask** | Low-frequency amplitude-modulated rumble. Works as a bed beneath music. |
| **Airy Hiss** | High-pass filtered noise with stereo sweep. Blends into hi-hat/ambience. |
| **Pulse Bed** | Rhythmic bandpass tone pulses. Sits in the mid-range rhythm of the music. |

All textures are generated in real time using Web Audio API synthesis. **No speech synthesis or TTS is used** — see below for why.

---

## Honest Browser Limitations

### No TTS Voice Export
`speechSynthesis` audio output cannot be reliably captured into a Web Audio processing chain across browsers, and on iOS Safari it does not work at all for audio routing. This is a hard browser platform limitation, not a choice.

The subliminal layers are **entirely synthesized audio signals** — structured tone/noise patterns embedded at the subliminal volume you set. They are real audio layers that are exported into the WAV. They are not voice recordings.

### WAV Only
MP3 encoding is not natively available in browsers without a third-party codec library. This app deliberately has no dependencies, so export is WAV only. WAV files are larger than MP3 but lossless and universally supported.

### iPhone Export
- Requires iOS 14.5+ and Safari
- The WAV file downloads to Files app → Downloads (or iCloud Drive depending on your settings)
- Very long tracks (30+ min) may run out of memory during render on older iPhones — try shorter tracks
- The binaural focus layer is fully exported to WAV

### Storage
- `localStorage` stores your session (affirmations, settings) — typically 5MB limit per domain
- Audio files are never stored (too large, unreliable across iOS)
- Clearing Safari storage will delete your saved session

### Offline
The service worker caches the app shell for offline use after first load. Your audio files and session data remain available (from localStorage) offline, but you must re-upload audio each session.

---

## Technical Stack

| Concern | Implementation |
|---|---|
| Audio engine | Web Audio API — `AudioContext`, `GainNode`, `DynamicsCompressor`, `WaveShaper`, `OscillatorNode`, `StereoPannerNode`, `AnalyserNode` |
| Offline render | `OfflineAudioContext` |
| WAV encoding | Manual 16-bit PCM WAV construction via `DataView` |
| Peak normalization | Post-render peak scan + gain adjustment |
| Session storage | `localStorage` (JSON serialized) |
| PWA | Web App Manifest + Service Worker |
| Fonts | Google Fonts (DM Mono + Outfit) via CDN — works offline after first load if cached |
| Dependencies | **Zero** — no npm, no build step, no framework |

---

## File Structure

```
subliminal-forge/
├── index.html            UI and layout
├── styles.css            All styling
├── script.js             Complete audio engine and app logic
├── manifest.webmanifest  PWA manifest
├── service-worker.js     Offline shell cache
├── icons/
│   ├── icon-192.png      PWA icon (you provide)
│   └── icon-512.png      PWA icon (you provide)
└── README.md
```

---

*Subliminal Forge v2 · Static · No cloud · No backend · No tracking · MIT License*
