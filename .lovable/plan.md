

## Plan: Redesign Expanded Row Layout — Vertical Sections with Containers

### Summary
Restructure the expanded detail area (lines 604–697 in AdminPanel.tsx) so each section is displayed vertically inside its own bordered glass container, arranged in a responsive grid.

### Layout

```text
┌─────────────────────────────────────────────────────────┐
│ Meta bar (model, funnel, submitted by)                  │
├──────────────┬──────────────┬────────────────────────────┤
│ Customer     │ Scoring      │ Credit Costs               │
│ Inputs       │ Profile      │                            │
│              │              │ Credit — Grow: $X          │
│ Reps: 5      │ HI%: 40%    │ Credit — Acc:  $X          │
│ Cost/Rep: $X │ 7-Dial: 80% │ Credit — Scale: $X         │
│ Dials/Day: X │ Avg Phones:X │                            │
│ Connect%: X  │ TitanX Con%X │                            │
│ Conv%: X     │              │                            │
│ Meeting%: X  │              │                            │
│ ...          │              │                            │
├──────────────┴──────────────┴────────────────────────────┤
│ Current State                                           │
│ (vertical list in a container)                          │
├─────────────────────────────────────────────────────────┤
│ Tier Results — Grow │ Accelerate │ Scale                │
│ (existing 3-col cards, already vertical)                │
└─────────────────────────────────────────────────────────┘
```

### Changes (single file: `src/pages/AdminPanel.tsx`)

1. **Wrap each section** (Customer Inputs, Scoring Profile, Credit Costs, Current State, Tier Results) in a glass container div with `rounded-lg border border-border/20 bg-background/20 p-4` and a section header with the existing brand-red styling.

2. **Customer Inputs** — change from 5-col grid to a single-column vertical list of label–value pairs stacked top-to-bottom.

3. **Scoring Profile** — same vertical list layout. Extract credit costs and lift multipliers into their own "Credit Costs" container.

4. **Credit Costs** — new container with 6 items (3 credit prices + 3 lift multipliers) in a vertical list.

5. **Current State** — vertical list instead of 5-col grid.

6. **Tier Results** — keep existing 3-column card layout (already looks good), just ensure it's also wrapped in a container.

7. **Top row**: Customer Inputs, Scoring Profile, and Credit Costs side-by-side in a `grid-cols-3` layout. Current State full-width below. Tier Results full-width below that.

8. Each vertical list item: label in `text-muted-foreground text-[10px] uppercase` and value in `text-foreground text-sm font-medium`, stacked vertically with small gap between items.

