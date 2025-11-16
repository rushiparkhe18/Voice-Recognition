// Content script for voice recognition (runs in page context)
let recognition = null;
let isListening = false;

console.log('🎤 Voice content script loaded');

// Initialize Speech Recognition
function initRecognition() {
  if (recognition) return true;
  
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    console.error('❌ Speech Recognition not supported in this browser');
    return false;
  }
  
  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = 'en-US';
  recognition.maxAlternatives = 1;
  
  recognition.onstart = () => {
    console.log('✅ Speech recognition started');
    isListening = true;
  };
  
  recognition.onresult = (event) => {
    const result = event.results[event.results.length - 1];
    if (result.isFinal) {
      const transcript = result[0].transcript.trim().toLowerCase();
      console.log('🎤 Heard:', transcript);
      
      // Send to background script (with callback to handle response properly)
      chrome.runtime.sendMessage({
        type: 'voiceCommand',
        transcript: transcript
      }, (response) => {
        // Handle response or ignore if channel closed
        if (chrome.runtime.lastError) {
          console.log('⚠️ Message sent (response not required)');
          return;
        }
        if (response) {
          console.log('✅ Processed as:', response.intent);
        }
      });
    }
  };
  
  recognition.onerror = (event) => {
    // Only log critical errors, ignore common ones
    if (event.error === 'not-allowed') {
      console.error('❌ Microphone permission denied!');
      chrome.runtime.sendMessage({
        type: 'permissionDenied'
      });
    } else if (event.error === 'no-speech') {
      // Normal - no speech detected, just continue listening
      console.log('⚠️ No speech detected');
    } else if (event.error === 'aborted') {
      // Normal - recognition was stopped
      console.log('⚠️ Recognition aborted');
    } else if (event.error === 'network') {
      console.error('❌ Network error - check internet connection');
    } else {
      console.error('❌ Recognition error:', event.error);
    }
  };
  
  recognition.onend = () => {
    console.log('🔄 Recognition ended');
    if (isListening) {
      console.log('🔄 Restarting recognition...');
      // Small delay before restarting to avoid rapid restarts
      setTimeout(() => {
        if (isListening) {
          try {
            recognition.start();
          } catch (e) {
            if (e.name === 'InvalidStateError') {
              console.log('⚠️ Already running');
            } else {
              console.error('Error restarting:', e.message);
              isListening = false;
            }
          }
        }
      }, 100);
    }
  };
  
  return true;
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Content script received:', message.type);
  
  // Handle ping (health check)
  if (message.type === 'ping') {
    sendResponse({ success: true });
    return true;
  }
  
  if (message.type === 'startRecognition') {
    console.log('🎤 Starting recognition in content script...');
    
    if (!recognition) {
      if (!initRecognition()) {
        sendResponse({ success: false, error: 'Speech recognition not supported' });
        return true;
      }
    }
    
    try {
      recognition.start();
      isListening = true;
      console.log('✅ Recognition started successfully');
      sendResponse({ success: true });
    } catch (e) {
      if (e.name === 'InvalidStateError') {
        console.log('⚠️ Already listening');
        sendResponse({ success: true });
      } else {
        console.error('❌ Error starting:', e);
        sendResponse({ success: false, error: e.message });
      }
    }
    
  } else if (message.type === 'stopRecognition') {
    console.log('⏸️ Stopping recognition in content script...');
    
    if (recognition && isListening) {
      isListening = false;
      recognition.stop();
      console.log('✅ Stopped recognition');
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false });
    }
  }
  
  return true; // Keep message channel open for async response
});

// Auto-initialize when script loads
initRecognition();
console.log('✅ Voice content script ready');
