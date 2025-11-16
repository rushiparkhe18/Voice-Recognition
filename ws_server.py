# ws_server.py
import asyncio
import websockets
import json
import traceback

clients = set()
# Optional: map client-provided ids to websocket objects so we can deduplicate
clients_by_id = {}

async def handler(ws):
    # Register connection
    clients.add(ws)
    remote = getattr(ws, 'remote_address', None)
    print(f"🔗 Client connected (total: {len(clients)}) remote={remote}")
    try:
        async for message in ws:
            # message expected to be a JSON string
            print("📩 Received from client:", message)
            # try parse JSON and handle handshake
            try:
                data = json.loads(message)
            except Exception:
                data = None

            if isinstance(data, dict) and data.get('type') == 'handshake':
                cid = data.get('client_id') or data.get('client')
                if cid:
                    # if another websocket is registered for same id, close the old one
                    old = clients_by_id.get(cid)
                    if old is not None and old is not ws:
                        try:
                            await old.close()
                        except Exception:
                            pass
                    clients_by_id[cid] = ws
                    print(f"🤝 Handshake registered: {cid}")
                continue
            
            # Handle ping messages (keepalive)
            if isinstance(data, dict) and data.get('type') == 'ping':
                # Don't broadcast pings, just acknowledge
                continue

            # broadcast to all connected clients (except sender if it's python_client)
            sender_is_python = isinstance(data, dict) and data.get('client') == 'python_client'
            
            for c in list(clients):
                # Skip sending back to Python client (it's ephemeral)
                if sender_is_python and c == ws:
                    continue
                    
                try:
                    # Send to all other connected clients
                    await c.send(message)
                except websockets.exceptions.ConnectionClosed:
                    # Connection was closed, skip it
                    continue
                except Exception as e:
                    print(f"⚠️ Error sending to client: {e}")
                    # Don't close on send error - client might reconnect
    except websockets.exceptions.ConnectionClosed:
        print("⚠️ Client disconnected")
    except Exception as e:
        print("❌ Handler error:", e)
        traceback.print_exc()
    finally:
        # Clean up registry entries referencing this websocket
        clients.discard(ws)
        for k, v in list(clients_by_id.items()):
            if v is ws:
                del clients_by_id[k]
        print("🔌 Client removed (total: {})".format(len(clients)))

async def main():
    host = "127.0.0.1"
    port = 8765
    print(f"🌐 WebSocket server running at ws://{host}:{port}")
    async with websockets.serve(handler, host, port):
        await asyncio.Future()  # run forever

if __name__ == "__main__":
    asyncio.run(main())


