import json
import logging
import asyncio
import traceback
import random
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from google.adk.agents.live_request_queue import LiveRequestQueue
from google.adk.agents.run_config import RunConfig, StreamingMode
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types
import os
from dotenv import load_dotenv

# Load the environment variables from the .env file
load_dotenv()

# Import the brain we just built! 
from .agent import vvob_agent  

# Import your real assessment data
from .data_service import NUMERACY_DATA

logger = logging.getLogger("assessment")
router = APIRouter()

# =======================================
# HTTP ROUTES: Fetch Assessment Data
# =======================================

@router.get("/api/assessments/numeracy/random")
async def get_random_numeracy():
    # Grabs a random tool from your NUMERACY_DATA in data_service.py
    return random.choice(NUMERACY_DATA)

@router.get("/api/assessments/literacy/random")
async def get_random_literacy():
    # Mock data for Literacy (Replace with LITERACY_DATA from data_service if you have it!)
    return {
        "sections": {
            "letter_sounds": ["s", "t", "p", "n", "a"],
            "words": [
                {"word": "cat"}, {"word": "sun"}, 
                {"word": "mat"}, {"word": "dog"}, {"word": "run"}
            ],
            "simple_paragraph": "The cat sat on the mat. The sun was hot. The dog ran to play."
        }
    }


# =======================================
# WEBSOCKET ROUTE: Gemini ADK Live Stream
# =======================================

# ADK Session Management (Remembers students automatically)
session_service = InMemorySessionService()
runner = Runner(app_name="booxclash", agent=vvob_agent, session_service=session_service)

@router.websocket("/ws/assess/live")
async def live_assessment(websocket: WebSocket):
    logger.info("🔌 New ADK WebSocket connection request received.")
    await websocket.accept()

    try:
        # Phase 1: Initialize Context
        init_data = await websocket.receive_text()
        data = json.loads(init_data)
        
        session_id = data.get("session_id", "default_student")
        instrument_data = data.get("instrument")

        # Create or fetch session memory
        session = await session_service.get_session(app_name="booxclash", user_id="default", session_id=session_id)
        if not session:
            await session_service.create_session(app_name="booxclash", user_id="default", session_id=session_id)

        # Force AUDIO mode to avoid the 1007 crash with the native-audio model
        run_config = RunConfig(
            streaming_mode=StreamingMode.BIDI,
            response_modalities=["AUDIO"],  # Required for native-audio model
            session_resumption=types.SessionResumptionConfig(),
        )

        live_request_queue = LiveRequestQueue()

        # Inject the dynamic flowchart for this specific session silently
        instrument_msg = types.Content(parts=[types.Part(
            text=f"SYSTEM CONTEXT OVERRIDE. Follow this flowchart strictly: {json.dumps(instrument_data)}"
        )])
        live_request_queue.send_content(instrument_msg)

        # =======================================
        # TASK 1: Receive from React (Upstream)
        # =======================================
        async def upstream_task():
            chunk_count = 0
            try:
                while True:
                    # websocket.receive() natively handles both text and binary frames
                    message = await websocket.receive()
                    
                    # 1a. Fast Binary Audio (No Base64!)
                    if "bytes" in message:
                        chunk_count += 1
                        if chunk_count % 10 == 0:
                            logger.info(f"🎤 Receiving binary audio buffer... ({chunk_count} buffers processed)")
                        
                        audio_blob = types.Blob(mime_type="audio/pcm;rate=16000", data=message["bytes"])
                        live_request_queue.send_realtime(audio_blob)

                    # 1b. Text Commands (like END_OF_TURN)
                    elif "text" in message:
                        msg_data = json.loads(message["text"])
                        if msg_data.get("type") == "text":
                            logger.info(f"🛑 Sending prompt to Gemini: {msg_data['text']}")
                            content = types.Content(parts=[types.Part(text=msg_data["text"])])
                            live_request_queue.send_content(content)
                            
            except WebSocketDisconnect:
                logger.info("👋 Student disconnected")
            except Exception as e:
                logger.error(f"Upstream error: {e}")

        # =======================================
        # TASK 2: Receive from Gemini (Downstream)
        # =======================================
        async def downstream_task():
            try:
                # runner.run_live automatically manages the Gemini connection!
                async for event in runner.run_live(
                    user_id="default",
                    session_id=session_id,
                    live_request_queue=live_request_queue,
                    run_config=run_config,
                ):
                    # === 🚨 NEW RAW EVENT LOGGING 🚨 ===
                    # This dumps EVERYTHING Gemini is doing to your terminal
                    logger.info(f"🔍 [RAW GEMINI EVENT]: {event.model_dump_json(exclude_none=True)}")
                    
                    # Intercept the Tool Call so we can send the grade to React
                    if getattr(event, "tool_call", None):
                        for fc in event.tool_call.function_calls:
                            if fc.name == "submit_grade":
                                logger.info(f"✅ 🛠️ ADK EXECUTED TOOL: {fc.name} | PAYLOAD: {fc.args}")
                                
                                # Send payload to React UI
                                await websocket.send_text(json.dumps({
                                    "type": "GRADE_SUBMITTED",
                                    "payload": fc.args
                                }))

                    # Intercept standard content (Text, Audio, or Turn Signals)
                    if getattr(event, "server_content", None):
                        
                        # 1. Check if Gemini is speaking or writing
                        if event.server_content.model_turn:
                            for part in event.server_content.model_turn.parts:
                                if part.text:
                                    logger.info(f"💬 Gemini is thinking/writing: {part.text}")
                                if part.inline_data:
                                    logger.warning(f"🔊 Gemini is sending AUDIO data back! ({len(part.inline_data.data)} bytes)")

                        # 2. Check if Gemini thinks the conversation turn is over
                        if event.server_content.turn_complete:
                            logger.info("🏁 Gemini has finished its processing turn.")

            except Exception as e:
                logger.error(f"Downstream error: {e}")
                traceback.print_exc()

        # Run both tasks simultaneously
        await asyncio.gather(upstream_task(), downstream_task())

    except Exception as e:
        logger.error(f"Critical Connection Error: {e}")
    finally:
        if websocket.client_state.name != "DISCONNECTED":
            await websocket.close()
        if 'live_request_queue' in locals():
            live_request_queue.close()