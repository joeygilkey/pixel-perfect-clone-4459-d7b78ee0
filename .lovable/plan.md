

## Understanding the Issue

The current ROI formula is: `addlPipeline / costAnnual` — this calculates the return based on **additional pipeline** divided by the **TitanX cost**. 

The user wants the ROI to reflect the **total output value** (not the delta) relative to **TitanX spend only**, and it should adapt based on funnel depth:

- **Closed Won** → `tier's annualClosedWonRevenue / tier's costAnnual` → e.g. "5.9x revenue return"
- **Qualified Opps** → `tier's annualPipelineGenerated / tier's costAnnual` → e.g. "38.6x pipeline return"

## Plan

**File: `src/pages/Calculator.tsx` (~lines 721-727, 748-751, 783-786)**

1. **Fix ROI formula** — Change the ROI calculation to use the tier's total output (not the delta from current state) divided by `costAnnual` (TitanX spend only, not `totalAnnualCost`):
   - If funnel depth is `closed_won`: `roi = annualClosedWonRevenue / costAnnual`
   - If funnel depth is `opps`: `roi = annualPipelineGenerated / costAnnual`
   - Fallback for shallower depths: keep pipeline-based or hide ROI

2. **Update ROI label** — Change the display text from just "Xx return" to context-aware labels:
   - `closed_won` → "5.9x revenue return"
   - `opps` → "38.6x pipeline return"

3. **Update all three display locations** — the bullet list callout, the table column, and the chart tooltip to use the corrected formula and label.

