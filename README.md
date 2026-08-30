# DebateMate — AI Debate Coach

A real-time voice-based debate sparring partner. Speak naturally against an AI opponent that challenges your arguments, coaches you when you're stuck, and speaks its replies back to you — powered by Gemini, LangGraph, and Deepgram's streaming speech APIs.

## 🎯 Features

- **Voice-to-Voice Debate** — full-duplex voice loop: mic → transcription → AI rebuttal → spoken reply
- **AI or User Opens** — choose who makes the opening statement
- **Pro / Con Stances** — the AI always argues the opposite side of yours
- **Smart Coaching** — say "I'm stuck" (or hit the 💡 Help Me button) and the AI switches from opponent to coach, hinting angles for *your* side
- **Argument Summarization** — key points are captured as ≤8-word sticky notes
- **Live Transcription** — interim captions plus finalized turns for both speakers
- **Gapless TTS Playback** — streamed Aura-2 audio scheduled back-to-back on the Web Audio clock
- **Transcript Export** — download the debate as `.txt` and save a structured JSON copy server-side
- **3D Visualizer** — animated sphere reacts to user speech and AI speaking state

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, Vite, TailwindCSS, React Three Fiber |
| **Backend** | FastAPI + uvicorn, Python asyncio |
| **Orchestration** | LangGraph (intent-routed graph: opponent / help coach / opening) |
| **LLM** | Google Gemini (`gemini-3.6-flash` default) with structured output; OpenAI-compatible fallback via `OPENAI_BASE_URL` |
| **Speech-to-Text** | Deepgram Flux (`/v2/listen`, EndOfTurn events) |
| **Text-to-Speech** | Deepgram Aura-2 (`aura-2-asteria-en`, streaming linear16 24 kHz) |

## 📋 Prerequisites

- Python 3.10+
- Node.js 18+
- **Google AI API key** (free tier: https://aistudio.google.com/apikey)
- **Deepgram API key** (https://console.deepgram.com)

## 🚀 Installation

### 1. Clone the repository

```bash
git clone <repo-url>
cd DebateMate
```

### 2. Backend setup

```bash
python -m venv venv
venv\Scripts\activate        # Windows  (source venv/bin/activate on macOS/Linux)
pip install -r requirements.txt
```

Create a `.env` file in the project root:

```env
GOOGLE_API_KEY=your-google-ai-key
DEEPGRAM_API_KEY=your-deepgram-key
```

Optional overrides:

```env
GOOGLE_MODEL=gemini-3.6-flash   # any Gemini model with function calling
OPENAI_API_KEY=...              # fallback provider (used only if GOOGLE_API_KEY is absent)
OPENAI_BASE_URL=...             # point the fallback at any OpenAI-compatible router
OPENAI_MODEL=gpt-4o
```

> ⚠️ Keys are read at startup — restart the server after editing `.env`.

### 3. Start the backend

```bash
python voice_server.py
```

On startup it prints the active LLM provider, e.g. `[Startup] LLM provider: Gemini (GOOGLE_API_KEY set)`.

### 4. Frontend setup

```bash
cd frontend
npm install
npm run dev        # dev server
# or
npm run build      # production bundle in frontend/dist
```

## 🎙️ Usage

1. Pick a topic (preset or custom), your stance (Pro/Con), and who speaks first.
2. Tap the mic button and argue. The AI rebuts in voice and text.
3. Stuck? Say "help me" or press 💡 — the AI coaches you instead of countering.
4. **Save Transcript** downloads a `.txt` and stores structured JSON under `transcripts/`.

## 🧠 Architecture

```
Browser mic (16 kHz linear16) ──► FastAPI /ws/debate ──► Deepgram Flux STT
                                        │                     │
                                        │            EndOfTurn transcript
                                        ▼                     │
                               LangGraph debate brain ◄───────┘
                          (opening / opponent / help coach nodes)
                                        │
                          structured reply (rebuttal, coaching_tip, sticky_note)
                                        │
                    agent_response JSON ─► frontend transcript, notes & tips
                                        │
                          Deepgram Aura-2 TTS ─► binary PCM between
                          audio_start / audio_end frames ─► gapless playback
```

Key modules:

| File | Role |
|------|------|
| `voice_server.py` | WebSocket orchestration: STT streaming, turn finalization, TTS relay, transcript saving |
| `main.py` | LangGraph brain: `DebateReply` structured schema, intent routing, prompts |
| `frontend/src/hooks/useVoice.js` | Mic capture, WS protocol, gapless PCM playback |
| `frontend/src/App.jsx` | Setup screen, debate view, transcript/notes state |

Turn quality guards: turns with fewer than 2 words or average STT confidence below 0.65 are discarded, so breaths and ambient noise never trigger the AI.

## 🧪 Smoke test

```bash
python main.py
```

Runs one debate turn against the configured LLM and prints the rebuttal, coaching tip, and sticky note.

## 🗂️ Transcripts

Saved debates land in `./transcripts/` as JSON: topic, sides, timestamps, and the full turn-by-turn transcript.

## 🔧 Troubleshooting

| Symptom | Fix |
|---------|-----|
| `⚠️ Agent error: 429 ...` shown in the UI | LLM quota exhausted — check your key's credits; errors are now surfaced in the transcript instead of hidden |
| Wrong/stale LLM provider used | Keys load at startup — restart `voice_server.py` after editing `.env` |
| `404 This model ... is no longer available` | Google retires models quickly — set `GOOGLE_MODEL` to a current one |
| No transcription | Check `DEEPGRAM_API_KEY`; STT connects lazily on the first mic chunk |
| Mic works but AI silent | Run `python main.py` to isolate whether the LLM or the audio path is failing |
