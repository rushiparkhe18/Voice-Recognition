// Content script - Executes commands on web pages
console.log('🎤 Standalone Voice Assistant content script loaded');

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

// Read page content aloud - Improved efficiency
function readPageContent() {
  try {
    // Try to get main content first (more efficient for articles)
    let mainContent = '';
    
    // Priority 1: Look for article or main content
    const article = document.querySelector('article, main, [role="main"], .article, .content, .post');
    if (article) {
      mainContent = article.innerText || article.textContent;
    }
    
    // Priority 2: If no article, get body but exclude nav, footer, ads
    if (!mainContent) {
      const bodyClone = document.body.cloneNode(true);
      // Remove navigation, headers, footers, ads, scripts
      const excludeSelectors = 'nav, header, footer, aside, .ad, .advertisement, script, style, [role="navigation"], [role="banner"], [role="complementary"]';
      bodyClone.querySelectorAll(excludeSelectors).forEach(el => el.remove());
      mainContent = bodyClone.innerText || bodyClone.textContent;
    }
    
    // Clean and process text
    const cleanText = mainContent
      .replace(/\s+/g, ' ')           // Multiple spaces to single
      .replace(/\n+/g, '. ')          // Newlines to periods
      .replace(/\.\s*\./g, '.')       // Remove double periods
      .trim()
      .substring(0, 8000);            // Increased from 5000 for better reading
    
    if (cleanText && cleanText.length > 10) {
      // Send first, then start speaking
      chrome.runtime.sendMessage({
        action: 'speakText',
        text: cleanText
      }, (response) => {
        console.log('✅ Started reading page');
      });
    } else {
      chrome.runtime.sendMessage({
        action: 'speakText',
        text: 'No readable content found on this page'
      });
    }
  } catch (error) {
    console.error('Error reading page:', error);
    chrome.runtime.sendMessage({
      action: 'speakText',
      text: 'Error reading this page'
    });
  }
}

// Read selected text aloud
function readSelectedText() {
  const selection = window.getSelection().toString().trim();
  
  if (selection) {
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

console.log('✅ Standalone Voice Assistant content script ready');
