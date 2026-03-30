import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import titanxLogo from '@/assets/titanx-logo.svg';
import { fCurrency } from '@/lib/formatters';

interface SessionRow {
  id: string;
  session_date: string;
  submitted_by_name: string;
  account_name: string;
  sf_user_name: string;
  inp_reps: number;
  inp_connect_rate: number;
  inp_acv: number;
  funnel_depth: string;
  recommended_tier: string | null;
  out_grow_cost_annual: number | null;
  out_grow_annual_pipeline: number | null;
  out_acc_cost_annual: number | null;
  out_acc_annual_pipeline: number | null;
  out_scale_cost_annual: number | null;
  out_scale_annual_pipeline: number | null;
  created_at: string;
}

export default function AdminPanel() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/login'); return; }

      const { data: userRow } = await supabase
        .from('app_users')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (!userRow || userRow.role !== 'admin') { navigate('/'); return; }

      const { data } = await supabase
        .from('admin_sessions_view')
        .select('*')
        .order('created_at', { ascending: false });

      setSessions(data ?? []);
      setLoading(false);
    })();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="glass-strong sticky top-0 z-50 p-2.5 flex items-center justify-between">
        <img src={titanxLogo} alt="TitanX" className="h-[26px]" />
        <h1 className="text-base font-semibold text-foreground/80 tracking-wide">Admin Panel</h1>
        <Button variant="outline" size="sm" onClick={handleSignOut} className="glass-subtle border-none text-foreground/80 hover:text-foreground transition-all duration-300">
          Sign Out
        </Button>
      </header>

      <div className="p-6 overflow-x-auto">
        <div className="rounded-xl overflow-hidden border border-border/30 min-w-[1400px]">
          {/* Header */}
          <div className="grid" style={{ gridTemplateColumns: '100px 140px 160px 140px 60px 80px 90px 100px 100px 110px 110px 110px 110px 110px 110px' }}>
            {['Date', 'Submitted By', 'Account', 'SF User', 'Reps', 'Connect %', 'ACV', 'Funnel', 'Tier', 'Grow Cost', 'Grow Pipeline', 'Acc Cost', 'Acc Pipeline', 'Scale Cost', 'Scale Pipeline'].map(h => (
              <div key={h} style={{ background: '#1A1A1A' }} className="px-3 py-3 text-[10px] uppercase tracking-[0.12em] font-bold text-muted-foreground">{h}</div>
            ))}
          </div>
          {/* Rows */}
          {sessions.map((s, i) => {
            const bg = i % 2 === 0 ? '#1A1A1A' : '#2A2A2A';
            const cellClass = "px-3 py-2.5 text-xs text-foreground/80 truncate";
            return (
              <div key={s.id || i} className="grid" style={{ gridTemplateColumns: '100px 140px 160px 140px 60px 80px 90px 100px 100px 110px 110px 110px 110px 110px 110px' }}>
                <div style={{ background: bg }} className={cellClass}>{s.session_date}</div>
                <div style={{ background: bg }} className={cellClass}>{s.submitted_by_name}</div>
                <div style={{ background: bg }} className={cellClass}>{s.account_name}</div>
                <div style={{ background: bg }} className={cellClass}>{s.sf_user_name}</div>
                <div style={{ background: bg }} className={cellClass}>{s.inp_reps}</div>
                <div style={{ background: bg }} className={cellClass}>{s.inp_connect_rate}%</div>
                <div style={{ background: bg }} className={cellClass}>{fCurrency(s.inp_acv)}</div>
                <div style={{ background: bg }} className={cellClass}>{s.funnel_depth}</div>
                <div style={{ background: bg }} className={cellClass}>
                  {s.recommended_tier && (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(255,0,76,0.2)', color: '#FF004C' }}>
                      {s.recommended_tier}
                    </span>
                  )}
                </div>
                <div style={{ background: bg }} className={cellClass}>{s.out_grow_cost_annual != null ? fCurrency(s.out_grow_cost_annual) : '—'}</div>
                <div style={{ background: bg }} className={cellClass}>{s.out_grow_annual_pipeline != null ? fCurrency(s.out_grow_annual_pipeline) : '—'}</div>
                <div style={{ background: bg }} className={cellClass}>{s.out_acc_cost_annual != null ? fCurrency(s.out_acc_cost_annual) : '—'}</div>
                <div style={{ background: bg }} className={cellClass}>{s.out_acc_annual_pipeline != null ? fCurrency(s.out_acc_annual_pipeline) : '—'}</div>
                <div style={{ background: bg }} className={cellClass}>{s.out_scale_cost_annual != null ? fCurrency(s.out_scale_cost_annual) : '—'}</div>
                <div style={{ background: bg }} className={cellClass}>{s.out_scale_annual_pipeline != null ? fCurrency(s.out_scale_annual_pipeline) : '—'}</div>
              </div>
            );
          })}
          {sessions.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground/50">No sessions found.</div>
          )}
        </div>
      </div>
    </div>
  );
}
