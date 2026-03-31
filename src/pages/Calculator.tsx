import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import AccountSelector from '@/components/AccountSelector';
import UserSelector from '@/components/UserSelector';
import NumericInput from '@/components/NumericInput';
import CalculatorResultsView, { depthAtLeast } from '@/components/CalculatorResults';
import { toast } from 'sonner';
import { Copy, Plus, Save, CalendarIcon, Star, Sun, Moon, ChevronDown, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import titanxLogo from '@/assets/titanx-logo.svg';
import titanxLogoLight from '@/assets/titanx-logo-light.svg';
import bgDark from '@/assets/bg-dark.png';
import bgLight from '@/assets/bg-light.png';
import { calculate, type CustomerInputs, type TitanXInputs, type TierResults, type CurrentState, type FunnelDepth, type FunnelMetrics } from '@/lib/calculations';
import { fCurrency, fNumber, fPercent, fReps, fMeetings } from '@/lib/formatters';
import { supabase } from '@/lib/supabase';

const FUNNEL_DEPTHS: { value: FunnelDepth; label: string }[] = [
  { value: 'meetings_set', label: 'Meetings Set' },
  { value: 'meetings_held', label: 'Meetings Held' },
  { value: 'opps', label: 'Qualified Opps' },
  { value: 'closed_won', label: 'Closed Won' },
];

// depthAtLeast is now imported from @/components/CalculatorResults

// Display components (TierColumn, StatCard, etc.) are now in @/components/CalculatorResults

export default function Calculator() {
  const navigate = useNavigate();
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedSfUserId, setSelectedSfUserId] = useState('');
  const [sessionDate, setSessionDate] = useState<Date>(new Date());
  const [model, setModel] = useState<string>('blended');
  const [recommendedTier, setRecommendedTier] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [funnelDepth, setFunnelDepth] = useState<FunnelDepth>('meetings_set');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from('app_users')
        .select('role')
        .eq('id', session.user.id)
        .single();
      if (data?.role === 'admin') setIsAdmin(true);
    })();
  }, []);

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
    setSelectedAccountId(''); setSelectedSfUserId(''); setSessionDate(new Date());
    setFunnelDepth('meetings_set');
    setCustomer({ reps: null, annualCostPerRep: null, dialsPerDay: null, connectRate: null, conversationRate: null, meetingRate: null, meetingShowRate: null, oppQualificationRate: null, winRate: null, acv: null });
    setTitanx({ highIntent: 20, highIntentReach: 85, avgPhones: 2, titanxConnectRate: 25, creditPriceGrow: 0.50, creditPriceAccelerate: 0.50, creditPriceScale: 0.50, multipleGrow: 1.5, multipleAccelerate: 2.0, multipleScale: 2.5 });
  };

  const handleSave = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast.error('Not logged in'); return; }
    if (!results) { toast.error('Complete all inputs first'); return; }

    const td = model === 'blended' ? results.blended : results.highIntent;

    const { error } = await supabase.from('calculator_sessions').insert({
      app_user_id:     session.user.id,
      sf_account_id:   selectedAccountId  || null,
      sf_user_id:      selectedSfUserId   || null,
      session_date:    format(sessionDate, 'yyyy-MM-dd'),
      model,
      funnel_depth:    funnelDepth,
      recommended_tier: recommendedTier  || null,

      inp_reps:                   customer.reps,
      inp_annual_cost_per_rep:    customer.annualCostPerRep,
      inp_dials_per_day:          customer.dialsPerDay,
      inp_connect_rate:           customer.connectRate,
      inp_conversation_rate:      customer.conversationRate,
      inp_meeting_rate:           customer.meetingRate,
      inp_meeting_show_rate:      customer.meetingShowRate,
      inp_opp_qualification_rate: customer.oppQualificationRate,
      inp_win_rate:               customer.winRate,
      inp_acv:                    customer.acv,

      inp_high_intent:             titanx.highIntent,
      inp_high_intent_reach:       titanx.highIntentReach,
      inp_avg_phones:              titanx.avgPhones,
      inp_titanx_connect_rate:     titanx.titanxConnectRate,
      inp_credit_price_grow:       titanx.creditPriceGrow,
      inp_credit_price_accelerate: titanx.creditPriceAccelerate,
      inp_credit_price_scale:      titanx.creditPriceScale,
      inp_multiple_grow:           titanx.multipleGrow,
      inp_multiple_accelerate:     titanx.multipleAccelerate,
      inp_multiple_scale:          titanx.multipleScale,

      out_cs_monthly_dials:         results.currentState.monthlyDials,
      out_cs_monthly_connects:      results.currentState.monthlyConnects,
      out_cs_monthly_conversations: results.currentState.monthlyConversations,
      out_cs_monthly_meetings:      results.currentState.monthlyMeetings,
      out_cs_annual_meetings:       results.currentState.annualMeetings,
      out_cs_annual_cost_reps:      results.currentState.annualCostReps,
      out_cs_cost_per_connect:      results.currentState.costPerConnect,
      out_cs_cost_per_meeting:      results.currentState.costPerMeeting,
      out_cs_monthly_meetings_held: results.currentState.funnel.monthlyMeetingsHeld ?? null,
      out_cs_monthly_opps:          results.currentState.funnel.monthlyOpps          ?? null,
      out_cs_monthly_closed_won:    results.currentState.funnel.monthlyClosedWon     ?? null,
      out_cs_annual_pipeline:       results.currentState.funnel.annualPipelineGenerated ?? null,
      out_cs_annual_revenue:        results.currentState.funnel.annualClosedWonRevenue  ?? null,

      out_grow_monthly_dials:         td.grow.monthlyDials,
      out_grow_monthly_connects:      td.grow.monthlyConnects,
      out_grow_monthly_conversations: td.grow.monthlyConversations,
      out_grow_monthly_meetings:      td.grow.monthlyMeetings,
      out_grow_annual_meetings:       td.grow.annualMeetings,
      out_grow_credits_per_month:     td.grow.creditsPerMonth,
      out_grow_cost_monthly:          td.grow.costMonthly,
      out_grow_cost_annual:           td.grow.costAnnual,
      out_grow_total_annual_cost:     td.grow.totalAnnualCost,
      out_grow_cost_per_connect:      td.grow.costPerConnect,
      out_grow_cost_per_meeting:      td.grow.costPerMeeting,
      out_grow_rep_production_equiv:  td.grow.repProductionEquivalent,
      out_grow_cost_of_equiv_reps:    td.grow.costOfEquivReps,
      out_grow_pct_of_current_dials:  td.grow.pctOfCurrentDials,
      out_grow_monthly_meetings_held: td.grow.funnel.monthlyMeetingsHeld       ?? null,
      out_grow_monthly_opps:          td.grow.funnel.monthlyOpps               ?? null,
      out_grow_monthly_closed_won:    td.grow.funnel.monthlyClosedWon          ?? null,
      out_grow_annual_pipeline:       td.grow.funnel.annualPipelineGenerated   ?? null,
      out_grow_annual_revenue:        td.grow.funnel.annualClosedWonRevenue    ?? null,

      out_acc_monthly_dials:         td.accelerate.monthlyDials,
      out_acc_monthly_connects:      td.accelerate.monthlyConnects,
      out_acc_monthly_conversations: td.accelerate.monthlyConversations,
      out_acc_monthly_meetings:      td.accelerate.monthlyMeetings,
      out_acc_annual_meetings:       td.accelerate.annualMeetings,
      out_acc_credits_per_month:     td.accelerate.creditsPerMonth,
      out_acc_cost_monthly:          td.accelerate.costMonthly,
      out_acc_cost_annual:           td.accelerate.costAnnual,
      out_acc_total_annual_cost:     td.accelerate.totalAnnualCost,
      out_acc_cost_per_connect:      td.accelerate.costPerConnect,
      out_acc_cost_per_meeting:      td.accelerate.costPerMeeting,
      out_acc_rep_production_equiv:  td.accelerate.repProductionEquivalent,
      out_acc_cost_of_equiv_reps:    td.accelerate.costOfEquivReps,
      out_acc_pct_of_current_dials:  td.accelerate.pctOfCurrentDials,
      out_acc_monthly_meetings_held: td.accelerate.funnel.monthlyMeetingsHeld     ?? null,
      out_acc_monthly_opps:          td.accelerate.funnel.monthlyOpps             ?? null,
      out_acc_monthly_closed_won:    td.accelerate.funnel.monthlyClosedWon        ?? null,
      out_acc_annual_pipeline:       td.accelerate.funnel.annualPipelineGenerated ?? null,
      out_acc_annual_revenue:        td.accelerate.funnel.annualClosedWonRevenue  ?? null,

      out_scale_monthly_dials:         td.scale.monthlyDials,
      out_scale_monthly_connects:      td.scale.monthlyConnects,
      out_scale_monthly_conversations: td.scale.monthlyConversations,
      out_scale_monthly_meetings:      td.scale.monthlyMeetings,
      out_scale_annual_meetings:       td.scale.annualMeetings,
      out_scale_credits_per_month:     td.scale.creditsPerMonth,
      out_scale_cost_monthly:          td.scale.costMonthly,
      out_scale_cost_annual:           td.scale.costAnnual,
      out_scale_total_annual_cost:     td.scale.totalAnnualCost,
      out_scale_cost_per_connect:      td.scale.costPerConnect,
      out_scale_cost_per_meeting:      td.scale.costPerMeeting,
      out_scale_rep_production_equiv:  td.scale.repProductionEquivalent,
      out_scale_cost_of_equiv_reps:    td.scale.costOfEquivReps,
      out_scale_pct_of_current_dials:  td.scale.pctOfCurrentDials,
      out_scale_monthly_meetings_held: td.scale.funnel.monthlyMeetingsHeld     ?? null,
      out_scale_monthly_opps:          td.scale.funnel.monthlyOpps             ?? null,
      out_scale_monthly_closed_won:    td.scale.funnel.monthlyClosedWon        ?? null,
      out_scale_annual_pipeline:       td.scale.funnel.annualPipelineGenerated ?? null,
      out_scale_annual_revenue:        td.scale.funnel.annualClosedWonRevenue  ?? null,
    });

    if (error) {
      toast.error('Failed to save', { description: error.message });
    } else {
      toast.success('Session saved.');
    }
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
          {isAdmin && (
            <button onClick={() => navigate('/admin')} className="p-2 rounded-lg glass-subtle border-none text-foreground/60 hover:text-foreground transition-all duration-300" aria-label="Admin Panel">
              <Settings className="h-4 w-4" />
            </button>
          )}
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
            <AccountSelector value={selectedAccountId} onChange={setSelectedAccountId} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">TitanX User</label>
            <UserSelector value={selectedSfUserId} onChange={setSelectedSfUserId} />
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
            <CalculatorResultsView
              results={results}
              tierData={tierData}
              funnelDepth={funnelDepth}
              recommendedTier={recommendedTier}
              onRecommendTier={setRecommendedTier}
              reps={customer.reps}
              annualCostPerRep={customer.annualCostPerRep}
              multiples={{ grow: titanx.multipleGrow, accelerate: titanx.multipleAccelerate, scale: titanx.multipleScale }}
            />
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
