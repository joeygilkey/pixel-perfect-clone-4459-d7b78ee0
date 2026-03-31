import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { calculate, type CustomerInputs, type TitanXInputs, type FunnelDepth } from '@/lib/calculations';
import CalculatorResultsView from '@/components/CalculatorResults';
import titanxLogo from '@/assets/titanx-logo.svg';
import bgDark from '@/assets/bg-dark.png';
import { format } from 'date-fns';

export default function GuestView() {
  const { token } = useParams<{ token: string }>();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) { setError('Invalid link'); setLoading(false); return; }

    (async () => {
      const { data, error: err } = await supabase
        .from('calculator_sessions')
        .select('*')
        .eq('share_token', token)
        .single();

      if (err || !data) {
        setError('This link is invalid or has expired.');
      } else {
        setSession(data);
      }
      setLoading(false);
    })();
  }, [token]);

  const customer: CustomerInputs | null = session ? {
    reps: session.inp_reps,
    annualCostPerRep: session.inp_annual_cost_per_rep,
    dialsPerDay: session.inp_dials_per_day,
    connectRate: session.inp_connect_rate,
    conversationRate: session.inp_conversation_rate,
    meetingRate: session.inp_meeting_rate,
    meetingShowRate: session.inp_meeting_show_rate,
    oppQualificationRate: session.inp_opp_qualification_rate,
    winRate: session.inp_win_rate,
    acv: session.inp_acv,
  } : null;

  const titanx: TitanXInputs | null = session ? {
    highIntent: session.inp_high_intent ?? 20,
    highIntentReach: session.inp_high_intent_reach ?? 85,
    avgPhones: session.inp_avg_phones ?? 2,
    titanxConnectRate: session.inp_titanx_connect_rate ?? 25,
    creditPriceGrow: session.inp_credit_price_grow ?? 0.50,
    creditPriceAccelerate: session.inp_credit_price_accelerate ?? 0.50,
    creditPriceScale: session.inp_credit_price_scale ?? 0.50,
    multipleGrow: session.inp_multiple_grow ?? 1.5,
    multipleAccelerate: session.inp_multiple_accelerate ?? 2.0,
    multipleScale: session.inp_multiple_scale ?? 2.5,
  } : null;

  const results = useMemo(() => {
    if (!customer || !titanx) return null;
    return calculate(customer, titanx);
  }, [customer, titanx]);

  const model = session?.model ?? 'blended';
  const funnelDepth: FunnelDepth = (session?.funnel_depth as FunnelDepth) ?? 'meetings_set';
  const recommendedTier = session?.recommended_tier ?? null;
  const tierData = results ? (model === 'blended' ? results.blended : results.highIntent) : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="glass rounded-xl p-10 text-center max-w-md space-y-4">
          <img src={titanxLogo} alt="TitanX" className="h-8 mx-auto" />
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <img src={bgDark} alt="" className="w-full h-full object-cover" />
      </div>
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-primary/[0.03] blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-primary/[0.02] blur-[100px]" />
      </div>

      {/* Header */}
      <header className="glass-strong sticky top-0 z-50 p-2.5 flex items-center justify-between">
        <img src={titanxLogo} alt="TitanX" className="h-[26px]" />
        <h1 className="text-base font-semibold text-foreground/80 tracking-wide">Dream Outcome Calculator</h1>
        <div />
      </header>

      <div className="max-w-[1440px] mx-auto p-6 space-y-6 relative z-10">
        {/* Session meta */}
        {session && (
          <div className="glass rounded-xl p-5 flex flex-wrap gap-6 text-sm text-muted-foreground">
            {session.session_date && (
              <span>Date: <strong className="text-foreground/80">{format(new Date(session.session_date + 'T12:00:00'), 'MMMM d, yyyy')}</strong></span>
            )}
            <span>Model: <strong className="text-foreground/80">{model === 'highIntent' ? 'High Intent Only' : 'Blended Calling'}</strong></span>
            {recommendedTier && (
              <span>Recommended: <strong className="text-primary capitalize">{recommendedTier}</strong></span>
            )}
          </div>
        )}

        {/* Results */}
        {results && tierData ? (
          <CalculatorResultsView
            results={results}
            tierData={tierData}
            funnelDepth={funnelDepth}
            recommendedTier={recommendedTier}
            onRecommendTier={() => {}}
            reps={customer?.reps ?? null}
            annualCostPerRep={customer?.annualCostPerRep ?? null}
            multiples={{
              grow: titanx?.multipleGrow ?? null,
              accelerate: titanx?.multipleAccelerate ?? null,
              scale: titanx?.multipleScale ?? null,
            }}
          />
        ) : (
          <div className="glass rounded-xl p-16 text-center text-muted-foreground/60">
            Unable to compute results for this session.
          </div>
        )}
      </div>
    </div>
  );
}
