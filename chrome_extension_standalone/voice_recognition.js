// Voice recognition content script
// This runs on actual web pages where microphone access is allowed

let recognition = null;
let isListening = false;

console.log('🎤 Voice recognition content script loaded');

// Initialize speech recognition
function initSpeechRecognition() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    console.error('Speech recognition not supported');
    return null;
  }
  
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = 'en-US';
  
  recognition.onstart = () => {
    console.log('🎤 Recognition started');
    isListening = true;
    chrome.runtime.sendMessage({
      type: 'recognitionStarted'
    });
  };
  
  recognition.onresult = (event) => {
    const last = event.results.length - 1;
    const text = event.results[last][0].transcript;
    
    console.log('📝 Recognized:', text);
    chrome.runtime.sendMessage({
      type: 'recognitionResult',
      text: text
    });
  };
  
  recognition.onerror = (event) => {
    console.error('❌ Recognition error:', event.error);
    
    // Stop listening on permission errors
    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
      isListening = false;
    }
    
    chrome.runtime.sendMessage({
      type: 'recognitionError',
      error: event.error
    });
  };
  
  recognition.onend = () => {
    console.log('🛑 Recognition ended, isListening:', isListening);
    
    // Only auto-restart if still listening
    if (isListening) {
      setTimeout(() => {
        if (isListening && recognition) {
          try {
            console.log('♻️ Restarting recognition...');
            recognition.start();
          } catch (e) {
            console.error('Failed to restart:', e);
            isListening = false;
            chrome.runtime.sendMessage({
              type: 'recognitionError',
              error: 'restart-failed'
            });
          }
        }
      }, 100);
    } else {
      chrome.runtime.sendMessage({
        type: 'recognitionStopped'
      });
    }
  };
  
  return recognition;
}

// Listen for messages from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Voice recognition received:', message);
  
  if (message.action === 'startRecognition') {
    if (!recognition) {
      recognition = initSpeechRecognition();
    }
    
    if (recognition) {
      try {
        recognition.start();
        isListening = true;
        sendResponse({ success: true });
      } catch (e) {
        console.error('Failed to start recognition:', e);
        sendResponse({ success: false, error: e.message });
      }
    } else {
      sendResponse({ success: false, error: 'Recognition not available' });
    }
  } else if (message.action === 'stopRecognition') {
    isListening = false;
    if (recognition) {
      recognition.stop();
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false });
    }
  }
  
  return true;
});
