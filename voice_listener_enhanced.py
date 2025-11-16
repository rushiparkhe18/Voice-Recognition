#!/usr/bin/env python3
"""
Voice-Based Web Accessibility for Blind Users
Optimized for: Speed, Accuracy, and Audio Feedback
"""

import sounddevice as sd
import numpy as np
import wavio
import soundfile as sf
import whisper
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import torch
import json
from ws_send import send_intent
import time
import pyttsx3
import threading

# ========== CONFIGURATION FOR BLIND USERS ==========
AUDIO_FEEDBACK_ENABLED = True  # Always provide audio confirmation
SPEECH_RATE = 200  # Words per minute (150-250 is comfortable)
SPEECH_VOLUME = 1.0  # Maximum volume for clarity
RESPONSE_TIMEOUT = 0.5  # Faster response (reduce from 1.0s to 0.5s)
AUDIO_THRESHOLD = 25  # Lower threshold for sensitivity

print("♿ Voice Web Accessibility - For Blind Users")
print("=" * 60)

# ========== INITIALIZE TTS (Text-to-Speech) ==========
print("\n🔊 Initializing audio feedback system...")
tts_engine = pyttsx3.init()
tts_engine.setProperty('rate', SPEECH_RATE)
tts_engine.setProperty('volume', SPEECH_VOLUME)

# Use clearest voice available
voices = tts_engine.getProperty('voices')
for voice in voices:
    if 'zira' in voice.name.lower() or 'hazel' in voice.name.lower():  # Microsoft Zira (female, clear)
        tts_engine.setProperty('voice', voice.id)
        break
print(f"✅ Audio feedback ready (Rate: {SPEECH_RATE} WPM)")

def speak(text, urgent=False):
    """Speak text using TTS - thread-safe for immediate response"""
    if not AUDIO_FEEDBACK_ENABLED:
        return
    
    def _speak():
        try:
            tts_engine.say(text)
            tts_engine.runAndWait()
        except:
            pass
    
    if urgent:
        # Speak immediately for important feedback
        _speak()
    else:
        # Non-blocking for normal feedback
        threading.Thread(target=_speak, daemon=True).start()

# ========== LOAD AI MODELS ==========
print("\n📚 Loading AI models...")
speak("Loading voice recognition system. Please wait.", urgent=True)

# Load Whisper (faster 'base' model instead of 'tiny' for better accuracy)
print("🤖 Loading Whisper (base model for better accuracy)...")
WHISPER_MODEL = whisper.load_model("base")  # Better accuracy than 'tiny'
print("✅ Whisper loaded")

# Load FLAN-T5 (keep small model for speed)
print("🤖 Loading intent classifier...")
TOKENIZER = AutoTokenizer.from_pretrained("google/flan-t5-small")
MODEL = AutoModelForSeq2SeqLM.from_pretrained("google/flan-t5-small")
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
MODEL.to(device)
print(f"✅ Intent classifier loaded on {device}")

# Load intent definitions
with open("intents.json") as f:
    INTENT_ACTIONS = json.load(f)

print("\n✅ System ready!")
speak("Voice recognition ready. You may start speaking commands.", urgent=True)

# ========== USER-FRIENDLY COMMAND MAPPING ==========
FRIENDLY_COMMANDS = {
    "SCROLL_DOWN": "Scrolling down the page",
    "SCROLL_UP": "Scrolling up the page",
    "SCROLL_TO_TOP": "Going to the top of the page",
    "SCROLL_TO_BOTTOM": "Going to the bottom of the page",
    "GO_BACK": "Going back to the previous page",
    "GO_FORWARD": "Going forward",
    "REFRESH_PAGE": "Refreshing the page",
    "NEW_TAB": "Opening a new tab",
    "CLOSE_TAB": "Closing the current tab",
    "NEXT_TAB": "Switching to the next tab",
    "PREVIOUS_TAB": "Switching to the previous tab",
    "ZOOM_IN": "Making text larger",
    "ZOOM_OUT": "Making text smaller",
    "RESET_ZOOM": "Resetting text size to normal",
    "FULL_SCREEN": "Entering fullscreen mode",
    "EXIT_FULL_SCREEN": "Exiting fullscreen mode",
    "SEARCH_GOOGLE": "Searching Google for {}",
    "SEARCH_YOUTUBE": "Searching YouTube for {}",
    "OPEN_WEBSITE": "Opening {}",
    "OPEN_YOUTUBE": "Opening YouTube",
    "OPEN_GMAIL": "Opening Gmail",
    "OPEN_GOOGLE": "Opening Google",
    "OPEN_FACEBOOK": "Opening Facebook",
    "OPEN_INSTAGRAM": "Opening Instagram",
    "OPEN_TWITTER": "Opening Twitter",
    "OPEN_LINKEDIN": "Opening LinkedIn",
    "OPEN_WHATSAPP_WEB": "Opening WhatsApp Web",
    "OPEN_DRIVE": "Opening Google Drive",
    "OPEN_MAPS": "Opening Google Maps",
    "OPEN_CALENDAR": "Opening Google Calendar",
    "OPEN_NEWS": "Opening news website",
    "BOOKMARK_PAGE": "Bookmarking this page",
    "OPEN_BOOKMARKS": "Opening your bookmarks",
    "OPEN_DOWNLOADS": "Opening downloads",
    "OPEN_SETTINGS": "Opening settings",
    "CLOSE_BROWSER": "Closing the browser",
    "PLAY_YOUTUBE_VIDEO": "Playing the video",
    "STOP_YOUTUBE_VIDEO": "Pausing the video",
    "READ_PAGE": "Starting to read the page. Please wait.",
    "READ_SECTION": "Starting to read the section. Please wait.",
    "READ_SELECTION": "Reading the selected text",
    "STOP_READING": "Stopped reading",
    "OPEN_FIRST_LINK": "Opening the first link on the page",
    "OPEN_SECOND_LINK": "Opening the second link on the page",
    "OPEN_THIRD_LINK": "Opening the third link on the page",
    "UNKNOWN": "I didn't understand that command. Please try again."
}

# ========== ENHANCED AUDIO CAPTURE ==========
def record_audio(duration=3, fs=16000, filename="command.wav"):
    """Record audio with enhanced sensitivity for blind users"""
    
    speak("Listening", urgent=False)
    
    # Try multiple devices for best audio
    devices = sd.query_devices()
    device_id = None
    
    # Prefer devices with "microphone" or "array" in name
    for i, device in enumerate(devices):
        if device['max_input_channels'] > 0:
            name_lower = device['name'].lower()
            if 'microphone' in name_lower or 'array' in name_lower:
                device_id = i
                break
    
    # Record audio
    audio = sd.rec(int(duration * fs), samplerate=fs, channels=1, device=device_id, dtype='int16')
    sd.wait()
    
    # Check audio level
    audio_level = np.abs(audio).mean()
    
    if audio_level < AUDIO_THRESHOLD:
        speak("No speech detected. Please speak louder.", urgent=True)
        return None
    
    # Save audio
    wavio.write(filename, audio, fs, sampwidth=2)
    return filename

# ========== FAST TRANSCRIPTION ==========
def transcribe_audio(file_path):
    """Transcribe with optimized settings for speed"""
    
    audio_data, sample_rate = sf.read(file_path)
    
    # Convert to mono if stereo
    if len(audio_data.shape) > 1:
        audio_data = audio_data.mean(axis=1)
    
    # Resample to 16kHz if needed
    if sample_rate != 16000:
        duration = len(audio_data) / sample_rate
        num_samples = int(duration * 16000)
        audio_data = np.interp(
            np.linspace(0, len(audio_data), num_samples),
            np.arange(len(audio_data)),
            audio_data
        )
    
    audio_data = audio_data.astype(np.float32)
    
    # Fast transcription
    result = WHISPER_MODEL.transcribe(
        audio_data,
        language="en",
        fp16=False,
        beam_size=3,  # Balance between speed and accuracy
        best_of=2,
        temperature=0.0  # More deterministic = faster
    )
    
    text = result["text"].strip()
    
    if not text or len(text) < 2:
        return ""
    
    print(f"📝 Heard: \"{text}\"")
    return text

# ========== IMPROVED INTENT CLASSIFICATION ==========
def classify_intent(command):
    """Classify with enhanced accuracy - optimized for blind users with ALL CSV commands"""
    
    # Direct keyword matching for common commands (faster and more accurate)
    command_lower = command.lower()
    
    # Filter out nonsensical transcriptions (likely background noise or unclear speech)
    # Check for common misheard phrases that don't make sense as commands
    nonsense_patterns = [
        "bring his face", "and then bring", "his face", "her face", "their face",
        "thank you", "you know", "i think", "maybe", "probably",
        "uh", "um", "ah", "hmm", "like"
    ]
    
    # If command starts with these patterns and has no valid keywords, reject it
    if any(pattern in command_lower for pattern in nonsense_patterns):
        # But still allow if it contains valid command keywords
        valid_keywords = [
            "open", "close", "scroll", "search", "go", "back", "forward", 
            "refresh", "tab", "zoom", "read", "play", "pause", "stop",
            "bookmark", "settings", "downloads", "youtube", "gmail", "google"
        ]
        if not any(keyword in command_lower for keyword in valid_keywords):
            print(f"⚠️ Ignoring unclear command: \"{command}\"")
            return None, 0.0
    
    # SCROLL DOWN - From CSV dataset
    if any(phrase in command_lower for phrase in ["scroll down", "page down", "move down", "go down", "move the page down", "scroll the screen down", "take me lower", "slide down", "go further down", "bring the page lower", "down"]):
        return "SCROLL_DOWN", 0.95
    
    # SCROLL UP - From CSV dataset
    if any(phrase in command_lower for phrase in ["scroll up", "page up", "move up", "go up", "scroll the screen up", "take me higher", "slide up", "go further up", "bring the page higher", "up"]):
        return "SCROLL_UP", 0.95
    
    # SCROLL TO TOP/BOTTOM
    if any(phrase in command_lower for phrase in ["go to top", "top of page", "scroll to top", "beginning", "start of page"]):
        return "SCROLL_TO_TOP", 0.95
    if any(phrase in command_lower for phrase in ["go to bottom", "bottom of page", "scroll to bottom", "end", "end of page"]):
        return "SCROLL_TO_BOTTOM", 0.95
    
    # GO BACK - From CSV dataset (improved matching to avoid false positives)
    # Only match if "back" appears with navigation context or as a clear command
    if any(phrase in command_lower for phrase in ["go back", "previous page", "back page", "go to last page", "take me back", "back please", "navigate back", "go back one step", "backtrack", "go to previous", "page back"]):
        return "GO_BACK", 0.95
    # Match standalone "back" only if it's the whole command (avoid false matches like "bring his face")
    if command_lower.strip() in ["back", "return"]:
        return "GO_BACK", 0.95
    
    # GO FORWARD - From CSV dataset
    if any(phrase in command_lower for phrase in ["go forward", "forward", "next page", "forward please", "move ahead", "forward page", "continue forward", "step forward", "navigate ahead", "move on", "ahead"]):
        return "GO_FORWARD", 0.95
    
    # REFRESH - From CSV dataset
    if any(phrase in command_lower for phrase in ["refresh", "reload", "reload page", "reload this tab", "refresh the site", "reload now", "restart the page", "update the page", "reload browser", "refresh screen", "refresh this site"]):
        return "REFRESH_PAGE", 0.95
    
    # NEW TAB - From CSV dataset
    if any(phrase in command_lower for phrase in ["new tab", "open new tab", "make a new tab", "create new tab", "start another tab", "new tab please", "add a tab", "launch a new tab", "open fresh tab", "create another tab", "one more tab"]):
        return "NEW_TAB", 0.95
    
    # CLOSE TAB - From CSV dataset
    if any(phrase in command_lower for phrase in ["close tab", "close this tab", "shut this tab", "remove tab", "end tab", "kill this tab", "close the current tab", "exit tab", "shut it down", "close browser tab"]):
        return "CLOSE_TAB", 0.95
    
    # NEXT TAB - From CSV dataset
    if any(phrase in command_lower for phrase in ["next tab", "go to next tab", "move to the right tab", "switch to next tab", "show next tab", "forward tab", "right tab", "next please", "change to next tab", "open next one"]):
        return "NEXT_TAB", 0.95
    
    # PREVIOUS TAB - From CSV dataset
    if any(phrase in command_lower for phrase in ["previous tab", "go back a tab", "last tab", "left tab", "switch to previous tab", "go to earlier tab", "back one tab", "show last tab", "move left tab", "previous please", "prev tab"]):
        return "PREVIOUS_TAB", 0.95
    
    # ZOOM IN - From CSV dataset
    if any(phrase in command_lower for phrase in ["zoom in", "enlarge", "make bigger", "increase zoom", "bigger screen", "magnify", "zoom closer", "enlarge text", "zoom more", "bigger please", "larger text", "bigger"]):
        return "ZOOM_IN", 0.95
    
    # ZOOM OUT - From CSV dataset
    if any(phrase in command_lower for phrase in ["zoom out", "shrink", "make smaller", "reduce zoom", "smaller screen", "minimize view", "zoom back", "reduce size", "smaller text", "zoom less", "smaller"]):
        return "ZOOM_OUT", 0.95
    
    # RESET ZOOM
    if any(phrase in command_lower for phrase in ["reset zoom", "normal size", "default zoom", "original size", "normal zoom"]):
        return "RESET_ZOOM", 0.95
    
    # FULLSCREEN - From CSV dataset
    if any(phrase in command_lower for phrase in ["fullscreen", "enter fullscreen", "make it fullscreen", "maximize screen", "show full screen", "fullscreen mode", "go fullscreen", "expand screen", "large screen", "view fullscreen", "full screen"]):
        return "FULL_SCREEN", 0.95
    
    # EXIT FULLSCREEN - From CSV dataset
    if any(phrase in command_lower for phrase in ["exit fullscreen", "leave fullscreen", "normal screen", "minimize fullscreen", "restore window", "back to normal", "shrink fullscreen", "turn off fullscreen", "restore default size", "out of fullscreen"]):
        return "EXIT_FULL_SCREEN", 0.95
    
    # READING - CRITICAL for blind users! From CSV dataset
    # MORE FLEXIBLE - check for "read" AND "page" anywhere in command
    if ("read" in command_lower and ("page" in command_lower or "this" in command_lower or "content" in command_lower or "everything" in command_lower or "all" in command_lower or "screen" in command_lower)):
        return "READ_PAGE", 0.95
    
    # Also catch simple "read page" variations
    if any(phrase in command_lower for phrase in ["read page", "read the page", "start reading", "read aloud", "speak this page", "narrate this"]):
        return "READ_PAGE", 0.95
    
    if any(phrase in command_lower for phrase in ["read selected", "read selection", "read highlighted", "read that", "read this text"]):
        return "READ_SELECTION", 0.95
    
    if any(phrase in command_lower for phrase in ["stop reading", "stop", "silence", "quiet", "pause reading"]):
        return "STOP_READING", 0.95
    
    # OPEN LINKS - For browsing search results (important for blind users)
    # MORE FLEXIBLE - check for number + "link" or "result"
    if ("first" in command_lower or "1st" in command_lower or "one" in command_lower) and ("link" in command_lower or "result" in command_lower or "option" in command_lower or "open" in command_lower or "click" in command_lower):
        return "OPEN_FIRST_LINK", 0.95
    
    if ("second" in command_lower or "2nd" in command_lower or "two" in command_lower) and ("link" in command_lower or "result" in command_lower or "option" in command_lower or "open" in command_lower or "click" in command_lower):
        return "OPEN_SECOND_LINK", 0.95
    
    if ("third" in command_lower or "3rd" in command_lower or "three" in command_lower) and ("link" in command_lower or "result" in command_lower or "option" in command_lower or "open" in command_lower or "click" in command_lower):
        return "OPEN_THIRD_LINK", 0.95
    
    # OPEN WEBSITES FIRST (more specific commands)
    # OPEN GOOGLE - Check BEFORE search (more specific: "open google" vs "google...")
    if any(phrase in command_lower for phrase in ["open google", "launch google", "go to google", "start google"]) and "search" not in command_lower:
        return "OPEN_GOOGLE", 0.95
    
    # OPEN GMAIL - From CSV dataset
    if any(phrase in command_lower for phrase in ["open gmail", "launch gmail", "go to gmail", "start gmail", "open mail", "check gmail", "show gmail", "gmail please", "access gmail", "go gmail"]) and "search" not in command_lower:
        return "OPEN_GMAIL", 0.95
    
    # OPEN YOUTUBE - From CSV dataset (only if NOT searching)
    if any(phrase in command_lower for phrase in ["open youtube", "launch youtube", "go to youtube", "start youtube", "show youtube", "access youtube", "youtube please", "bring up youtube", "open videos"]) and "search" not in command_lower:
        return "OPEN_YOUTUBE", 0.95
    
    # SEARCH - Check AFTER open commands (less specific)
    # MORE FLEXIBLE - check for "search" or "find" + "youtube" anywhere
    if ("youtube" in command_lower and ("search" in command_lower or "find" in command_lower or "look" in command_lower)) or "search youtube" in command_lower or "youtube search" in command_lower:
        return "SEARCH_YOUTUBE", 0.95
    
    # Google search - broad matching (only if not opening google)
    if ("search" in command_lower or "find" in command_lower or "look for" in command_lower) and "youtube" not in command_lower and "open" not in command_lower:
        return "SEARCH_GOOGLE", 0.95
    
    # Last resort: if just "google" mentioned (not "open google")
    if "google" in command_lower and "open" not in command_lower and "youtube" not in command_lower:
        return "SEARCH_GOOGLE", 0.95
    
    # OPEN FACEBOOK - From CSV dataset
    if any(phrase in command_lower for phrase in ["open facebook", "launch facebook", "go to facebook", "start facebook", "show facebook", "access facebook", "facebook please", "open social", "bring up facebook", "check facebook", "facebook"]):
        return "OPEN_FACEBOOK", 0.95
    
    # OPEN INSTAGRAM - From CSV dataset
    if any(phrase in command_lower for phrase in ["open instagram", "launch instagram", "go to instagram", "start instagram", "show instagram", "access instagram", "instagram please", "check instagram", "bring up instagram", "insta open", "instagram", "insta"]):
        return "OPEN_INSTAGRAM", 0.95
    
    # OPEN TWITTER/X - From CSV dataset
    if any(phrase in command_lower for phrase in ["open twitter", "launch twitter", "go to twitter", "start twitter", "show twitter", "access twitter", "twitter please", "bring up twitter", "check twitter", "open x", "twitter"]):
        return "OPEN_TWITTER", 0.95
    
    # OPEN LINKEDIN - From CSV dataset
    if any(phrase in command_lower for phrase in ["open linkedin", "launch linkedin", "go to linkedin", "start linkedin", "show linkedin", "access linkedin", "linkedin please", "bring up linkedin", "check linkedin", "open jobs site", "linkedin"]):
        return "OPEN_LINKEDIN", 0.95
    
    # OPEN WHATSAPP - From CSV dataset
    if any(phrase in command_lower for phrase in ["open whatsapp", "launch whatsapp web", "go to whatsapp", "start whatsapp", "show whatsapp", "access whatsapp web", "whatsapp please", "check whatsapp", "bring up whatsapp", "open chats", "whatsapp"]):
        return "OPEN_WHATSAPP_WEB", 0.95
    
    # OPEN GOOGLE DRIVE - From CSV dataset
    if any(phrase in command_lower for phrase in ["open google drive", "open drive", "launch drive", "go to drive", "start drive", "show drive", "access google drive", "drive please", "bring up drive", "open storage", "check drive", "google drive", "drive"]):
        return "OPEN_DRIVE", 0.95
    
    # OPEN GOOGLE MAPS - From CSV dataset
    if any(phrase in command_lower for phrase in ["open google maps", "open maps", "launch maps", "go to maps", "start maps", "show maps", "access google maps", "maps please", "bring up maps", "open navigation", "check maps", "google maps", "maps"]):
        return "OPEN_MAPS", 0.95
    
    # OPEN CALENDAR - From CSV dataset
    if any(phrase in command_lower for phrase in ["open calendar", "launch calendar", "go to calendar", "start calendar", "show calendar", "access calendar", "calendar please", "bring up calendar", "check calendar", "open schedule", "calendar"]):
        return "OPEN_CALENDAR", 0.95
    
    # OPEN NEWS - From CSV dataset
    if any(phrase in command_lower for phrase in ["open news", "launch news", "go to news", "start news site", "show news", "access news", "news please", "bring up news", "check headlines", "open articles", "news"]):
        return "OPEN_NEWS", 0.95
    
    # OPEN BOOKMARKS - Check BEFORE bookmark page (more specific: "open bookmarks" vs "bookmark")
    if any(phrase in command_lower for phrase in ["open bookmarks", "show bookmarks", "access bookmarks", "bring up bookmarks", "view bookmarks", "see bookmarks", "display bookmarks", "load bookmarks", "get bookmarks"]) or ("open" in command_lower and "bookmark" in command_lower):
        return "OPEN_BOOKMARKS", 0.95
    
    # BOOKMARK PAGE - Check AFTER open bookmarks (less specific)
    if any(phrase in command_lower for phrase in ["bookmark page", "save this page", "add to bookmarks", "mark this site", "save bookmark", "bookmark this", "store page", "add bookmark", "remember this page", "favorite this page"]) or ("bookmark" in command_lower and "open" not in command_lower):
        return "BOOKMARK_PAGE", 0.95
    
    # OPEN DOWNLOADS - From CSV dataset
    if any(phrase in command_lower for phrase in ["open downloads", "show downloads", "access downloads", "bring up downloads", "downloads please", "check downloads", "load downloads", "get downloads", "view downloads", "see downloaded files", "downloads"]):
        return "OPEN_DOWNLOADS", 0.95
    
    # OPEN SETTINGS - From CSV dataset
    if any(phrase in command_lower for phrase in ["open settings", "launch settings", "go to settings", "show settings", "access settings", "settings please", "bring up settings", "check settings", "load settings", "system settings", "settings"]):
        return "OPEN_SETTINGS", 0.95
    
    # CLOSE BROWSER - From CSV dataset
    if any(phrase in command_lower for phrase in ["close browser", "exit browser", "shut down browser", "quit browser", "close everything", "shut browser", "stop browser", "leave browser", "kill browser", "exit application"]):
        return "CLOSE_BROWSER", 0.95
    
    # Video controls
    if any(phrase in command_lower for phrase in ["play video", "play", "start video", "resume"]):
        return "PLAY_YOUTUBE_VIDEO", 0.90
    if any(phrase in command_lower for phrase in ["pause", "stop video", "pause video"]):
        return "STOP_YOUTUBE_VIDEO", 0.90
    
    # If no direct match, use AI
    prompt = f"Classify this voice command into one of these intents: {', '.join(INTENT_ACTIONS.keys())}. Command: '{command}'. Intent:"
    
    inputs = TOKENIZER(prompt, return_tensors="pt", max_length=256, truncation=True).to(device)
    outputs = MODEL.generate(**inputs, max_length=32, num_beams=1)
    intent = TOKENIZER.decode(outputs[0], skip_special_tokens=True).strip().upper()
    
    # Validate intent
    if intent not in INTENT_ACTIONS:
        return "UNKNOWN", 0.5
    
    return intent, 0.75

# ========== EXTRACT PARAMETERS ==========
def extract_parameter(command, intent):
    """Extract search queries, URLs, etc. - Enhanced for natural speech"""
    
    command_lower = command.lower()
    
    if intent == "SEARCH_GOOGLE":
        # Remove trigger words - handle multiple variations (order matters!)
        for phrase in ["search google for", "google search for", "google for", "search for", "find on google", "google", "search", "find"]:
            if phrase in command_lower:
                command_lower = command_lower.replace(phrase, "", 1).strip()
                break
        param = command_lower.strip()
        return param if param and len(param) > 1 else None
    
    if intent == "SEARCH_YOUTUBE":
        # Remove trigger words - handle YouTube search variations (order matters!)
        # DON'T remove "youtube" from the actual query, only from trigger phrases
        for phrase in ["search youtube for", "youtube search for", "search for on youtube", "find on youtube", "youtube search", "search youtube", "youtube for", "search for", "find"]:
            if phrase in command_lower:
                command_lower = command_lower.replace(phrase, "", 1).strip()
                break
        param = command_lower.strip()
        return param if param and len(param) > 1 else None
    
    if intent == "OPEN_WEBSITE":
        # Extract website URL or name
        for phrase in ["open", "go to", "visit", "navigate to"]:
            if phrase in command_lower:
                command_lower = command_lower.replace(phrase, "", 1).strip()
                break
        param = command_lower.strip()
        return param if param else "google.com"
    
    return None
    
    if intent == "OPEN_WEBSITE":
        # Extract website name
        param = command_lower.replace("open", "").replace("website", "").strip()
        return param if param else None
    
    return None

# ========== MAIN LOOP ==========
def main():
    command_count = 0
    
    print("\n" + "=" * 60)
    print("🎤 Voice Command Listener Active")
    print("=" * 60)
    print("\n💡 Optimized for blind users:")
    print("   ✅ Audio feedback for every action")
    print("   ✅ Faster response time")
    print("   ✅ Better accuracy with direct matching")
    print("\n📋 Try these commands:")
    print("   - 'Scroll down' / 'Scroll up'")
    print("   - 'Go back' / 'Go forward'")
    print("   - 'New tab' / 'Close tab'")
    print("   - 'Search for Python tutorials'")
    print("   - 'Read this page'")
    print("   - 'Open YouTube'")
    print("\nPress Ctrl+C to stop\n")
    
    speak("Voice control activated. Say your command now.", urgent=True)
    
    try:
        while True:
            command_count += 1
            print("\n" + "=" * 60)
            print(f"Command #{command_count}")
            print("=" * 60)
            
            start_time = time.time()
            
            # Record audio
            audio_file = record_audio(duration=3)
            if not audio_file:
                time.sleep(0.5)
                continue
            
            # Transcribe
            print("🤖 Transcribing...")
            command = transcribe_audio(audio_file)
            
            if not command:
                speak("No speech detected. Please try again.", urgent=True)
                time.sleep(0.5)
                continue
            
            # Classify intent
            intent, confidence = classify_intent(command)
            
            # Check if command was rejected as nonsensical
            if intent is None:
                speak("Please say a clear voice command", urgent=True)
                time.sleep(0.5)
                continue
            
            print(f"🎯 Intent: {intent} (confidence: {confidence:.2f})")
            
            # Extract parameters
            parameter = extract_parameter(command, intent)
            
            # Generate user-friendly feedback
            feedback = FRIENDLY_COMMANDS.get(intent, "Processing command")
            if parameter and "{}" in feedback:
                feedback = feedback.format(parameter)
            
            # Speak feedback IMMEDIATELY
            speak(feedback, urgent=True)
            
            # Send to Chrome extension
            if intent != "UNKNOWN":
                print(f"➡️ Sending: {intent}")
                intent_data = {
                    'intent': intent,
                    'command': command,
                    'confidence': float(confidence),
                    'parameter': parameter
                }
                send_intent(intent_data)
                print("✅ Command sent!")
            else:
                print("⚠️ Command not recognized")
            
            # Show timing
            elapsed = time.time() - start_time
            print(f"⏱️ Total time: {elapsed:.1f}s")
            print("\nReady for next command...")
            
            time.sleep(RESPONSE_TIMEOUT)
    
    except KeyboardInterrupt:
        print("\n\n👋 Stopping voice listener...")
        speak("Voice control stopped.", urgent=True)
        print(f"Total commands processed: {command_count}")

if __name__ == "__main__":
    main()
