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

### 8. Spacing Between Inline Elements in Table Cells
**Problem:** Phone/WhatsApp icons and StatusDropdown overlapped in list view Actions column.
**Cause:** Icons div and StatusDropdown were siblings inside TableCell with no flex wrapper or gap between them.
**Fix:** Wrap both in a flex container with `gap-2` to control spacing. Individual `mr-2` on the icons div alone wasn't enough since TableCell isn't a flex container.
```tsx
<TableCell className="text-right py-3 px-4 align-middle">
  <div className="flex items-center justify-end gap-2">
    {talent["Phone"] && <div className="flex items-center gap-1.5">...</div>}
    <StatusDropdown ... />
  </div>
</TableCell>
```
**Rule:** When multiple interactive elements share a table cell, always wrap them in a flex container with explicit gap. Don't rely on margin on individual children inside non-flex parent.

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
- [ ] Wrap multiple sibling elements in a flex container with gap when sharing a table cell — don't rely on individual margins
- [ ] When matching two components' sizes, diff their className strings line by line — look for responsive classes (`sm:min-h-[auto]`) one has and the other doesn't
- [ ] After stash pop or branch switch, diff against `origin/redesign` before making new edits
- [ ] `min-h-[44px]` is for mobile touch targets — add `sm:min-h-[auto]` to remove it on desktop

### 9. Matching Component Trigger Sizes Across Responsive Breakpoints
**Problem:** ManagerDropdown and StatusDropdown looked different sizes in card view on desktop.
**Cause:** StatusDropdown had `min-h-[44px] sm:min-h-[auto]` — removing the mobile 44px touch target on desktop. ManagerDropdown had `min-h-[44px]` without the `sm:` override, so it stayed 44px tall on desktop.
**Fix:** Add `sm:min-h-[auto]` to ManagerDropdown trigger to match StatusDropdown.
**Pattern for matching two components:**
1. Compare their trigger `className` strings side by side
2. Look for classes one has that the other doesn't (especially responsive ones like `sm:`)
3. Copy the exact responsive overrides — don't just eyeball the desktop appearance
**Rule:** When matching UI elements across components, check ALL responsive classes (`sm:`, `md:`), not just the base ones. A `sm:min-h-[auto]` on one component and not the other will cause a visible size difference on desktop that looks identical on mobile.

### 10. Always Check Before Editing — Remote May Already Have the Fix
**Problem:** Spent time editing App.tsx to swap DropdownMenu for ManagerDropdown, but the remote redesign branch already had ManagerDropdown in place.
**Cause:** Didn't check `origin/redesign` state before making changes.
**Fix:** Always `git log origin/redesign --oneline -5` and check what the remote has before assuming what needs to change.
**Rule:** After a stash pop conflict or branch switch, always diff against `origin/redesign` to understand the actual current state before making new edits.

## Issues Encountered (March 23, 2026)

### 11. Card Grid Equal Height Layout
**Problem:** Grid cards had varying heights based on content length, causing Manager/Status buttons to overflow or look misaligned between cards in the same row.
**Cause:** Card container was not using flex column layout with content area set to grow.
**Fix:** Made `.talent-card` a flex column (`display: flex; flex-direction: column`), added `h-full` to inner wrapper, and set the clickable content area to `flex-1` so it grows to push the actions bar to the bottom of every card.
```tsx
<Card className="talent-card">  {/* CSS: display: flex; flex-direction: column */}
  <div className="flex flex-col gap-3 h-full">
    <div className="cursor-pointer flex-1">  {/* Content grows */}
      {/* Header, details, etc */}
    </div>
    <div className="pt-2 border-t card-actions">  {/* Actions pinned to bottom */}
      {/* StatusDropdown, ManagerDropdown */}
    </div>
  </div>
</Card>
```
**Rule:** For card grids with action buttons at the bottom, use flex column + `flex-1` on content to equalize heights and pin actions. CSS Grid handles row equalization, but the inner flex layout ensures content fills the space.

### 12. Portal Dropdowns Re-Anchor on Scroll (Not Close)
**Problem:** ManagerDropdown closed on scroll because the scroll handler called `setIsOpen(false)`. User experience was poor — dropdowns should stay open and re-position.
**Cause:** Initial fix used `onScroll = () => setIsOpen(false)` to prevent floating portals, but closing the dropdown on every scroll event is disruptive.
**Fix:** Changed scroll handler to recalculate position from trigger's `getBoundingClientRect()` instead of closing:
```tsx
const handleScroll = () => {
  if (triggerRef.current) {
    const rect = triggerRef.current.getBoundingClientRect();
    setDropdownPosition({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  }
};
window.addEventListener("scroll", handleScroll, true);
window.addEventListener("resize", handleScroll);
```
**Rule:** For portal-based dropdowns, re-anchor on scroll (update position) rather than close. The `true` capture phase catches all scroll events including nested containers. Also listen to `resize` for completeness.

### 13. Default Filter Exclusions (Reactive List)
**Problem:** Need to exclude "Rejected" and "Onboarded" statuses by default on page load, but still allow explicit filtering to show them.
**Cause:** The `activeTile` state defaults to `null` which maps to "all" (show everything). Changing the default to exclude specific statuses would break the filter tile behavior.
**Fix:** Modified the `matchesStatus` logic inside the filter function to treat "all" as "everything except Rejected and Onboarded":
```typescript
// In TalentGridView (line ~1298) and TalentTable (line ~199)
const matchesStatus = 
  !activeTile || activeTile === "all" 
    ? (status !== "Rejected" && status !== "Onboarded")
    : status === activeTile;
```
When a talent's status changes to Rejected/Onboarded, they disappear immediately because the list re-renders reactively.
**Rule:** For "default exclude" filter behavior, modify the filter predicate for the "all" case rather than changing the default filter state. This preserves explicit filter selections while providing the desired default behavior.

### 14. Removing Borders from UI Elements
**Problem:** Multiple UI elements had borders that looked heavy/distracting (stat cards, filter dropdowns, buttons, toggle group).
**Fix pattern:** For each element type:
- **shadcn Select:** Remove `border` from `SelectTrigger` and `SelectContent` className
- **CSS classes:** Remove `border` property from `.stat-card`, `.btn-premium`, `.toggle-group`
- **Inline classes:** Remove `border` from button JSX directly
**Rule:** When removing borders systematically, check ALL layers: CSS classes, component props, and shadcn component internals. One element type might be styled in multiple places.

### 15. Mobile vs Desktop Dialog Close Button
**Problem:** X close button on dialogs had a circle/padding on mobile that looked heavy. User wanted bare X on mobile, circle on desktop.
**Fix:** Use responsive prefixes to conditionally apply styling:
```tsx
className="... p-0 sm:p-2 sm:rounded-full sm:hover:bg-accent border-0 sm:border border-transparent sm:focus:ring-2 sm:focus:ring-ring sm:focus:ring-offset-2 sm:ring-offset-background"
```
- `p-0 sm:p-2` — no padding on mobile, padding on desktop
- `border-0 sm:border` — no border on mobile, border on desktop
- `sm:rounded-full` — no rounding on mobile (square), circle on desktop
**Rule:** For mobile-only style changes on shared components, prefix ALL styling classes with `sm:` to scope them to desktop. The mobile state should be the "naked" version (p-0, border-0, no rounding).

### 16. Don't Touch Vercel Without Permission
**Rule:** Ainesh explicitly said "do not deploy anything on Vercel until I ask you to." All changes go to `redesign` branch and the Cloudflare tunnel only. Vercel deploys only when Ainesh explicitly requests.
