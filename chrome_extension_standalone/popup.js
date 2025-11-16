// Popup script for standalone voice control
let isListening = false;

const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const helpBtn = document.getElementById('helpBtn');
const statusText = document.getElementById('statusText');
const statusSubtext = document.getElementById('statusSubtext');
const listeningIndicator = document.getElementById('listeningIndicator');
const commandHeard = document.getElementById('commandHeard');
const commandText = document.getElementById('commandText');
const actionText = document.getElementById('actionText');

// Start listening
startBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'startListening' }, (response) => {
    if (response && response.success) {
      isListening = true;
      statusText.textContent = 'Listening';
      statusSubtext.textContent = 'Speak your command';
      listeningIndicator.classList.add('active');
      startBtn.style.display = 'none';
      stopBtn.style.display = 'block';
    } else {
      statusText.textContent = 'Error Starting';
      statusSubtext.innerHTML = 'Click "❓ Microphone Not Working?" button for help';
    }
  });
});

// Stop listening
stopBtn.addEventListener('click', () => {
  isListening = false;
  chrome.runtime.sendMessage({ action: 'stopListening' });
  
  listeningIndicator.classList.remove('active');
  statusText.textContent = 'Stopped';
  statusSubtext.textContent = 'Click Start to begin';
  startBtn.style.display = 'block';
  stopBtn.style.display = 'none';
});

// Help button - open microphone setup page
helpBtn.addEventListener('click', () => {
  chrome.tabs.create({
    url: chrome.runtime.getURL('microphone_setup.html')
  });
});

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  // Check if already listening
  chrome.action.getBadgeText({}, (text) => {
    if (text === 'ON') {
      isListening = true;
      statusText.textContent = 'Active';
      statusSubtext.textContent = 'Voice control is running';
      listeningIndicator.classList.add('active');
      startBtn.style.display = 'none';
      stopBtn.style.display = 'block';
    }
  });
});

console.log('✅ Standalone popup script loaded');
