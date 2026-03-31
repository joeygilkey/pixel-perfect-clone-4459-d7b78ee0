import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, ReferenceLine } from 'recharts';
import { Star, ChevronDown } from 'lucide-react';
import { fCurrency, fNumber, fPercent, fReps, fMeetings } from '@/lib/formatters';
import type { TierResults, CurrentState, FunnelDepth, FunnelMetrics, CalculationResults } from '@/lib/calculations';

/* ───── Helpers ───── */

const FUNNEL_DEPTH_ORDER: FunnelDepth[] = ['meetings_set', 'meetings_held', 'opps', 'closed_won'];

export function depthAtLeast(current: FunnelDepth, target: FunnelDepth): boolean {
  return FUNNEL_DEPTH_ORDER.indexOf(current) >= FUNNEL_DEPTH_ORDER.indexOf(target);
}

function getPrimaryMetric(depth: FunnelDepth, funnel: FunnelMetrics, monthlyMeetings: number): { label: string; value: string } {
  switch (depth) {
    case 'closed_won':
      return { label: 'Monthly Closed Won', value: fMeetings(funnel.monthlyClosedWon ?? 0) };
    case 'opps':
      return { label: 'Monthly Qualified Opps', value: fMeetings(funnel.monthlyOpps ?? 0) };
    case 'meetings_held':
      return { label: 'Monthly Meetings Held', value: fMeetings(funnel.monthlyMeetingsHeld ?? 0) };
    default:
      return { label: 'Monthly Meetings Set', value: fMeetings(monthlyMeetings) };
  }
}

/* ───── Sub-components ───── */

function StatCard({ label, value, highlight = false, muted = false, index = 0 }: {
  label: React.ReactNode; value: string; highlight?: boolean; muted?: boolean; index?: number;
}) {
  const bgColor = index >= 0 ? (index % 2 === 0 ? 'rgba(26,26,26,0.6)' : 'rgba(42,42,42,0.4)') : 'transparent';
  return (
    <div className={`transition-all duration-300 rounded-md px-3 py-2 ${muted ? 'opacity-40' : ''}`} style={{ backgroundColor: bgColor }}>
      <div className={`text-xl font-bold tabular-nums tracking-tight ${highlight ? 'text-primary drop-shadow-[0_0_8px_hsla(348,100%,50%,0.4)]' : 'text-foreground'}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

function FunnelContextSection({ funnel, monthlyMeetings, depth }: {
  funnel: FunnelMetrics; monthlyMeetings: number; depth: FunnelDepth;
}) {
  if (depth === 'meetings_set') return null;
  return (
    <div className="space-y-1.5 mt-2">
      <p className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground/60 font-semibold">Funnel Context</p>
      <div className="text-xs text-muted-foreground/50 space-y-0.5">
        <div className="flex justify-between"><span>Meetings Set</span><span className="tabular-nums">{fMeetings(monthlyMeetings)}/mo</span></div>
        {depthAtLeast(depth, 'meetings_held') && funnel.monthlyMeetingsHeld != null && depth !== 'meetings_held' && (
          <div className="flex justify-between"><span>Meetings Held</span><span className="tabular-nums">{fMeetings(funnel.monthlyMeetingsHeld)}/mo</span></div>
        )}
        {depthAtLeast(depth, 'opps') && funnel.monthlyOpps != null && depth !== 'opps' && (
          <div className="flex justify-between"><span>Qualified Opps</span><span className="tabular-nums">{fMeetings(funnel.monthlyOpps)}/mo</span></div>
        )}
      </div>
    </div>
  );
}

export function TierColumn({ title, subtitle, results, currentState, recommended = false, isCurrent = false, onRecommend, funnelDepth, reps, annualCostPerRep }: {
  title: string; subtitle?: string; results?: TierResults; currentState?: CurrentState;
  recommended?: boolean; isCurrent?: boolean; onRecommend?: () => void; funnelDepth: FunnelDepth;
  reps?: number | null; annualCostPerRep?: number | null;
}) {
  const glassClass = recommended
    ? 'glass-accent glow-primary'
    : isCurrent
      ? 'glass-subtle'
      : 'glass';

  const monthlyMeetings = isCurrent ? (currentState?.monthlyMeetings ?? 0) : (results?.monthlyMeetings ?? 0);
  const funnel = isCurrent ? (currentState?.funnel ?? {}) : (results?.funnel ?? {});
  const primary = getPrimaryMetric(funnelDepth, funnel, monthlyMeetings);

  return (
    <div className={`${glassClass} rounded-xl p-5 space-y-5 relative overflow-hidden transition-all duration-500 hover:scale-[1.01] hover:shadow-lg ${recommended ? 'ring-1 ring-primary/40' : ''}`}>
      <div className={`absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r ${recommended ? 'from-transparent via-primary/60 to-transparent' : 'from-transparent via-foreground/10 to-transparent'}`} />

      {!isCurrent && onRecommend && (
        <button onClick={onRecommend} className="absolute top-3 left-3 z-10 transition-all duration-300">
          <Star className={`h-4 w-4 ${recommended ? 'fill-primary text-primary drop-shadow-[0_0_6px_hsla(342,100%,50%,0.5)]' : 'text-muted-foreground/40 hover:text-primary/60'}`} />
        </button>
      )}

      <div className="text-center min-h-[48px] flex flex-col items-center justify-center">
        <span className={`inline-block font-bold text-base px-4 py-1.5 rounded-full border ${isCurrent ? 'bg-muted text-muted-foreground border-border' : 'bg-primary/20 text-primary border-primary/30'}`}>{title}</span>
        {subtitle ? <p className="text-[10px] text-muted-foreground/60 mt-1.5">{subtitle}</p> : <p className="text-[10px] mt-1.5">&nbsp;</p>}
      </div>

      {funnelDepth !== 'meetings_set' && (
        <div className="text-center py-2">
          <div className="text-2xl font-bold tabular-nums tracking-tight text-primary drop-shadow-[0_0_8px_hsla(348,100%,50%,0.4)]">{primary.value}</div>
          <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mt-0.5">{primary.label}</div>
          <FunnelContextSection funnel={funnel} monthlyMeetings={monthlyMeetings} depth={funnelDepth} />
        </div>
      )}

      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-semibold pb-1 border-b-2 border-primary">Activity</p>
        {isCurrent && currentState ? (
          <>
            <StatCard label="Monthly Dials" value={fNumber(currentState.monthlyDials)} muted index={0} />
            <StatCard label="Monthly Connects" value={fNumber(currentState.monthlyConnects)} muted index={1} />
            <StatCard label="Monthly Conversations" value={fNumber(currentState.monthlyConversations, 1)} muted index={2} />
            <StatCard label="Monthly Meetings" value={fMeetings(currentState.monthlyMeetings)} muted index={3} />
            <StatCard label="Annual Meetings" value={fMeetings(currentState.annualMeetings)} muted index={4} />
            {funnelDepth !== 'meetings_set' && currentState.funnel.monthlyMeetingsHeld != null && (
              <StatCard label="Monthly Meetings Held" value={fMeetings(currentState.funnel.monthlyMeetingsHeld)} muted index={5} />
            )}
            {depthAtLeast(funnelDepth, 'opps') && currentState.funnel.monthlyOpps != null && (
              <StatCard label="Monthly Qualified Opps" value={fMeetings(currentState.funnel.monthlyOpps)} muted index={6} />
            )}
            {funnelDepth === 'closed_won' && currentState.funnel.monthlyClosedWon != null && (
              <StatCard label="Monthly Closed Won" value={fMeetings(currentState.funnel.monthlyClosedWon)} muted index={7} />
            )}
          </>
        ) : results ? (
          <>
            <StatCard label="Monthly Dials" value={fNumber(results.monthlyDials)} index={0} />
            <StatCard label="Monthly Connects" value={fNumber(results.monthlyConnects)} index={1} />
            <StatCard label="Monthly Conversations" value={fNumber(results.monthlyConversations, 1)} index={2} />
            <StatCard label="Monthly Meetings" value={fMeetings(results.monthlyMeetings)} index={3} />
            <StatCard label="Annual Meetings" value={fMeetings(results.annualMeetings)} index={4} />
            {funnelDepth !== 'meetings_set' && results.funnel.monthlyMeetingsHeld != null && (
              <StatCard label="Monthly Meetings Held" value={fMeetings(results.funnel.monthlyMeetingsHeld)} index={5} />
            )}
            {depthAtLeast(funnelDepth, 'opps') && results.funnel.monthlyOpps != null && (
              <StatCard label="Monthly Qualified Opps" value={fMeetings(results.funnel.monthlyOpps)} index={6} />
            )}
            {funnelDepth === 'closed_won' && results.funnel.monthlyClosedWon != null && (
              <StatCard label="Monthly Closed Won" value={fMeetings(results.funnel.monthlyClosedWon)} index={7} />
            )}
          </>
        ) : null}
      </div>

      {!isCurrent && results && (
        <div className="space-y-3 glass-accent rounded-lg p-3 -mx-1">
          <p className="text-[10px] uppercase tracking-[0.15em] text-primary font-semibold flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Efficiency Story
          </p>
          <StatCard label="Rep Production Equivalent" value={`${fReps(results.repProductionEquivalent)} reps`} highlight index={-1} />
          <StatCard label="% of Current Dials Required" value={fPercent(results.pctOfCurrentDials)} highlight index={-1} />
          <StatCard label="Cost of Equivalent Reps" value={`${fReps(results.costOfEquivReps)} reps`} highlight index={-1} />
        </div>
      )}

      {!isCurrent && results && (
        <div className="bg-muted/40 rounded-lg p-3 text-center space-y-3">
          <div>
            <div className="text-xl font-bold tabular-nums tracking-tight text-foreground">{fNumber(results.creditsPerMonth * 12)}</div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mt-0.5">Credits / Year</div>
          </div>
          <div className="border border-primary rounded-lg p-2">
            <div className="text-xl font-bold tabular-nums tracking-tight text-foreground">{fCurrency(results.costAnnual)}</div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mt-0.5">Annual Cost</div>
          </div>
        </div>
      )}

      {!isCurrent && results && reps != null && reps > 0 && annualCostPerRep != null && annualCostPerRep > 0 && (() => {
        const additionalReps = results.repProductionEquivalent - reps;
        const additionalCost = additionalReps * annualCostPerRep;
        return additionalReps > 0 ? (
          <div className="glass-accent rounded-lg p-3 text-center">
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              It would cost you <span className="font-bold text-primary">{fCurrency(additionalCost)}</span> in additional headcount to achieve the {title.toLowerCase()} plan outcome, but instead you will do it with the same team size only making <span className="font-bold text-primary">{fPercent(results.pctOfCurrentDials)}</span> of your current dials.
            </p>
          </div>
        ) : null;
      })()}
    </div>
  );
}

/* ───── Main Results Component ───── */

interface CalculatorResultsProps {
  results: CalculationResults;
  tierData: { grow: TierResults; accelerate: TierResults; scale: TierResults };
  funnelDepth: FunnelDepth;
  recommendedTier: string | null;
  onRecommendTier: (tier: string | null) => void;
  reps: number | null;
  annualCostPerRep: number | null;
  multiples: { grow: number | null; accelerate: number | null; scale: number | null };
}

export default function CalculatorResults({
  results, tierData, funnelDepth, recommendedTier, onRecommendTier,
  reps, annualCostPerRep, multiples,
}: CalculatorResultsProps) {
  const [financialOpen, setFinancialOpen] = useState(false);
  const [roiOpen, setRoiOpen] = useState(false);

  const showROI = depthAtLeast(funnelDepth, 'opps') && results;

  return (
    <div className="space-y-6">
      {/* Activity + Efficiency — 4-column TierColumns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <TierColumn title="Current State" isCurrent currentState={results.currentState} funnelDepth={funnelDepth} />
        <TierColumn title="Grow" subtitle={`${multiples.grow ?? 1.5}× connects`} results={tierData.grow} currentState={results.currentState} recommended={recommendedTier === 'grow'} onRecommend={() => onRecommendTier(recommendedTier === 'grow' ? null : 'grow')} funnelDepth={funnelDepth} reps={reps} annualCostPerRep={annualCostPerRep} />
        <TierColumn title="Accelerate" subtitle={`${multiples.accelerate ?? 2}× connects`} results={tierData.accelerate} currentState={results.currentState} recommended={recommendedTier === 'accelerate'} onRecommend={() => onRecommendTier(recommendedTier === 'accelerate' ? null : 'accelerate')} funnelDepth={funnelDepth} reps={reps} annualCostPerRep={annualCostPerRep} />
        <TierColumn title="Scale" subtitle={`${multiples.scale ?? 2.5}× connects`} results={tierData.scale} currentState={results.currentState} recommended={recommendedTier === 'scale'} onRecommend={() => onRecommendTier(recommendedTier === 'scale' ? null : 'scale')} funnelDepth={funnelDepth} reps={reps} annualCostPerRep={annualCostPerRep} />
      </div>

      {/* Financial Section */}
      <div>
        <button onClick={() => setFinancialOpen(prev => !prev)} className="w-full flex items-center gap-2 mb-3 group cursor-pointer">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-[0.12em] border-l-2 border-primary pl-3">Financial Metrics</h3>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-300 ${financialOpen ? 'rotate-180' : ''}`} />
        </button>
        <div className={`transition-all duration-500 overflow-hidden ${financialOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <FinancialTable results={results} tierData={tierData} funnelDepth={funnelDepth} />
          <WaterfallChart results={results} tierData={tierData} funnelDepth={funnelDepth} />
        </div>
      </div>

      {/* ROI Summary */}
      {showROI && (
        <ROISummary
          results={results}
          tierData={tierData}
          funnelDepth={funnelDepth}
          roiOpen={roiOpen}
          setRoiOpen={setRoiOpen}
        />
      )}
    </div>
  );
}

/* ───── Financial Table ───── */

function FinancialTable({ results, tierData, funnelDepth }: {
  results: CalculationResults; tierData: { grow: TierResults; accelerate: TierResults; scale: TierResults }; funnelDepth: FunnelDepth;
}) {
  const cs = results.currentState;
  const tiers = [
    { name: 'Grow', data: tierData.grow },
    { name: 'Accelerate', data: tierData.accelerate },
    { name: 'Scale', data: tierData.scale },
  ];

  type MetricRow = { label: string; csValue: number | undefined; tierValues: (number | undefined)[]; depth: FunnelDepth };
  const allMetrics: MetricRow[] = [
    { label: 'Total Annual Cost', csValue: cs.annualCostReps, tierValues: tiers.map(t => t.data.totalAnnualCost), depth: 'meetings_set' },
    { label: 'Cost Per Connect', csValue: cs.costPerConnect, tierValues: tiers.map(t => t.data.costPerConnect), depth: 'meetings_set' },
    { label: 'Cost Per Meeting Set', csValue: cs.costPerMeeting, tierValues: tiers.map(t => t.data.costPerMeeting), depth: 'meetings_set' },
    { label: 'Cost Per Meeting Held', csValue: cs.costPerMeetingHeld, tierValues: tiers.map(t => t.data.costPerMeetingHeld), depth: 'meetings_held' },
    { label: 'Cost Per Qualified Opp', csValue: cs.costPerOpp, tierValues: tiers.map(t => t.data.costPerOpp), depth: 'opps' },
    { label: 'Cost Per Acquisition', csValue: cs.costPerAcquisition, tierValues: tiers.map(t => t.data.costPerAcquisition), depth: 'closed_won' },
  ];
  const metrics = allMetrics.filter(m => depthAtLeast(funnelDepth, m.depth));

  const pctDelta = (csVal: number | undefined, tierVal: number | undefined) => {
    if (csVal == null || tierVal == null || csVal === 0) return null;
    return ((tierVal - csVal) / csVal) * 100;
  };

  return (
    <div className="rounded-xl overflow-hidden border border-border/30">
      <div className="grid" style={{ gridTemplateColumns: '1.5fr 1fr 1fr 0.6fr 1fr 0.6fr 1fr 0.6fr' }}>
        <div style={{ background: '#1A1A1A' }} className="px-4 py-3 text-[10px] uppercase tracking-[0.12em] font-bold" />
        <div style={{ background: '#1A1A1A' }} className="px-3 py-3 text-[10px] uppercase tracking-[0.12em] font-bold text-center">
          <span style={{ color: '#666666' }}>Current State</span>
        </div>
        {tiers.map(t => (
          <div key={t.name} className="contents">
            <div style={{ background: '#1A1A1A' }} className="px-3 py-3 text-[10px] uppercase tracking-[0.12em] font-bold text-center">
              <span style={{ color: '#FF004C' }}>{t.name}</span>
            </div>
            <div style={{ background: '#1A1A1A' }} className="px-2 py-3 text-[10px] uppercase tracking-[0.12em] font-bold text-center">
              <span style={{ color: '#FF004C', opacity: 0.6 }}>Δ%</span>
            </div>
          </div>
        ))}
      </div>
      {metrics.map((m, rowIdx) => {
        const rowBg = rowIdx % 2 === 0 ? '#1A1A1A' : '#2A2A2A';
        return (
          <div key={m.label} className="grid" style={{ gridTemplateColumns: '1.5fr 1fr 1fr 0.6fr 1fr 0.6fr 1fr 0.6fr' }}>
            <div style={{ background: rowBg }} className="px-4 py-2.5 flex items-center">
              <span style={{ color: '#999999' }} className="text-[11px] uppercase tracking-[0.08em] font-bold">{m.label}</span>
            </div>
            <div style={{ background: rowBg }} className="px-3 py-2.5 text-center flex items-center justify-center">
              <span style={{ color: '#666666' }} className="text-sm font-semibold tabular-nums">{m.csValue != null ? fCurrency(m.csValue, m.label === 'Total Annual Cost' ? 0 : 2) : '—'}</span>
            </div>
            {tiers.map((t, ti) => {
              const tierVal = m.tierValues[ti];
              const delta = pctDelta(m.csValue, tierVal);
              return (
                <div key={t.name} className="contents">
                  <div style={{ background: rowBg }} className="px-3 py-2.5 text-center flex items-center justify-center">
                    <span className="text-sm font-semibold tabular-nums text-foreground">{tierVal != null ? fCurrency(tierVal, m.label === 'Total Annual Cost' ? 0 : 2) : '—'}</span>
                  </div>
                  <div style={{ background: rowBg }} className="px-2 py-2.5 text-center flex items-center justify-center">
                    {delta != null ? (
                      <span style={{ color: '#FF004C' }} className="text-xs font-bold tabular-nums">
                        {delta > 0 ? '+' : ''}{delta.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

/* ───── Waterfall Chart ───── */

function WaterfallChart({ results, tierData, funnelDepth }: {
  results: CalculationResults; tierData: { grow: TierResults; accelerate: TierResults; scale: TierResults }; funnelDepth: FunnelDepth;
}) {
  const depthConfig: Record<FunnelDepth, { key: string; label: string }> = {
    meetings_set: { key: 'costPerMeeting', label: 'Cost Per Meeting Set' },
    meetings_held: { key: 'costPerMeetingHeld', label: 'Cost Per Meeting Held' },
    opps: { key: 'costPerOpp', label: 'Cost Per Qualified Opp' },
    closed_won: { key: 'costPerAcquisition', label: 'Cost Per Acquisition' },
  };
  const cfg = depthConfig[funnelDepth];
  const currentVal = (results.currentState as any)[cfg.key] as number | undefined;
  const growVal = (tierData.grow as any)[cfg.key] as number | undefined;
  const accVal = (tierData.accelerate as any)[cfg.key] as number | undefined;
  const scaleVal = (tierData.scale as any)[cfg.key] as number | undefined;

  if (currentVal == null) return null;

  const data = [
    { name: 'Current', value: currentVal, isBase: true },
    ...(growVal != null ? [{ name: 'Grow', value: growVal - currentVal, isBase: false }] : []),
    ...(accVal != null ? [{ name: 'Accelerate', value: accVal - currentVal, isBase: false }] : []),
    ...(scaleVal != null ? [{ name: 'Scale', value: scaleVal - currentVal, isBase: false }] : []),
  ];

  let running = 0;
  const waterfallData = data.map(d => {
    if (d.isBase) {
      const item = { ...d, start: 0, end: d.value, display: d.value };
      running = d.value;
      return item;
    }
    const start = running;
    const end = running + d.value;
    return { ...d, start: Math.min(start, end), end: Math.max(start, end), display: end, delta: d.value };
  });

  return (
    <div className="glass rounded-xl p-5 mt-4">
      <h4 className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground mb-4">{cfg.label} — Waterfall</h4>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={waterfallData} barCategoryGap="20%">
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontWeight: 600 }} />
          <YAxis tickFormatter={(v: number) => `$${Math.round(v).toLocaleString()}`} axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} width={80} />
          <RechartsTooltip
            cursor={{ fill: 'rgba(255, 0, 76, 0.1)' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const item = payload[0]?.payload;
              if (!item) return null;
              const isBase = item.isBase;
              return (
                <div style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid hsl(var(--foreground) / 0.08)', borderRadius: '10px', padding: '8px 12px', fontSize: '12px', boxShadow: '0 8px 32px hsl(var(--background) / 0.4)' }}>
                  <div style={{ color: 'hsl(var(--muted-foreground))', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>{isBase ? 'Current' : 'Savings'}</div>
                  <div style={{ fontWeight: 700, color: isBase ? 'hsl(var(--foreground))' : '#22c55e' }}>{fCurrency(isBase ? item.value : item.delta, 2)}</div>
                </div>
              );
            }}
          />
          <ReferenceLine y={0} stroke="hsl(var(--border))" />
          <Bar dataKey="start" stackId="waterfall" fill="transparent" />
          <Bar dataKey={(d: any) => d.end - d.start} stackId="waterfall" radius={[4, 4, 0, 0]}>
            {waterfallData.map((entry, index) => (
              <Cell key={index} fill={entry.isBase ? 'hsl(var(--muted-foreground) / 0.4)' : 'hsl(var(--primary))'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ───── ROI Summary ───── */

function ROISummary({ results, tierData, funnelDepth, roiOpen, setRoiOpen }: {
  results: CalculationResults;
  tierData: { grow: TierResults; accelerate: TierResults; scale: TierResults };
  funnelDepth: FunnelDepth;
  roiOpen: boolean;
  setRoiOpen: (fn: (prev: boolean) => boolean) => void;
}) {
  const currentFunnel = results.currentState.funnel ?? {};
  const showRevenue = funnelDepth === 'closed_won';
  const csPipeline = currentFunnel.annualPipelineGenerated ?? 0;
  const csRevenue = currentFunnel.annualClosedWonRevenue ?? 0;

  const roiTiers = [
    { name: 'Grow', data: tierData.grow, color: 'rgba(255,0,76,0.6)' },
    { name: 'Accelerate', data: tierData.accelerate, color: 'rgba(255,0,76,0.8)' },
    { name: 'Scale', data: tierData.scale, color: '#FF004C' },
  ].map(t => {
    const f = t.data.funnel ?? {};
    const totalPipeline = f.annualPipelineGenerated ?? 0;
    const totalRevenue = f.annualClosedWonRevenue ?? 0;
    const addlPipeline = totalPipeline - csPipeline;
    const addlRevenue = totalRevenue - csRevenue;
    const roiValue = funnelDepth === 'closed_won' ? addlRevenue : addlPipeline;
    const roi = t.data.costAnnual > 0 ? roiValue / t.data.costAnnual : 0;
    const roiLabel = funnelDepth === 'closed_won' ? 'incremental revenue return' : 'incremental pipeline return';
    const pipelinePctIncrease = csPipeline > 0 ? addlPipeline / csPipeline : 0;
    const revenuePctIncrease = csRevenue > 0 ? addlRevenue / csRevenue : 0;
    return { ...t, investment: t.data.costAnnual, totalPipeline, totalRevenue, addlPipeline, addlRevenue, roi, roiLabel, pipelinePctIncrease, revenuePctIncrease };
  });

  return (
    <div className="space-y-3">
      <div className="border-t-2 border-primary pt-4">
        <button onClick={() => setRoiOpen(prev => !prev)} className="w-full flex items-center gap-2 mb-3 group cursor-pointer">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-[0.12em] border-l-2 border-primary pl-3">ROI Summary</h3>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-300 ${roiOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>
      <div className={`transition-all duration-500 overflow-hidden space-y-4 ${roiOpen ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        {/* ROI Callout */}
        <div className="glass-accent rounded-xl p-5">
          <p className="text-sm font-semibold text-foreground/90 mb-3">By investing in a TitanX plan, you are projected to:</p>
          <div className="space-y-2">
            {roiTiers.map(t => (
              <div key={t.name} className="flex items-start gap-2 text-[13px] leading-relaxed text-foreground/80">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                <p>
                  Invest <span className="font-bold text-primary">{fCurrency(t.investment)}</span> in <span className="font-bold" style={{ color: t.color }}>{t.name}</span> to generate <span className="font-bold text-primary">{fCurrency(t.addlPipeline)}</span> in additional pipeline
                  {showRevenue && t.addlRevenue > 0 && (
                    <> and <span className="font-bold text-primary">{fCurrency(t.addlRevenue)}</span> in additional revenue</>
                  )}
                  {' '}— a <span className="font-bold text-primary">{t.roi.toFixed(1)}x</span> {t.roiLabel}.
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ROI Impact Table */}
        <div className="rounded-xl overflow-hidden border border-border/30">
          <div className="grid" style={{ gridTemplateColumns: `1.5fr ${showRevenue ? '1fr 1fr 1fr 1fr' : '1fr 1fr 1fr'}` }}>
            <div style={{ background: '#1A1A1A' }} className="px-4 py-3 text-[10px] uppercase tracking-[0.12em] font-bold" />
            <div style={{ background: '#1A1A1A' }} className="px-3 py-3 text-[10px] uppercase tracking-[0.12em] font-bold text-center text-muted-foreground">TitanX Investment</div>
            <div style={{ background: '#1A1A1A' }} className="px-3 py-3 text-[10px] uppercase tracking-[0.12em] font-bold text-center text-muted-foreground">Total Pipeline</div>
            {showRevenue && <div style={{ background: '#1A1A1A' }} className="px-3 py-3 text-[10px] uppercase tracking-[0.12em] font-bold text-center text-muted-foreground">Total Revenue</div>}
            <div style={{ background: '#1A1A1A' }} className="px-3 py-3 text-[10px] uppercase tracking-[0.12em] font-bold text-center text-muted-foreground">{funnelDepth === 'closed_won' ? 'Incremental Revenue ROI' : 'Incremental Pipeline ROI'}</div>
          </div>
          {roiTiers.map((t, rowIdx) => {
            const rowBg = rowIdx % 2 === 0 ? '#1A1A1A' : '#2A2A2A';
            return (
              <div key={t.name} className="grid" style={{ gridTemplateColumns: `1.5fr ${showRevenue ? '1fr 1fr 1fr 1fr' : '1fr 1fr 1fr'}` }}>
                <div style={{ background: rowBg }} className="px-4 py-2.5 flex items-center">
                  <span className="text-[11px] uppercase tracking-[0.08em] font-bold" style={{ color: t.color }}>{t.name}</span>
                </div>
                <div style={{ background: rowBg }} className="px-3 py-2.5 text-center flex items-center justify-center">
                  <span className="text-sm font-semibold tabular-nums text-foreground">{fCurrency(t.investment)}</span>
                </div>
                <div style={{ background: rowBg }} className="px-3 py-2.5 text-center flex flex-col items-center justify-center">
                  <span className="text-sm font-semibold tabular-nums text-foreground">{fCurrency(t.totalPipeline)}</span>
                  {t.addlPipeline > 0 && (
                    <span className="text-[10px] font-semibold tabular-nums" style={{ color: '#22c55e' }}>
                      +{fCurrency(t.addlPipeline)} ({fPercent(t.pipelinePctIncrease)})
                    </span>
                  )}
                </div>
                {showRevenue && (
                  <div style={{ background: rowBg }} className="px-3 py-2.5 text-center flex flex-col items-center justify-center">
                    <span className="text-sm font-semibold tabular-nums text-foreground">{fCurrency(t.totalRevenue)}</span>
                    {t.addlRevenue > 0 && (
                      <span className="text-[10px] font-semibold tabular-nums" style={{ color: '#22c55e' }}>
                        +{fCurrency(t.addlRevenue)} ({fPercent(t.revenuePctIncrease)})
                      </span>
                    )}
                  </div>
                )}
                <div style={{ background: rowBg }} className="px-3 py-2.5 text-center flex items-center justify-center">
                  <span className="text-sm font-bold tabular-nums text-primary">{t.roi.toFixed(1)}x</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
