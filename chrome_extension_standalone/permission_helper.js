// Permission helper page script
const requestBtn = document.getElementById('requestBtn');
const statusDiv = document.getElementById('status');

requestBtn.addEventListener('click', async () => {
  statusDiv.className = 'status';
  statusDiv.textContent = 'Requesting microphone permission...';
  statusDiv.style.display = 'block';
  
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Permission granted!
    console.log('✅ Microphone permission granted');
    stream.getTracks().forEach(track => track.stop());
    
    statusDiv.className = 'status success';
    statusDiv.textContent = '✅ Microphone permission granted! You can close this tab now.';
    
    // Notify background script
    chrome.runtime.sendMessage({ 
      action: 'permissionGranted' 
    });
    
    // Auto-close after 2 seconds
    setTimeout(() => {
      window.close();
    }, 2000);
    
  } catch (error) {
    console.error('❌ Permission denied:', error);
    
    statusDiv.className = 'status error';
    statusDiv.textContent = '❌ Permission denied. Please allow microphone access when prompted.';
    
    if (error.name === 'NotAllowedError') {
      statusDiv.textContent += '\n\nIf you blocked it, go to chrome://settings/content/microphone and remove this site from the blocked list.';
    }
  }
});

// Auto-request on page load
console.log('Permission helper page loaded');
