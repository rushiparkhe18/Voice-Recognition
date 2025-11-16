// ========================================
// VOICE WEB ACCESSIBILITY - BACKGROUND SERVICE WORKER
// For Blind Users - Optimized with loud, clear audio feedback
// ========================================

let ws = null;
let reconnectInterval = null;
let keepAliveInterval = null;

// ========== CONTENT SCRIPT INJECTION ==========
async function ensureContentScript(tabId) {
  try {
    // Try to ping the content script
    await chrome.tabs.sendMessage(tabId, { action: 'ping' });
  } catch (error) {
    // Content script not loaded, inject it
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
      });
      // Wait a bit for the script to initialize
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (injectError) {
      console.error('Failed to inject content script:', injectError);
      throw new Error('Cannot inject content script on this page');
    }
  }
}

// ========== CONNECT TO PYTHON BACKEND ==========
function connectWebSocket() {
  console.log('🎤 Voice Assistant: Starting connection to Python backend...');
  
  try {
    // Close existing connection
    if (ws) {
      try {
        ws.close();
      } catch (e) {}
    }
    
    if (reconnectInterval) {
      clearInterval(reconnectInterval);
      reconnectInterval = null;
    }
    
    // Connect to WebSocket server
    ws = new WebSocket('ws://127.0.0.1:8765');
    
    ws.onopen = () => {
      console.log('✅ Connected to Python voice backend');
      
      // Clear reconnection interval
      if (reconnectInterval) {
        clearInterval(reconnectInterval);
        reconnectInterval = null;
      }
      
      // Send handshake
      try {
        ws.send(JSON.stringify({
          type: 'handshake',
          client: 'chrome_extension',
          client_id: chrome.runtime.id
        }));
        console.log('🤝 Handshake sent to server');
      } catch (e) {
        console.warn('Handshake failed:', e);
      }
      
      // Start keepalive pings every 30 seconds
      if (keepAliveInterval) clearInterval(keepAliveInterval);
      keepAliveInterval = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(JSON.stringify({ type: 'ping' }));
            console.log('💓 Keepalive ping sent');
          } catch (e) {
            console.warn('Keepalive failed:', e);
          }
        }
      }, 30000);
      
      // Update badge to green
      chrome.action.setBadgeText({ text: '✓' });
      chrome.action.setBadgeBackgroundColor({ color: '#00FF00' });
      
      // Announce connection (LOUD for blind users)
      speakText('Voice assistant connected and ready');
    };
    
    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📨 Received message:', data);
        
        // Skip handshake and ping messages
        if (data.type === 'handshake' || data.type === 'ping') {
          console.log('⏭️ Skipping system message');
          return;
        }
        
        // Execute the command
        await executeCommand(data);
        
        console.log('✅ Command executed successfully');
        
      } catch (error) {
        console.error('❌ Error processing message:', error);
        speakText('Sorry, the command could not be executed. Please try again');
      }
    };
    
    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      speakText('Connection error occurred');
    };
    
    ws.onclose = () => {
      console.log('🔴 Disconnected from voice backend');
      
      // Clear keepalive
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
      }
      
      ws = null;
      
      // Update badge to red
      chrome.action.setBadgeText({ text: '✗' });
      chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
      
      // Announce disconnection
      speakText('Voice assistant disconnected. Attempting to reconnect');
      
      // Auto-reconnect every 3 seconds
      if (!reconnectInterval) {
        reconnectInterval = setInterval(() => {
          console.log('🔄 Reconnecting...');
          connectWebSocket();
        }, 3000);
      }
    };
    
  } catch (error) {
    console.error('❌ Failed to connect:', error);
  }
}

// ========== HANDLE MESSAGES FROM CONTENT SCRIPT ==========
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Background received message:', request);
  
  if (request.action === 'speakText' && request.text) {
    // Handle TTS request from content script
    speakText(request.text);
    sendResponse({ success: true });
  }
  
  return true;
});

// ========== EXECUTE VOICE COMMANDS ==========
async function executeCommand(data) {
  const { intent, command, parameter, confidence } = data;
  
  console.log(`🎯 Executing: ${intent} (confidence: ${confidence})`);
  console.log(`   Command: "${command}"`);
  if (parameter) console.log(`   Parameter: "${parameter}"`);
  
  // Get active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab) {
    console.error('❌ No active tab found');
    speakText('No active tab found. Please open a web page first');
    return;
  }
  
  try {
    switch (intent) {
      // ========== NAVIGATION ==========
      case 'SCROLL_DOWN':
        await ensureContentScript(tab.id);
        await chrome.tabs.sendMessage(tab.id, { action: 'scrollDown' });
        speakText('Scrolling down the page');
        break;
      
      case 'SCROLL_UP':
        await ensureContentScript(tab.id);
        await chrome.tabs.sendMessage(tab.id, { action: 'scrollUp' });
        speakText('Scrolling up the page');
        break;
      
      case 'SCROLL_TO_TOP':
        await ensureContentScript(tab.id);
        await chrome.tabs.sendMessage(tab.id, { action: 'scrollToTop' });
        speakText('Going to the top of the page');
        break;
      
      case 'SCROLL_TO_BOTTOM':
        await ensureContentScript(tab.id);
        await chrome.tabs.sendMessage(tab.id, { action: 'scrollToBottom' });
        speakText('Going to the bottom of the page');
        break;
      
      case 'GO_BACK':
        await chrome.tabs.goBack(tab.id);
        speakText('Going back to the previous page');
        break;
      
      case 'GO_FORWARD':
        await chrome.tabs.goForward(tab.id);
        speakText('Going forward to the next page');
        break;
      
      case 'REFRESH_PAGE':
        await chrome.tabs.reload(tab.id);
        speakText('Refreshing the page');
        break;
      
      // ========== TABS ==========
      case 'NEW_TAB':
        await chrome.tabs.create({});
        speakText('Opening a new tab');
        break;
      
      case 'CLOSE_TAB':
        await chrome.tabs.remove(tab.id);
        speakText('Closing the current tab');
        break;
      
      case 'NEXT_TAB':
        const allTabs = await chrome.tabs.query({ currentWindow: true });
        const currentIndex = allTabs.findIndex(t => t.id === tab.id);
        const nextIndex = (currentIndex + 1) % allTabs.length;
        await chrome.tabs.update(allTabs[nextIndex].id, { active: true });
        speakText('Switching to the next tab');
        break;
      
      case 'PREVIOUS_TAB':
        try {
          const tabs = await chrome.tabs.query({ currentWindow: true });
          if (tabs.length <= 1) {
            speakText('Only one tab is open');
            break;
          }
          const index = tabs.findIndex(t => t.id === tab.id);
          const prevIndex = (index - 1 + tabs.length) % tabs.length;
          await chrome.tabs.update(tabs[prevIndex].id, { active: true });
          speakText('Switching to the previous tab');
        } catch (error) {
          console.error('Error switching tab:', error);
          speakText('Unable to switch to previous tab');
        }
        break;
      
      // ========== ZOOM ==========
      case 'ZOOM_IN':
        const currentZoom = await chrome.tabs.getZoom(tab.id);
        await chrome.tabs.setZoom(tab.id, currentZoom + 0.1);
        speakText('Making text larger');
        break;
      
      case 'ZOOM_OUT':
        const zoom = await chrome.tabs.getZoom(tab.id);
        await chrome.tabs.setZoom(tab.id, zoom - 0.1);
        speakText('Making text smaller');
        break;
      
      case 'RESET_ZOOM':
        await chrome.tabs.setZoom(tab.id, 1.0);
        speakText('Resetting text size to normal');
        break;
      
      // ========== READING (FOR BLIND USERS) ==========
      case 'READ_PAGE':
      case 'READ_SECTION':
        try {
          await ensureContentScript(tab.id);
          await chrome.tabs.sendMessage(tab.id, { action: 'readPage' });
          speakText('Starting to read the page');
        } catch (error) {
          console.error('Error reading page:', error);
          speakText('Unable to read this page. It may be a protected page like chrome settings or extensions page');
        }
        break;
      
      case 'READ_SELECTION':
        try {
          await ensureContentScript(tab.id);
          await chrome.tabs.sendMessage(tab.id, { action: 'readSelection' });
          speakText('Reading the selected text');
        } catch (error) {
          console.error('Error reading selection:', error);
          speakText('Unable to read selection on this page');
        }
        break;
      
      case 'STOP_READING':
        chrome.tts.stop();
        speakText('Stopped reading');
        break;
      
      // ========== SEARCH ==========
      case 'SEARCH_GOOGLE':
        const searchQuery = parameter || command;
        await chrome.tabs.create({ 
          url: `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}` 
        });
        speakText(`Searching Google for ${searchQuery}`);
        break;
      
      case 'SEARCH_YOUTUBE':
        const ytQuery = parameter || command;
        await chrome.tabs.create({ 
          url: `https://www.youtube.com/results?search_query=${encodeURIComponent(ytQuery)}` 
        });
        speakText(`Searching YouTube for ${ytQuery}`);
        break;
      
      // ========== OPEN WEBSITES ==========
      case 'OPEN_YOUTUBE':
        await chrome.tabs.create({ url: 'https://www.youtube.com' });
        speakText('Opening YouTube');
        break;
      
      case 'OPEN_GMAIL':
        await chrome.tabs.create({ url: 'https://mail.google.com' });
        speakText('Opening Gmail');
        break;
      
      case 'OPEN_GOOGLE':
        await chrome.tabs.create({ url: 'https://www.google.com' });
        speakText('Opening Google');
        break;
      
      case 'OPEN_FACEBOOK':
        await chrome.tabs.create({ url: 'https://www.facebook.com' });
        speakText('Opening Facebook');
        break;
      
      case 'OPEN_INSTAGRAM':
        await chrome.tabs.create({ url: 'https://www.instagram.com' });
        speakText('Opening Instagram');
        break;
      
      case 'OPEN_TWITTER':
        await chrome.tabs.create({ url: 'https://www.twitter.com' });
        speakText('Opening Twitter');
        break;
      
      case 'OPEN_LINKEDIN':
        await chrome.tabs.create({ url: 'https://www.linkedin.com' });
        speakText('Opening LinkedIn');
        break;
      
      case 'OPEN_WHATSAPP_WEB':
        await chrome.tabs.create({ url: 'https://web.whatsapp.com' });
        speakText('Opening WhatsApp Web');
        break;
      
      case 'OPEN_DRIVE':
        await chrome.tabs.create({ url: 'https://drive.google.com' });
        speakText('Opening Google Drive');
        break;
      
      case 'OPEN_MAPS':
        await chrome.tabs.create({ url: 'https://www.google.com/maps' });
        speakText('Opening Google Maps');
        break;
      
      case 'OPEN_CALENDAR':
        await chrome.tabs.create({ url: 'https://calendar.google.com' });
        speakText('Opening Google Calendar');
        break;
      
      case 'OPEN_NEWS':
        await chrome.tabs.create({ url: 'https://news.google.com' });
        speakText('Opening Google News');
        break;
      
      case 'OPEN_WEBSITE':
        if (parameter) {
          let url = parameter;
          if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
          }
          await chrome.tabs.create({ url });
          speakText(`Opening ${parameter}`);
        }
        break;
      
      // ========== BOOKMARKS ==========
      case 'BOOKMARK_PAGE':
        await chrome.bookmarks.create({ title: tab.title, url: tab.url });
        speakText('Page bookmarked successfully');
        break;
      
      case 'OPEN_BOOKMARKS':
        await chrome.tabs.create({ url: 'chrome://bookmarks' });
        speakText('Opening your bookmarks');
        break;
      
      case 'OPEN_DOWNLOADS':
        await chrome.tabs.create({ url: 'chrome://downloads' });
        speakText('Opening downloads page');
        break;
      
      case 'OPEN_SETTINGS':
        await chrome.tabs.create({ url: 'chrome://settings' });
        speakText('Opening browser settings');
        break;
      
      // ========== VIDEO CONTROLS ==========
      case 'PLAY_VIDEO':
      case 'RESUME_VIDEO':
        await ensureContentScript(tab.id);
        await chrome.tabs.sendMessage(tab.id, { action: 'playVideo' });
        speakText('Playing video');
        break;
      
      case 'PAUSE_VIDEO':
      case 'STOP_VIDEO':
        await ensureContentScript(tab.id);
        await chrome.tabs.sendMessage(tab.id, { action: 'pauseVideo' });
        speakText('Pausing video');
        break;
      
      // ========== FULLSCREEN ==========
      case 'FULL_SCREEN':
        await chrome.windows.update(tab.windowId, { state: 'fullscreen' });
        speakText('Entering fullscreen mode');
        break;
      
      case 'EXIT_FULL_SCREEN':
        await chrome.windows.update(tab.windowId, { state: 'normal' });
        speakText('Exiting fullscreen mode');
        break;
      
      // ========== OPEN LINKS (FOR BLIND USERS BROWSING) ==========
      case 'OPEN_FIRST_LINK':
        await ensureContentScript(tab.id);
        await chrome.tabs.sendMessage(tab.id, { action: 'openFirstLink' });
        speakText('Opening the first link on the page');
        break;
      
      case 'OPEN_SECOND_LINK':
        await ensureContentScript(tab.id);
        await chrome.tabs.sendMessage(tab.id, { action: 'openSecondLink' });
        speakText('Opening the second link on the page');
        break;
      
      case 'OPEN_THIRD_LINK':
        await ensureContentScript(tab.id);
        await chrome.tabs.sendMessage(tab.id, { action: 'openThirdLink' });
        speakText('Opening the third link on the page');
        break;
      
      // ========== CLOSE BROWSER ==========
      case 'CLOSE_BROWSER':
        speakText('Closing browser. Goodbye!');
        await chrome.windows.getCurrent((window) => {
          chrome.windows.remove(window.id);
        });
        break;
      
      default:
        console.log('⚠️ Unknown intent:', intent);
        speakText(`Command ${command} not recognized. Please try again`);
    }
    
  } catch (error) {
    console.error('❌ Error executing command:', error);
    speakText('Sorry, the command could not be executed');
  }
}

// ========== TEXT-TO-SPEECH (LOUD FOR BLIND USERS) ==========
function speakText(text) {
  console.log('🔊 Speaking:', text);
  
  // Stop any ongoing speech
  chrome.tts.stop();
  
  // Speak with LOUD volume and moderate speed
  chrome.tts.speak(text, {
    rate: 1.3,      // Slightly faster than normal
    pitch: 1.0,     // Normal pitch
    volume: 1.0,    // MAXIMUM volume for blind users
    lang: 'en-US',
    enqueue: false  // Don't queue, speak immediately
  });
}

// ========== START CONNECTION ON LOAD ==========
console.log('🎤 Voice Web Accessibility Extension - Initializing...');
connectWebSocket();

// Listen for extension icon clicks
chrome.action.onClicked.addListener(() => {
  console.log('🖱️ Extension icon clicked');
  
  if (ws && ws.readyState === WebSocket.OPEN) {
    speakText('Voice assistant is connected and ready');
  } else {
    speakText('Voice assistant is disconnected. Reconnecting now');
    connectWebSocket();
  }
});

console.log('✅ Background service worker loaded successfully');
