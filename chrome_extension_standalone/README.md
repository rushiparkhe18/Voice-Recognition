# Voice Web Accessibility - Standalone

**A browser-only voice control extension that works instantly - no Python setup required!**

## ✨ Key Features

- 🚀 **Instant Setup**: Just load in Chrome and click "Start" - works immediately
- 🌐 **Browser-Only**: Uses Chrome's built-in Web Speech API
- 🔊 **Voice Feedback**: Speaks confirmation after each command
- ♿ **Accessibility Focused**: Designed for blind and low-vision users
- 💬 **23 Essential Commands**: Navigate, search, read, and control tabs

## 🆚 Standalone vs. Python Version

| Feature | **Standalone** (This Version) | Python Version |
|---------|-------------------------------|----------------|
| Setup | Load in Chrome & click Start | Run Python scripts |
| Requirements | Just Chrome browser | Python, Whisper AI, PyAudio |
| Accuracy | Good (browser speech API) | Excellent (Whisper AI) |
| Speed | Instant recognition | ~5 seconds per command |
| Best For | Quick setup, simple use | Power users, best accuracy |

**Choose this version if you want:** Instant usability, no technical setup  
**Choose Python version if you want:** Better accuracy, offline support

## 📥 Installation

### 1. Load Extension in Chrome

1. Open Chrome and go to: `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **Load unpacked**
4. Select the `chrome_extension_standalone` folder
5. The extension icon will appear in your toolbar

### 2. Start Voice Control

1. Click the extension icon in your toolbar
2. Click the **"Start Voice Control"** button
3. Allow microphone access when prompted
4. The badge will turn **green** (ON) and show "Listening..."
5. **Speak any command** - it will be executed immediately!

### 3. Stop Voice Control

- Click **"Stop Voice Control"** button in the popup
- Or close the popup window
- Badge turns **gray** (OFF)

## 🎤 Supported Commands (23 Total)

### 📜 Page Navigation (7 commands)
| Command | What It Does |
|---------|--------------|
| **scroll down** | Scrolls page down |
| **scroll up** | Scrolls page up |
| **go back** | Goes to previous page |
| **go forward** | Goes to next page in history |
| **refresh page** | Reloads current page |
| **scroll to top** | Jumps to top of page |
| **scroll to bottom** | Jumps to bottom of page |

### 🗂️ Tab Management (4 commands)
| Command | What It Does |
|---------|--------------|
| **new tab** | Opens a new tab |
| **close tab** | Closes current tab |
| **next tab** | Switches to next tab |
| **previous tab** | Switches to previous tab |

### 🔍 Zoom Control (3 commands)
| Command | What It Does |
|---------|--------------|
| **zoom in** | Increases page zoom |
| **zoom out** | Decreases page zoom |
| **reset zoom** | Resets zoom to 100% |

### 📖 Reading (3 commands)
| Command | What It Does |
|---------|--------------|
| **read page** | Reads all page content |
| **read selection** | Reads highlighted text |
| **stop reading** | Stops text-to-speech |

### 🔎 Search (2 commands)
| Command | What It Does | Example |
|---------|--------------|---------|
| **search google [query]** | Searches Google | "search google python tutorial" |
| **search youtube [query]** | Searches YouTube | "search youtube learn coding" |

### 🔗 Link Navigation (3 commands)
| Command | What It Does |
|---------|--------------|
| **open first link** | Clicks the first link on page |
| **open second link** | Clicks the second link on page |
| **open third link** | Clicks the third link on page |

### 🌐 Quick Access (3 commands)
| Command | What It Does |
|---------|--------------|
| **open google** | Opens Google homepage |
| **open gmail** | Opens Gmail |
| **open youtube** | Opens YouTube |

### 🔖 Bookmarks (2 commands)
| Command | What It Does |
|---------|--------------|
| **bookmark this** | Bookmarks current page |
| **open bookmarks** | Opens bookmarks manager |

## 💡 Usage Tips

### For Blind Users
1. **Start with location**: Use "read page" to understand what's on screen
2. **Navigate systematically**: "scroll down" → "read page" → "scroll down"
3. **Use link browsing**: "open first link" is faster than searching
4. **Combine commands**: "search google python" → wait → "open first link"

### Command Recognition
- **Speak clearly** at normal pace
- **Wait for confirmation** before next command (TTS feedback)
- **Commands are flexible**: "scroll down" and "scroll page down" both work
- **For search**: Say "search google [your query]" in one sentence

### Troubleshooting
- **"Command not working"**: Check microphone is enabled in browser
- **"No feedback"**: Ensure browser TTS is enabled (Settings → Accessibility)
- **"Wrong command"**: Speak more slowly and clearly
- **"Badge stays gray"**: Click extension icon and press "Start Voice Control"

## 🔧 Technical Details

### Technologies Used
- **Chrome Web Speech API** (`webkitSpeechRecognition`)
- **Chrome TTS API** (`chrome.tts`)
- **Chrome Extensions API** (Manifest V3)
- **No external dependencies** - pure browser JavaScript

### How It Works
1. **Microphone** → Captures your voice
2. **Speech Recognition** → Converts speech to text
3. **Command Classifier** → Identifies intent (scroll, search, etc.)
4. **Action Executor** → Performs the command
5. **TTS Feedback** → Speaks confirmation

### Permissions Required
- `activeTab` - Access to current tab
- `tabs` - Tab management (create, switch, close)
- `storage` - Save user preferences
- `scripting` - Inject content scripts for page manipulation

### File Structure
```
chrome_extension_standalone/
├── manifest.json          # Extension configuration
├── background.js          # Service worker (command processor)
├── content.js            # Page manipulation scripts
├── popup.html            # Extension UI
├── popup.js              # UI logic
├── icons/                # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md             # This file
```

## 🔄 Comparison with Python Version

### When to Use Standalone (This Version)
✅ You want instant setup  
✅ You're new to voice control  
✅ You don't want to install Python  
✅ You need quick web browsing help  

### When to Use Python Version
✅ You need maximum accuracy  
✅ You work offline frequently  
✅ You're comfortable with technical setup  
✅ You want advanced features (custom commands, better AI)  

**Both versions support the same 23 commands!**

## 📚 Related Documentation

- See `COMMANDS.md` in parent folder for detailed command examples
- Python version: `chrome_extension/` folder
- Test suite: `test_all_commands.py` (for Python version)

## 🐛 Known Limitations

1. **Accuracy**: Browser speech recognition is less accurate than Whisper AI
2. **Internet Required**: Web Speech API requires internet connection
3. **Chrome Only**: Currently only works in Chrome/Chromium browsers
4. **Language**: English only (US English accent recommended)
5. **Background Noise**: Works best in quiet environments

## 🆘 Getting Help

If you encounter issues:
1. Check **Troubleshooting** section above
2. Verify microphone permissions in Chrome settings
3. Test microphone with: "speech recognition test" in Google
4. Try the **Python version** for better accuracy

## 🎯 Quick Start Example

```
1. Load extension in Chrome
2. Click extension icon
3. Click "Start Voice Control"
4. Say: "search google weather"
   → Extension searches Google for "weather"
5. Say: "open first link"
   → Opens top search result
6. Say: "read page"
   → Reads the page content aloud
7. Say: "go back"
   → Returns to search results
```

**That's it! You're now browsing hands-free! 🎉**

---

**Made with ♿ for accessibility • Works entirely in browser • No setup required**
