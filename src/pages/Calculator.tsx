import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { toast } from 'sonner';
import { HelpCircle, Copy, Plus, Save } from 'lucide-react';
import { calculate, type CustomerInputs, type TitanXInputs, type TierResults, type CurrentState } from '@/lib/calculations';
import { fCurrency, fNumber, fPercent, fReps, fMeetings } from '@/lib/formatters';

function NumericInput({ label, value, onChange, prefix, suffix, placeholder = '—', tooltip }: {
  label: string; value: number | null; onChange: (v: number | null) => void;
  prefix?: string; suffix?: string; placeholder?: string; tooltip?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</label>
        {tooltip && (
          <Tooltip>
            <TooltipTrigger><HelpCircle className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
            <TooltipContent className="max-w-[220px] text-xs">{tooltip}</TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{prefix}</span>}
        <Input
          type="number"
          className={`bg-background border-input text-foreground h-9 text-sm ${prefix ? 'pl-7' : ''} ${suffix ? 'pr-7' : ''}`}
          placeholder={placeholder}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
        />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}

function StatCard({ label, value, highlight = false, muted = false }: {
  label: string; value: string; highlight?: boolean; muted?: boolean;
}) {
  return (
    <div className={muted ? 'opacity-50' : ''}>
      <div className={`text-xl font-bold tabular-nums ${highlight ? 'text-primary' : 'text-foreground'}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

function TierColumn({ title, subtitle, results, currentState, recommended = false, isCurrent = false }: {
  title: string; subtitle?: string; results?: TierResults; currentState?: CurrentState;
  recommended?: boolean; isCurrent?: boolean;
}) {
  const borderClass = recommended ? 'border-l-2 border-l-primary' : isCurrent ? '' : '';
  const accentBorder = !isCurrent && !recommended ? 'border-l-2 border-l-primary/40' : '';

  return (
    <div className={`bg-card rounded border border-border p-4 space-y-4 ${borderClass} ${accentBorder} relative`}>
      {recommended && (
        <span className="absolute -top-3 left-3 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
          Recommended
        </span>
      )}
      <div>
        <h4 className={`font-bold text-sm ${isCurrent ? 'text-muted-foreground' : 'text-foreground'}`}>{title}</h4>
        {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
      </div>

      {/* Activity Metrics */}
      <div className="space-y-3">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Activity</p>
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
        <div className="space-y-3 border-l-2 border-primary pl-3">
          <p className="text-[10px] uppercase tracking-wider text-primary font-medium">Efficiency Story</p>
          <StatCard label="Rep Production Equivalent" value={`${fReps(results.repProductionEquivalent)} reps`} highlight />
          <StatCard label="% of Current Dials Required" value={fPercent(results.pctOfCurrentDials)} highlight />
          <StatCard label="Cost of Equivalent Reps" value={`${fReps(results.costOfEquivReps)} reps`} highlight />
        </div>
      )}

      {/* Financial Metrics */}
      <div className="space-y-3">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Financial</p>
        {isCurrent && currentState ? (
          <>
            <StatCard label="Credits / Month" value="—" muted />
            <StatCard label="TitanX Cost / Month" value="—" muted />
            <StatCard label="TitanX Cost / Year" value="—" muted />
            <StatCard label="Total Annual Cost" value={fCurrency(currentState.annualCostReps)} muted />
            <StatCard label="Cost Per Connect" value={fCurrency(currentState.costPerConnect, 2)} muted />
            <StatCard label="Cost Per Meeting" value={fCurrency(currentState.costPerMeeting, 2)} muted />
          </>
        ) : results ? (
          <>
            <StatCard label="Credits / Month" value={fNumber(results.creditsPerMonth)} />
            <StatCard label="TitanX Cost / Month" value={fCurrency(results.costMonthly)} />
            <StatCard label="TitanX Cost / Year" value={fCurrency(results.costAnnual)} />
            <StatCard label="Total Annual Cost" value={fCurrency(results.totalAnnualCost)} />
            <StatCard label="Cost Per Connect" value={fCurrency(results.costPerConnect, 2)} />
            <StatCard label="Cost Per Meeting" value={fCurrency(results.costPerMeeting, 2)} />
          </>
        ) : null}
      </div>
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="text-xl font-bold tracking-tight">
          <span className="text-foreground">TITAN</span><span className="text-primary">X</span>
        </div>
        <h1 className="text-lg font-semibold text-foreground hidden sm:block">Dream Outcome Calculator</h1>
        <Button variant="outline" size="sm" onClick={handleNewSession}>
          <Plus className="h-4 w-4 mr-1" /> New Session
        </Button>
      </header>

      <div className="max-w-[1440px] mx-auto p-6 space-y-6">
        {/* Session Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-card rounded border border-border p-4">
          <div className="space-y-1">
            <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Customer Name</label>
            <Input className="bg-background border-input h-9 text-sm" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="—" />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Company</label>
            <Input className="bg-background border-input h-9 text-sm" value={company} onChange={e => setCompany(e.target.value)} placeholder="—" />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">AE Name</label>
            <Input className="bg-background border-input h-9 text-sm" value={aeName} onChange={e => setAeName(e.target.value)} placeholder="—" />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Date</label>
            <Input className="bg-background border-input h-9 text-sm" value={sessionDate} readOnly />
          </div>
        </div>

        {/* Two-column inputs */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Customer Inputs */}
          <div className="bg-card rounded border border-border p-5 space-y-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-primary">Customer Inputs</span>
              <p className="text-[11px] text-muted-foreground mt-0.5">Fill in with the prospect during the session.</p>
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
          <div className="bg-card rounded border border-border p-5 space-y-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-primary">TitanX Data</span>
              <p className="text-[11px] text-muted-foreground mt-0.5">Pulled from your TitanX account data for this prospect.</p>
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
            <h2 className="text-lg font-bold text-foreground">Live Results</h2>
            <ToggleGroup type="single" value={model} onValueChange={(v) => v && setModel(v)} className="bg-card border border-border rounded">
              <ToggleGroupItem value="blended" className="text-xs px-4 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                Blended Calling
              </ToggleGroupItem>
              <ToggleGroupItem value="highIntent" className="text-xs px-4 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                High Intent Only
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {results && tierData ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <TierColumn title="Current State" isCurrent currentState={results.currentState} />
              <TierColumn title="Grow" subtitle="1.5× connects" results={tierData.grow} currentState={results.currentState} />
              <TierColumn title="Accelerate" subtitle="2× connects" results={tierData.accelerate} currentState={results.currentState} />
              <TierColumn title="Scale" subtitle="2.5× connects" results={tierData.scale} currentState={results.currentState} recommended />
            </div>
          ) : (
            <div className="bg-card rounded border border-border p-12 text-center text-muted-foreground">
              Fill in all inputs above to see live results.
            </div>
          )}
        </div>

        {/* Action Bar */}
        <div className="flex gap-3 justify-end">
          <Button onClick={handleSave} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Save className="h-4 w-4 mr-1" /> Save Session
          </Button>
          <Button variant="outline" onClick={() => { navigator.clipboard.writeText(window.location.href); toast.info('Link copied!'); }}>
            <Copy className="h-4 w-4 mr-1" /> Copy Shareable Link
          </Button>
          <Button variant="outline" onClick={handleNewSession}>
            <Plus className="h-4 w-4 mr-1" /> Start New Session
          </Button>
        </div>

        {/* Footer */}
        <footer className="text-center py-6 text-sm text-muted-foreground">
          Welcome to the <span className="text-primary font-semibold">Phone Intent™</span> Era.
        </footer>
      </div>
    </div>
  );
}
