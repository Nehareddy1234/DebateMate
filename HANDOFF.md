# DebateMate — Agent Handoff

Everything a developer (human or AI agent) needs to work on this repo: current
state, architecture, contracts, commands, and what is done vs. what remains.

_Last updated: 2026-09-01. Working tree clean; latest commit `eb9059e`
("Add accounts, S3 storage, landing page, and production hardening")._

## 1. What this project is

A real-time **voice debate sparring partner**. The user speaks into the browser
mic; the server transcribes (Deepgram Flux), runs a LangGraph "debate brain"
(Gemini LLM) that rebuts or coaches, and streams the spoken reply back
(Deepgram Aura-2 TTS) with live captions, sticky-note summaries, and coaching
tips. Users register/login; every debate can be saved and re-read.

## 2. Current state at a glance

| Area | Status |
|------|--------|
| Voice loop (mic → STT → LLM → TTS → playback) | Done, hardened |
| Accounts (bcrypt + JWT) | Done |
| Transcript save/list/get per user | Done (object store) |
| Coaching mode (voice intent + Help button) | Done |
| AI-or-User opening, Pro/Con stances | Done |
| Live captions + noise guard | Done |
| WS auto-reconnect, gapless TTS playback | Done |
| Tests (backend logic + REST) | Done — last local run all green; CI runs on every push |
| Frontend tests | **None** (CI only builds) |
| Docs | README mostly accurate; module table stale (see §10) |

Provider note: the brain currently runs on **Gemini** (`GOOGLE_API_KEY`); the
OpenAI key is dead. OpenAI-compatible fallback exists but is unused. Google
retires models fast — if you see `404 model not available`, update
`GOOGLE_MODEL` (default `gemini-3.6-flash`).

## 3. Repository map

Backend (Python 3.11, FastAPI, all at repo root):

| File | Role |
|------|------|
| `voice_server.py` | FastAPI app: `/ws/debate` WebSocket orchestration (STT streaming, turn finalization, LLM dispatch, TTS relay), CORS, rate limiting, static mount of `frontend/dist`, uvicorn entry (`python voice_server.py`) |
| `main.py` | LangGraph brain: `DebateState`, `DebateReply` schema, `detect_assist_intent`, nodes `opening_statement` / `opponent` / `help_coach`, compiled graphs `app_brain` / `app_opening` / `app_help`. Also runnable as smoke test (`python main.py`) |
| `auth.py` | bcrypt hashing, JWT create/decode, `get_current_user` dependency |
| `routes_auth.py` | `POST /auth/register` (5/min), `POST /auth/login` (10/min, username **or email**), `GET /auth/me` |
| `routes_transcripts.py` | `POST /transcripts` (30/min), `GET /transcripts` (list, newest 100), `GET /transcripts/{id}` (ownership enforced via per-user key path) |
| `schemas.py` | Pydantic request models (`SaveTranscriptRequest`, `RegisterRequest`, `LoginRequest`) — all input validated here |
| `storage.py` | Pluggable JSON object store: `LocalStore` (`./storage/`, override `STORAGE_ROOT`) or `S3Store` (when `S3_BUCKET` set) |
| `rate_limit.py` | shared slowapi `limiter` (per-IP) |
| `logging_config.py` | stdout logging, ISO timestamps, quiet `websockets`/`uvicorn.access` |
| `tests/` | pytest (asyncio auto mode): `test_brain.py` (pure logic), `test_auth.py` (REST via httpx ASGI transport); `conftest.py` fakes keys + temp store |
| `render.yaml` | Render blueprint (single web service) |

Frontend (`frontend/`, React 18 + Vite 5 + Tailwind + React Three Fiber):

| File | Role |
|------|------|
| `src/App.jsx` | Auth gate → Landing/AuthScreen; phases `setup` → `debate` → `history`; owns transcript/notes/tips state; save = `.txt` download + `POST /transcripts` |
| `src/hooks/useVoice.js` | Mic capture (16 kHz linear16, software downsample fallback), WS protocol + reconnect (exp. backoff, max 30 s, skip on code 4001), gapless PCM playback (24 kHz, Web Audio clock scheduling) |
| `src/hooks/useAuth.js` | JWT in `localStorage["dm_token"]`, `authFetch` wrapper, 401 auto-logout |
| `src/components/` | `LandingPage`, `AuthScreen`, `HistoryView`, `SphereVisualizer` (lazy-loaded), `TranscriptPanel`, `TranscriptOverlay`, `DebateNotes`, `ErrorBoundary` |
| `dist/` | **Committed build output** — Render serves it from FastAPI; rebuild + commit on frontend changes |

## 4. Runtime pipeline (one `/ws/debate` connection = one `DebateSession`)

1. **Handshake**: client sends first JSON frame (see §5). Server validates the
   JWT *in-frame*; invalid/missing → close code **4001**.
2. **AI opening** (if `first_speaker == "AI"`): `app_opening` runs immediately.
3. **STT**: mic PCM streams to Deepgram Flux `/v2/listen` (lazy connect on first
   audio chunk; 5 s cooldown after a failed connect). Flux wraps everything in
   `TurnInfo` frames dispatched by inner `event`: `Update` → live captions,
   `StartOfTurn` → reset buffers, `EndOfTurn` → the ONLY trigger for the LLM.
   Legacy v1 `Update`/`Results`/`Turn` branches remain as fallbacks.
4. **Noise guard** (`_should_accept_turn`): turns with < 2 words or average
   confidence < 0.65 are discarded (breaths/clicks never reach the LLM).
5. **Brain**: `app_brain` routes by regex intent (`detect_assist_intent`) →
   `opponent` or `help_coach`; Help button uses `app_help` directly. LLM call
   bounded by `LLM_TIMEOUT_S` (default 30 s). Replies are structured
   (`DebateReply`) and sanitized (`_plain_voice` strips markdown/emoji).
6. **Response fan-out**: `agent_response` JSON to client, then TTS: binary PCM
   between `audio_start` / `audio_end` JSON frames.
7. **Cleanup**: on disconnect all tasks cancelled, `CloseStream` to Deepgram.

All AI turns serialize through `_respond_lock` — opening/rebuttal/hint never interleave.

## 5. WebSocket protocol contract

Client → server:

| Frame | Shape |
|-------|-------|
| handshake (first, type `start_debate` or `setup`) | `{ type, topic, user_side: "Pro"|"Con", first_speaker: "AI"|"User", token: <JWT> }` (legacy `user_role` accepted) |
| help button | `{ type: "help_request" }` |
| audio | binary, linear16 PCM, 16 kHz mono (~250 ms chunks) |

Server → client:

| Frame | Shape |
|-------|-------|
| `ready` | `{ session_id }` |
| `setup_ack` | `{ session_id, topic, user_side, first_speaker }` |
| `partial_transcript` | `{ speaker: "user", text }` — interim captions |
| `transcript` | `{ speaker: "user", text }` — finalized turn |
| `ai_thinking_start` / `ai_thinking_end` | `{}` |
| `agent_response` | `{ rebuttal, coaching_tip, sticky_note, notes[], is_help, is_opening }` + legacy aliases `text`/`tip` |
| `audio_start` | `{ encoding: "linear16", sample_rate: 24000 }` then binary PCM chunks then `audio_end` |
| `error` | `{ text }` — client renders it as a ⚠️ transcript line |

## 6. REST API

| Endpoint | Auth | Notes |
|----------|------|-------|
| `POST /auth/register` | — | 5/min; 409 on duplicate username/email |
| `POST /auth/login` | — | 10/min; accepts username OR email |
| `GET /auth/me` | Bearer | |
| `POST /transcripts` | Bearer | 30/min; body = `SaveTranscriptRequest` |
| `GET /transcripts` | Bearer | summaries only, newest first, max 100 |
| `GET /transcripts/{id}` | Bearer | 404 for foreign/invalid ids (regex-guarded) |
| `POST /save_transcript` | Bearer | **deprecated alias** of `POST /transcripts` |
| `GET /healthz` | — | Render health check |

## 7. Storage model (JSON object store — no database)

| Key | Content |
|-----|---------|
| `users/<username_lower>.json` | user record (`id`, `username`, `email`, `password_hash`, `created_at`) |
| `user_index/email/<email_lower>.json` | `{"username": ...}` email→user lookup |
| `transcripts/<user_id>/<id>.json` | full transcript record |

Backend = S3 (`S3_BUCKET` set, boto3 via `asyncio.to_thread`) or local folder
(`STORAGE_ROOT`, default `./storage/`). Ownership checks come from the key
path; there is no shared index.

## 8. Environment variables

Keys load **at startup/import** — restart the server after editing `.env`.

| Var | Required | Purpose |
|-----|----------|---------|
| `GOOGLE_API_KEY` | yes (or OpenAI fallback) | Gemini provider; printed at startup |
| `DEEPGRAM_API_KEY` | yes | STT + TTS; server refuses to start without it |
| `GOOGLE_MODEL` | no | default `gemini-3.6-flash` |
| `OPENAI_API_KEY` / `OPENAI_BASE_URL` / `OPENAI_MODEL` | no | fallback provider (any OpenAI-compatible router); used only when `GOOGLE_API_KEY` absent |
| `JWT_SECRET` | **set in prod** | default dev value logs a warning at startup |
| `JWT_EXPIRE_MINUTES` | no | default 1440 |
| `S3_BUCKET` / `AWS_REGION` / `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | prod only | S3 storage backend |
| `STORAGE_ROOT` | no | local store dir (tests point it at a tempdir) |
| `CORS_ORIGINS` | no | comma-separated; default `*` (credentials always disabled) |
| `LLM_TIMEOUT_S` | no | default 30 |
| `LOG_LEVEL` | no | default INFO |
| `PORT` | no | Render injects it; default 8000 |

## 9. Commands

```bash
# Backend (Windows venv already exists at ./venv)
venv\Scripts\activate                 # or source venv/bin/activate
pip install -r requirements.txt
python voice_server.py                # API + WS + built frontend on :8000
python main.py                        # LLM smoke test (one debate turn)

# Tests (no API keys / AWS needed — conftest fakes them)
pip install pytest pytest-asyncio
python -m pytest tests/ -v

# Frontend
cd frontend
npm install
npm run dev                           # :5173, proxies /ws /auth /transcripts /healthz to :8000
npm run build                         # -> frontend/dist  (COMMIT this for Render)

# Deploy
# Render Blueprint from render.yaml + S3 bucket (README "Deployment" section)
```

CI (GitHub Actions, on push/PR): backend job runs pytest on Python 3.11;
frontend job runs `npm ci && npm run build` on Node 20.

## 10. Done ✅

- Full-duplex voice debate loop with Deepgram Flux STT (EndOfTurn-driven) and
  Aura-2 streaming TTS with gapless back-to-back playback scheduling.
- LangGraph brain with intent routing (opponent / help coach / opening),
  structured `DebateReply` output, plain-voice sanitization, 8-word sticky notes.
- User accounts: register/login/me, bcrypt + JWT, WS auth via in-frame token,
  rate limiting (slowapi), 401 auto-logout on the client.
- Per-user transcript persistence with Pydantic-validated input, ownership
  isolation, path-traversal-safe ids; `.txt` export in the UI; history view.
- Resilience: WS reconnect with exponential backoff + message queueing,
  STT lazy connect + reconnect cooldown + auto-reset, LLM/TTS timeouts,
  generic client-facing errors (details stay server-side).
- Noise guard, 16 kHz guarantee via software downsample, mic routed through a
  zero-gain sink (no speaker feedback).
- Tests: intent detection, voice sanitizing, Deepgram payload parsing (3
  shapes), noise guard, auth/transcript endpoints incl. ownership, traversal
  rejection, rate limiting. All green on last recorded run; CI enforces.
- Landing page, 3D sphere visualizer (lazy-loaded), transcript panel/overlay,
  notes & tips UI.
- Production hardening: env-driven CORS, healthz, logging config, Render
  blueprint, S3 storage backend.

## 11. To do / known issues 🚧

Documentation debt
1. **README module table is stale**: it lists `database.py` / `models.py`
   ("Async SQLAlchemy engine") — those files do not exist; storage is the JSON
   object store in `storage.py`. Fix the table (and note `routes_auth.py`,
   `rate_limit.py`, `logging_config.py` are also missing from it).
2. `voice_server.py` module docstring (point 7) still says transcripts persist
   "in the database (SQLite locally, Postgres in production)" — same fix:
   object store. `tests/test_auth.py` docstring ("throwaway SQLite") too.

Tech debt / cleanup
3. Deprecated `POST /save_transcript` alias + its test — remove once no old
   clients exist (frontend already uses `POST /transcripts`).
4. `frontend/dist` is committed by design (Render serves it) — easy to forget:
   any frontend change needs `npm run build` + commit, CI will not do it.
5. `useVoice.js` uses `createScriptProcessor` (deprecated Web Audio API);
   works everywhere today, but `AudioWorklet` is the modern replacement.
6. `@app.on_event("startup")` is deprecated in newer FastAPI — migrate to
   `lifespan` when upgrading.
7. Root `transcripts/` dir and committed `__pycache__/` are leftovers from the
   pre-object-store era — safe to delete (both gitignored).
8. No frontend tests; CI only verifies the build.

Functional gaps (candidates, roughly smallest → largest effort)
9. **Reconnect loses debate memory**: client reconnect re-sends the handshake,
   but the server creates a fresh session (new `session_id`, empty LLM
   history). UI transcript survives (client state), the AI forgets. Could
   resume by session id + replay of transcript lines.
10. No transcript **delete** endpoint (create/list/get only).
11. No barge-in: the user cannot interrupt the AI's spoken reply.
12. Render free tier sleeps after ~15 min idle and drops active debates
    (documented; paid plan for always-on).
13. No email verification / password reset; registration is open.

## 12. Gotchas for the next agent

- **Restart after `.env` changes** — keys are read at import time.
- Provider prints at startup (`[Startup] LLM provider: ...`); if replies fail
  with 404, the Gemini model was retired → set `GOOGLE_MODEL`.
- Don't combine `CORS_ORIGINS="*"` with credentials — intentionally disabled.
- EndOfTurn is the ONLY LLM trigger; don't react to `Update` frames.
- `_extract_result` is deliberately shape-agnostic (Flux TurnInfo vs v1/v2
  Listen) — keep it that way when touching STT parsing; tests cover 3 shapes.
- Tests fake `GOOGLE_API_KEY=test-google` to pass the startup provider check;
  no LLM/network call happens in the suite.
- `ws_max_size` is 1 MB inbound; mic chunks are ~250 ms so this is generous.
- JWT in the WS rides in the handshake frame, never the URL (no token leaks
  into access logs).
