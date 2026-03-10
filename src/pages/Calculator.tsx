import { useState, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import AccountSelector from '@/components/AccountSelector';
import UserSelector from '@/components/UserSelector';
import { toast } from 'sonner';
import { HelpCircle, Copy, Plus, Save, CalendarIcon, Star, Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import titanxLogo from '@/assets/titanx-logo.svg';
import titanxLogoLight from '@/assets/titanx-logo-light.svg';
import bgDark from '@/assets/bg-dark.png';
import bgLight from '@/assets/bg-light.png';
import { calculate, type CustomerInputs, type TitanXInputs, type TierResults, type CurrentState, type FunnelDepth, type FunnelMetrics } from '@/lib/calculations';
import { fCurrency, fNumber, fPercent, fReps, fMeetings } from '@/lib/formatters';

const FUNNEL_DEPTHS: { value: FunnelDepth; label: string }[] = [
  { value: 'meetings_set', label: 'Meetings Set' },
  { value: 'meetings_held', label: 'Meetings Held' },
  { value: 'opps', label: 'Qualified Opps' },
  { value: 'closed_won', label: 'Closed Won' },
];

const FUNNEL_DEPTH_ORDER: FunnelDepth[] = ['meetings_set', 'meetings_held', 'opps', 'closed_won'];

function depthAtLeast(current: FunnelDepth, target: FunnelDepth): boolean {
  return FUNNEL_DEPTH_ORDER.indexOf(current) >= FUNNEL_DEPTH_ORDER.indexOf(target);
}

function NumericInput({ label, value, onChange, prefix, suffix, placeholder = '—', tooltip, step, commas = false }: {
  label: string; value: number | null; onChange: (v: number | null) => void;
  prefix?: string; suffix?: string; placeholder?: string; tooltip?: string; step?: string; commas?: boolean;
}) {
  const [isFocused, setIsFocused] = useState(false);

  const displayValue = useMemo(() => {
    if (value == null) return '';
    if (isFocused) return String(value);
    if (commas) return value.toLocaleString('en-US');
    if (step === '0.01') return value.toFixed(2);
    return String(value);
  }, [value, isFocused, commas, step]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <label className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">{label}</label>
        {tooltip && (
          <Tooltip>
            <TooltipTrigger><HelpCircle className="h-3 w-3 text-muted-foreground/60" /></TooltipTrigger>
            <TooltipContent className="glass-strong max-w-[220px] text-xs border-none">{tooltip}</TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className="relative group">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground/70">{prefix}</span>}
        <Input
          type={isFocused || !commas ? 'number' : 'text'}
          step={step}
          className={`glass-subtle border-none h-9 text-sm text-foreground placeholder:text-muted-foreground/40 focus:ring-1 focus:ring-primary/40 transition-all duration-300 group-hover:bg-muted/60 ${prefix ? 'pl-7' : ''} ${suffix ? 'pr-7' : ''}`}
          placeholder={placeholder}
          value={displayValue}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onChange={(e) => {
            const raw = e.target.value.replace(/,/g, '');
            onChange(raw === '' ? null : parseFloat(raw));
          }}
        />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground/70">{suffix}</span>}
      </div>
    </div>
  );
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

function StatCard({ label, value, highlight = false, muted = false }: {
  label: React.ReactNode; value: string; highlight?: boolean; muted?: boolean;
}) {
  return (
    <div className={`transition-all duration-300 ${muted ? 'opacity-40' : ''}`}>
      <div className={`text-xl font-bold tabular-nums tracking-tight ${highlight ? 'text-primary drop-shadow-[0_0_8px_hsla(348,100%,50%,0.4)]' : 'text-foreground'}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

function FunnelContextSection({ funnel, monthlyMeetings, annualMeetings, depth }: {
  funnel: FunnelMetrics; monthlyMeetings: number; annualMeetings: number; depth: FunnelDepth;
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

function TierColumn({ title, subtitle, results, currentState, recommended = false, isCurrent = false, onRecommend, funnelDepth }: {
  title: string; subtitle?: string; results?: TierResults; currentState?: CurrentState;
  recommended?: boolean; isCurrent?: boolean; onRecommend?: () => void; funnelDepth: FunnelDepth;
}) {
  const glassClass = recommended
    ? 'glass-accent glow-primary'
    : isCurrent
      ? 'glass-subtle'
      : 'glass';

  const monthlyMeetings = isCurrent ? (currentState?.monthlyMeetings ?? 0) : (results?.monthlyMeetings ?? 0);
  const annualMeetings = isCurrent ? (currentState?.annualMeetings ?? 0) : (results?.annualMeetings ?? 0);
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

      {/* Primary Metric */}
      {funnelDepth !== 'meetings_set' && (
        <div className="text-center py-2">
          <div className="text-2xl font-bold tabular-nums tracking-tight text-primary drop-shadow-[0_0_8px_hsla(348,100%,50%,0.4)]">{primary.value}</div>
          <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mt-0.5">{primary.label}</div>
          <FunnelContextSection funnel={funnel} monthlyMeetings={monthlyMeetings} annualMeetings={annualMeetings} depth={funnelDepth} />
        </div>
      )}

      {/* Activity Metrics */}
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-semibold pb-1 border-b-2 border-primary">Activity</p>
        {isCurrent && currentState ? (
          <>
            <StatCard label="Monthly Dials" value={fNumber(currentState.monthlyDials)} muted />
            <StatCard label="Monthly Connects" value={fNumber(currentState.monthlyConnects)} muted />
            <StatCard label="Monthly Conversations" value={fNumber(currentState.monthlyConversations, 1)} muted />
            <StatCard label="Monthly Meetings" value={fMeetings(currentState.monthlyMeetings)} muted />
            <StatCard label="Annual Meetings" value={fMeetings(currentState.annualMeetings)} muted />
            {funnelDepth !== 'meetings_set' && currentState.funnel.monthlyMeetingsHeld != null && (
              <StatCard label="Monthly Meetings Held" value={fMeetings(currentState.funnel.monthlyMeetingsHeld)} muted />
            )}
            {depthAtLeast(funnelDepth, 'opps') && currentState.funnel.monthlyOpps != null && (
              <StatCard label="Monthly Qualified Opps" value={fMeetings(currentState.funnel.monthlyOpps)} muted />
            )}
            {funnelDepth === 'closed_won' && currentState.funnel.monthlyClosedWon != null && (
              <StatCard label="Monthly Closed Won" value={fMeetings(currentState.funnel.monthlyClosedWon)} muted />
            )}
          </>
        ) : results ? (
          <>
            <StatCard label="Monthly Dials" value={fNumber(results.monthlyDials)} />
            <StatCard label="Monthly Connects" value={fNumber(results.monthlyConnects)} />
            <StatCard label="Monthly Conversations" value={fNumber(results.monthlyConversations, 1)} />
            <StatCard label="Monthly Meetings" value={fMeetings(results.monthlyMeetings)} />
            <StatCard label="Annual Meetings" value={fMeetings(results.annualMeetings)} />
            {funnelDepth !== 'meetings_set' && results.funnel.monthlyMeetingsHeld != null && (
              <StatCard label="Monthly Meetings Held" value={fMeetings(results.funnel.monthlyMeetingsHeld)} />
            )}
            {depthAtLeast(funnelDepth, 'opps') && results.funnel.monthlyOpps != null && (
              <StatCard label="Monthly Qualified Opps" value={fMeetings(results.funnel.monthlyOpps)} />
            )}
            {funnelDepth === 'closed_won' && results.funnel.monthlyClosedWon != null && (
              <StatCard label="Monthly Closed Won" value={fMeetings(results.funnel.monthlyClosedWon)} />
            )}
          </>
        ) : null}
      </div>

      {/* Efficiency Story */}
      {!isCurrent && results && (
        <div className="space-y-3 glass-accent rounded-lg p-3 -mx-1">
          <p className="text-[10px] uppercase tracking-[0.15em] text-primary font-semibold flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Efficiency Story
          </p>
          <StatCard label="Rep Production Equivalent" value={`${fReps(results.repProductionEquivalent)} reps`} highlight />
          <StatCard label="% of Current Dials Required" value={fPercent(results.pctOfCurrentDials)} highlight />
          <StatCard label="Cost of Equivalent Reps" value={`${fReps(results.costOfEquivReps)} reps`} highlight />
        </div>
      )}

      {/* Credits & Cost */}
      {!isCurrent && results && (
        <div className="bg-muted/40 rounded-lg p-3 text-center space-y-3">
          <div>
            <div className="text-xl font-bold tabular-nums tracking-tight text-foreground">{fNumber(results.creditsPerMonth * 12)}</div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mt-0.5">Credits / Year</div>
          </div>
          <div>
            <div className="text-xl font-bold tabular-nums tracking-tight text-foreground">{fCurrency(results.costAnnual)}</div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mt-0.5">Annual Cost</div>
          </div>
        </div>
      )}
    </div>
  );
}

function FinancialColumn({ title, results, currentState, recommended = false, isCurrent = false, funnelDepth = 'meetings_set' }: {
  title: string; results?: TierResults; currentState?: CurrentState;
  recommended?: boolean; isCurrent?: boolean; funnelDepth?: FunnelDepth;
}) {
  const glassClass = recommended
    ? 'glass-accent glow-primary'
    : isCurrent
      ? 'glass-subtle'
      : 'glass';

  const data = isCurrent ? currentState : results;
  const muted = isCurrent;

  return (
    <div className={`${glassClass} rounded-xl p-5 space-y-3 relative overflow-hidden transition-all duration-500 hover:scale-[1.01] hover:shadow-lg ${recommended ? 'ring-1 ring-primary/40' : ''}`}>
      <div className={`absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r ${recommended ? 'from-transparent via-primary/60 to-transparent' : 'from-transparent via-foreground/10 to-transparent'}`} />
      <div className="text-center">
        <span className={`inline-block font-bold text-base px-4 py-1.5 rounded-full border ${isCurrent ? 'bg-muted text-muted-foreground border-border' : 'bg-primary/20 text-primary border-primary/30'}`}>{title}</span>
      </div>
      {data && (
        <>
          <StatCard label="Total Annual Cost" value={fCurrency('totalAnnualCost' in data ? data.totalAnnualCost : data.annualCostReps)} muted={muted} />
          <StatCard label="Cost Per Connect" value={fCurrency(data.costPerConnect, 2)} muted={muted} />
          <StatCard label="Cost Per Meeting Set" value={fCurrency(data.costPerMeeting, 2)} muted={muted} />
          {depthAtLeast(funnelDepth, 'meetings_held') && data.costPerMeetingHeld != null && (
            <StatCard label="Cost Per Meeting Held" value={fCurrency(data.costPerMeetingHeld, 2)} muted={muted} />
          )}
          {depthAtLeast(funnelDepth, 'opps') && data.costPerOpp != null && (
            <StatCard label="Cost Per Qualified Opp" value={fCurrency(data.costPerOpp, 2)} muted={muted} />
          )}
          {depthAtLeast(funnelDepth, 'closed_won') && data.costPerAcquisition != null && (
            <StatCard label="Cost Per Acquisition" value={fCurrency(data.costPerAcquisition, 2)} muted={muted} />
          )}
        </>
      )}
    </div>
  );
}

function ROICard({ title, results, currentState, isCurrent = false, recommended = false, funnelDepth, acv }: {
  title: string; results?: TierResults; currentState?: CurrentState;
  isCurrent?: boolean; recommended?: boolean; funnelDepth: FunnelDepth; acv: number;
}) {
  const glassClass = recommended ? 'glass-accent glow-primary' : isCurrent ? 'glass-subtle' : 'glass';
  const funnel = isCurrent ? (currentState?.funnel ?? {}) : (results?.funnel ?? {});
  const totalAnnualCost = isCurrent ? (currentState?.annualCostReps ?? 0) : (results?.totalAnnualCost ?? 0);
  const titanxCost = results?.costAnnual ?? 0;

  const pipeline = funnel.annualPipelineGenerated ?? 0;
  const revenue = funnel.annualClosedWonRevenue ?? 0;

  return (
    <div className={`${glassClass} rounded-xl p-5 space-y-4 relative overflow-hidden transition-all duration-500 hover:scale-[1.01] hover:shadow-lg ${recommended ? 'ring-1 ring-primary/40' : ''}`}>
      <div className="text-center">
        <span className={`inline-block font-bold text-base px-4 py-1.5 rounded-full border ${isCurrent ? 'bg-muted text-muted-foreground border-border' : 'bg-primary/20 text-primary border-primary/30'}`}>{title}</span>
      </div>

      {/* Pipeline */}
      {depthAtLeast(funnelDepth, 'opps') && (
        <div className="space-y-2">
          <div className="text-center">
            <div className="text-2xl font-bold tabular-nums tracking-tight text-foreground">{fCurrency(pipeline)}</div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mt-0.5">Annual Pipeline</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-semibold tabular-nums text-primary">
              {!isCurrent && titanxCost > 0 ? `$${(pipeline / titanxCost).toFixed(2)} pipeline per $1 spent` : '—'}
            </div>
            <div className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground/60 mt-0.5">Per $1 TitanX Spend</div>
          </div>
          <div className="text-center">
            <div className="text-xs tabular-nums text-muted-foreground">
              {totalAnnualCost > 0 ? `$${(pipeline / totalAnnualCost).toFixed(2)} per $1 total` : '—'}
            </div>
            <div className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground/60 mt-0.5">Per $1 Total Cost</div>
          </div>
        </div>
      )}

      {/* Revenue */}
      {funnelDepth === 'closed_won' && (
        <div className="space-y-2 border-t border-border/30 pt-3">
          <div className="text-center">
            <div className="text-2xl font-bold tabular-nums tracking-tight text-foreground">{fCurrency(revenue)}</div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mt-0.5">Annual Closed Won Revenue</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-semibold tabular-nums text-primary">
              {!isCurrent && titanxCost > 0 ? `$${(revenue / titanxCost).toFixed(2)} revenue per $1 spent` : '—'}
            </div>
            <div className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground/60 mt-0.5">Per $1 TitanX Spend</div>
          </div>
          <div className="text-center">
            <div className="text-xs tabular-nums text-muted-foreground">
              {totalAnnualCost > 0 ? `$${(revenue / totalAnnualCost).toFixed(2)} per $1 total` : '—'}
            </div>
            <div className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground/60 mt-0.5">Per $1 Total Cost</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Calculator() {
  const [company, setCompany] = useState('');
  const [aeName, setAeName] = useState('');
  const [sessionDate, setSessionDate] = useState<Date>(new Date());
  const [model, setModel] = useState<string>('blended');
  const [recommendedTier, setRecommendedTier] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [funnelDepth, setFunnelDepth] = useState<FunnelDepth>('meetings_set');

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      document.documentElement.classList.toggle('light', next === 'light');
      return next;
    });
  }, []);

  const [customer, setCustomer] = useState<CustomerInputs>({
    reps: null, annualCostPerRep: null, dialsPerDay: null,
    connectRate: null, conversationRate: null, meetingRate: null,
    meetingShowRate: null, oppQualificationRate: null, winRate: null, acv: null,
  });

  const [titanx, setTitanx] = useState<TitanXInputs>({
    highIntent: 20, highIntentReach: 85, avgPhones: 2,
    titanxConnectRate: 25, creditPriceGrow: 0.50,
    creditPriceAccelerate: 0.50, creditPriceScale: 0.50,
    multipleGrow: 1.5, multipleAccelerate: 2.0, multipleScale: 2.5,
  });

  const results = useMemo(() => calculate(customer, titanx), [customer, titanx]);
  const tierData = results ? (model === 'blended' ? results.blended : results.highIntent) : null;

  const updateCustomer = (key: keyof CustomerInputs) => (v: number | null) =>
    setCustomer(prev => ({ ...prev, [key]: v }));
  const updateTitanx = (key: keyof TitanXInputs) => (v: number | null) =>
    setTitanx(prev => ({ ...prev, [key]: v }));

  const handleNewSession = () => {
    if (!confirm('Clear all inputs and start a new session?')) return;
    setCompany(''); setAeName(''); setSessionDate(new Date());
    setFunnelDepth('meetings_set');
    setCustomer({ reps: null, annualCostPerRep: null, dialsPerDay: null, connectRate: null, conversationRate: null, meetingRate: null, meetingShowRate: null, oppQualificationRate: null, winRate: null, acv: null });
    setTitanx({ highIntent: 20, highIntentReach: 85, avgPhones: 2, titanxConnectRate: 25, creditPriceGrow: 0.50, creditPriceAccelerate: 0.50, creditPriceScale: 0.50, multipleGrow: 1.5, multipleAccelerate: 2.0, multipleScale: 2.5 });
  };

  const handleSave = () => {
    toast.success('Session saved. Shareable link ready.', { description: 'Connect Lovable Cloud to enable persistence.' });
  };

  const showROI = depthAtLeast(funnelDepth, 'opps') && customer.acv != null && customer.acv > 0 && results && tierData;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background image */}
      <div className="fixed inset-0 pointer-events-none">
        <img src={theme === 'light' ? bgLight : bgDark} alt="" className="w-full h-full object-cover" />
      </div>
      {/* Ambient background glows */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-primary/[0.03] blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-primary/[0.02] blur-[100px]" />
        <div className="absolute top-[40%] left-[60%] w-[30vw] h-[30vw] rounded-full bg-primary/[0.02] blur-[100px]" />
      </div>

      {/* Header */}
      <header className="glass-strong sticky top-0 z-50 p-2.5 flex items-center justify-between">
        <img src={theme === 'light' ? titanxLogoLight : titanxLogo} alt="TitanX" className="h-[26px]" />
        <h1 className="text-base font-semibold text-foreground/80 hidden sm:block tracking-wide">Dream Outcome Calculator</h1>
        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} className="p-2 rounded-lg glass-subtle border-none text-foreground/60 hover:text-foreground transition-all duration-300" aria-label="Toggle theme">
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <Button variant="outline" size="sm" onClick={handleNewSession} className="glass-subtle border-none text-foreground/80 hover:text-foreground transition-all duration-300">
            <Plus className="h-4 w-4 mr-1" /> New Session
          </Button>
        </div>
      </header>

      <div className="max-w-[1440px] mx-auto p-6 space-y-6 relative z-10">
        {/* Session Info */}
        <div className="glass rounded-xl grid grid-cols-1 md:grid-cols-3 gap-4 p-5 relative z-20">
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">Account</label>
            <AccountSelector value={company} onChange={setCompany} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">TitanX User</label>
            <UserSelector value={aeName} onChange={setAeName} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("glass-subtle border-none h-9 w-full justify-start text-sm font-normal focus:ring-1 focus:ring-primary/40", !sessionDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground/70" />
                  {sessionDate ? format(sessionDate, 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 glass-strong border-none" align="start">
                <Calendar mode="single" selected={sessionDate} onSelect={(d) => d && setSessionDate(d)} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Two-column inputs */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Customer Inputs */}
          <div className="glass rounded-xl p-5 space-y-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.15em] text-primary">Customer Inputs</span>
              <p className="text-[11px] text-muted-foreground/60 mt-1">Fill in with the prospect during the session.</p>
            </div>

            {/* Funnel Depth Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">Measure To</label>
              <div className="flex rounded-lg overflow-hidden border border-border/30">
                {FUNNEL_DEPTHS.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => setFunnelDepth(d.value)}
                    className={cn(
                      "flex-1 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider transition-all duration-300",
                      funnelDepth === d.value
                        ? "bg-primary text-primary-foreground shadow-[0_0_12px_hsla(348,100%,50%,0.3)]"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <NumericInput label="Reps" value={customer.reps} onChange={updateCustomer('reps')} />
              <NumericInput label="Annual Cost Per Rep" value={customer.annualCostPerRep} onChange={updateCustomer('annualCostPerRep')} prefix="$" commas />
              <NumericInput label="Dials / Day / Rep" value={customer.dialsPerDay} onChange={updateCustomer('dialsPerDay')} />
              <NumericInput label="Connect Rate" value={customer.connectRate} onChange={updateCustomer('connectRate')} suffix="%" tooltip="% of dials that connect (e.g. 5.5)" />
              <NumericInput label="Conversation Rate" value={customer.conversationRate} onChange={updateCustomer('conversationRate')} suffix="%" tooltip="% of connects that become conversations" />
              <NumericInput label="Meeting Rate" value={customer.meetingRate} onChange={updateCustomer('meetingRate')} suffix="%" tooltip="% of conversations that book a meeting" />

              {/* Conditional funnel inputs */}
              {depthAtLeast(funnelDepth, 'meetings_held') && (
                <NumericInput label="Meeting Show Rate" value={customer.meetingShowRate} onChange={updateCustomer('meetingShowRate')} suffix="%" tooltip="% of meetings set that are actually attended" />
              )}
              {depthAtLeast(funnelDepth, 'opps') && (
                <NumericInput label="Opp Qualification Rate" value={customer.oppQualificationRate} onChange={updateCustomer('oppQualificationRate')} suffix="%" tooltip="% of meetings held that become Sales Accepted Opps" />
              )}
              {funnelDepth === 'closed_won' && (
                <NumericInput label="Win Rate" value={customer.winRate} onChange={updateCustomer('winRate')} suffix="%" tooltip="% of qualified opps that close" />
              )}
              {depthAtLeast(funnelDepth, 'opps') && (
                <NumericInput label="ACV" value={customer.acv} onChange={updateCustomer('acv')} prefix="$" commas tooltip="Average Contract Value" />
              )}
            </div>

            <div className="border-t border-border/50 pt-4 mt-4">
              <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-primary/70 mb-3 block">Plan Multipliers</span>
              <div className="grid grid-cols-3 gap-4">
                <NumericInput label="Grow" value={titanx.multipleGrow} onChange={updateTitanx('multipleGrow')} suffix="×" tooltip="Connect multiplier for Grow tier" step="0.5" />
                <NumericInput label="Accelerate" value={titanx.multipleAccelerate} onChange={updateTitanx('multipleAccelerate')} suffix="×" tooltip="Connect multiplier for Accelerate tier" step="0.5" />
                <NumericInput label="Scale" value={titanx.multipleScale} onChange={updateTitanx('multipleScale')} suffix="×" tooltip="Connect multiplier for Scale tier" step="0.5" />
              </div>
            </div>
          </div>

          {/* TitanX Data */}
          <div className="glass rounded-xl p-5 space-y-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.15em] text-primary">TitanX Data</span>
              <p className="text-[11px] text-muted-foreground/60 mt-1">Pulled from your TitanX account data for this prospect.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <NumericInput label="High Intent %" value={titanx.highIntent} onChange={updateTitanx('highIntent')} suffix="%" tooltip="% of contacts scored as High Intent" />
              <NumericInput label="7-dial Reach" value={titanx.highIntentReach} onChange={updateTitanx('highIntentReach')} suffix="%" tooltip="Reachability of High Intent contacts" />
              <NumericInput label="Avg Phones / Contact" value={titanx.avgPhones} onChange={updateTitanx('avgPhones')} />
              <NumericInput label="TitanX Connect Rate" value={titanx.titanxConnectRate} onChange={updateTitanx('titanxConnectRate')} suffix="%" tooltip="Connect rate on TitanX High Intent data" />
            </div>

            <div className="border-t border-border/50 pt-4 mt-4">
              <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-primary/70 mb-3 block">Credit Pricing</span>
              <div className="space-y-3">
                <NumericInput label="Credit Price — Grow" value={titanx.creditPriceGrow} onChange={updateTitanx('creditPriceGrow')} prefix="$" step="0.01" />
                <NumericInput label="Credit Price — Accelerate" value={titanx.creditPriceAccelerate} onChange={updateTitanx('creditPriceAccelerate')} prefix="$" step="0.01" />
                <NumericInput label="Credit Price — Scale" value={titanx.creditPriceScale} onChange={updateTitanx('creditPriceScale')} prefix="$" step="0.01" />
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground tracking-tight border-l-2 border-primary pl-3">Live Results</h2>
            <ToggleGroup type="single" value={model} onValueChange={(v) => v && setModel(v)} className="glass rounded-lg p-0.5">
              <ToggleGroupItem value="blended" className="text-xs px-5 py-2 rounded-md data-[state=on]:bg-primary/20 data-[state=on]:text-primary data-[state=on]:shadow-[0_0_12px_hsla(348,100%,50%,0.2)] border-none transition-all duration-300">
                Blended Calling
              </ToggleGroupItem>
              <ToggleGroupItem value="highIntent" className="text-xs px-5 py-2 rounded-md data-[state=on]:bg-primary/20 data-[state=on]:text-primary data-[state=on]:shadow-[0_0_12px_hsla(348,100%,50%,0.2)] border-none transition-all duration-300">
                High Intent Only
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {results && tierData ? (
            <div className="space-y-6">
              {/* Activity + Efficiency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <TierColumn title="Current State" isCurrent currentState={results.currentState} funnelDepth={funnelDepth} />
                <TierColumn title="Grow" subtitle={`${titanx.multipleGrow ?? 1.5}× connects`} results={tierData.grow} currentState={results.currentState} recommended={recommendedTier === 'grow'} onRecommend={() => setRecommendedTier(prev => prev === 'grow' ? null : 'grow')} funnelDepth={funnelDepth} />
                <TierColumn title="Accelerate" subtitle={`${titanx.multipleAccelerate ?? 2}× connects`} results={tierData.accelerate} currentState={results.currentState} recommended={recommendedTier === 'accelerate'} onRecommend={() => setRecommendedTier(prev => prev === 'accelerate' ? null : 'accelerate')} funnelDepth={funnelDepth} />
                <TierColumn title="Scale" subtitle={`${titanx.multipleScale ?? 2.5}× connects`} results={tierData.scale} currentState={results.currentState} recommended={recommendedTier === 'scale'} onRecommend={() => setRecommendedTier(prev => prev === 'scale' ? null : 'scale')} funnelDepth={funnelDepth} />
              </div>

              {/* Financial Section */}
              <div>
                <h3 className="text-sm font-bold text-foreground uppercase tracking-[0.12em] mb-3 border-l-2 border-primary pl-3">Financial Metrics</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <FinancialColumn title="Current State" isCurrent currentState={results.currentState} funnelDepth={funnelDepth} />
                  <FinancialColumn title="Grow" results={tierData.grow} currentState={results.currentState} recommended={recommendedTier === 'grow'} funnelDepth={funnelDepth} />
                  <FinancialColumn title="Accelerate" results={tierData.accelerate} currentState={results.currentState} recommended={recommendedTier === 'accelerate'} funnelDepth={funnelDepth} />
                  <FinancialColumn title="Scale" results={tierData.scale} currentState={results.currentState} recommended={recommendedTier === 'scale'} funnelDepth={funnelDepth} />
                </div>
              </div>

              {/* ROI Summary */}
              {showROI && (
                <div className="space-y-3">
                  <div className="border-t-2 border-primary pt-4">
                    <h3 className="text-sm font-bold text-primary uppercase tracking-[0.12em] mb-3 border-l-2 border-primary pl-3">ROI Summary</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <ROICard title="Current State" isCurrent currentState={results.currentState} funnelDepth={funnelDepth} acv={customer.acv!} />
                    <ROICard title="Grow" results={tierData.grow} funnelDepth={funnelDepth} acv={customer.acv!} recommended={recommendedTier === 'grow'} />
                    <ROICard title="Accelerate" results={tierData.accelerate} funnelDepth={funnelDepth} acv={customer.acv!} recommended={recommendedTier === 'accelerate'} />
                    <ROICard title="Scale" results={tierData.scale} funnelDepth={funnelDepth} acv={customer.acv!} recommended={recommendedTier === 'scale'} />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="glass rounded-xl p-16 text-center text-muted-foreground/60 glow-soft">
              <div className="text-3xl mb-3 opacity-30">✦</div>
              Fill in all inputs above to see live results.
            </div>
          )}
        </div>

        {/* Action Bar */}
        <div className="flex gap-3 justify-end">
          <Button onClick={handleSave} className="bg-primary/90 text-primary-foreground hover:bg-primary glow-primary transition-all duration-300 border-none">
            <Save className="h-4 w-4 mr-1.5" /> Save Session
          </Button>
          <Button variant="outline" onClick={() => { navigator.clipboard.writeText(window.location.href); toast.info('Link copied!'); }} className="glass-subtle border-none text-foreground/80 hover:text-foreground transition-all duration-300">
            <Copy className="h-4 w-4 mr-1.5" /> Copy Link
          </Button>
          <Button variant="outline" onClick={handleNewSession} className="glass-subtle border-none text-foreground/80 hover:text-foreground transition-all duration-300">
            <Plus className="h-4 w-4 mr-1.5" /> New Session
          </Button>
        </div>

        {/* Footer */}
        <footer className="text-center py-8 space-y-1">
          <p className="text-4xl font-bold text-muted-foreground/60 animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]">
            Welcome to the <span className="text-primary font-extrabold drop-shadow-[0_0_16px_hsla(348,100%,50%,0.6)]">Phone Intent™</span> Era.
          </p>
          <p className="text-xs text-muted-foreground/40">© 2026 TitanX. All rights reserved.</p>
          <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/30">Confidential & Proprietary</p>
        </footer>
      </div>
    </div>
  );
}
