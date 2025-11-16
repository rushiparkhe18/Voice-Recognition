// Voice Control Page Script
// This page stays open and handles speech recognition for the entire browser

console.log('==========================================');
console.log('🎤 VOICE CONTROL PAGE LOADED');
console.log('==========================================');

let recognition = null;
let isListening = false;

const statusDiv = document.getElementById('status');
const lastCommandDiv = document.getElementById('lastCommand');

console.log('✅ Status div:', statusDiv);
console.log('✅ Last command div:', lastCommandDiv);

// Initialize speech recognition
function initSpeechRecognition() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    statusDiv.textContent = '❌ Speech recognition not supported';
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
    statusDiv.textContent = '🎤 Listening...';
    statusDiv.classList.add('listening');
    document.body.style.backgroundColor = '#667eea'; // Visual feedback
    
    chrome.runtime.sendMessage({
      type: 'recognitionStarted'
    });
  };
  
  recognition.onresult = (event) => {
    const last = event.results.length - 1;
    const text = event.results[last][0].transcript;
    
    console.log('📝 Recognized:', text);
    lastCommandDiv.textContent = text;
    
    chrome.runtime.sendMessage({
      type: 'recognitionResult',
      text: text
    });
  };
  
  recognition.onerror = (event) => {
    console.error('❌ Recognition error:', event.error);
    
    statusDiv.textContent = `❌ Error: ${event.error}`;
    statusDiv.classList.remove('listening');
    
    // Stop listening on critical errors
    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
      isListening = false;
      statusDiv.textContent = '❌ Microphone permission denied. Please allow access.';
    } else if (event.error === 'aborted') {
      // Aborted errors are common when quickly restarting - don't show error
      console.log('⚠️ Recognition aborted (normal during restart)');
      statusDiv.textContent = '🎤 Restarting...';
    } else if (event.error === 'no-speech') {
      // No speech detected - this is normal, just restart
      console.log('⚠️ No speech detected, continuing...');
    } else {
      // Other errors - stop listening and require manual restart
      isListening = false;
      statusDiv.textContent = `❌ Error: ${event.error} - Click to restart`;
    }
    
    chrome.runtime.sendMessage({
      type: 'recognitionError',
      error: event.error
    });
  };
  
  recognition.onend = () => {
    console.log('🛑 Recognition ended, isListening:', isListening);
    statusDiv.classList.remove('listening');
    document.body.style.backgroundColor = ''; // Reset background
    
    if (isListening) {
      // Add longer delay to prevent rapid restart loops
      setTimeout(() => {
        if (isListening && recognition) {
          try {
            console.log('♻️ Restarting recognition...');
            recognition.start();
          } catch (e) {
            console.error('Failed to restart:', e);
            // If already started, that's okay
            if (e.message && e.message.includes('already started')) {
              console.log('✅ Already running, continuing...');
            } else {
              isListening = false;
              statusDiv.textContent = '❌ Failed to restart - Click anywhere to try again';
            }
          }
        }
      }, 300);
    } else {
      statusDiv.textContent = 'Stopped - Click anywhere to start again';
      chrome.runtime.sendMessage({
        type: 'recognitionStopped'
      });
    }
  };
  
  return recognition;
}

// Listen for messages from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Voice Control page received:', message);
  
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
        statusDiv.textContent = `❌ Failed: ${e.message}`;
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

// Auto-start on page load after permission is granted
statusDiv.textContent = '👆 Click anywhere to start voice control';
statusDiv.style.cursor = 'pointer';

// Make entire page clickable
document.body.style.cursor = 'pointer';
document.body.addEventListener('click', (e) => {
  console.log('🖱️ Page clicked, isListening:', isListening);
  
  if (!isListening) {
    statusDiv.textContent = '⏳ Starting...';
    
    if (!recognition) {
      console.log('🔧 Initializing recognition...');
      recognition = initSpeechRecognition();
    }
    
    if (recognition) {
      try {
        console.log('▶️ Starting recognition...');
        recognition.start();
        isListening = true;
      } catch (e) {
        console.error('❌ Failed to start:', e);
        if (e.name === 'NotAllowedError') {
          statusDiv.textContent = '❌ Microphone permission denied - Please allow access';
        } else if (e.message.includes('already started')) {
          statusDiv.textContent = '✅ Already listening...';
          isListening = true;
        } else {
          statusDiv.textContent = `❌ Error: ${e.message}`;
        }
      }
    } else {
      statusDiv.textContent = '❌ Speech recognition not supported in this browser';
    }
  }
});
