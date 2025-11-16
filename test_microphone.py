"""
Quick microphone test script.
Run this to verify your microphone is working before using the voice pipeline.
"""

import sounddevice as sd
import numpy as np
import wavio

print("🎤 Microphone Test")
print("=" * 50)

# List all audio devices
print("\n📋 Available Audio Devices:")
print(sd.query_devices())

# Get default input device
try:
    default_device = sd.default.device[0]  # Input device index
    device_info = sd.query_devices(default_device, 'input')
    print(f"\n✅ Default Input Device: #{default_device} - {device_info['name']}")
except Exception as e:
    print(f"\n⚠️ Could not get default device: {e}")
    default_device = None

# Test recording
print("\n🎙️ Testing 3-second recording...")
print("Speak now: 'Hello, this is a test'")

duration = 3
fs = 16000

audio = sd.rec(int(duration * fs), samplerate=fs, channels=1, dtype=np.int16)
sd.wait()

# Check audio level
audio_level = np.abs(audio).mean()
max_level = np.abs(audio).max()

print(f"\n📊 Audio Statistics:")
print(f"  Average level: {audio_level:.1f}")
print(f"  Maximum level: {max_level:.1f}")
print(f"  Sample rate: {fs} Hz")
print(f"  Duration: {duration} seconds")

# Evaluate quality
if audio_level < 10:
    print("\n❌ FAIL: No audio detected")
    print("Possible issues:")
    print("  - Microphone not connected")
    print("  - Wrong input device selected")
    print("  - Microphone muted in system settings")
    print("  - Microphone permissions not granted")
elif audio_level < 50:
    print("\n⚠️ WARNING: Audio level very low")
    print("Possible issues:")
    print("  - Microphone too far away")
    print("  - Microphone volume too low")
    print("  - Background noise suppression too aggressive")
elif audio_level < 200:
    print("\n✅ GOOD: Audio level acceptable")
    print("Your microphone is working!")
else:
    print("\n✅ EXCELLENT: Strong audio signal")
    print("Your microphone is working great!")

# Save test audio
wavio.write("test_recording.wav", audio, fs, sampwidth=2)
print(f"\n💾 Test recording saved as: test_recording.wav")
print("You can play this file to verify the recording quality")

print("\n" + "=" * 50)
print("🔧 Troubleshooting Tips:")
print("\n1. Low audio level?")
print("   - Increase microphone volume in Windows Sound Settings")
print("   - Get closer to the microphone")
print("   - Check if microphone is muted")

print("\n2. Wrong device?")
print("   - Look at the device list above")
print("   - Edit phase2_pipeline.py line 53:")
print("   - Add: device=X (where X is the correct device index)")

print("\n3. No audio detected?")
print("   - Grant microphone permissions to Python/Terminal")
print("   - Check Windows Privacy Settings → Microphone")
print("   - Try a different microphone")

print("\n4. Still not working?")
print("   - Run: python -c \"import sounddevice as sd; sd.check_input_settings()\"")
print("   - Check Device Manager → Audio inputs")
print("   - Restart your computer")

print("\n✅ Test complete!")
