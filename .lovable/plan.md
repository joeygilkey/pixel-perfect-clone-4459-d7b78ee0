

# TitanX Dream Outcome Calculator

## Overview
An internal sales tool for Account Executives to create personalized pro forma projections showing prospects what outcomes they can expect at each TitanX plan tier (Grow, Accelerate, Scale). Dark, premium dashboard aesthetic with the TitanX brand system.

## Pages

### 1. Calculator Page (Authenticated AE View)
- **Header**: TitanX wordmark (TITAN white + X red), centered title "Dream Outcome Calculator", "New Session" button
- **Session Info Bar**: Customer Name, Company, AE Name (pre-filled from auth), Date (auto-filled)
- **Customer Inputs Section** (red "CUSTOMER INPUTS" label): 6 fields in 2-column grid — Reps, Annual Cost Per Rep, Dials/Day, Connect Rate, Conversation Rate, Meeting Rate
- **TitanX Data Section** (red "TITANX DATA" label): 7 fields in 2-column grid — High Intent %, HI Reach, Avg Phones/Contact, TitanX Connect Rate, Credit Price for each tier (Grow/Accelerate/Scale)
- **Live Results Section**: Toggle between "Blended Calling" and "High Intent Only" models. 4-column layout (Current State + 3 plan tiers) showing Activity Metrics, Efficiency Story (highlighted with red accent), and Financial Metrics as styled stat cards. Scale column marked as "RECOMMENDED"
- **Action Bar**: Save Session, Copy Shareable Link, Start New Session buttons

### 2. Shared View (Public, Read-Only)
- Route: `/share/:sessionId`
- Loads saved session from Supabase, renders both Blended and High Intent results stacked (no toggle)
- Polished presentation mode with TitanX branding, no edit controls
- Footer with "Welcome to the Phone Intent™ Era." tagline

## Design System
- Dark theme: `#1A1A1A` background, `#2A2A2A` panels, `#FF004C` accent
- Inter font, sharp/confident enterprise feel
- Typography hierarchy: bold white headlines, `#999999` labels, large stat numbers, red highlights for key metrics

## Calculation Engine
- Two models: **Blended** (High + Low Intent mix) and **High Intent Only**
- Three tiers per model: Grow (1.5×), Accelerate (2×), Scale (2.5×)
- All calculations derived live from inputs — no submit button
- Metrics: dials, connects, conversations, meetings, credits, costs, rep equivalents, efficiency ratios
- Validation against provided reference numbers to ensure accuracy

## Backend (Supabase)
- **Auth**: Simple authentication for AEs
- **Database table** `dream_outcome_sessions`: stores all inputs + computed results as JSONB
- **RLS**: Anyone with session UUID can read (for sharing); write requires auth
- **Shareable links**: `/share/{session-id}` pattern

## UX Details
- Results update instantly as inputs change
- Empty fields show `—` placeholders (no NaN/0)
- Percentage inputs accept both whole numbers and decimals
- Tooltip hints on technical fields
- Responsive: side-by-side on desktop, stacked on mobile
- Success toast on save

