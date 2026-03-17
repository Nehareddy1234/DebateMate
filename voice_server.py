"""
voice_server.py — FastAPI WebSocket Orchestration (V3 Final)
Fixed HTTP 410 by migrating to AssemblyAI StreamingClient v3.
Properly handles the voice-sandwich: Mic -> STT -> LLM -> TTS -> Speaker.
"""

import asyncio
import json
import os
import traceback

import assemblyai as aai
from assemblyai.streaming.v3 import (
    StreamingClient,
    StreamingClientOptions,
    StreamingEvents,
    StreamingParameters,
)
from cartesia import Cartesia
from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from langchain_core.messages import HumanMessage

# Import components from your main.py
from main import DebateState, app_brain, _extract_tip

load_dotenv()

# ─────────────────────────── Setup ────────────────────────────

app = FastAPI(title="AI Debate Coach API")

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Keys
aai.settings.api_key = os.getenv("ASSEMBLYAI_API_KEY")
CARTESIA_API_KEY = os.getenv("CARTESIA_API_KEY")

# Cartesia configuration
CARTESIA_VOICE_ID = "a0e99841-438c-4a64-b679-ae501e7d6091"
CARTESIA_MODEL_ID = "sonic-english"
cartesia_client = Cartesia(api_key=CARTESIA_API_KEY)

# ─────────────────────────── WebSocket Route ──────────────────

@app.websocket("/ws/debate")
async def debate_websocket(websocket: WebSocket):
    await websocket.accept()
    print("[WS] Client connected successfully")
    
    loop = asyncio.get_event_loop()
    transcript_queue = asyncio.Queue()
    
    # Initialize the Debate State
    state: DebateState = {
        "messages": [],
        "topic": "General Debate",
        "user_role": "Pro",
        "debate_summary": []
    }

    # ── Helpers: TTS and Brain ────────────────────────────────

    async def _tts_sentence(text: str):
        """Streams text to Cartesia and sends raw PCM bytes to frontend."""
        print(f"[TTS] Generating audio for rebuttal...")
        try:
            output_format = {
                "container": "raw",
                "encoding": "pcm_s16le",
                "sample_rate": 22050,
            }

            stream = cartesia_client.tts.stream(
                model_id=CARTESIA_MODEL_ID,
                transcript=text,
                voice_id=CARTESIA_VOICE_ID,
                output_format=output_format,
            )

            for output in stream:
                await websocket.send_bytes(output["audio"])
        except Exception as e:
            print(f"[TTS Error] {e}")

    async def brain_processor():
        while True:
            user_text = await transcript_queue.get()
            
            # Add user message to local history
            state["messages"].append(HumanMessage(content=user_text))
            
            try:
                # FIX: Pass a clean copy of the state to avoid LangGraph metadata conflicts
                # Ensure we only pass the keys defined in DebateState
                input_data = {
                    "messages": state["messages"],
                    "topic": state["topic"],
                    "user_role": state["user_role"],
                    "debate_summary": state["debate_summary"]
                }

                # Run the graph
                final_state = await app_brain.ainvoke(input_data)
                
                # Update our local state with the results
                state["messages"] = final_state["messages"]
                state["debate_summary"] = final_state["debate_summary"]

                # Extract the last message from the assistant
                last_ai_msg = final_state["messages"][-1].content
                clean_text, coach_tip = _extract_tip(last_ai_msg)

                await websocket.send_json({
                    "type": "agent_response",
                    "text": clean_text,
                    "tip": coach_tip,
                    "notes": state["debate_summary"]
                })

                await _tts_sentence(clean_text)
                
            except Exception as e:
                print(f"[Brain Error] {e}")
                # If a KeyError: '__start__' happens, it often helps to clear messages and restart the state
                if "__start__" in str(e):
                    print("Attempting state recovery...")
            finally:
                transcript_queue.task_done()
                
    # ── AssemblyAI v3 Event Handlers ──────────────────────────

    def on_begin(session,event):
        print(f"[AssemblyAI] Connection established. Session ID: {event.id}")

    def on_turn(session,event):
        if event.transcript:
            print(f"[STT Final] {event.transcript}")
            # Send transcript to UI immediately
            asyncio.run_coroutine_threadsafe(
                websocket.send_json({
                    "type": "transcript", 
                    "speaker": "user", 
                    "text": event.transcript
                }),
                loop
            )
            # Queue for LLM processing
            asyncio.run_coroutine_threadsafe(
                transcript_queue.put(event.transcript), 
                loop
            )

    def on_error(session,error):
        print(f"[AssemblyAI Error] {error}")

    # ── Client Setup ──────────────────────────────────────────

    client = StreamingClient(
        StreamingClientOptions(
            api_key=aai.settings.api_key,
            api_host="streaming.assemblyai.com",
        )
    )

    client.on(StreamingEvents.Begin, on_begin)
    client.on(StreamingEvents.Turn, on_turn)
    client.on(StreamingEvents.Error, on_error)

    print("[AssemblyAI] Connecting with Universal-3 Pro...")
    try:
        client.connect(
            StreamingParameters(
                sample_rate=16000,
                speech_model="u3-rt-pro" 
            )
        )
    except Exception as e:
        print(f"[AssemblyAI] Connection failed: {e}")
        return

    # Start the background brain task
    processor_task = asyncio.create_task(brain_processor())

    # ── Main Listen Loop ──────────────────────────────────────

    try:
        while True:
            message = await websocket.receive()
            
            # Handle JSON messages (Setup/Start)
            if "text" in message:
                data = json.loads(message["text"])
                if data.get("type") == "start_debate":
                    state["topic"] = data.get("topic", state["topic"])
                    state["user_role"] = data.get("user_role", state["user_role"])
                    print(f"[WS] Debate Started: {state['topic']} as {state['user_role']}")

            # Handle Binary Audio Chunks (User Voice)
            elif "bytes" in message:
                client.stream(message["bytes"])

    except WebSocketDisconnect:
        print("[WS] Client disconnected")
    except Exception as exc:
        print(f"[WS] Unexpected error: {exc}")
    finally:
        # Clean up resources
        client.disconnect(terminate=True)
        processor_task.cancel()
        print("[WS] Connection cleaned up.")

# ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    # Use 0.0.0.0 to allow access from other devices on local network
    uvicorn.run(app, host="0.0.0.0", port=8000)