

## Plan: Add "Export to PDF" Action Button per Session Row

### Summary
Add a PDF export button (download icon) to each row's action buttons in the All Submissions table. Clicking it will recalculate the full results from the stored inputs and generate a plain PDF containing every single input and output value.

### Approach
- Use the browser-side `jspdf` library (no server needed)
- On click: pull the session's stored inputs, run `calculate()`, and dump every input field and every output field into a simple text-based PDF
- Sections: Meta info, Customer Inputs, TitanX/Scoring Inputs, Current State, Grow Tier, Accelerate Tier, Scale Tier (each with all funnel metrics)
- No fancy design — just labeled key-value pairs organized by section

### Files to change

| File | Change |
|---|---|
| `package.json` | Add `jspdf` dependency |
| `src/pages/AdminPanel.tsx` | Add PDF export button + `generatePDF(session)` function that builds inputs → runs `calculate()` → writes all values to a jsPDF document → triggers download |

### PDF Content (all fields)
- **Meta**: Date, Account, User, Model, Funnel Depth, Recommended Tier
- **Customer Inputs**: Reps, Annual Cost/Rep, Dials/Day, Connect Rate, Conversation Rate, Meeting Rate, Show Rate, Opp Rate, Win Rate, ACV
- **Scoring Profile**: High Intent %, Reach %, Avg Phones, TitanX Connect Rate
- **Credit Costs**: Grow/Accelerate/Scale price per credit
- **Lift Multiples**: Grow/Accelerate/Scale multiplier
- **Current State**: All monthly/annual activity, costs, funnel metrics
- **Tier Results (×3)**: Dials, connects, conversations, meetings, credits, costs, cost-per metrics, rep equivalents, all funnel metrics

