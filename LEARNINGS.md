# TOABH Talent Dashboard - Learnings & Notes

## Project Overview
Talent management dashboard for TOABH agency. Connects to Google Sheets via Apps Script API.

## Tech Stack
- React + Vite + TypeScript
- Tailwind CSS + shadcn/ui
- React Bits (UI components)
- Framer Motion (animations)
- Vercel deployment

## Key Integrations
- Google Apps Script API for talent data
- Google Sheets as backend database
- Cloudflare tunnel for dev preview

## UI Components Used
- BorderGlow (React Bits) - for stat cards with colored glow effects
- AnimatedList - for manager dropdown (worked), NOT for status dropdown (rendering issues)
- StatusDropdown - custom component for status updates
- Select (shadcn/ui) - for filter dropdowns

## Important Lessons

### Dropdown Issues
1. **StatusDropdown with AnimatedList FAILS** - AnimatedList doesn't render properly inside StatusDropdown in profile dialog context. Use original list implementation instead.
2. **ManagerDropdown with AnimatedList WORKS** - But needs high z-index (z-[9999]) and NO overflow-hidden on parent container.
3. **overflow-hidden on dropdown containers causes clipping** - Always use overflow-visible or no overflow on dropdown wrapper divs.
4. **z-index must be very high (9999)** - Profile dialogs create stacking contexts that can bury dropdowns.

### Git/Deployment Workflow
- Vercel deploys from GitHub master branch
- Tunnel runs locally with current code (different from Vercel if needed)
- Don't auto-deploy to Vercel unless explicitly asked - Ainesh controls deployment

### Clear Filter Button Issue
- The "Clear filter" button used absolute positioning that overlapped stat cards
- Removed completely - clicking stat cards already handles filtering

### Email Field Wrapping
- Email addresses need `word-break: break-all` to wrap properly
- Without it, long emails break awkwardly mid-character

### AnimatedList Integration
- Works well for simple lists (manager names)
- Has issues with: status dots, complex items, narrow containers
- ItemClassName override didn't work as expected
- Max-height creates scroll context properly

### Table vs Grid View
- List view (table) has overflow-visible on card container
- Grid view cards also need proper overflow handling

### React Bits Components
- BorderGlow: Works great for stat cards with colored borders
- intensity prop controls glow strength (2.4 is good default)

## Current Issues Being Fixed
- Dropdown rendering in profile dialog
- Email field wrapping
- Clear filter button removal

## Branch Strategy
- master: production-ready code
- redesign branch: for UI/UX overhaul (in progress)

## Contact
- Ainesh Sikdar (A2SIK) - TOABH agency owner
- Tushar Tomar (FateFumbler) - Developer
