# 🎮 Mettlestate League - New Features Documentation

## ✅ All Features Implemented

### 1. 📅 Postponement System (20 Per Player)

**How it works:**
- Each player starts with **20 postponements per league**
- Postponements are tracked in the player's profile
- Only the person requesting the postponement loses a postponement credit
- Postponements are visible in fixture exports

**Usage:**

#### In Fixtures Tab:
- Each fixture card now has two postponement buttons (one for each player)
- Click the "⏸ [Player]" button to postpone the match on behalf of that player
- Postponed matches show with an orange badge and reduced opacity
- A "▶ Resume" button appears to un-postpone the match

#### In Player Management:
- View each player's remaining postponements (shown as "Postponements: X/20")
- Postponement count automatically decreases when a player postpones a match

#### In Fixture Exports:
- Exported fixture images now separate **ACTIVE FIXTURES** and **POSTPONED FIXTURES**
- Postponed fixtures show with a "⏸" badge and display who postponed it

---

### 2. 🚫 Player Suspension System

**How it works:**
- Admins can suspend/unsuspend players at any time
- Suspended players are excluded from fixture generation
- Suspended players cannot play until reactivated

**Usage:**

#### Suspending a Player:
1. Go to **Players** tab
2. Click the orange "🚫" (ban) button next to the player
3. Player will be marked as "SUSPENDED" with visual indicators
4. Player will be excluded from all future fixture generation

#### Reactivating a Player:
1. Find the suspended player in the **Players** tab
2. Click the green "▶" (play) button
3. Player is immediately reactivated and can be included in fixtures

**Visual Indicators:**
- Suspended players shown with red "SUSPENDED" badge
- Row has reduced opacity and red tint
- Toggle button changes from ban icon (🚫) to play icon (▶)

---

### 3. 🤖 WhatsApp Chat OCR (AI-Powered Auto-Processing)

**How it works:**
- Upload a WhatsApp chat screenshot
- AI automatically detects:
  - **Postponement requests** (player names mentioned)
  - **No-show reports** (@Tyron/@Astral + "opponent didn't show" = automatic 3-0 win)
  - **Match results** (screenshots with scores)
- System automatically updates fixtures and results

**Usage:**

#### Processing a WhatsApp Screenshot:

1. **Go to Admin Panel → WhatsApp Chat OCR**

2. **Click "Upload WhatsApp Screenshot"** and select your image

3. **Click "Process Screenshot"**
   - AI analyzes the entire chat
   - Looks for player names, postponement keywords, no-show reports, and scores

4. **Review Results:**
   - System shows all actions taken
   - Postponements are automatically applied
   - No-shows create automatic 3-0 wins
   - Match results are logged with scores

#### What the AI Detects:

**Postponement Requests:**
- Keywords: "postpone", "can't play", "delay", "reschedule"
- If a player name is mentioned with these words, their postponement is used

**No-Show Reports:**
- Must tag "@Tyron" or "@Astral" (admin tags)
- Must contain "opponent didn't show", "no-show", or "didn't arrive"
- Reporter gets automatic 3-0 win
- Opponent gets automatic 0-3 loss

**Match Results:**
- Looks for scores like "3-1", "2-0", "1-1"
- Matches player names to fixture
- Automatically logs the result with goals

#### Example WhatsApp Chat Scenarios:

**Scenario 1: Postponement**
```
Player message: "Hey @Admin can't play today, need to postpone"
Result: Player's postponement count decreases, match postponed
```

**Scenario 2: No-Show**
```
Player message: "@Tyron opponent didn't show [screenshot]"
Result: Automatic 3-0 win for reporter
```

**Scenario 3: Match Result**
```
Player sends result screenshot showing "Final Score: 4-2"
Result: Match logged with 4-2 score
```

---

## 🎯 Complete Feature Summary

| Feature | Status | Location |
|---------|--------|----------|
| 20 Postponements per Player | ✅ Complete | Players tab, Fixtures tab |
| Postponement Tracking | ✅ Complete | Player management table |
| Postponed Fixture Display | ✅ Complete | Fixtures tab, Fixture exports |
| Player Suspension | ✅ Complete | Players tab |
| Exclude Suspended from Draws | ✅ Complete | Admin → Generate Fixtures |
| WhatsApp OCR - Postponements | ✅ Complete | Admin → WhatsApp Chat OCR |
| WhatsApp OCR - No-Shows (3-0) | ✅ Complete | Admin → WhatsApp Chat OCR |
| WhatsApp OCR - Results | ✅ Complete | Admin → WhatsApp Chat OCR |

---

## 🔧 Technical Details

### Data Structure Updates

**Players:**
```javascript
{
  name: "Player Name",
  username: "username",
  phone: "123456789",
  postponements: 20,      // NEW: Starts at 20
  suspended: false,       // NEW: Suspension status
  // ... existing stats
}
```

**Fixtures:**
```javascript
{
  home: "username1",
  away: "username2",
  postponedBy: null,      // NEW: Username who postponed, or null
  id: timestamp
}
```

**Results:**
```javascript
{
  home: "username1",
  away: "username2",
  homeGoals: 3,
  awayGoals: 1,
  result: "home",         // "home", "away", or "draw"
  autoWin: true,          // NEW: Present if awarded via no-show
  id: timestamp
}
```

### Backwards Compatibility

All existing data structures remain compatible:
- Existing players automatically get `postponements: 20` and `suspended: false`
- Existing fixtures get `postponedBy: null`
- No data migration needed

---

## 📱 Mobile-First Design

All new features are fully mobile-responsive:
- Postponement buttons adapt to screen size
- Suspension indicators clear on small screens
- WhatsApp OCR works with phone screenshots
- Export images optimized for sharing

---

## 🚀 Quick Start Guide

### For Admins:

1. **Managing Postponements:**
   - View remaining postponements in Players tab
   - Use fixture postponement buttons when players request
   - Export fixtures to share with players (shows postponed status)

2. **Managing Suspensions:**
   - Suspend rule-breakers in Players tab
   - They'll be excluded from fixture generation
   - Reactivate when appropriate

3. **Using WhatsApp OCR:**
   - Screenshot the league WhatsApp group chat
   - Upload in Admin → WhatsApp Chat OCR
   - Review and confirm actions taken
   - System handles the rest automatically

### For Players:

- Request postponements through WhatsApp (admins will process)
- Report no-shows by tagging @Tyron/@Astral with evidence
- Submit result screenshots in the group
- Check fixture exports to see postponed matches

---

## 🎨 Visual Indicators

**Postponed Fixtures:**
- 🟠 Orange badge: "⏸ POSTPONED by [username]"
- Reduced opacity (70%)
- Resume button available

**Suspended Players:**
- 🔴 Red "SUSPENDED" badge
- Reduced opacity with red tint
- Green reactivate button

**Auto-Win Results:**
- ⚡ Marked internally as `autoWin: true`
- Displayed as normal 3-0 results in standings

---

## 💡 Tips & Best Practices

1. **Postponements:**
   - Use postponement buttons in Fixtures tab for accuracy
   - Monitor player postponement counts regularly
   - Reset postponements at the start of each league season

2. **Suspensions:**
   - Clearly communicate suspension reasons to players
   - Use for rule violations, not postponement management
   - Document suspensions in your admin notes

3. **WhatsApp OCR:**
   - Capture the full chat context in screenshots
   - Include timestamps when possible
   - Process screenshots promptly for best accuracy
   - Double-check AI-detected results before confirming

4. **Fixture Exports:**
   - Export daily to show players their matches
   - Postponed fixtures clearly separated for clarity
   - Share in WhatsApp group for transparency

---

## 🐛 Troubleshooting

**Postponement not working:**
- Check if player has postponements remaining
- Ensure fixture isn't already postponed
- Verify player username matches fixture

**Suspension not excluding from draw:**
- Refresh the page and try again
- Check suspension status in Players tab
- Ensure using "Generate Fixtures" after suspending

**WhatsApp OCR not detecting:**
- Ensure image is clear and readable
- Check player names match your registered usernames
- Use correct admin tags (@Tyron or @Astral)
- Verify internet connection for API call

---

## 🔐 Security & Privacy

- WhatsApp screenshots processed via Claude API (Anthropic)
- No chat data stored permanently
- Only extracted actions (postponements, results) saved
- All processing happens client-side in browser
- GitHub sync maintains data privacy

---

## 📞 Support

For issues or questions:
- Check this documentation first
- Review player/fixture data for accuracy
- Test with small screenshots before bulk processing
- Document any bugs with screenshots for developer review

---

**Version:** 2.0 - Postponements, Suspensions & WhatsApp OCR  
**Last Updated:** April 2026  
**Developer:** Ghost (DoomedButton327)
