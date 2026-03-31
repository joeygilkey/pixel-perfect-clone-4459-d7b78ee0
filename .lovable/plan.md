

## Plan: Add Navigation Link + "Present to Client" Button

### What we're building
1. **Nav link in Admin header** — an icon/button (e.g. calculator icon or "Open Calculator") in the admin header bar that links to `/` (main calculator) in a new tab.
2. **"Present to Client" button on individual sessions** — in the All Submissions tab, each session row gets a button that opens the main calculator in a new tab with query params (e.g. `/?session=<id>`) so the calculator can load that session's data and display results in the client-facing view.
3. **Calculator reads query params** — on mount, if `?session=<id>` is present, fetch that session from Supabase and pre-fill all inputs + show results automatically.

### Files to change

**`src/pages/AdminPanel.tsx`**
- Add an "Open Calculator" link/icon button in the header (next to Sign Out) that does `window.open('/', '_blank')`
- Add a "Present" button on each session row in the All Submissions table that does `window.open('/?session=' + row.id, '_blank')`

**`src/pages/Calculator.tsx`**
- On mount, check for `session` query param via `useSearchParams`
- If present, fetch the session from `admin_sessions_view` by ID and populate all input state fields + trigger calculation
- This lets the calculator render the full branded results for that saved session

### Technical details
- Query param approach keeps it simple — no new routes needed
- The calculator already has all the state fields; we just set them from the fetched row
- The "Present" button will use a branded style (glass-subtle with an external-link icon)

