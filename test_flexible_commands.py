"""
🧪 TEST FLEXIBLE COMMAND RECOGNITION
Tests the improved fuzzy matching for voice commands
Run this to verify all fixes work correctly
"""

import sys
sys.path.append('.')

# Import the classify_intent function
from voice_listener_enhanced import classify_intent

print("=" * 70)
print("🧪 TESTING FLEXIBLE COMMAND RECOGNITION")
print("=" * 70)

# Test cases: (command, expected_intent)
test_cases = [
    # READ PAGE - Should work with variations
    ("read page", "READ_PAGE"),
    ("read this page", "READ_PAGE"),
    ("please read the page", "READ_PAGE"),
    ("can you read this", "READ_PAGE"),
    ("read everything", "READ_PAGE"),
    ("read all content", "READ_PAGE"),
    ("read the screen", "READ_PAGE"),
    
    # OPEN FIRST LINK - Should work with variations
    ("open first link", "OPEN_FIRST_LINK"),
    ("click first", "OPEN_FIRST_LINK"),
    ("open the first one", "OPEN_FIRST_LINK"),
    ("first result", "OPEN_FIRST_LINK"),
    ("click on first link", "OPEN_FIRST_LINK"),
    ("open first", "OPEN_FIRST_LINK"),
    
    # OPEN SECOND LINK
    ("open second link", "OPEN_SECOND_LINK"),
    ("click second", "OPEN_SECOND_LINK"),
    ("second result", "OPEN_SECOND_LINK"),
    ("open the second one", "OPEN_SECOND_LINK"),
    
    # OPEN THIRD LINK
    ("open third link", "OPEN_THIRD_LINK"),
    ("click third", "OPEN_THIRD_LINK"),
    ("third result", "OPEN_THIRD_LINK"),
    
    # SEARCH YOUTUBE - Should work with variations
    ("search youtube for cats", "SEARCH_YOUTUBE"),
    ("find music on youtube", "SEARCH_YOUTUBE"),
    ("youtube search for dogs", "SEARCH_YOUTUBE"),
    ("search youtube for youtube music", "SEARCH_YOUTUBE"),  # Keep "youtube" in query
    ("look for videos on youtube", "SEARCH_YOUTUBE"),
    ("can you search youtube for coding", "SEARCH_YOUTUBE"),
    
    # SEARCH GOOGLE - Should work with variations
    ("search for weather", "SEARCH_GOOGLE"),
    ("find restaurants near me", "SEARCH_GOOGLE"),
    ("google python tutorials", "SEARCH_GOOGLE"),
    ("look for news", "SEARCH_GOOGLE"),
    ("can you search for cats", "SEARCH_GOOGLE"),
    
    # STOP READING
    ("stop reading", "STOP_READING"),
    ("stop", "STOP_READING"),
    
    # OTHER COMMANDS
    ("scroll down", "SCROLL_DOWN"),
    ("go back", "GO_BACK"),
    ("new tab", "NEW_TAB"),
    ("close tab", "CLOSE_TAB"),
]

passed = 0
failed = 0

print("\n🔍 Testing Commands...")
print("-" * 70)

for command, expected_intent in test_cases:
    intent, confidence = classify_intent(command)
    
    if intent == expected_intent:
        passed += 1
        status = "✅ PASS"
    else:
        failed += 1
        status = "❌ FAIL"
    
    print(f"{status} | '{command}'")
    print(f"         Expected: {expected_intent}, Got: {intent} (conf: {confidence:.2f})")
    print()

print("=" * 70)
print(f"📊 RESULTS: {passed}/{len(test_cases)} passed ({failed} failed)")
print("=" * 70)

if failed == 0:
    print("🎉 ALL TESTS PASSED! Command recognition is working perfectly!")
else:
    print(f"⚠️ {failed} tests failed. Check the output above for details.")

print("\n💡 TIP: Now test with real voice commands!")
print("   1. Start ws_server.py")
print("   2. Start voice_listener_enhanced.py")
print("   3. Reload Chrome extension")
print("   4. Try speaking the commands above!")
