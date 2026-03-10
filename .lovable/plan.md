

## Plan: Dynamic "Cost Per" Metrics Based on Funnel Depth

**What it does:** The Financial Metrics section currently always shows Cost Per Connect and Cost Per Meeting. This change makes it show progressive "cost per" stats all the way down to the selected funnel depth.

### Cost Per Metrics by Depth

| Funnel Depth | Metrics Shown |
|---|---|
| Meetings Set | Cost Per Connect, Cost Per Meeting Set |
| Meetings Held | Cost Per Connect, Cost Per Meeting Set, Cost Per Meeting Held |
| Qualified Opps | Cost Per Connect, Cost Per Meeting Set, Cost Per Meeting Held, Cost Per Qualified Opp |
| Closed Won | Cost Per Connect, Cost Per Meeting Set, Cost Per Meeting Held, Cost Per Qualified Opp, Cost Per Acquisition |

### Changes

**1. `src/lib/calculations.ts`** — Add new cost-per fields to `TierResults` and `CurrentState`:
- `costPerMeetingHeld` — totalAnnualCost / annualMeetingsHeld
- `costPerOpp` — totalAnnualCost / annualOpps
- `costPerAcquisition` — totalAnnualCost / annualClosedWon

Compute these in `calcBlended`, `calcHI`, and for CurrentState wherever the funnel data exists.

**2. `src/pages/Calculator.tsx`** — Update `FinancialColumn`:
- Pass `funnelDepth` as a prop
- After "Cost Per Meeting" (rename to "Cost Per Meeting Set"), conditionally render:
  - `meetings_held`+: Cost Per Meeting Held
  - `opps`+: Cost Per Qualified Opp
  - `closed_won`: Cost Per Acquisition
- Use the existing `depthAtLeast()` helper for conditionals

