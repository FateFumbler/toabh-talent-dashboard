# TOABH Talent Dashboard - Project Learnings

## Issues Encountered (March 22, 2026)

### 1. Logo Theme Switching Logic Bug
**Problem:** Logo was using wrong Tailwind classes for theme switching.
**Wrong:** `<img src="/logo_white.png" className="hidden dark:block" />` (show white in dark mode)
**Correct:** 
```tsx
<img src="/logo_black.png" className="dark:hidden" />       {/* Show in light mode */}
<img src="/logo_white.png" className="hidden dark:block" />   {/* Show in dark mode */}
```
- `dark:hidden` = hide when DARK = show in LIGHT
- `hidden dark:block` = hide when LIGHT = show in DARK

### 2. Dropdown Click Opens Profile Instead
**Problem:** Clicking status dropdown opened the talent profile instead.
**Cause:** Click event bubbling up from dropdown trigger to parent card.
**Fix:** Add `e.stopPropagation()` to dropdown trigger button's onClick handler.

### 3. Height.trim() Error
**Problem:** `height.trim is not a function` error in list view.
**Cause:** Height value was not a string (could be number or undefined).
**Fix:** Always convert to string before calling string methods:
```typescript
const trimmed = String(height || '').trim();
```

### 4. Duplicate formatHeight() Functions
**Problem:** Same function copied in 3 files (App.tsx, TalentTable.tsx, TalentProfile.tsx).
**Fix:** Extract to `src/lib/utils.ts` and import where needed.

### 5. Portal-Based Dropdown Positioning
**Problem:** Dropdown rendered via portal appeared disconnected from trigger.
**Fix:** Use `getBoundingClientRect()` of trigger button to position dropdown correctly.
**Also:** Add viewport boundary checking to prevent overflow.

### 6. Hardcoded Colors Break Theme
**Problem:** Components like AnimatedList used hardcoded `bg-purple-600` which breaks light mode.
**Fix:** Always use theme tokens like `bg-primary`, `bg-muted`, `ring-primary/50`.

### 7. Avatar Placeholder Colors
**Problem:** Dark blue backgrounds looked inconsistent.
**Fix:** Use `bg-muted` for all avatar placeholders.

## Design Decisions

### Theme System
- Use oklch color space for design tokens
- Primary color should be used for accents, not full backgrounds
- Always test in both light AND dark mode

### Component Architecture
- Extract shared utilities (formatHeight, etc.) to `src/lib/utils.ts`
- Don't copy-paste functions - refactor to shared location
- Clean up imports - don't have duplicate imports at top AND bottom of files

## Never Again
- [ ] Always use `String(value || '')` before calling .trim() or other string methods
- [ ] Always test logo in both light and dark mode on both desktop and mobile
- [ ] Add `e.stopPropagation()` on dropdown click handlers
- [ ] Extract duplicate functions to shared utils
- [ ] Use theme tokens (bg-muted, text-foreground) not hardcoded colors
- [ ] Test dropdown positioning near viewport edges
