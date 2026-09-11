# AGENTS.md — DebateMate quick orientation

Voice-based AI debate coach: browser mic → Deepgram Flux STT → LangGraph brain
(Gemini) → Deepgram Aura-2 TTS, with JWT accounts and per-user transcript
storage. Full details, contracts, and the done/to-do list: **see HANDOFF.md**.

## Commands

```bash
venv\Scripts\activate                 # Python 3.11 venv exists at ./venv
python voice_server.py                # backend + built frontend on :8000
python main.py                        # LLM smoke test (needs GOOGLE_API_KEY)
python -m pytest tests/ -v            # no API keys needed (conftest fakes them)

cd frontend
npm run dev                           # :5173, proxies to :8000
npm run build                         # -> frontend/dist — COMMIT the rebuilt dist
```

## Rules of the road

- Keys load at startup: restart the server after editing `.env`.
- LLM provider: Gemini (`GOOGLE_API_KEY`); fallback OpenAI-compatible only if
  Google key absent. 404 on model = Google retired it → set `GOOGLE_MODEL`.
- Storage is a JSON object store (`storage.py`): local `./storage/` in dev,
  S3 in prod. There is NO SQL database despite older docs.
- Deepgram `EndOfTurn` is the only LLM trigger; keep `_extract_result`
  shape-agnostic (tests cover Flux TurnInfo + v1/v2 Listen shapes).
- Frontend dist is committed by design; rebuild and commit after UI changes.
- Never put the JWT in the WS URL — it rides in the handshake frame.
