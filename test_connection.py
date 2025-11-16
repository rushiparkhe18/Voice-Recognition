#!/usr/bin/env python3
"""
Quick test script to verify WebSocket connection and Chrome extension
"""

from ws_send import send_intent
import time

print("🧪 Testing Voice Control System Connection")
print("=" * 60)

print("\n📤 Sending test command to Chrome extension...")
print("Command: Open new tab")

try:
    test_payload = {
        "command": "open new tab",
        "intent": "NEW_TAB",
        "confidence": 1.0
    }
    
    send_intent(test_payload)
    print("✅ Test command sent successfully!")
    print("\n🔍 Check your Chrome browser:")
    print("  - Did a new tab open?")
    print("  - Did you hear 'New tab opened'?")
    print("  - Check WebSocket server terminal for message receipt")
    
except Exception as e:
    print(f"❌ Error: {e}")
    print("\n💡 Troubleshooting:")
    print("  1. Make sure ws_server.py is running")
    print("  2. Make sure Chrome extension is loaded")
    print("  3. Check extension badge shows 🟢 (green)")

print("\n" + "=" * 60)
