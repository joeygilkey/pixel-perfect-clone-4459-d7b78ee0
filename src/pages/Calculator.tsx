import { useState, useMemo, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, ReferenceLine, CartesianGrid, Legend } from 'recharts';
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
import { HelpCircle, Copy, Plus, Save, CalendarIcon, Star, Sun, Moon, ChevronDown } from 'lucide-react';
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

function TierColumn({ title, subtitle, results, currentState, recommended = false, isCurrent = false, onRecommend, funnelDepth, reps, annualCostPerRep }: {
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

      {/* Efficiency Story */}
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

      {/* Credits & Cost */}
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

      {/* Headcount Cost Summary */}
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

export default function Calculator() {
  const [company, setCompany] = useState('');
  const [aeName, setAeName] = useState('');
  const [sessionDate, setSessionDate] = useState<Date>(new Date());
  const [model, setModel] = useState<string>('blended');
  const [recommendedTier, setRecommendedTier] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [funnelDepth, setFunnelDepth] = useState<FunnelDepth>('meetings_set');
  const [financialOpen, setFinancialOpen] = useState(false);
  const [roiOpen, setRoiOpen] = useState(false);

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
              <span className="text-xs font-bold uppercase tracking-[0.15em] text-primary">Team & Baseline</span>
              <p className="text-[11px] text-muted-foreground/60 mt-1">Fill in your team size, costs, and baseline metrics.</p>
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

          </div>

          {/* Your Scoring Profile */}
          <div className="glass rounded-xl p-5 space-y-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.15em] text-primary">Your Scoring Profile</span>
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

          {/* Desired Production Lift */}
          <div className="glass rounded-xl p-5 space-y-4 relative overflow-hidden md:col-span-2">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.15em] text-primary">Desired Production Lift</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <NumericInput label="Grow" value={titanx.multipleGrow} onChange={updateTitanx('multipleGrow')} suffix="×" tooltip="Connect multiplier for Grow tier" step="0.5" />
              <NumericInput label="Accelerate" value={titanx.multipleAccelerate} onChange={updateTitanx('multipleAccelerate')} suffix="×" tooltip="Connect multiplier for Accelerate tier" step="0.5" />
              <NumericInput label="Scale" value={titanx.multipleScale} onChange={updateTitanx('multipleScale')} suffix="×" tooltip="Connect multiplier for Scale tier" step="0.5" />
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
                <TierColumn title="Grow" subtitle={`${titanx.multipleGrow ?? 1.5}× connects`} results={tierData.grow} currentState={results.currentState} recommended={recommendedTier === 'grow'} onRecommend={() => setRecommendedTier(prev => prev === 'grow' ? null : 'grow')} funnelDepth={funnelDepth} reps={customer.reps} annualCostPerRep={customer.annualCostPerRep} />
                <TierColumn title="Accelerate" subtitle={`${titanx.multipleAccelerate ?? 2}× connects`} results={tierData.accelerate} currentState={results.currentState} recommended={recommendedTier === 'accelerate'} onRecommend={() => setRecommendedTier(prev => prev === 'accelerate' ? null : 'accelerate')} funnelDepth={funnelDepth} reps={customer.reps} annualCostPerRep={customer.annualCostPerRep} />
                <TierColumn title="Scale" subtitle={`${titanx.multipleScale ?? 2.5}× connects`} results={tierData.scale} currentState={results.currentState} recommended={recommendedTier === 'scale'} onRecommend={() => setRecommendedTier(prev => prev === 'scale' ? null : 'scale')} funnelDepth={funnelDepth} reps={customer.reps} annualCostPerRep={customer.annualCostPerRep} />
              </div>

              {/* Financial Section */}
              <div>
                <button onClick={() => setFinancialOpen(prev => !prev)} className="w-full flex items-center gap-2 mb-3 group cursor-pointer">
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-[0.12em] border-l-2 border-primary pl-3">Financial Metrics</h3>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-300 ${financialOpen ? 'rotate-180' : ''}`} />
                </button>
                <div className={`transition-all duration-500 overflow-hidden ${financialOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                {(() => {
                  const cs = results.currentState;
                  const tiers = [
                    { name: 'Grow', data: tierData.grow },
                    { name: 'Accelerate', data: tierData.accelerate },
                    { name: 'Scale', data: tierData.scale },
                  ];

                  type MetricRow = { label: string; csValue: number | undefined; tierValues: (number | undefined)[]; depth: FunnelDepth };
                  const allMetrics: MetricRow[] = [
                    { label: 'Total Annual Cost', csValue: cs.annualCostReps, tierValues: tiers.map(t => t.data.totalAnnualCost), depth: 'meetings_set' as FunnelDepth },
                    { label: 'Cost Per Connect', csValue: cs.costPerConnect, tierValues: tiers.map(t => t.data.costPerConnect), depth: 'meetings_set' as FunnelDepth },
                    { label: 'Cost Per Meeting Set', csValue: cs.costPerMeeting, tierValues: tiers.map(t => t.data.costPerMeeting), depth: 'meetings_set' as FunnelDepth },
                    { label: 'Cost Per Meeting Held', csValue: cs.costPerMeetingHeld, tierValues: tiers.map(t => t.data.costPerMeetingHeld), depth: 'meetings_held' as FunnelDepth },
                    { label: 'Cost Per Qualified Opp', csValue: cs.costPerOpp, tierValues: tiers.map(t => t.data.costPerOpp), depth: 'opps' as FunnelDepth },
                    { label: 'Cost Per Acquisition', csValue: cs.costPerAcquisition, tierValues: tiers.map(t => t.data.costPerAcquisition), depth: 'closed_won' as FunnelDepth },
                  ];
                  const metrics = allMetrics.filter(m => depthAtLeast(funnelDepth, m.depth));

                  const pctDelta = (csVal: number | undefined, tierVal: number | undefined) => {
                    if (csVal == null || tierVal == null || csVal === 0) return null;
                    return ((tierVal - csVal) / csVal) * 100;
                  };

                  return (
                    <div className="rounded-xl overflow-hidden border border-border/30">
                      {/* Header row */}
                      <div className="grid" style={{ gridTemplateColumns: '1.5fr 1fr 1fr 0.6fr 1fr 0.6fr 1fr 0.6fr' }}>
                        <div style={{ background: '#1A1A1A' }} className="px-4 py-3 text-[10px] uppercase tracking-[0.12em] font-bold" />
                        <div style={{ background: '#1A1A1A' }} className="px-3 py-3 text-[10px] uppercase tracking-[0.12em] font-bold text-center" >
                          <span style={{ color: '#666666' }}>Current State</span>
                        </div>
                        {tiers.map((t, i) => (
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

                      {/* Data rows */}
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
                })()}

                {/* Waterfall Chart */}
                {(() => {
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

                  // Calculate running totals for waterfall positioning
                  let running = 0;
                  const waterfallData = data.map((d) => {
                    if (d.isBase) {
                      const item = { ...d, start: 0, end: d.value, display: d.value };
                      running = d.value;
                      return item;
                    }
                    const start = running;
                    const end = running + d.value;
                    const item = { ...d, start: Math.min(start, end), end: Math.max(start, end), display: end, delta: d.value };
                    return item;
                  });

                  return (
                    <div className="glass rounded-xl p-5 mt-4">
                      <h4 className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground mb-4">{cfg.label} — Waterfall</h4>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={waterfallData} barCategoryGap="20%">
                          <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontWeight: 600 }}
                          />
                          <YAxis
                            tickFormatter={(v: number) => `$${Math.round(v).toLocaleString()}`}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                            width={80}
                          />
                          <RechartsTooltip
                            cursor={{ fill: 'rgba(255, 0, 76, 0.1)' }}
                            content={({ active, payload }) => {
                              if (!active || !payload?.length) return null;
                              const item = payload[0]?.payload;
                              if (!item) return null;
                              const isBase = item.isBase;
                              return (
                                <div style={{
                                  background: 'rgba(0, 0, 0, 0.7)',
                                  backdropFilter: 'blur(16px)',
                                  WebkitBackdropFilter: 'blur(16px)',
                                  border: '1px solid hsl(var(--foreground) / 0.08)',
                                  borderRadius: '10px',
                                  padding: '8px 12px',
                                  fontSize: '12px',
                                  boxShadow: '0 8px 32px hsl(var(--background) / 0.4)',
                                }}>
                                  <div style={{ color: 'hsl(var(--muted-foreground))', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>
                                    {isBase ? 'Current' : 'Savings'}
                                  </div>
                                  <div style={{ fontWeight: 700, color: isBase ? 'hsl(var(--foreground))' : '#22c55e' }}>
                                    {fCurrency(isBase ? item.value : item.delta, 2)}
                                  </div>
                                </div>
                              );
                            }}
                          />
                          <ReferenceLine y={0} stroke="hsl(var(--border))" />
                          {/* Invisible bar for the base (start position) */}
                          <Bar dataKey="start" stackId="waterfall" fill="transparent" />
                          {/* Visible bar showing the segment */}
                          <Bar dataKey={(d: any) => d.end - d.start} stackId="waterfall" radius={[4, 4, 0, 0]}>
                            {waterfallData.map((entry, index) => (
                              <Cell
                                key={index}
                                fill={entry.isBase ? 'hsl(var(--muted-foreground) / 0.4)' : 'hsl(var(--primary))'}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  );
                })()}
              </div>
              </div>

              {/* ROI Summary */}
              {showROI && (() => {
                const currentFunnel = results.currentState.funnel ?? {};
                const tiers = [
                  { name: 'Current State', funnel: currentFunnel, cost: results.currentState.annualCostReps ?? 0, titanxCost: 0, isCurrent: true },
                  { name: 'Grow', funnel: tierData.grow.funnel ?? {}, cost: tierData.grow.totalAnnualCost, titanxCost: tierData.grow.costAnnual, isCurrent: false },
                  { name: 'Accelerate', funnel: tierData.accelerate.funnel ?? {}, cost: tierData.accelerate.totalAnnualCost, titanxCost: tierData.accelerate.costAnnual, isCurrent: false },
                  { name: 'Scale', funnel: tierData.scale.funnel ?? {}, cost: tierData.scale.totalAnnualCost, titanxCost: tierData.scale.costAnnual, isCurrent: false },
                ];
                const TIER_COLORS = ['#444444', 'rgba(255,0,76,0.6)', 'rgba(255,0,76,0.8)', '#FF004C'];

                const showRevenue = funnelDepth === 'closed_won';
                const groups = [
                  ...(depthAtLeast(funnelDepth, 'opps') ? [{ key: 'pipeline', label: 'Annual Pipeline Generated' }] : []),
                  ...(showRevenue ? [{ key: 'revenue', label: 'Annual Closed Won Revenue' }] : []),
                ];

                const chartData = tiers.map((t, i) => {
                  const row: Record<string, any> = { tier: t.name, tierColor: TIER_COLORS[i] };
                  groups.forEach(g => {
                    row[g.label] = g.key === 'pipeline' ? (t.funnel.annualPipelineGenerated ?? 0) : (t.funnel.annualClosedWonRevenue ?? 0);
                  });
                  return row;
                });

                const formatYAxis = (v: number) => {
                  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
                  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
                  return `$${v}`;
                };

                // Per-$1-spent metrics
                const perDollarRows = tiers.map(t => {
                  const pipeline = t.funnel.annualPipelineGenerated ?? 0;
                  const revenue = t.funnel.annualClosedWonRevenue ?? 0;
                  const addlPipe = t.isCurrent ? 0 : pipeline - (currentFunnel.annualPipelineGenerated ?? 0);
                  const addlRev = t.isCurrent ? 0 : revenue - (currentFunnel.annualClosedWonRevenue ?? 0);
                  return {
                    name: t.name,
                    isCurrent: t.isCurrent,
                    pipelinePerTitanx: !t.isCurrent && t.titanxCost > 0 ? `$${(addlPipe / t.titanxCost).toFixed(2)}` : '—',
                    pipelinePerTotal: t.cost > 0 ? `$${(pipeline / t.cost).toFixed(2)}` : '—',
                    revenuePerTitanx: !t.isCurrent && t.titanxCost > 0 ? `$${(addlRev / t.titanxCost).toFixed(2)}` : '—',
                    revenuePerTotal: t.cost > 0 ? `$${(revenue / t.cost).toFixed(2)}` : '—',
                  };
                });

                const csPipeline = currentFunnel.annualPipelineGenerated ?? 0;
                const csRevenue = currentFunnel.annualClosedWonRevenue ?? 0;

                // Per-tier ROI data
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
                        <div style={{ background: '#1A1A1A' }} className="px-3 py-3 text-[10px] uppercase tracking-[0.12em] font-bold text-center text-muted-foreground">{funnelDepth === 'closed_won' ? 'Revenue ROI' : 'Pipeline ROI'}</div>
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
                    <div className="glass rounded-xl p-5">
                      <ResponsiveContainer width="100%" height={320}>
                        <BarChart data={chartData} barCategoryGap="20%" barGap={4}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" vertical={false} />
                          <XAxis dataKey="tier" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} />
                          <YAxis tickFormatter={formatYAxis} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} width={65} />
                          <RechartsTooltip
                            cursor={{ fill: 'rgba(255, 0, 76, 0.1)' }}
                            content={({ active, payload, label }) => {
                              if (!active || !payload?.length) return null;
                              const tierIdx = tiers.findIndex(t => t.name === label);
                              return (
                                <div style={{
                                  background: 'rgba(0, 0, 0, 0.7)',
                                  backdropFilter: 'blur(16px)',
                                  WebkitBackdropFilter: 'blur(16px)',
                                  border: '1px solid hsl(var(--foreground) / 0.08)',
                                  borderRadius: 10,
                                  padding: '10px 14px',
                                  boxShadow: '0 8px 32px hsl(var(--foreground) / 0.08)',
                                }}>
                                  <div style={{ fontSize: 12, color: tierIdx >= 0 ? TIER_COLORS[tierIdx] : 'hsl(var(--muted-foreground))', marginBottom: 6, fontWeight: 700 }}>{label}</div>
                                  {payload.map((p: any, i: number) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginBottom: 2 }}>
                                      <span style={{ color: 'hsl(var(--muted-foreground))' }}>{p.name}</span>
                                      <span style={{ fontWeight: 700, color: 'hsl(var(--foreground))', marginLeft: 'auto', fontVariantNumeric: 'tabular-nums' }}>{fCurrency(p.value)}</span>
                                    </div>
                                  ))}
                                </div>
                              );
                            }}
                          />
                          {groups.map((g, gi) => (
                            <Bar key={g.key} dataKey={g.label} radius={[4, 4, 0, 0]}>
                              {chartData.map((entry, index) => (
                                <Cell key={index} fill={TIER_COLORS[index]} />
                              ))}
                            </Bar>
                          ))}
                        </BarChart>
                      </ResponsiveContainer>

                      {/* Per-$1-spent data row */}
                      <div className="mt-4 border-t border-border/30 pt-3">
                        <div className="grid grid-cols-4 gap-4 text-center">
                          {perDollarRows.map((r, i) => (
                            <div key={r.name} className="space-y-1">
                              <div className="text-[10px] uppercase tracking-[0.12em] font-semibold" style={{ color: TIER_COLORS[i] }}>{r.name}</div>
                              {depthAtLeast(funnelDepth, 'opps') && (
                                <div>
                                  <div className="text-xs font-bold tabular-nums text-foreground">{r.isCurrent ? r.pipelinePerTotal : r.pipelinePerTitanx}</div>
                                  <div className="text-[9px] text-muted-foreground/60">{r.isCurrent ? 'pipeline / $1 total' : 'pipeline / $1 TitanX'}</div>
                                </div>
                              )}
                              {showRevenue && (
                                <div>
                                  <div className="text-xs font-bold tabular-nums text-foreground">{r.isCurrent ? r.revenuePerTotal : r.revenuePerTitanx}</div>
                                  <div className="text-[9px] text-muted-foreground/60">{r.isCurrent ? 'revenue / $1 total' : 'revenue / $1 TitanX'}</div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    </div>
                  </div>
                );
              })()}
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
