#!/usr/bin/env python3
"""
Continuous voice command listener - keeps models loaded and listens continuously
Much faster than loading models for each command
WITH VOICE FEEDBACK - Speaks confirmation after executing commands
"""

import sounddevice as sd
import numpy as np
import wavio
import noisereduce as nr
import soundfile as sf
import whisper
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import torch
import re
import difflib
import pandas as pd
import json
from ws_send import send_intent
import time
import pyttsx3
import threading

print("🚀 Starting Voice Command Listener...")
print("=" * 60)

# Initialize Text-to-Speech Engine
print("\n🔊 Initializing voice feedback system...")
tts_engine = pyttsx3.init()
tts_engine.setProperty('rate', 180)  # Speed of speech
tts_engine.setProperty('volume', 0.9)  # Volume level (0.0 to 1.0)
voices = tts_engine.getProperty('voices')
# Set a nice voice (usually index 1 is female, 0 is male)
if len(voices) > 1:
    tts_engine.setProperty('voice', voices[1].id)
print("✅ Voice feedback ready")

# Load everything once at startup
print("\n📚 Loading models (one-time startup)...")

# Load dataset
df = pd.read_csv("commands_dataset_expanded.csv")
df = df[df['command'].notnull()]
df['command'] = df['command'].astype(str)

# Load intents
with open("intents.json") as f:
    intent_actions = json.load(f)
intents = df['intent'].unique().tolist()

# Load FLAN-T5 (optimized for faster inference)
print("🤖 Loading FLAN-T5...")
tokenizer = AutoTokenizer.from_pretrained("google/flan-t5-base")
model_flan = AutoModelForSeq2SeqLM.from_pretrained("google/flan-t5-base")
device = "cuda" if torch.cuda.is_available() else "cpu"
model_flan = model_flan.to(device)
model_flan.eval()  # Set to evaluation mode for faster inference
print(f"✅ FLAN-T5 loaded on {device}")

# Load Whisper (using "tiny" for faster processing)
print("🤖 Loading Whisper (tiny model for speed)...")
WHISPER_MODEL = whisper.load_model("tiny")  # Changed from "base" to "tiny" for speed
print("✅ Whisper loaded")

print("\n" + "=" * 60)
print("✅ All models loaded! Ready for commands.")
print("=" * 60)

# Helper functions
def preprocess_command(command):
    command = command.lower().strip()
    command = re.sub(r'[^\w\s]', '', command)
    return command

def record_audio(filename="command.wav", duration=3, fs=16000):  # Reduced from 4s to 3s for faster response
    print("\n🎤 Listening... Speak now!")
    
    # Try multiple devices
    audio = None
    audio_level = 0
    
    # Try device 1 first (Realtek), then default
    for device in [1, None]:
        try:
            if device is not None:
                audio = sd.rec(int(duration * fs), samplerate=fs, channels=1, dtype=np.int16, device=device)
            else:
                audio = sd.rec(int(duration * fs), samplerate=fs, channels=1, dtype=np.int16)
            sd.wait()
            
            audio_level = np.abs(audio).mean()
            print(f"📊 Device {device if device else 'default'}: Audio level = {audio_level:.1f}")
            
            # If we got reasonable audio, use it
            if audio_level > 30:  # Lowered threshold from 50 to 30
                break
        except Exception as e:
            print(f"⚠️ Device {device} failed: {e}")
            continue
    
    if audio is None or audio_level < 30:
        print(f"❌ No audio detected (level: {audio_level:.1f})")
        print("💡 TIP: Speak LOUDER or increase microphone volume in Windows settings")
        return None
    
    print(f"✅ Audio captured (level: {audio_level:.1f})")
    wavio.write(filename, audio, fs, sampwidth=2)
    return filename

def denoise_audio(input_file="command.wav", output_file="clean_command.wav"):
    data, rate = sf.read(input_file)
    reduced_noise = nr.reduce_noise(y=data, sr=rate)
    sf.write(output_file, reduced_noise, rate)
    return output_file

def transcribe_audio(file_path):
    audio_data, sample_rate = sf.read(file_path)
    if len(audio_data.shape) > 1:
        audio_data = audio_data.mean(axis=1)
    if sample_rate != 16000:
        duration = len(audio_data) / sample_rate
        num_samples = int(duration * 16000)
        audio_data = np.interp(
            np.linspace(0, len(audio_data), num_samples),
            np.arange(len(audio_data)),
            audio_data
        )
    audio_data = audio_data.astype(np.float32)
    
    # Faster transcription with optimized settings
    result = WHISPER_MODEL.transcribe(
        audio_data, 
        language="en", 
        fp16=False,
        beam_size=1,  # Faster than default beam_size=5
        best_of=1     # Faster than default best_of=5
    )
    text = result["text"].strip()
    
    if not text or len(text) < 2:
        print("⚠️ No speech detected")
        return ""
    
    print(f"📝 Heard: \"{text}\"")
    return text

def classify_intent(command):
    command_clean = preprocess_command(command)
    
    if not command_clean:
        return {"command": command, "intent": "UNKNOWN", "confidence": 0.0}
    
    prompt = f"""Classify this voice command into one intent:
Intents: {', '.join(intents[:15])}
Command: "{command_clean}"
Intent:"""
    
    inputs = tokenizer(prompt, return_tensors="pt", truncation=True, max_length=512).to(device)
    
    # Faster generation with torch.no_grad() and optimized parameters
    with torch.no_grad():
        outputs = model_flan.generate(
            **inputs, 
            max_new_tokens=10, 
            output_scores=True, 
            return_dict_in_generate=True,
            num_beams=1,  # Greedy decoding for speed
            do_sample=False  # Deterministic output
        )
    raw_intent = tokenizer.decode(outputs.sequences[0], skip_special_tokens=True).strip()
    
    # Normalize
    intent = raw_intent.upper().replace(" ", "_").replace("-", "_")
    if intent not in intents:
        match = difflib.get_close_matches(intent, intents, n=1, cutoff=0.6)
        intent = match[0] if match else "UNKNOWN"
    
    scores = outputs.scores
    confidence = float(np.mean([torch.softmax(s, dim=-1).max().item() for s in scores])) if scores else 1.0
    
    return {"command": command, "intent": intent, "confidence": confidence}

def speak_response(text):
    """Speak response in a separate thread to avoid blocking"""
    def _speak():
        try:
            tts_engine.say(text)
            tts_engine.runAndWait()
        except Exception as e:
            print(f"⚠️ TTS error: {e}")
    
    thread = threading.Thread(target=_speak)
    thread.daemon = True
    thread.start()

def extract_parameter_from_command(command, intent):
    """Extract parameter/query from command based on intent"""
    cmd_lower = command.lower()
    
    # Extract video number for YouTube
    if intent == "PLAY_YOUTUBE_VIDEO":
        import re
        match = re.search(r'\b(first|1st|one|second|2nd|two|third|3rd|three|fourth|4th|four|fifth|5th|five)\b', cmd_lower)
        if match:
            word = match.group(1)
            num_map = {"first": "1", "1st": "1", "one": "1", 
                      "second": "2", "2nd": "2", "two": "2",
                      "third": "3", "3rd": "3", "three": "3",
                      "fourth": "4", "4th": "4", "four": "4",
                      "fifth": "5", "5th": "5", "five": "5"}
            return num_map.get(word, "1")
        return "1"
    
    # Extract site name for OPEN_WEBSITE
    if intent == "OPEN_WEBSITE":
        words = cmd_lower.replace("open ", "").replace("go to ", "").replace("visit ", "").strip()
        return words if words else None
    
    # Extract search query for SEARCH_GOOGLE
    if intent == "SEARCH_GOOGLE":
        query = cmd_lower.replace("search google for ", "").replace("search for ", "").replace("google ", "").strip()
        return query if query else command
    
    # Extract search query for SEARCH_YOUTUBE
    if intent == "SEARCH_YOUTUBE":
        query = cmd_lower.replace("search youtube for ", "").replace("open youtube ", "").replace("youtube ", "").strip()
        return query if query else command
    
    return None

def get_voice_response(intent, parameter=None):
    """Generate natural voice response for each intent with parameter support"""
    responses = {
        "SCROLL_DOWN": "Scrolling down",
        "SCROLL_UP": "Scrolling up",
        "REFRESH_PAGE": "Page refreshed",
        "NEW_TAB": "New tab opened",
        "CLOSE_TAB": "Tab closed",
        "NEXT_TAB": "Switched to next tab",
        "PREVIOUS_TAB": "Switched to previous tab",
        "ZOOM_IN": "Zoomed in",
        "ZOOM_OUT": "Zoomed out",
        "FULL_SCREEN": "Entering full screen",
        "EXIT_FULL_SCREEN": "Exiting full screen",
        "OPEN_WEBSITE": f"Opening {parameter}" if parameter else "Opening website",
        "SEARCH_GOOGLE": f"Searching Google for {parameter}" if parameter else "Searching on Google",
        "SEARCH_YOUTUBE": f"Opening YouTube {parameter}" if parameter else "Opening YouTube",
        "PLAY_YOUTUBE_VIDEO": f"Playing video {parameter}" if parameter else "Playing video",
        "STOP_YOUTUBE_VIDEO": "Video paused",
        "RESUME_YOUTUBE_VIDEO": "Video resumed",
        "READ_SECTION": "Reading content",
        "STOP_READING": "Stopped reading",
        "RESUME_READING": "Resuming reading",
        "OPEN_FIRST_WEBSITE": "Opening first link",
        "OPEN_SECOND_WEBSITE": "Opening second link",
        "UNKNOWN": "Command not recognized"
    }
    return responses.get(intent, "Command executed")

def process_command(text):
    if not text:
        return
    
    result = classify_intent(text)
    print(f"🎯 Intent: {result['intent']} (confidence: {result['confidence']:.2f})")
    
    intent_payload = {
        "command": result.get("command", text),
        "intent": result.get("intent", "UNKNOWN"),
        "confidence": float(result.get("confidence", 0.0))
    }
    
    # Apply fallback logic for scroll commands
    cmd_lower = text.lower()
    if "scroll" in cmd_lower and result['confidence'] < 0.55:
        if "down" in cmd_lower:
            intent_payload["intent"] = "SCROLL_DOWN"
        elif "up" in cmd_lower:
            intent_payload["intent"] = "SCROLL_UP"
        else:
            intent_payload["intent"] = "SCROLL_DOWN"
    
    # Extract parameter from command
    parameter = extract_parameter_from_command(text, intent_payload["intent"])
    if parameter:
        intent_payload["parameter"] = parameter
    
    print(f"➡️ Sending: {intent_payload['intent']}" + (f" ({parameter})" if parameter else ""))
    try:
        send_intent(intent_payload)
        print("✅ Command sent!")
        
        # Only provide voice feedback for local Python actions (not browser commands)
        # Browser commands will get feedback from Chrome extension's TTS
        local_actions = ["READ_SECTION", "STOP_READING", "RESUME_READING"]
        
        if intent_payload["intent"] in local_actions:
            response_text = get_voice_response(intent_payload["intent"], parameter)
            print(f"🔊 Speaking (Python): \"{response_text}\"")
            speak_response(response_text)
        else:
            print(f"🔊 Voice feedback will be provided by Chrome extension")
        
    except Exception as e:
        print(f"❌ Send failed: {e}")
        speak_response("Command failed")

# Main loop
def main():
    print("\n" + "="*60)
    print("🎤 Voice Command Listener Active")
    print("="*60)
    
    # Quick microphone test
    print("\n🔧 Testing microphone...")
    print("Available devices:")
    devices = sd.query_devices()
    for i, dev in enumerate(devices):
        if dev['max_input_channels'] > 0:
            print(f"  Device {i}: {dev['name']} ({dev['max_input_channels']} channels)")
    
    print("\nPress Ctrl+C to stop\n")
    
    command_count = 0
    
    try:
        while True:
            command_count += 1
            print(f"\n{'='*60}")
            print(f"Command #{command_count}")
            print(f"{'='*60}")
            
            # Record
            start_time = time.time()
            raw_file = record_audio()
            if not raw_file:
                print("⏭️ Skipping (no audio detected)")
                time.sleep(1)
                continue
            
            # Skip denoising for faster processing (optional - can be enabled if needed)
            # clean_file = denoise_audio(raw_file)
            
            # Transcribe directly from raw audio (faster)
            print("🤖 Transcribing...")
            text = transcribe_audio(raw_file)  # Using raw_file instead of clean_file
            if not text:
                print("⏭️ Skipping (no speech detected)")
                print("💡 TIP: Speak louder and clearer into microphone")
                time.sleep(1)
                continue
            
            # Process
            process_command(text)
            
            elapsed = time.time() - start_time
            print(f"⏱️ Total time: {elapsed:.1f}s")
            print("\nReady for next command...")
            time.sleep(0.5)  # Brief pause before next command
            
    except KeyboardInterrupt:
        print("\n\n👋 Stopping voice listener...")
        print(f"Total commands processed: {command_count}")

if __name__ == "__main__":
    main()
