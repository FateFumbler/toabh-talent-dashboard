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

### 2. Dropdown Click Opens Profile Instead (RESOLVED)
**Problem:** Clicking status dropdown opened the talent profile instead.
**Cause:** Click event bubbling up from dropdown trigger to parent card.
**Fix (initial):** Added `e.stopPropagation()` to dropdown trigger button's onClick handler.
**Fix (root cause):** The `handleClickOutside` listener in StatusDropdown checked `dropdownRef.current.contains(event.target)` but the dropdown content was rendered via `createPortal` to `document.body` — so it was NOT inside `dropdownRef`. Every click on a dropdown item was detected as "click outside" and closed the dropdown before the selection registered.
**Final Fix:** Added `dropdownContentRef` to the portal'd dropdown container. Updated click-outside handler to check both `dropdownRef` (trigger) and `dropdownContentRef` (portal'd dropdown). Now clicks on dropdown items are correctly detected as "inside" the dropdown.
**Rule:** When using `createPortal`, always ensure click-outside handlers check BOTH the trigger container AND the portal'd content container.

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

### 8. Dropdown Stays Fixed When Scrolling
**Problem:** When scrolling after opening a dropdown, the dropdown stays in place instead of moving with its parent card.
**Cause:** Using `position: fixed` for portal-rendered dropdowns - fixed positioning is relative to viewport, not parent.
**Fix options:**
1. Use `position: absolute` for dropdowns that should move with parent scroll
2. Add scroll event listeners to reposition dropdown when container scrolls
3. Consider not using portal for dropdowns inside scrollable containers

**Recommended:** Add scroll event handler to recalculate position:
```typescript
useEffect(() => {
  const handleScroll = () => {
    if (isOpen) {
      updatePosition();
    }
  };
  window.addEventListener('scroll', handleScroll, true);
  return () => window.removeEventListener('scroll', handleScroll, true);
}, [isOpen]);
```

### 9. Z-Index Layering Logic
**Problem:** Dropdowns, modals, and overlays may appear behind or in front of wrong elements.
**Fix:** Establish consistent z-index stacking:
- Base content: z-0 to z-10
- Cards: z-10
- Dropdowns: z-50
- Fixed headers: z-40
- Modals: z-50+
- Tooltips: z-60
- Toasts/notifications: z-70

Always use `relative` on parent containers when using `absolute` positioning inside.

## Issues Encountered (March 23, 2026)

### 10. Tab Toggle Hardcoded Colors
**Problem:** Toggle group used hardcoded white backgrounds (`#ffffff`, `#e5e7eb`) which breaks dark mode.
**Fix:** Use theme tokens or media queries. Active state should use `var(--primary)` or indigo (`#5E5ADB`).
**Rule:** Never use hardcoded hex colors in CSS that's meant to be theme-aware. Use CSS variables or Tailwind theme tokens.

### 11. Stat Card Border Clipping on Mobile
**Problem:** `border-left-4` added extra width to card dimensions, pushing cards beyond grid cells on mobile.
**Fix:** Use `box-shadow: inset 4px 0 0 0 <color>` instead of `border-left`. Shadow renders inside the element.
**Also:** Add `min-width: 0` to grid items and `overflow: hidden` to stat-card container.

### 12. Header Tab Navigation - Minimal Design
**Problem:** Tabs with icons and pill-style indicators looked cluttered on mobile.
**Fix:** Remove icons from tabs, use simple text-only tabs. Active state = bold + underline. Group related tabs left, utility buttons right.
**Rule:** Less is more on mobile navigation. Text tabs > icon tabs > pill tabs.

### 13. Dropdown Overflow in Table Containers
**Problem:** `overflow: auto` on table wrapper clips absolutely-positioned dropdowns.
**Fix:** Use React `createPortal` to render dropdown at `document.body` level. Position using `getBoundingClientRect()`.
**Also:** Clamp viewport bounds: `left: Math.max(8, Math.min(left, window.innerWidth - menuWidth))`

### 14. Agents Not Completing Work
**Problem:** Subagents sometimes report "completed" but made no actual changes.
**Fix:** Always verify with `git log` after agent completes. If no new commit, the work wasn't done.
**Rule:** Trust but verify. Check git log, run tsc, run build after every agent completion.

### 15. Toggle Group Hardcoded Colors Broke Theme
**Problem:** Toggle group (list/grid view) used hardcoded hex colors (`#ffffff`, `#e5e7eb`, `#4b5563`). When the app switched to light mode, the toggle appeared dark/black because the hardcoded white didn't adapt.
**Fix:** Replace all hardcoded colors with CSS variables: `var(--bg-secondary)`, `var(--border)`, `var(--text-muted)`, `var(--primary)`.
**Rule:** NEVER use hardcoded hex colors (`#ffffff`, `#e5e7eb`, etc.) in any component that needs to work in both light and dark mode. Always use CSS custom properties.

### 16. One Change Shouldn't Break Another
**Problem:** When fixing the header tabs, the toggle group styling broke because adjacent CSS was affected.
**Fix:** After ANY CSS or component change, verify that ALL other UI elements still work correctly. Run through a quick mental checklist: header, tabs, toggle, cards, dropdowns, stat cards.
**Rule:** Every visual fix must include a regression check of adjacent components.

### 17. Mobile List View Not Working
**Problem:** List view on mobile always fell through to grid view because of `windowWidth < 1024` logic.
**Fix:** Disabled list view toggle on mobile (opacity-50 + disabled) since table layout doesn't work on small screens.
**Rule:** Test both view modes (list + grid) on mobile after any layout changes.

### 18. View Mode Defaults in Settings
**Problem:** User wanted configurable default view mode for mobile and desktop.
**Fix:** Added Settings page with Mobile/Desktop default view mode toggles. Stored in `toabh-default-view-mobile` and `toabh-default-view-desktop` localStorage keys. Manual toggle still uses `toabh-view-mode` as override.
**Pattern:** Three-tier view mode logic: 1) Manual toggle override (`toabh-view-mode`), 2) Settings defaults (`toabh-default-view-*`), 3) Hardcoded fallback (grid=mobile, list=desktop).
**Rule:** When adding configurable defaults, always check: override first, then per-device default, then hardcoded fallback.

### 19. Card onClick Interferes with Child Dropdowns
**Problem:** Status dropdown in grid cards didn't work. The entire `<Card>` had `onClick={() => onTalentClick(...)}` which intercepted ALL clicks, including dropdown interactions.
**Root Cause:** Even with `e.stopPropagation()` on the dropdown trigger, React's event delegation and portal rendering caused edge cases where the card's click handler still fired.
**Fix:** Removed `onClick` from the `<Card>` element. Moved the click handler to a wrapper `<div>` around only the content area (header, info, details). The actions area (StatusDropdown, MoreMenu) sits OUTSIDE the clickable div.
**Rule:** Never put `onClick` on a card container that also contains interactive children (dropdowns, buttons). Instead, make only the content area clickable and keep interactive elements outside the click zone.

## Agent Workflow Rules

### Always Create LEARNINGS.md in Every Project
- Every project must have a `.learning/PROJECT_LEARNINGS.md` or `LEARNINGS.md` file
- Update it after every fix, bug, or design decision
- Include: What went wrong, what fixed it, what to never do again
- This prevents the same mistakes from happening repeatedly

### Never Again (Updated)
- [ ] Always use `String(value || '')` before calling .trim() or other string methods
- [ ] Always test logo in both light and dark mode on both desktop and mobile
- [ ] Add `e.stopPropagation()` on dropdown click handlers
- [ ] Extract duplicate functions to shared utils
- [ ] Use theme tokens (bg-muted, text-foreground) not hardcoded colors
- [ ] Test dropdown positioning near viewport edges
- [ ] Use box-shadow inset instead of border for one-sided accents
- [ ] Add min-width: 0 to grid items to prevent overflow
- [ ] Use portals for dropdowns inside overflow containers
- [ ] Never use hardcoded hex colors in theme-aware CSS
- [ ] Always update learnings after every fix (MANDATORY)
- [ ] Verify git log after agent tasks to confirm work was done
- [ ] Keep nav tabs minimal: text-only, underline active state
- [ ] No Vercel deploys without explicit user approval
- [ ] When changing CSS, scan ALL adjacent styles to avoid unintended side effects on other components
