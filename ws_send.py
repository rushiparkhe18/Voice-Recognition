# ws_send.py
import asyncio
import websockets
import json


async def _send_intent_async(intent_dict):
    uri = "ws://127.0.0.1:8765"
    try:
        async with websockets.connect(uri) as ws:
            # send a short handshake so server can deduplicate logical clients
            try:
                await ws.send(json.dumps({"type": "handshake", "client": "python_client"}))
            except Exception:
                pass
            await ws.send(json.dumps(intent_dict))
    except Exception as e:
        print("WS send error:", e)


def send_intent(intent_dict):
    try:
        asyncio.run(_send_intent_async(intent_dict))
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(_send_intent_async(intent_dict))
        loop.close()


