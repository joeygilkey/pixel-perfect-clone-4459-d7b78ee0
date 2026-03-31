

## Plan: Add ROI & Financial Metrics to PDF Export

### Summary
Add the missing ROI and financial comparison metrics to each tier section in the PDF export, matching what the calculator UI shows.

### Metrics to add per tier

1. **Headcount Equivalence**: Additional reps needed = `repProductionEquivalent - reps`, cost = `additionalReps * annualCostPerRep`
2. **Incremental Pipeline**: `tier.funnel.annualPipelineGenerated - currentState.funnel.annualPipelineGenerated`
3. **Incremental Revenue**: `tier.funnel.annualClosedWonRevenue - currentState.funnel.annualClosedWonRevenue`
4. **ROI Multiple**: `incrementalValue / tier.costAnnual` (uses revenue if closed_won depth, otherwise pipeline)

### Files to change

| File | Change |
|---|---|
| `src/pages/AdminPanel.tsx` | In `generateSessionPDF`, after existing tier metrics (lines ~258-269), add ROI section: headcount equivalence cost, incremental pipeline delta, incremental revenue delta, and ROI multiple |

### Technical details
- Compute `additionalReps = t.repProductionEquivalent - cInputs.reps`
- Compute `additionalCost = additionalReps * cInputs.annualCostPerRep`
- Compute incremental pipeline/revenue by subtracting current state funnel values from tier funnel values
- Compute ROI = incremental value / `t.costAnnual` (guard against zero)
- All values formatted with existing `fCurrency`/`fNumber` helpers

