

## Plan: Guest Read-Only Links for Calculator Sessions

### Concept
Generate a unique share token for any saved session. Non-authenticated users can open a `/share/:token` route and see the full calculator results in read-only mode — no login required, no ability to edit inputs or access admin.

### How it works

1. **New DB column**: Add a `share_token` (UUID, unique, nullable) column to `calculator_sessions`. When a user clicks "Share" on a session, generate a UUID token and store it.

2. **RLS policy**: Add a `SELECT` policy on `calculator_sessions` that allows anonymous access when filtering by `share_token` — so the guest link works without authentication.

3. **New route `/share/:token`**:
   - Public route (no `ProtectedRoute` wrapper)
   - Fetches the session by `share_token` from `calculator_sessions`
   - Runs the calculation engine with the stored inputs
   - Renders `CalculatorResultsView` in a branded, read-only layout (no input fields, no save button, no admin link)
   - Shows account name, date, model, and recommended tier as context

4. **"Copy Guest Link" button** in Admin Panel:
   - On the All Submissions table (next to "Present to Client")
   - First click generates a `share_token` if one doesn't exist, saves it, then copies the URL
   - Subsequent clicks just copy the existing URL
   - URL format: `https://yourapp.com/share/<token>`

### Files to change

| File | Change |
|---|---|
| **Migration** | Add `share_token uuid unique` column to `calculator_sessions`; add anon SELECT policy filtered by `share_token IS NOT NULL` |
| `src/App.tsx` | Add public route `/share/:token` pointing to new `GuestView` page |
| `src/pages/GuestView.tsx` | **New file** — fetch session by token, run `calculate()`, render read-only results with branding |
| `src/pages/AdminPanel.tsx` | Add "Copy Guest Link" button per row that generates/copies the share URL |

### Security
- Token is a random UUID — not guessable
- Guest can only see the single session tied to that token
- No auth session = no access to any other route or data
- No edit/save capabilities exposed in the guest view

