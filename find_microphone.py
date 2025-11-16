"""
Quick microphone finder - helps identify which device to use
"""
import sounddevice as sd
import numpy as np

print("🎤 Microphone Device Finder\n")
print("=" * 60)

# List all input devices
devices = sd.query_devices()
input_devices = []

print("Available INPUT devices:\n")
for i, dev in enumerate(devices):
    if dev['max_input_channels'] > 0:
        input_devices.append(i)
        default = " ← DEFAULT" if i == sd.default.device[0] else ""
        print(f"  [{i}] {dev['name']}{default}")
        print(f"      Channels: {dev['max_input_channels']}, Sample Rate: {dev['default_samplerate']}")

print("\n" + "=" * 60)
print("\n🧪 Testing each device (speak now for 3 seconds)...\n")

results = []

for device_id in input_devices:
    dev_name = devices[device_id]['name']
    print(f"Testing Device {device_id}: {dev_name[:40]}...")
    
    try:
        # Record 3 seconds
        duration = 3
        fs = 16000
        audio = sd.rec(int(duration * fs), samplerate=fs, channels=1, dtype=np.int16, device=device_id)
        sd.wait()
        
        # Check audio level
        audio_level = np.abs(audio).mean()
        max_level = np.abs(audio).max()
        
        results.append({
            'id': device_id,
            'name': dev_name,
            'avg_level': audio_level,
            'max_level': max_level
        })
        
        status = "✅ GOOD" if audio_level > 50 else "⚠️ LOW" if audio_level > 20 else "❌ NONE"
        print(f"  {status} - Average: {audio_level:.1f}, Max: {max_level:.1f}\n")
        
    except Exception as e:
        print(f"  ❌ ERROR: {e}\n")
        results.append({
            'id': device_id,
            'name': dev_name,
            'avg_level': 0,
            'max_level': 0
        })

print("=" * 60)
print("\n📊 RESULTS:\n")

# Sort by audio level
results.sort(key=lambda x: x['avg_level'], reverse=True)

for i, r in enumerate(results, 1):
    status = "🥇 BEST" if i == 1 and r['avg_level'] > 50 else "✅ GOOD" if r['avg_level'] > 50 else "⚠️ LOW" if r['avg_level'] > 20 else "❌ POOR"
    print(f"{i}. Device {r['id']}: {r['name'][:50]}")
    print(f"   {status} - Level: {r['avg_level']:.1f}")
    print()

print("=" * 60)
print("\n💡 RECOMMENDATION:\n")

best = results[0] if results else None
if best and best['avg_level'] > 50:
    print(f"✅ Use Device {best['id']}: {best['name'][:50]}")
    print(f"\nTo use this device, edit voice_listener.py line 71:")
    print(f"Change device=[1, None] to device=[{best['id']}, None]")
elif best and best['avg_level'] > 20:
    print(f"⚠️ Device {best['id']} works but audio is LOW")
    print(f"   {best['name'][:50]}")
    print("\nActions:")
    print("1. Increase Windows microphone volume to 100%")
    print("2. Get closer to microphone")
    print("3. Speak louder")
else:
    print("❌ No working microphone detected!")
    print("\nTroubleshooting:")
    print("1. Check microphone is connected")
    print("2. Grant microphone permissions to Python")
    print("3. Test in Windows Sound Settings")
    print("4. Try a different microphone")

print("\n" + "=" * 60)
