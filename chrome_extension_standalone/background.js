// ========================================
// STANDALONE VOICE WEB ACCESSIBILITY
// Works entirely in browser - No Python needed!
// ========================================

let isListening = false;
let voiceControlTabId = null;

// Initialize badge
chrome.action.setBadgeText({ text: 'OFF' });
chrome.action.setBadgeBackgroundColor({ color: '#999999' });

// Open voice control page on install
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    openVoiceControlPage();
  }
});

// ========== VOICE CONTROL PAGE MANAGEMENT ==========
async function openVoiceControlPage() {
  // Check if voice control page is already open
  if (voiceControlTabId) {
    try {
      const tab = await chrome.tabs.get(voiceControlTabId);
      // Tab exists, activate it
      chrome.tabs.update(voiceControlTabId, { active: true });
      chrome.windows.update(tab.windowId, { focused: true });
      return;
    } catch (e) {
      // Tab doesn't exist anymore
      voiceControlTabId = null;
    }
  }
  
  // Create new voice control page
  const tab = await chrome.tabs.create({
    url: chrome.runtime.getURL('voice_control.html'),
    pinned: true
  });
  
  voiceControlTabId = tab.id;
  console.log('🎤 Voice control page opened:', voiceControlTabId);
}

// Track when voice control page is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === voiceControlTabId) {
    voiceControlTabId = null;
    isListening = false;
    chrome.action.setBadgeText({ text: 'OFF' });
    chrome.action.setBadgeBackgroundColor({ color: '#999999' });
    console.log('🛑 Voice control page closed');
  }
});

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

// ========== SPEECH RECOGNITION SETUP ==========
function initSpeechRecognition() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    console.error('Speech recognition not supported');
    return null;
  }
  
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognizer = new SpeechRecognition();
  
  recognizer.continuous = true;
  recognizer.interimResults = false;
  recognizer.lang = 'en-US';
  
  return recognizer;
}

// ========== COMMAND CLASSIFICATION ==========
function classifyCommand(text) {
  const command = text.toLowerCase().trim();
  
  // NAVIGATION - More efficient patterns
  if (/scroll\s*(down|page\s*down)/i.test(command)) {
    return { intent: 'SCROLL_DOWN', parameter: null };
  }
  if (/scroll\s*(up|page\s*up)/i.test(command)) {
    return { intent: 'SCROLL_UP', parameter: null };
  }
  if (/\b(go\s*back|back|previous\s*page)\b/i.test(command)) {
    return { intent: 'GO_BACK', parameter: null };
  }
  if (/\b(go\s*forward|forward|next\s*page)\b/i.test(command)) {
    return { intent: 'GO_FORWARD', parameter: null };
  }
  if (/\b(refresh|reload)\b/i.test(command)) {
    return { intent: 'REFRESH_PAGE', parameter: null };
  }
  if (/scroll\s*(to\s*)?(top|beginning)/i.test(command)) {
    return { intent: 'SCROLL_TO_TOP', parameter: null };
  }
  if (/scroll\s*(to\s*)?(bottom|end)/i.test(command)) {
    return { intent: 'SCROLL_TO_BOTTOM', parameter: null };
  }
  
  // TABS - Better matching
  if (/\b(open|new|create)\s*(a\s*)?tab\b/i.test(command)) {
    return { intent: 'NEW_TAB', parameter: null };
  }
  if (/\b(close|exit|shut)\s*(this\s*)?tab\b/i.test(command)) {
    return { intent: 'CLOSE_TAB', parameter: null };
  }
  if (/\bnext\s*tab\b/i.test(command)) {
    return { intent: 'NEXT_TAB', parameter: null };
  }
  if (/\b(previous|prev|last)\s*tab\b/i.test(command)) {
    return { intent: 'PREVIOUS_TAB', parameter: null };
  }
  
  // BROWSER CONTROL
  if (/\b(close|exit|quit)\s*(the\s*)?(browser|chrome|window)\b/i.test(command)) {
    return { intent: 'CLOSE_BROWSER', parameter: null };
  }
  
  // ZOOM
  if (/\bzoom\s*in\b/i.test(command)) {
    return { intent: 'ZOOM_IN', parameter: null };
  }
  if (/\bzoom\s*out\b/i.test(command)) {
    return { intent: 'ZOOM_OUT', parameter: null };
  }
  if (/\breset\s*zoom\b/i.test(command)) {
    return { intent: 'RESET_ZOOM', parameter: null };
  }
  
  // READING - More efficient and flexible patterns
  if (/\b(read|speak)\s*(the\s*)?(page|content|article|text|this|everything)\b/i.test(command)) {
    return { intent: 'READ_PAGE', parameter: null };
  }
  if (/\b(read|speak)\s*(the\s*)?selection\b/i.test(command)) {
    return { intent: 'READ_SELECTION', parameter: null };
  }
  if (/\b(stop|pause|quiet|silence|shut\s*up)\b/i.test(command)) {
    return { intent: 'STOP_READING', parameter: null };
  }
  
  // SEARCH - More flexible extraction
  if (/\b(search|find|look(\s*up)?)\s*(on\s*)?(youtube|yt)\b/i.test(command)) {
    const query = command.replace(/\b(search|find|look(\s*up)?|on|for|in)\s*(on\s*)?(youtube|yt)\b/gi, '').trim();
    return { intent: 'SEARCH_YOUTUBE', parameter: query || 'videos' };
  }
  if (/\b(search|find|look(\s*up)?|google)\b/i.test(command) && !/\b(youtube|yt)\b/i.test(command)) {
    const query = command.replace(/\b(search|find|look(\s*up)?|google|on|for|in)\b/gi, '').trim();
    return { intent: 'SEARCH_GOOGLE', parameter: query || 'search' };
  }
  
  // BROWSE LINKS - Support for any number
  // Check for specific number patterns (1-20)
  const linkMatch = command.match(/\b(open|click|go\s*to)?\s*(the\s*)?(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|1st|2nd|3rd|4th|5th|6th|7th|8th|9th|10th|\d+)\s*(link|result|option|one)?\b/i);
  
  if (linkMatch) {
    const numberWord = linkMatch[3].toLowerCase();
    const numberMap = {
      'first': 0, '1st': 0, 'one': 0, '1': 0,
      'second': 1, '2nd': 1, 'two': 1, '2': 1,
      'third': 2, '3rd': 2, 'three': 2, '3': 2,
      'fourth': 3, '4th': 3, 'four': 3, '4': 3,
      'fifth': 4, '5th': 4, 'five': 4, '5': 4,
      'sixth': 5, '6th': 5, 'six': 5, '6': 5,
      'seventh': 6, '7th': 6, 'seven': 6, '7': 6,
      'eighth': 7, '8th': 7, 'eight': 7, '8': 7,
      'ninth': 8, '9th': 8, 'nine': 8, '9': 9,
      'tenth': 9, '10th': 9, 'ten': 9, '10': 9
    };
    
    let linkIndex = numberMap[numberWord];
    
    // If not in map, try parsing as number
    if (linkIndex === undefined) {
      const num = parseInt(numberWord);
      if (!isNaN(num) && num > 0 && num <= 20) {
        linkIndex = num - 1;
      }
    }
    
    if (linkIndex !== undefined) {
      return { intent: 'OPEN_LINK', parameter: linkIndex };
    }
  }
  
  // OPEN WEBSITES
  if (command.includes('open google') && !command.includes('search')) {
    return { intent: 'OPEN_GOOGLE', parameter: null };
  }
  if (command.includes('open gmail')) {
    return { intent: 'OPEN_GMAIL', parameter: null };
  }
  if (command.includes('open youtube') && !command.includes('search')) {
    return { intent: 'OPEN_YOUTUBE', parameter: null };
  }
  
  // BOOKMARKS
  if (command.includes('open') && command.includes('bookmark')) {
    return { intent: 'OPEN_BOOKMARKS', parameter: null };
  }
  if (command.includes('bookmark')) {
    return { intent: 'BOOKMARK_PAGE', parameter: null };
  }
  
  return { intent: 'UNKNOWN', parameter: null };
}

// ========== EXECUTE COMMANDS ==========
async function executeCommand(intent, parameter) {
  console.log(`Executing: ${intent}`, parameter);
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    switch (intent) {
      // NAVIGATION
      case 'SCROLL_DOWN':
        await ensureContentScript(tab.id);
        await chrome.tabs.sendMessage(tab.id, { action: 'scrollDown' });
        speakText('Scrolling down');
        break;
        
      case 'SCROLL_UP':
        await ensureContentScript(tab.id);
        await chrome.tabs.sendMessage(tab.id, { action: 'scrollUp' });
        speakText('Scrolling up');
        break;
        
      case 'GO_BACK':
        await chrome.tabs.goBack(tab.id);
        speakText('Going back');
        break;
        
      case 'GO_FORWARD':
        await chrome.tabs.goForward(tab.id);
        speakText('Going forward');
        break;
        
      case 'REFRESH_PAGE':
        await chrome.tabs.reload(tab.id);
        speakText('Refreshing page');
        break;
        
      case 'SCROLL_TO_TOP':
        await ensureContentScript(tab.id);
        await chrome.tabs.sendMessage(tab.id, { action: 'scrollToTop' });
        speakText('Scrolling to top');
        break;
        
      case 'SCROLL_TO_BOTTOM':
        await ensureContentScript(tab.id);
        await chrome.tabs.sendMessage(tab.id, { action: 'scrollToBottom' });
        speakText('Scrolling to bottom');
        break;
        break;
      
      // TABS
      case 'NEW_TAB':
        await chrome.tabs.create({});
        speakText('Opening new tab');
        break;
        
      case 'CLOSE_TAB':
        await chrome.tabs.remove(tab.id);
        speakText('Closing tab');
        break;
      
      case 'CLOSE_BROWSER':
        speakText('Closing browser');
        // Close current window
        const window = await chrome.windows.getCurrent();
        await chrome.windows.remove(window.id);
        break;
        
      case 'NEXT_TAB':
        const tabs = await chrome.tabs.query({ currentWindow: true });
        const currentIndex = tabs.findIndex(t => t.id === tab.id);
        const nextIndex = (currentIndex + 1) % tabs.length;
        await chrome.tabs.update(tabs[nextIndex].id, { active: true });
        speakText('Switching to next tab');
        break;
        
      case 'PREVIOUS_TAB':
        try {
          const allTabs = await chrome.tabs.query({ currentWindow: true });
          if (allTabs.length <= 1) {
            speakText('Only one tab open');
            break;
          }
          const currIndex = allTabs.findIndex(t => t.id === tab.id);
          const prevIndex = (currIndex - 1 + allTabs.length) % allTabs.length;
          await chrome.tabs.update(allTabs[prevIndex].id, { active: true });
          speakText('Switching to previous tab');
        } catch (error) {
          console.error('Error switching tab:', error);
          speakText('Unable to switch tab');
        }
        break;
      
      // ZOOM
      case 'ZOOM_IN':
        const currentZoom = await chrome.tabs.getZoom(tab.id);
        await chrome.tabs.setZoom(tab.id, currentZoom + 0.1);
        speakText('Zooming in');
        break;
        
      case 'ZOOM_OUT':
        const zoom = await chrome.tabs.getZoom(tab.id);
        await chrome.tabs.setZoom(tab.id, zoom - 0.1);
        speakText('Zooming out');
        break;
        
      case 'RESET_ZOOM':
        await chrome.tabs.setZoom(tab.id, 1.0);
        speakText('Resetting zoom');
        break;
      
      // READING
      case 'READ_PAGE':
        try {
          // Give immediate feedback
          speakText('Reading page');
          // Ensure content script is injected
          await ensureContentScript(tab.id);
          // Small delay to let TTS start
          await new Promise(resolve => setTimeout(resolve, 500));
          await chrome.tabs.sendMessage(tab.id, { action: 'readPage' });
        } catch (error) {
          console.error('Error reading page:', error);
          speakText('Unable to read this page. It may be a protected page like chrome settings or extensions page');
        }
        break;
        
      case 'READ_SELECTION':
        try {
          await ensureContentScript(tab.id);
          await chrome.tabs.sendMessage(tab.id, { action: 'readSelection' });
        } catch (error) {
          console.error('Error reading selection:', error);
          speakText('Unable to read selection on this page');
        }
        break;
        
      case 'STOP_READING':
        chrome.tts.stop();
        speakText('Stopped');
        break;
      
      // SEARCH
      case 'SEARCH_GOOGLE':
        await chrome.tabs.create({ url: `https://www.google.com/search?q=${encodeURIComponent(parameter)}` });
        speakText(`Searching Google for ${parameter}`);
        break;
        
      case 'SEARCH_YOUTUBE':
        await chrome.tabs.create({ url: `https://www.youtube.com/results?search_query=${encodeURIComponent(parameter)}` });
        speakText(`Searching YouTube for ${parameter}`);
        break;
      
      // BROWSE LINKS - Unified handler for any link number
      case 'OPEN_LINK':
        try {
          await ensureContentScript(tab.id);
          await chrome.tabs.sendMessage(tab.id, { 
            action: 'openLinkByIndex', 
            index: parameter 
          });
          // Feedback is now handled in content script
        } catch (error) {
          console.error('Error opening link:', error);
          speakText('Unable to open link on this page');
        }
        break;
      
      // Legacy support for old commands
      case 'OPEN_FIRST_LINK':
        await ensureContentScript(tab.id);
        await chrome.tabs.sendMessage(tab.id, { action: 'openLinkByIndex', index: 0 });
        break;
        
      case 'OPEN_SECOND_LINK':
        await ensureContentScript(tab.id);
        await chrome.tabs.sendMessage(tab.id, { action: 'openLinkByIndex', index: 1 });
        break;
        
      case 'OPEN_THIRD_LINK':
        await ensureContentScript(tab.id);
        await chrome.tabs.sendMessage(tab.id, { action: 'openLinkByIndex', index: 2 });
        break;
      
      // OPEN WEBSITES
      case 'OPEN_GOOGLE':
        await chrome.tabs.create({ url: 'https://www.google.com' });
        speakText('Opening Google');
        break;
        
      case 'OPEN_GMAIL':
        await chrome.tabs.create({ url: 'https://mail.google.com' });
        speakText('Opening Gmail');
        break;
        
      case 'OPEN_YOUTUBE':
        await chrome.tabs.create({ url: 'https://www.youtube.com' });
        speakText('Opening YouTube');
        break;
      
      // BOOKMARKS
      case 'BOOKMARK_PAGE':
        await chrome.bookmarks.create({ title: tab.title, url: tab.url });
        speakText('Page bookmarked');
        break;
        
      case 'OPEN_BOOKMARKS':
        await chrome.tabs.create({ url: 'chrome://bookmarks/' });
        speakText('Opening bookmarks');
        break;
        
      default:
        speakText('Command not recognized');
    }
  } catch (error) {
    console.error('Error executing command:', error);
    speakText('Error executing command');
  }
}

// ========== TEXT TO SPEECH ==========
function speakText(text) {
  // Stop any current speech first for immediate feedback
  chrome.tts.stop();
  
  chrome.tts.speak(text, {
    rate: 1.2,          // Slightly slower for better clarity
    pitch: 1.0,         // Natural pitch
    volume: 1.0,        // Full volume
    lang: 'en-US',
    enqueue: false,     // Don't queue, speak immediately
    onEvent: (event) => {
      if (event.type === 'error') {
        console.error('TTS error:', event);
      }
    }
  });
}

// ========== MESSAGE HANDLER ==========
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  // Only handle messages from voice_control.html page
  const isFromVoiceControl = sender.url === chrome.runtime.getURL('voice_control.html');

  // Handle messages FROM voice_control page
  if (isFromVoiceControl) {
    if (request.type === 'recognitionStarted') {
      isListening = true;
      chrome.action.setBadgeText({ text: 'ON' });
      chrome.action.setBadgeBackgroundColor({ color: '#00FF00' });
      return;
    }
    
    if (request.type === 'recognitionResult') {
      const { text } = request;
      console.log('📝 Command heard from voice_control:', text);

      // Classify and execute command
      const { intent, parameter } = classifyCommand(text);
      console.log('🎯 Intent:', intent, 'Parameter:', parameter);
      await executeCommand(intent, parameter);
      return;
    }
    
    if (request.type === 'recognitionError') {
      console.error('Recognition error from voice_control:', request.error);
      
      // Only stop listening on critical errors
      if (request.error === 'not-allowed' || request.error === 'service-not-allowed') {
        isListening = false;
        chrome.action.setBadgeText({ text: 'OFF' });
        chrome.action.setBadgeBackgroundColor({ color: '#999999' });
        
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon128.png',
          title: 'Microphone Permission Required',
          message: 'Please allow microphone access when prompted, or check chrome://settings/content/microphone',
          priority: 2
        });
      }
      // Ignore 'aborted' and 'no-speech' errors - they're normal
      return;
    }
    
    if (request.type === 'recognitionStopped') {
      isListening = false;
      chrome.action.setBadgeText({ text: 'OFF' });
      chrome.action.setBadgeBackgroundColor({ color: '#999999' });
      return;
    }
  }
  
  // Handle messages TO voice control page (from popup)
  if (request.action === 'startListening') {
    (async () => {
      try {
        // Ensure voice control page is open
        if (!voiceControlTabId) {
          await openVoiceControlPage();
          // Wait a bit for the page to load
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Send message to voice control page
        const response = await chrome.tabs.sendMessage(voiceControlTabId, { action: 'startRecognition' });
        sendResponse(response);
      } catch (error) {
        console.error('Failed to start listening:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'stopListening') {
    (async () => {
      isListening = false;
      chrome.action.setBadgeText({ text: 'OFF' });
      chrome.action.setBadgeBackgroundColor({ color: '#999999' });
      
      // Send message to voice control page to stop recognition
      if (voiceControlTabId) {
        try {
          await chrome.tabs.sendMessage(voiceControlTabId, { action: 'stopRecognition' });
        } catch (e) {
          // Voice control page might not exist
          voiceControlTabId = null;
        }
      }
      
      sendResponse({ success: true });
    })();
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'processCommand') {
    (async () => {
      const { intent, parameter } = classifyCommand(request.text);
      await executeCommand(intent, parameter);
      sendResponse({ success: true, intent });
    })();
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'speakText') {
    speakText(request.text);
    sendResponse({ success: true });
    return true; // Keep channel open for async response
  }
  
  // Don't return true if no handler matched
  return false;
});

console.log('✅ Standalone Voice Assistant Background Service Worker Ready');
