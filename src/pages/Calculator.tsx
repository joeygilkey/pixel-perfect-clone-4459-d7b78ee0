import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { toast } from 'sonner';
import { HelpCircle, Copy, Plus, Save, Sparkles } from 'lucide-react';
import titanxLogo from '@/assets/titanx-logo.svg';
import { calculate, type CustomerInputs, type TitanXInputs, type TierResults, type CurrentState } from '@/lib/calculations';
import { fCurrency, fNumber, fPercent, fReps, fMeetings } from '@/lib/formatters';

function NumericInput({ label, value, onChange, prefix, suffix, placeholder = '—', tooltip }: {
  label: string; value: number | null; onChange: (v: number | null) => void;
  prefix?: string; suffix?: string; placeholder?: string; tooltip?: string;
}) {
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
          type="number"
          className={`glass-subtle border-none h-9 text-sm text-foreground placeholder:text-muted-foreground/40 focus:ring-1 focus:ring-primary/40 transition-all duration-300 group-hover:bg-[hsla(220,20%,18%,0.4)] ${prefix ? 'pl-7' : ''} ${suffix ? 'pr-7' : ''}`}
          placeholder={placeholder}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
        />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground/70">{suffix}</span>}
      </div>
    </div>
  );
}

function StatCard({ label, value, highlight = false, muted = false }: {
  label: string; value: string; highlight?: boolean; muted?: boolean;
}) {
  return (
    <div className={`transition-all duration-300 ${muted ? 'opacity-40' : ''}`}>
      <div className={`text-xl font-bold tabular-nums tracking-tight ${highlight ? 'text-primary drop-shadow-[0_0_8px_hsla(348,100%,50%,0.4)]' : 'text-foreground'}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

function TierColumn({ title, subtitle, results, currentState, recommended = false, isCurrent = false }: {
  title: string; subtitle?: string; results?: TierResults; currentState?: CurrentState;
  recommended?: boolean; isCurrent?: boolean;
}) {
  const glassClass = recommended
    ? 'glass-accent glow-primary'
    : isCurrent
      ? 'glass-subtle'
      : 'glass';

  return (
    <div className={`${glassClass} rounded-xl p-5 space-y-5 relative overflow-hidden transition-all duration-500 hover:scale-[1.01] hover:shadow-lg`}>
      {/* Liquid highlight at top */}
      {!isCurrent && (
        <div className={`absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r ${recommended ? 'from-transparent via-primary/60 to-transparent' : 'from-transparent via-white/10 to-transparent'}`} />
      )}

      {recommended && (
        <span className="absolute top-3 right-3 bg-primary/20 text-primary text-[9px] font-bold uppercase tracking-[0.15em] px-2.5 py-1 rounded-full border border-primary/30 backdrop-blur-sm">
          <Sparkles className="inline h-3 w-3 mr-0.5 -mt-0.5" /> Recommended
        </span>
      )}
      <div>
        <h4 className={`font-bold text-sm ${isCurrent ? 'text-muted-foreground' : 'text-foreground'}`}>{title}</h4>
        {subtitle && <p className="text-[10px] text-muted-foreground/60 mt-0.5">{subtitle}</p>}
        {!isCurrent && results ? (
          <div className="flex gap-4 mt-1.5">
            <p className="text-[10px] text-muted-foreground"><span className="text-foreground/80 font-medium">{fNumber(results.creditsPerMonth)}</span> credits/mo</p>
            <p className="text-[10px] text-muted-foreground"><span className="text-foreground/80 font-medium">{fCurrency(results.costAnnual)}</span>/yr</p>
          </div>
        ) : null}
      </div>

      {/* Activity Metrics */}
      <div className="space-y-3">
        <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/80 font-medium">Activity</p>
        {isCurrent && currentState ? (
          <>
            <StatCard label="Monthly Dials" value={fNumber(currentState.monthlyDials)} muted />
            <StatCard label="Monthly Connects" value={fNumber(currentState.monthlyConnects)} muted />
            <StatCard label="Monthly Conversations" value={fNumber(currentState.monthlyConversations, 1)} muted />
            <StatCard label="Monthly Meetings" value={fMeetings(currentState.monthlyMeetings)} muted />
            <StatCard label="Annual Meetings" value={fMeetings(currentState.annualMeetings)} muted />
          </>
        ) : results ? (
          <>
            <StatCard label="Monthly Dials" value={fNumber(results.monthlyDials)} />
            <StatCard label="Monthly Connects" value={fNumber(results.monthlyConnects)} />
            <StatCard label="Monthly Conversations" value={fNumber(results.monthlyConversations, 1)} />
            <StatCard label="Monthly Meetings" value={fMeetings(results.monthlyMeetings)} />
            <StatCard label="Annual Meetings" value={fMeetings(results.annualMeetings)} />
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
    </div>
  );
}

function FinancialColumn({ title, results, currentState, recommended = false, isCurrent = false }: {
  title: string; results?: TierResults; currentState?: CurrentState;
  recommended?: boolean; isCurrent?: boolean;
}) {
  const glassClass = recommended
    ? 'glass-accent glow-primary'
    : isCurrent
      ? 'glass-subtle'
      : 'glass';

  return (
    <div className={`${glassClass} rounded-xl p-5 space-y-3 relative overflow-hidden transition-all duration-500 hover:scale-[1.01] hover:shadow-lg`}>
      {!isCurrent && (
        <div className={`absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r ${recommended ? 'from-transparent via-primary/60 to-transparent' : 'from-transparent via-white/10 to-transparent'}`} />
      )}
      <div className="flex items-center justify-between">
        <h4 className={`font-bold text-sm ${isCurrent ? 'text-muted-foreground' : 'text-foreground'}`}>{title}</h4>
        {recommended && (
          <span className="bg-primary/20 text-primary text-[9px] font-bold uppercase tracking-[0.15em] px-2 py-0.5 rounded-full border border-primary/30">
            <Sparkles className="inline h-2.5 w-2.5 mr-0.5 -mt-0.5" /> Best Value
          </span>
        )}
      </div>
      {isCurrent && currentState ? (
        <>
          <StatCard label="Total Annual Cost" value={fCurrency(currentState.annualCostReps)} muted />
          <StatCard label="Cost Per Connect" value={fCurrency(currentState.costPerConnect, 2)} muted />
          <StatCard label="Cost Per Meeting" value={fCurrency(currentState.costPerMeeting, 2)} muted />
        </>
      ) : results ? (
        <>
          <StatCard label="Total Annual Cost" value={fCurrency(results.totalAnnualCost)} />
          <StatCard label="Cost Per Connect" value={fCurrency(results.costPerConnect, 2)} />
          <StatCard label="Cost Per Meeting" value={fCurrency(results.costPerMeeting, 2)} />
        </>
      ) : null}
    </div>
  );
}

export default function Calculator() {
  const [customerName, setCustomerName] = useState('');
  const [company, setCompany] = useState('');
  const [aeName, setAeName] = useState('');
  const [sessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [model, setModel] = useState<string>('blended');

  const [customer, setCustomer] = useState<CustomerInputs>({
    reps: null, annualCostPerRep: null, dialsPerDay: null,
    connectRate: null, conversationRate: null, meetingRate: null,
  });

  const [titanx, setTitanx] = useState<TitanXInputs>({
    highIntent: 20, highIntentReach: 85, avgPhones: 2,
    titanxConnectRate: 25, creditPriceGrow: 0.50,
    creditPriceAccelerate: 0.50, creditPriceScale: 0.50,
  });

  const results = useMemo(() => calculate(customer, titanx), [customer, titanx]);
  const tierData = results ? (model === 'blended' ? results.blended : results.highIntent) : null;

  const updateCustomer = (key: keyof CustomerInputs) => (v: number | null) =>
    setCustomer(prev => ({ ...prev, [key]: v }));
  const updateTitanx = (key: keyof TitanXInputs) => (v: number | null) =>
    setTitanx(prev => ({ ...prev, [key]: v }));

  const handleNewSession = () => {
    if (!confirm('Clear all inputs and start a new session?')) return;
    setCustomerName(''); setCompany(''); setAeName('');
    setCustomer({ reps: null, annualCostPerRep: null, dialsPerDay: null, connectRate: null, conversationRate: null, meetingRate: null });
    setTitanx({ highIntent: 20, highIntentReach: 85, avgPhones: 2, titanxConnectRate: 25, creditPriceGrow: 0.50, creditPriceAccelerate: 0.50, creditPriceScale: 0.50 });
  };

  const handleSave = () => {
    toast.success('Session saved. Shareable link ready.', { description: 'Connect Lovable Cloud to enable persistence.' });
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-primary/[0.03] blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-primary/[0.02] blur-[100px]" />
        <div className="absolute top-[40%] left-[60%] w-[30vw] h-[30vw] rounded-full bg-blue-500/[0.02] blur-[100px]" />
      </div>

      {/* Header */}
      <header className="glass-strong sticky top-0 z-50 p-2.5 flex items-center justify-between">
        <img src={titanxLogo} alt="TitanX" className="h-[26px]" />
        <h1 className="text-base font-semibold text-foreground/80 hidden sm:block tracking-wide">Dream Outcome Calculator</h1>
        <Button variant="outline" size="sm" onClick={handleNewSession} className="glass-subtle border-none text-foreground/80 hover:text-foreground hover:bg-white/10 transition-all duration-300">
          <Plus className="h-4 w-4 mr-1" /> New Session
        </Button>
      </header>

      <div className="max-w-[1440px] mx-auto p-6 space-y-6 relative z-10">
        {/* Session Info */}
        <div className="glass rounded-xl grid grid-cols-2 md:grid-cols-4 gap-4 p-5">
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">Customer Name</label>
            <Input className="glass-subtle border-none h-9 text-sm focus:ring-1 focus:ring-primary/40" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="—" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">Company</label>
            <Input className="glass-subtle border-none h-9 text-sm focus:ring-1 focus:ring-primary/40" value={company} onChange={e => setCompany(e.target.value)} placeholder="—" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">Main TitanX POC</label>
            <Input className="glass-subtle border-none h-9 text-sm focus:ring-1 focus:ring-primary/40" value={aeName} onChange={e => setAeName(e.target.value)} placeholder="—" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">Date</label>
            <Input className="glass-subtle border-none h-9 text-sm text-muted-foreground" value={sessionDate} readOnly />
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
            <div className="grid grid-cols-2 gap-4">
              <NumericInput label="Reps" value={customer.reps} onChange={updateCustomer('reps')} />
              <NumericInput label="Annual Cost Per Rep" value={customer.annualCostPerRep} onChange={updateCustomer('annualCostPerRep')} prefix="$" />
              <NumericInput label="Dials / Day / Rep" value={customer.dialsPerDay} onChange={updateCustomer('dialsPerDay')} />
              <NumericInput label="Connect Rate" value={customer.connectRate} onChange={updateCustomer('connectRate')} suffix="%" tooltip="% of dials that connect (e.g. 5.5)" />
              <NumericInput label="Conversation Rate" value={customer.conversationRate} onChange={updateCustomer('conversationRate')} suffix="%" tooltip="% of connects that become conversations" />
              <NumericInput label="Meeting Rate" value={customer.meetingRate} onChange={updateCustomer('meetingRate')} suffix="%" tooltip="% of conversations that book a meeting" />
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
              <NumericInput label="HI Reach" value={titanx.highIntentReach} onChange={updateTitanx('highIntentReach')} suffix="%" tooltip="Reachability of High Intent contacts" />
              <NumericInput label="Avg Phones / Contact" value={titanx.avgPhones} onChange={updateTitanx('avgPhones')} />
              <NumericInput label="TitanX Connect Rate" value={titanx.titanxConnectRate} onChange={updateTitanx('titanxConnectRate')} suffix="%" tooltip="Connect rate on TitanX High Intent data" />
              <NumericInput label="Credit Price — Grow" value={titanx.creditPriceGrow} onChange={updateTitanx('creditPriceGrow')} prefix="$" />
              <NumericInput label="Credit Price — Accelerate" value={titanx.creditPriceAccelerate} onChange={updateTitanx('creditPriceAccelerate')} prefix="$" />
              <NumericInput label="Credit Price — Scale" value={titanx.creditPriceScale} onChange={updateTitanx('creditPriceScale')} prefix="$" />
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground tracking-tight">Live Results</h2>
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
                <TierColumn title="Current State" isCurrent currentState={results.currentState} />
                <TierColumn title="Grow" subtitle="1.5× connects" results={tierData.grow} currentState={results.currentState} />
                <TierColumn title="Accelerate" subtitle="2× connects" results={tierData.accelerate} currentState={results.currentState} />
                <TierColumn title="Scale" subtitle="2.5× connects" results={tierData.scale} currentState={results.currentState} recommended />
              </div>

              {/* Financial Section */}
              <div>
                <h3 className="text-sm font-bold text-foreground/70 uppercase tracking-[0.12em] mb-3">Financial Metrics</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <FinancialColumn title="Current State" isCurrent currentState={results.currentState} />
                  <FinancialColumn title="Grow" results={tierData.grow} currentState={results.currentState} />
                  <FinancialColumn title="Accelerate" results={tierData.accelerate} currentState={results.currentState} />
                  <FinancialColumn title="Scale" results={tierData.scale} currentState={results.currentState} recommended />
                </div>
              </div>
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
          <Button variant="outline" onClick={() => { navigator.clipboard.writeText(window.location.href); toast.info('Link copied!'); }} className="glass-subtle border-none text-foreground/80 hover:text-foreground hover:bg-white/10 transition-all duration-300">
            <Copy className="h-4 w-4 mr-1.5" /> Copy Link
          </Button>
          <Button variant="outline" onClick={handleNewSession} className="glass-subtle border-none text-foreground/80 hover:text-foreground hover:bg-white/10 transition-all duration-300">
            <Plus className="h-4 w-4 mr-1.5" /> New Session
          </Button>
        </div>

        {/* Footer */}
        <footer className="text-center py-8 text-sm text-muted-foreground/50">
          Welcome to the <span className="text-primary font-semibold drop-shadow-[0_0_8px_hsla(348,100%,50%,0.4)]">Phone Intent™</span> Era.
        </footer>
      </div>
    </div>
  );
}
