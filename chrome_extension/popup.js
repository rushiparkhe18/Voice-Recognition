// Popup script
document.addEventListener('DOMContentLoaded', () => {
  // Check connection status
  chrome.action.getBadgeText({}, (text) => {
    const statusIndicator = document.getElementById('status');
    const statusText = document.getElementById('statusText');
    
    if (text === '🟢') {
      statusIndicator.textContent = '🟢';
      statusText.textContent = 'Connected to Python backend';
    } else {
      statusIndicator.textContent = '🔴';
      statusText.textContent = 'Disconnected - Start Python scripts';
    }
  });
});
