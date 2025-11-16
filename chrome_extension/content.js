// Content script - Executes commands on web pages
console.log('🎤 Voice Assistant content script loaded');

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Content script received:', request);
  
  try {
    // Handle ping for content script detection
    if (request.action === 'ping') {
      sendResponse({ success: true, status: 'alive' });
      return true;
    }
    
    switch (request.action) {
      case 'scrollDown':
        window.scrollBy({ top: 300, behavior: 'smooth' });
        break;
        
      case 'scrollUp':
        window.scrollBy({ top: -300, behavior: 'smooth' });
        break;
        
      case 'scrollToTop':
        window.scrollTo({ top: 0, behavior: 'smooth' });
        break;
        
      case 'scrollToBottom':
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        break;
        
      case 'readPage':
        readPageContent();
        break;
        
      case 'readSelection':
        readSelectedText();
        break;
        
      case 'playVideo':
        playVideo();
        break;
        
      case 'pauseVideo':
        pauseVideo();
        break;
      
      case 'openLinkByIndex':
        openLinkByIndex(request.index || 0);
        break;
        
      // Legacy support
      case 'openFirstLink':
        openLinkByIndex(0);
        break;
        
      case 'openSecondLink':
        openLinkByIndex(1);
        break;
        
      case 'openThirdLink':
        openLinkByIndex(2);
        break;
    }
    
    sendResponse({ success: true });
  } catch (error) {
    console.error('❌ Content script error:', error);
    sendResponse({ success: false, error: error.message });
  }
  
  return true;
});

// Read page content aloud (for blind users)
function readPageContent() {
  // Get visible text from the page
  const bodyText = document.body.innerText || document.body.textContent;
  
  // Clean up text
  const cleanText = bodyText
    .replace(/\s+/g, ' ')  // Remove extra whitespace
    .replace(/\n+/g, '. ')  // Replace newlines with periods
    .trim()
    .substring(0, 5000);  // Limit length
  
  if (cleanText) {
    // Send to background script for TTS (content scripts can't use chrome.tts directly)
    chrome.runtime.sendMessage({
      action: 'speakText',
      text: cleanText
    });
  } else {
    chrome.runtime.sendMessage({
      action: 'speakText',
      text: 'No readable content found on this page'
    });
  }
}

// Read selected text aloud
function readSelectedText() {
  const selection = window.getSelection().toString().trim();
  
  if (selection) {
    // Send to background script for TTS
    chrome.runtime.sendMessage({
      action: 'speakText',
      text: selection
    });
  } else {
    chrome.runtime.sendMessage({
      action: 'speakText',
      text: 'No text is selected'
    });
  }
}

// Play video on current page
function playVideo() {
  const video = document.querySelector('video');
  if (video) {
    video.play();
    console.log('▶️ Video playing');
  } else {
    console.log('❌ No video found on page');
  }
}

// Pause video on current page
function pauseVideo() {
  const video = document.querySelector('video');
  if (video) {
    video.pause();
    console.log('⏸️ Video paused');
  } else {
    console.log('❌ No video found on page');
  }
}

// Open link by index - Improved to get visible, meaningful links only
function openLinkByIndex(index) {
  // Get all visible links with actual content
  const allLinks = Array.from(document.querySelectorAll('a[href]'));
  
  // Filter to only visible, meaningful links
  const visibleLinks = allLinks.filter(link => {
    // Must have href and not be hidden
    if (!link.href || link.href === '#' || link.href === 'javascript:void(0)') return false;
    
    // Check if visible
    const rect = link.getBoundingClientRect();
    const style = window.getComputedStyle(link);
    
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return false;
    }
    
    // Must have some dimensions (not collapsed)
    if (rect.width === 0 && rect.height === 0) return false;
    
    // Must have text content or image
    const hasText = link.innerText.trim().length > 0;
    const hasImage = link.querySelector('img') !== null;
    
    return hasText || hasImage;
  });
  
  console.log(`🔗 Found ${visibleLinks.length} visible links on page`);
  
  if (visibleLinks.length === 0) {
    chrome.runtime.sendMessage({
      action: 'speakText',
      text: 'No links found on this page'
    });
    return;
  }
  
  if (index >= visibleLinks.length) {
    chrome.runtime.sendMessage({
      action: 'speakText',
      text: `Only ${visibleLinks.length} links found. Please say a number between 1 and ${visibleLinks.length}`
    });
    return;
  }
  
  const link = visibleLinks[index];
  const linkText = link.innerText.trim() || link.getAttribute('aria-label') || 'link';
  console.log(`🔗 Opening link ${index + 1}: ${link.href}`);
  console.log(`   Text: "${linkText}"`);
  
  // Speak feedback before opening
  chrome.runtime.sendMessage({
    action: 'speakText',
    text: `Opening ${linkText.substring(0, 50)}`
  });
  
  // Small delay then click
  setTimeout(() => {
    link.click();
  }, 500);
}

console.log('✅ Voice Assistant content script ready');
