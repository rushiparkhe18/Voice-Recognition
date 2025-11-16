"""
🧪 COMPREHENSIVE COMMAND TEST - ALL 23 ESSENTIAL COMMANDS
Tests every single command to ensure the system works properly
Run this before and after making changes to verify everything works!
"""

import sys
sys.path.append('.')

from voice_listener_enhanced import classify_intent, extract_parameter

print("=" * 80)
print("🧪 COMPREHENSIVE VOICE COMMAND TEST - ALL 23 ESSENTIAL COMMANDS")
print("=" * 80)

# Test cases: (command, expected_intent, should_have_parameter, description)
test_cases = [
    # ===== NAVIGATION COMMANDS (6) =====
    ("scroll down", "SCROLL_DOWN", False, "Scroll Down"),
    ("scroll up", "SCROLL_UP", False, "Scroll Up"),
    ("go back", "GO_BACK", False, "Go Back"),
    ("go forward", "GO_FORWARD", False, "Go Forward"),
    ("refresh page", "REFRESH_PAGE", False, "Refresh Page"),
    ("scroll to top", "SCROLL_TO_TOP", False, "Scroll to Top"),
    ("scroll to bottom", "SCROLL_TO_BOTTOM", False, "Scroll to Bottom"),
    
    # ===== TAB COMMANDS (4) =====
    ("new tab", "NEW_TAB", False, "New Tab"),
    ("close tab", "CLOSE_TAB", False, "Close Tab"),
    ("next tab", "NEXT_TAB", False, "Next Tab"),
    ("previous tab", "PREVIOUS_TAB", False, "Previous Tab"),
    
    # ===== ZOOM COMMANDS (3) =====
    ("zoom in", "ZOOM_IN", False, "Zoom In"),
    ("zoom out", "ZOOM_OUT", False, "Zoom Out"),
    ("reset zoom", "RESET_ZOOM", False, "Reset Zoom"),
    
    # ===== READING COMMANDS (3) =====
    ("read page", "READ_PAGE", False, "Read Page"),
    ("read selection", "READ_SELECTION", False, "Read Selection"),
    ("stop reading", "STOP_READING", False, "Stop Reading"),
    
    # ===== SEARCH COMMANDS (2) =====
    ("search google for python tutorials", "SEARCH_GOOGLE", True, "Search Google"),
    ("search youtube for music", "SEARCH_YOUTUBE", True, "Search YouTube"),
    
    # ===== BROWSE LINKS (3) =====
    ("open first link", "OPEN_FIRST_LINK", False, "Open First Link"),
    ("open second link", "OPEN_SECOND_LINK", False, "Open Second Link"),
    ("open third link", "OPEN_THIRD_LINK", False, "Open Third Link"),
    
    # ===== OPEN WEBSITES (3) =====
    ("open google", "OPEN_GOOGLE", False, "Open Google"),
    ("open gmail", "OPEN_GMAIL", False, "Open Gmail"),
    ("open youtube", "OPEN_YOUTUBE", False, "Open YouTube"),
    
    # ===== BOOKMARKS (2) =====
    ("bookmark page", "BOOKMARK_PAGE", False, "Bookmark Page"),
    ("open bookmarks", "OPEN_BOOKMARKS", False, "Open Bookmarks"),
]

# Additional variation tests for flexibility
variation_tests = [
    # Read page variations
    ("read this page", "READ_PAGE", False, "Read Page - Variation 1"),
    ("please read everything", "READ_PAGE", False, "Read Page - Variation 2"),
    ("can you read this", "READ_PAGE", False, "Read Page - Variation 3"),
    
    # Open first link variations
    ("click first", "OPEN_FIRST_LINK", False, "Open First Link - Variation 1"),
    ("first result", "OPEN_FIRST_LINK", False, "Open First Link - Variation 2"),
    ("open the first one", "OPEN_FIRST_LINK", False, "Open First Link - Variation 3"),
    
    # Open second link variations
    ("click second", "OPEN_SECOND_LINK", False, "Open Second Link - Variation 1"),
    ("second result", "OPEN_SECOND_LINK", False, "Open Second Link - Variation 2"),
    
    # Open third link variations
    ("click third", "OPEN_THIRD_LINK", False, "Open Third Link - Variation 1"),
    ("third result", "OPEN_THIRD_LINK", False, "Open Third Link - Variation 2"),
    
    # Search YouTube variations
    ("find music on youtube", "SEARCH_YOUTUBE", True, "Search YouTube - Variation 1"),
    ("youtube search for cats", "SEARCH_YOUTUBE", True, "Search YouTube - Variation 2"),
    ("look for videos on youtube", "SEARCH_YOUTUBE", True, "Search YouTube - Variation 3"),
    
    # Search Google variations
    ("search for weather", "SEARCH_GOOGLE", True, "Search Google - Variation 1"),
    ("find restaurants near me", "SEARCH_GOOGLE", True, "Search Google - Variation 2"),
    ("google python tutorials", "SEARCH_GOOGLE", True, "Search Google - Variation 3"),
    
    # Scroll down variations
    ("page down", "SCROLL_DOWN", False, "Scroll Down - Variation 1"),
    ("move down", "SCROLL_DOWN", False, "Scroll Down - Variation 2"),
    
    # Scroll up variations
    ("page up", "SCROLL_UP", False, "Scroll Up - Variation 1"),
    ("move up", "SCROLL_UP", False, "Scroll Up - Variation 2"),
    
    # New tab variations
    ("open new tab", "NEW_TAB", False, "New Tab - Variation 1"),
    ("create new tab", "NEW_TAB", False, "New Tab - Variation 2"),
]

def test_command(command, expected_intent, should_have_param, description):
    """Test a single command"""
    intent, confidence = classify_intent(command)
    parameter = extract_parameter(command, intent)
    
    # Check intent
    intent_correct = (intent == expected_intent)
    
    # Check parameter
    param_correct = True
    if should_have_param:
        param_correct = (parameter is not None and len(parameter) > 0)
    
    # Overall pass/fail
    passed = intent_correct and param_correct
    
    return {
        'passed': passed,
        'intent': intent,
        'expected_intent': expected_intent,
        'confidence': confidence,
        'parameter': parameter,
        'intent_correct': intent_correct,
        'param_correct': param_correct
    }

# Run all tests
print("\n" + "=" * 80)
print("📋 TESTING ALL 23 ESSENTIAL COMMANDS")
print("=" * 80 + "\n")

passed_count = 0
failed_count = 0
failed_tests = []

for command, expected_intent, should_have_param, description in test_cases:
    result = test_command(command, expected_intent, should_have_param, description)
    
    if result['passed']:
        passed_count += 1
        status = "✅ PASS"
        color = ""
    else:
        failed_count += 1
        status = "❌ FAIL"
        failed_tests.append({
            'command': command,
            'description': description,
            'result': result
        })
    
    print(f"{status} | {description}")
    print(f"         Command: '{command}'")
    print(f"         Expected: {expected_intent}, Got: {result['intent']} (conf: {result['confidence']:.2f})")
    
    if should_have_param:
        if result['parameter']:
            print(f"         Parameter: '{result['parameter']}' ✓")
        else:
            print(f"         Parameter: Missing ✗")
    
    print()

# Run variation tests
print("\n" + "=" * 80)
print("📋 TESTING COMMAND VARIATIONS (Flexibility Test)")
print("=" * 80 + "\n")

variation_passed = 0
variation_failed = 0

for command, expected_intent, should_have_param, description in variation_tests:
    result = test_command(command, expected_intent, should_have_param, description)
    
    if result['passed']:
        variation_passed += 1
        status = "✅ PASS"
    else:
        variation_failed += 1
        status = "❌ FAIL"
        failed_tests.append({
            'command': command,
            'description': description,
            'result': result
        })
    
    print(f"{status} | {description}")
    print(f"         Command: '{command}'")
    print(f"         Got: {result['intent']} (conf: {result['confidence']:.2f})")
    print()

# Summary
total_tests = len(test_cases) + len(variation_tests)
total_passed = passed_count + variation_passed
total_failed = failed_count + variation_failed

print("\n" + "=" * 80)
print("📊 TEST RESULTS SUMMARY")
print("=" * 80)
print(f"\n✅ Essential Commands: {passed_count}/{len(test_cases)} passed")
print(f"✅ Variation Tests: {variation_passed}/{len(variation_tests)} passed")
print(f"\n🎯 OVERALL: {total_passed}/{total_tests} tests passed ({total_failed} failed)")
print(f"   Success Rate: {(total_passed/total_tests)*100:.1f}%")

if total_failed == 0:
    print("\n" + "=" * 80)
    print("🎉🎉🎉 ALL TESTS PASSED! SYSTEM IS WORKING PERFECTLY! 🎉🎉🎉")
    print("=" * 80)
    print("\n✅ All 23 essential commands work correctly")
    print("✅ All command variations are recognized")
    print("✅ Parameter extraction working properly")
    print("✅ System is ready for blind users!")
else:
    print("\n" + "=" * 80)
    print(f"⚠️  {total_failed} TESTS FAILED - Details Below:")
    print("=" * 80 + "\n")
    
    for i, test in enumerate(failed_tests, 1):
        print(f"{i}. {test['description']}")
        print(f"   Command: '{test['command']}'")
        print(f"   Expected: {test['result']['expected_intent']}")
        print(f"   Got: {test['result']['intent']} (conf: {test['result']['confidence']:.2f})")
        
        if not test['result']['param_correct']:
            print(f"   Parameter: {test['result']['parameter']} (should have parameter)")
        
        print()

print("\n" + "=" * 80)
print("💡 NEXT STEPS:")
print("=" * 80)

if total_failed == 0:
    print("\n✓ Run live test with voice:")
    print("  1. Start: python ws_server.py")
    print("  2. Start: python voice_listener_enhanced.py")
    print("  3. Reload Chrome extension")
    print("  4. Try speaking each command!")
else:
    print("\n✗ Fix failed tests:")
    print("  1. Review failed commands above")
    print("  2. Update intent classification in voice_listener_enhanced.py")
    print("  3. Run this test again: python test_all_commands.py")
    print("  4. Repeat until all tests pass")

print("\n" + "=" * 80)
print("📝 Test completed!")
print("=" * 80 + "\n")
