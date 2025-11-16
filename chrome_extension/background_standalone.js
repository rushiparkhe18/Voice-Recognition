// Background service worker for standalone voice control
let isListening = false;
let activeTabId = null; // Track the tab where voice control is active

// Inject content script into a tab
async function injectContentScript(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['voice_content.js']
    });
    console.log(`✅ Content script injected into tab ${tabId}`);
    return true;
  } catch (error) {
    console.error(`⚠️ Failed to inject into tab ${tabId}:`, error.message);
    return false;
  }
}

// Listen for new tabs and inject content script if voice is active
chrome.tabs.onCreated.addListener(async (tab) => {
  if (isListening && tab.id) {
    // Wait a moment for tab to initialize
    setTimeout(async () => {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab && activeTab.id === tab.id) {
        // Check if it's a valid page
        if (activeTab.url && !activeTab.url.startsWith('chrome://') && !activeTab.url.startsWith('edge://') && !activeTab.url.startsWith('about:')) {
          await injectContentScript(tab.id);
          // Start recognition on new tab
          await chrome.tabs.sendMessage(tab.id, { type: 'startRecognition' }).catch(() => {});
        }
      }
    }, 1000);
  }
});

// Listen for tab activation (switching between tabs)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  if (isListening) {
    activeTabId = activeInfo.tabId;
    
    // Get tab info to check URL
    const tab = await chrome.tabs.get(activeInfo.tabId);
    
    // Skip if it's a restricted page
    if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:'))) {
      return;
    }
    
    // Ensure content script is loaded on newly activated tab
    try {
      await chrome.tabs.sendMessage(activeInfo.tabId, { type: 'ping' });
    } catch {
      // Content script not loaded, inject it
      await injectContentScript(activeInfo.tabId);
      setTimeout(async () => {
        await chrome.tabs.sendMessage(activeInfo.tabId, { type: 'startRecognition' }).catch(() => {});
      }, 500);
    }
  }
});

// Generate voice feedback message based on intent
function generateFeedbackMessage(intent, parameter) {
  const messages = {
    'READ_PAGE': 'Reading page',
    'READ_SELECTION': 'Reading selection',
    'STOP_READING': 'Stopped',
    'RESUME_READING': 'Resuming',
    'SCROLL_DOWN': 'Down',
    'SCROLL_UP': 'Up',
    'REFRESH_PAGE': 'Refreshed',
    'NEW_TAB': 'New tab',
    'CLOSE_TAB': 'Closed',
    'NEXT_TAB': 'Next',
    'PREVIOUS_TAB': 'Previous',
    'ZOOM_IN': 'Zoomed in',
    'ZOOM_OUT': 'Zoomed out',
    'GO_BACK': 'Back',
    'GO_FORWARD': 'Forward',
    'OPEN_WEBSITE': parameter ? `Opening ${parameter}` : 'Opening',
    'SEARCH_GOOGLE': parameter ? `Searching ${parameter}` : 'Searching',
    'SEARCH_YOUTUBE': parameter ? `YouTube ${parameter}` : 'YouTube',
    'PLAY_YOUTUBE_VIDEO': 'Playing',
    'STOP_YOUTUBE_VIDEO': 'Paused'
  };
  
  return messages[intent] || 'Done';
}

// Send voice feedback using Chrome TTS (non-blocking)
function sendVoiceFeedback(intent, parameter) {
  const message = generateFeedbackMessage(intent, parameter);
  console.log('📣 Feedback:', intent, '→', message);
  speakText(message);
}

// Use Chrome's built-in TTS for immediate feedback (faster, non-blocking)
async function speakText(text) {
  if (!text || text.trim() === '') {
    console.log('⚠️ Empty text, skipping TTS');
    return;
  }
  
  console.log('🔊 Speaking:', text);
  
  // Check for available voices first
  chrome.tts.getVoices((voices) => {
    console.log('📢 Available voices:', voices.length);
    if (voices.length === 0) {
      console.warn('⚠️ No TTS voices available');
    }
  });
  
  // Use chrome.tts with error handling
  chrome.tts.speak(text, {
    rate: 1.6,  // Slightly slower for better clarity
    pitch: 1.0,
    volume: 1.0,  // Max volume
    enqueue: false,  // Don't queue, interrupt previous speech
    lang: 'en-US',  // Specify language
    onEvent: (event) => {
      if (event.type === 'start') {
        console.log('✅ TTS started');
      } else if (event.type === 'end') {
        console.log('✅ TTS completed');
      } else if (event.type === 'error') {
        console.error('❌ TTS error:', event.errorMessage);
      }
    }
  });
}

// Send message to content script in active tab
async function sendToContentScript(message) {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab) {
    console.error('❌ No active tab found');
    return false;
  }
  
  // Check if we can access this tab - if not, open a new accessible tab
  if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('brave://') || !tab.url || tab.url === 'about:blank')) {
    // Auto-open Google in a new tab for voice control
    speakText('Opening voice control page');
    const newTab = await chrome.tabs.create({ url: 'https://www.google.com', active: true });
    
    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Update tab reference
    tab = newTab;
  }
  
  try {
    // Try to ping the content script first
    await chrome.tabs.sendMessage(tab.id, { type: 'ping' });
    // If successful, send the actual message
    await chrome.tabs.sendMessage(tab.id, message);
    return true;
  } catch (error) {
    // Content script not loaded yet, inject it
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['voice_content.js']
      });
      
      // Wait for content script to initialize
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Try sending message again
      await chrome.tabs.sendMessage(tab.id, message);
      return true;
    } catch (injectError) {
      console.error('❌ Failed to inject content script:', injectError.message);
      return false;
    }
  }
}

// Initialize voice recognition (simplified - no offscreen needed)
async function initSpeechRecognition() {
  console.log('✅ Voice recognition uses content script (no initialization needed)');
  return true;
}

// Simple intent classifier (runs in browser!)
function classifyIntent(command) {
  const cmd = command.toLowerCase().trim();
  
  // Text-to-Speech / Reading commands
  if (cmd.includes('read this') || cmd.includes('read page') || cmd.includes('read text')) return 'READ_PAGE';
  if (cmd.includes('stop reading')) return 'STOP_READING';
  if (cmd.includes('resume reading') || cmd.includes('continue reading')) return 'RESUME_READING';
  if (cmd.includes('read selected') || cmd.includes('read selection')) return 'READ_SELECTION';
  
  // Scroll commands
  if (cmd.includes('scroll down') || cmd.includes('page down')) return 'SCROLL_DOWN';
  if (cmd.includes('scroll up') || cmd.includes('page up')) return 'SCROLL_UP';
  
  // Tab management
  if (cmd.includes('new tab')) return 'NEW_TAB';
  if (cmd.includes('close tab')) return 'CLOSE_TAB';
  if (cmd.includes('next tab')) return 'NEXT_TAB';
  if (cmd.includes('previous tab') || cmd.includes('prev tab')) return 'PREVIOUS_TAB';
  
  // Page actions
  if (cmd.includes('refresh') || cmd.includes('reload')) return 'REFRESH_PAGE';
  if (cmd.includes('go back') || cmd.includes('back')) return 'GO_BACK';
  if (cmd.includes('go forward') || cmd.includes('forward')) return 'GO_FORWARD';
  
  // Zoom
  if (cmd.includes('zoom in')) return 'ZOOM_IN';
  if (cmd.includes('zoom out')) return 'ZOOM_OUT';
  
  // YouTube
  if (cmd.includes('play') && cmd.includes('video')) return 'PLAY_YOUTUBE_VIDEO';
  if (cmd.includes('pause') || cmd.includes('stop')) return 'STOP_YOUTUBE_VIDEO';
  
  // Search
  if (cmd.includes('search') || cmd.includes('google')) return 'SEARCH_GOOGLE';
  if (cmd.includes('youtube')) return 'SEARCH_YOUTUBE';
  
  // Website opening
  if (cmd.includes('open')) {
    if (cmd.includes('youtube')) return 'SEARCH_YOUTUBE';
    if (cmd.includes('google')) return 'SEARCH_GOOGLE';
    return 'OPEN_WEBSITE';
  }
  
  return 'UNKNOWN';
}

// Start/Stop voice listening
async function toggleVoiceListening() {
  await initSpeechRecognition();
  
  if (isListening) {
    // Stop listening
    await sendToContentScript({ type: 'stopRecognition' });
    isListening = false;
    chrome.action.setBadgeText({ text: '' });
    
    // Voice confirmation
    speakText('Voice control stopped');
    
    // Notify popup
    chrome.runtime.sendMessage({ 
      type: 'statusUpdate', 
      isListening: false 
    }).catch(() => {});
    
  } else {
    // Start listening (will auto-open Google if on restricted page)
    const success = await sendToContentScript({ type: 'startRecognition' });
    
    if (success) {
      isListening = true;
      chrome.action.setBadgeText({ text: '🎤' });
      chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
      
      // Voice confirmation (clear message)
      speakText('Voice control activated');
      
      // Notify popup
      chrome.runtime.sendMessage({ 
        type: 'statusUpdate', 
        isListening: true 
      }).catch(() => {});
    } else {
      speakText('Voice control failed to start');
    }
  }
  
  return true;
}

// Standalone mode - no WebSocket needed!
// (Python backend not used in standalone mode)

// Execute voice command intent
async function executeIntent(data) {
  const { intent, command, parameter } = data;
  
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab) {
    console.error('❌ No active tab found');
    speakText('No active tab');
    return;
  }
  
  // Validate tab is accessible
  if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://') || tab.url.startsWith('brave://'))) {
    console.warn('⚠️ Cannot execute on restricted page:', tab.url);
    speakText('Cannot execute on this page');
    return;
  }
  
  console.log(`🎯 Executing: ${intent} on tab ${tab.id} (${tab.url})`);
  
  try {
    switch (intent) {
      case 'READ_PAGE':
        // Read main page content using TTS
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            // Get main content from page
            let text = '';
            const article = document.querySelector('article, main, [role="main"], .content, .post-content');
            if (article) {
              text = article.innerText;
            } else {
              // Fallback to body text
              text = document.body.innerText;
            }
            // Limit to first 500 characters for reasonable reading time
            return text.substring(0, 500).trim();
          }
        }).then(results => {
          if (results && results[0] && results[0].result) {
            const text = results[0].result;
            chrome.tts.speak(text, {
              rate: 1.2,
              pitch: 1.0,
              volume: 0.8
            });
          }
        });
        break;
        
      case 'READ_SELECTION':
        // Read selected text
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => window.getSelection().toString()
        }).then(results => {
          if (results && results[0] && results[0].result) {
            const text = results[0].result;
            if (text) {
              chrome.tts.speak(text, {
                rate: 1.2,
                pitch: 1.0,
                volume: 0.8
              });
            } else {
              chrome.tts.speak('No text selected');
            }
          }
        });
        break;
        
      case 'STOP_READING':
        chrome.tts.stop();
        break;
        
      case 'RESUME_READING':
        chrome.tts.resume();
        break;
      
      case 'SCROLL_DOWN':
        console.log('📜 Executing scroll down on tab:', tab.id);
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            window.scrollBy({ top: 300, behavior: 'smooth' });
            return 'scrolled';
          }
        }).then(results => {
          console.log('✅ Scroll result:', results);
        }).catch(err => {
          console.error('❌ Scroll error:', err);
        });
        break;
        
      case 'SCROLL_UP':
        console.log('📜 Executing scroll up on tab:', tab.id);
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            window.scrollBy({ top: -300, behavior: 'smooth' });
            return 'scrolled';
          }
        }).then(results => {
          console.log('✅ Scroll result:', results);
        }).catch(err => {
          console.error('❌ Scroll error:', err);
        });
        break;
        
      case 'REFRESH_PAGE':
        await chrome.tabs.reload(tab.id);
        break;
        
      case 'GO_BACK':
        console.log('⬅️ Executing go back');
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            window.history.back();
            return 'navigated back';
          }
        }).catch(err => console.error('❌ Go back error:', err));
        break;
        
      case 'GO_FORWARD':
        console.log('➡️ Executing go forward');
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            window.history.forward();
            return 'navigated forward';
          }
        }).catch(err => console.error('❌ Go forward error:', err));
        break;
        
      case 'NEW_TAB':
        await chrome.tabs.create({});
        break;
        
      case 'CLOSE_TAB':
        await chrome.tabs.remove(tab.id);
        break;
        
      case 'NEXT_TAB':
        const allTabs = await chrome.tabs.query({ currentWindow: true });
        const currentIndex = allTabs.findIndex(t => t.id === tab.id);
        const nextIndex = (currentIndex + 1) % allTabs.length;
        await chrome.tabs.update(allTabs[nextIndex].id, { active: true });
        break;
        
      case 'PREVIOUS_TAB':
        const tabs = await chrome.tabs.query({ currentWindow: true });
        const index = tabs.findIndex(t => t.id === tab.id);
        const prevIndex = (index - 1 + tabs.length) % tabs.length;
        await chrome.tabs.update(tabs[prevIndex].id, { active: true });
        break;
        
      case 'ZOOM_IN':
        const currentZoom = await chrome.tabs.getZoom(tab.id);
        await chrome.tabs.setZoom(tab.id, currentZoom + 0.1);
        break;
        
      case 'ZOOM_OUT':
        const zoom = await chrome.tabs.getZoom(tab.id);
        await chrome.tabs.setZoom(tab.id, zoom - 0.1);
        break;
        
      case 'SEARCH_GOOGLE':
        const query = parameter || command.replace(/search|google|for/gi, '').trim();
        await chrome.tabs.create({ url: `https://www.google.com/search?q=${encodeURIComponent(query)}` });
        break;
        
      case 'SEARCH_YOUTUBE':
        const ytQuery = parameter || command.replace(/youtube|search|for/gi, '').trim();
        await chrome.tabs.create({ url: `https://www.youtube.com/results?search_query=${encodeURIComponent(ytQuery)}` });
        break;
        
      case 'PLAY_YOUTUBE_VIDEO':
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            const videos = document.querySelectorAll('ytd-video-renderer a#video-title, ytd-grid-video-renderer a#video-title');
            if (videos[0]) videos[0].click();
          }
        });
        break;
        
      case 'STOP_YOUTUBE_VIDEO':
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            const video = document.querySelector('video');
            if (video) video.pause();
          }
        });
        break;
        
      default:
        console.log('⚠️ Unknown intent:', intent);
    }
    
    console.log('✅ Command executed');
    
    // Send voice feedback (non-blocking for speed)
    sendVoiceFeedback(intent, parameter);
    
  } catch (error) {
    console.error('❌ Execution error:', error);
    speakText('Command failed');
  }
}

// Listen for extension icon click
chrome.action.onClicked.addListener(() => {
  toggleVoiceListening();
});

// Listen for keyboard shortcut
chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-voice') {
    toggleVoiceListening();
  }
});

// Listen for messages from popup and offscreen document
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'toggleVoice') {
    toggleVoiceListening().then(() => {
      sendResponse({ isListening: isListening, success: true });
    });
    return true; // Keep channel open for async response
  } else if (message.action === 'getStatus') {
    sendResponse({ isListening: isListening });
  } else if (message.type === 'voiceCommand') {
    // Voice command from content script
    console.log('🎤 Voice command received:', message.transcript);
    const intent = classifyIntent(message.transcript);
    console.log('🎯 Classified as:', intent);
    
    // Send response immediately (don't wait for execution)
    sendResponse({ success: true, intent: intent });
    
    // Execute command asynchronously (fire and forget)
    executeIntent({ command: message.transcript, intent: intent, confidence: 1.0 })
      .catch(err => {
        console.error('❌ Execution error:', err);
      });
    
    return false; // Response already sent
  } else if (message.type === 'permissionDenied') {
    console.error('❌ Microphone permission denied');
    speakText('Microphone permission denied');
    sendResponse({ success: false });
  }
  return true;
});

// Initialize on startup (minimal logging for speed)
console.log('🎤 Voice Extension Ready (Standalone Mode) - Click icon to activate');

// Test TTS on startup
setTimeout(() => {
  console.log('🧪 Testing TTS system...');
  chrome.tts.speak('Voice extension loaded', {
    rate: 1.5,
    volume: 0.8,
    onEvent: (event) => {
      console.log('TTS Event:', event.type, event.errorMessage || '');
    }
  });
}, 2000);
