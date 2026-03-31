import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useTheme } from 'next-themes';
import bgDark from '@/assets/bg-dark.png';
import bgLight from '@/assets/bg-light.png';
import CalculatorResultsView from '@/components/CalculatorResults';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import AccountSelector from '@/components/AccountSelector';
import UserSelector from '@/components/UserSelector';
import NumericInput from '@/components/NumericInput';
import titanxLogo from '@/assets/titanx-logo.svg';
import { fCurrency, fPercent } from '@/lib/formatters';
import { calculate, type CustomerInputs, type TitanXInputs, type FunnelDepth } from '@/lib/calculations';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Search, Trash2, Pencil, X, CalendarIcon, Save, Star, ChevronDown, ChevronRight, Calculator, ExternalLink } from 'lucide-react';

/* ───── Types ───── */

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
  model?: string;
  out_grow_cost_annual: number | null;
  out_grow_annual_pipeline: number | null;
  out_acc_cost_annual: number | null;
  out_acc_annual_pipeline: number | null;
  out_scale_cost_annual: number | null;
  out_scale_annual_pipeline: number | null;
  created_at: string;
  // Edit / detail fields
  sf_account_id?: string;
  sf_user_id?: string;
  inp_annual_cost_per_rep?: number;
  inp_dials_per_day?: number;
  inp_conversation_rate?: number;
  inp_meeting_rate?: number;
  inp_meeting_show_rate?: number;
  inp_opp_qualification_rate?: number;
  inp_win_rate?: number;
  // TitanX inputs
  inp_high_intent?: number;
  inp_high_intent_reach?: number;
  inp_avg_phones?: number;
  inp_titanx_connect_rate?: number;
  inp_credit_price_grow?: number;
  inp_credit_price_accelerate?: number;
  inp_credit_price_scale?: number;
  inp_multiple_grow?: number;
  inp_multiple_accelerate?: number;
  inp_multiple_scale?: number;
  // Current state outputs
  out_cs_monthly_dials?: number | null;
  out_cs_monthly_connects?: number | null;
  out_cs_monthly_conversations?: number | null;
  out_cs_monthly_meetings?: number | null;
  out_cs_annual_meetings?: number | null;
  out_cs_annual_cost_reps?: number | null;
  out_cs_cost_per_connect?: number | null;
  out_cs_cost_per_meeting?: number | null;
  out_cs_annual_pipeline?: number | null;
  out_cs_annual_revenue?: number | null;
  // Tier outputs
  out_grow_monthly_dials?: number | null;
  out_grow_monthly_connects?: number | null;
  out_grow_monthly_meetings?: number | null;
  out_grow_cost_monthly?: number | null;
  out_grow_cost_per_connect?: number | null;
  out_grow_cost_per_meeting?: number | null;
  out_grow_annual_revenue?: number | null;
  out_grow_rep_production_equiv?: number | null;
  out_acc_monthly_dials?: number | null;
  out_acc_monthly_connects?: number | null;
  out_acc_monthly_meetings?: number | null;
  out_acc_cost_monthly?: number | null;
  out_acc_cost_per_connect?: number | null;
  out_acc_cost_per_meeting?: number | null;
  out_acc_annual_revenue?: number | null;
  out_acc_rep_production_equiv?: number | null;
  out_scale_monthly_dials?: number | null;
  out_scale_monthly_connects?: number | null;
  out_scale_monthly_meetings?: number | null;
  out_scale_cost_monthly?: number | null;
  out_scale_cost_per_connect?: number | null;
  out_scale_cost_per_meeting?: number | null;
  out_scale_annual_revenue?: number | null;
  out_scale_rep_production_equiv?: number | null;
}

const FUNNEL_LABELS: Record<string, string> = {
  meetings_set: 'Meetings Set',
  meetings_held: 'Meetings Held',
  opps: 'Qualified Opps',
  closed_won: 'Closed Won',
};

const FUNNEL_DEPTHS: { value: FunnelDepth; label: string }[] = [
  { value: 'meetings_set', label: 'Meetings Set' },
  { value: 'meetings_held', label: 'Meetings Held' },
  { value: 'opps', label: 'Qualified Opps' },
  { value: 'closed_won', label: 'Closed Won' },
];

function depthAtLeast(current: FunnelDepth, target: FunnelDepth): boolean {
  const order: FunnelDepth[] = ['meetings_set', 'meetings_held', 'opps', 'closed_won'];
  return order.indexOf(current) >= order.indexOf(target);
}

/* ───── Admin Panel ───── */

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<'all' | 'byAccount' | 'newSession'>('all');
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId] = useState('');
  const navigate = useNavigate();
  const { theme } = useTheme();

  // Shared state for Tab 2 → Tab 3 pre-fill
  const [prefilledAccountId, setPrefilledAccountId] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/login'); return; }

      setUserEmail(session.user.email ?? '');
      setUserId(session.user.id);

      const { data: userRow } = await supabase
        .from('app_users')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (!userRow || userRow.role !== 'admin') { navigate('/'); return; }
      await fetchSessions();
      setLoading(false);
    })();
  }, [navigate]);

  const fetchSessions = async () => {
    const { data } = await supabase
      .from('admin_sessions_view')
      .select('*')
      .order('created_at', { ascending: false });
    setSessions(data ?? []);
  };

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

  const tabs = [
    { key: 'all' as const, label: 'All Submissions' },
    { key: 'byAccount' as const, label: 'By Account' },
    { key: 'newSession' as const, label: 'New Session' },
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background image */}
      <div className="fixed inset-0 pointer-events-none">
        <img src={theme === 'light' ? bgLight : bgDark} alt="" className="w-full h-full object-cover" />
      </div>
      {/* Header */}
      <header className="glass-strong sticky top-0 z-50 p-2.5 flex items-center justify-between">
        <img src={titanxLogo} alt="TitanX" className="h-[26px]" />
        <h1 className="text-base font-semibold text-foreground/80 tracking-wide">Admin Panel</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground hidden sm:inline">{userEmail}</span>
          <button onClick={() => window.open('/', '_blank')} className="p-2 rounded-lg glass-subtle border-none text-foreground/60 hover:text-foreground transition-all duration-300" aria-label="Open Calculator">
            <Calculator className="h-4 w-4" />
          </button>
          <Button variant="outline" size="sm" onClick={handleSignOut} className="glass-subtle border-none text-foreground/80 hover:text-foreground transition-all duration-300">
            Sign Out
          </Button>
        </div>
      </header>

      {/* Tabs */}
      <div className="relative z-10 flex border-b border-border/30 px-6">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={cn(
              "px-5 py-3 text-sm font-semibold uppercase tracking-wider transition-all duration-300 border-b-2 -mb-[1px]",
              activeTab === t.key
                ? "text-primary border-primary"
                : "text-muted-foreground border-transparent hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="relative z-10 p-6">
        {activeTab === 'all' && (
          <AllSubmissionsTab
            sessions={sessions}
            onRefresh={fetchSessions}
          />
        )}
        {activeTab === 'byAccount' && (
          <ByAccountTab
            onCreateSession={(accountId) => {
              setPrefilledAccountId(accountId);
              setActiveTab('newSession');
            }}
          />
        )}
        {activeTab === 'newSession' && (
          <NewSessionTab
            userId={userId}
            prefilledAccountId={prefilledAccountId}
            onSaved={(accountId) => {
              setPrefilledAccountId(accountId);
              setActiveTab('byAccount');
            }}
          />
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   TAB 1 — ALL SUBMISSIONS
   ═══════════════════════════════════════════════════════ */

function AdminFilterDropdown({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = options.find(o => o.value === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} className="relative min-w-[160px]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="glass-subtle border-none h-9 w-full flex items-center gap-2 px-3 rounded-md text-sm transition-all duration-300 hover:ring-1 hover:ring-primary/40 text-left"
      >
        <span className="text-foreground truncate">{selected?.label ?? label}</span>
        {value && value !== 'all' && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange('all'); }}
            className="ml-auto flex-shrink-0 p-0.5 rounded-full text-muted-foreground/40 hover:text-foreground transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        )}
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground/50 ${value && value !== 'all' ? '' : 'ml-auto'} flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-[100] rounded-lg overflow-hidden border border-border/50 shadow-2xl animate-fade-in bg-background backdrop-blur-3xl" style={{ WebkitBackdropFilter: 'blur(60px)', backdropFilter: 'blur(60px)' }}>
          <div className="max-h-[240px] overflow-y-auto py-1">
            {options.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`w-full flex items-center px-3 py-2 text-left text-sm transition-colors duration-150 hover:bg-primary/10 ${value === opt.value ? 'bg-primary/10 text-foreground' : 'text-foreground/80'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AdminAccountFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [accounts, setAccounts] = useState<{ id: string; name: string; domain: string | null }[]>([]);
  const [selectedName, setSelectedName] = useState('');
  const [fetching, setFetching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchAccounts = useCallback(async (q: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setFetching(true);
    const { data } = await supabase.from('sf_accounts').select('id, name, domain').ilike('name', `%${q}%`).order('name').limit(50);
    setAccounts(data ?? []);
    setFetching(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchAccounts(search), 200);
    return () => clearTimeout(debounceRef.current);
  }, [search, open, fetchAccounts]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) { setOpen(false); setSearch(''); }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { if (open && inputRef.current) inputRef.current.focus(); }, [open]);

  return (
    <div ref={containerRef} className="relative min-w-[200px]">
      <button
        type="button"
        onClick={() => { setOpen(!open); setSearch(''); if (!open) fetchAccounts(''); }}
        className="glass-subtle border-none h-9 w-full flex items-center gap-2 px-3 rounded-md text-sm transition-all duration-300 hover:ring-1 hover:ring-primary/40 text-left"
      >
        <span className={selectedName ? 'text-foreground truncate' : 'text-muted-foreground/40'}>{selectedName || 'All Accounts'}</span>
        {selectedName && (
          <button type="button" onClick={(e) => { e.stopPropagation(); onChange(''); setSelectedName(''); }} className="ml-auto flex-shrink-0 p-0.5 rounded-full text-muted-foreground/40 hover:text-foreground transition-colors">
            <X className="h-3 w-3" />
          </button>
        )}
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground/50 ${selectedName ? '' : 'ml-auto'} flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-[100] rounded-lg overflow-hidden border border-border/50 shadow-2xl animate-fade-in bg-background backdrop-blur-3xl" style={{ WebkitBackdropFilter: 'blur(60px)', backdropFilter: 'blur(60px)' }}>
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border/30">
            <Search className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />
            <input ref={inputRef} type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search accounts…" className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 outline-none w-full" />
          </div>
          <div className={`max-h-[240px] overflow-y-auto py-1 transition-opacity ${fetching ? 'opacity-50' : ''}`}>
            <button type="button" onClick={() => { onChange(''); setSelectedName(''); setOpen(false); }} className={`w-full flex items-center px-3 py-2 text-left text-sm transition-colors duration-150 hover:bg-primary/10 ${!value ? 'bg-primary/10' : ''}`}>
              All Accounts
            </button>
            {accounts.map(a => (
              <button key={a.id} type="button" onClick={() => { onChange(a.name); setSelectedName(a.name); setOpen(false); setSearch(''); }} className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors duration-150 hover:bg-primary/10 ${value === a.name ? 'bg-primary/10' : ''}`}>
                <div className="flex flex-col min-w-0 leading-tight">
                  <span className="text-sm text-foreground truncate">{a.name}</span>
                  <span className="text-[10px] text-muted-foreground/50 truncate">{a.domain}</span>
                </div>
              </button>
            ))}
            {accounts.length === 0 && <div className="px-3 py-4 text-center text-xs text-muted-foreground/50">{fetching ? 'Loading…' : 'No accounts found'}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function AdminUserFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<{ id: string; name: string; email: string | null }[]>([]);
  const [selectedName, setSelectedName] = useState('');
  const [fetching, setFetching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchUsers = useCallback(async (q: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setFetching(true);
    const { data } = await supabase.from('sf_users').select('id, name, email').ilike('name', `%${q}%`).order('name').limit(50);
    setUsers(data ?? []);
    setFetching(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchUsers(search), 200);
    return () => clearTimeout(debounceRef.current);
  }, [search, open, fetchUsers]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) { setOpen(false); setSearch(''); }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { if (open && inputRef.current) inputRef.current.focus(); }, [open]);

  return (
    <div ref={containerRef} className="relative min-w-[200px]">
      <button
        type="button"
        onClick={() => { setOpen(!open); setSearch(''); if (!open) fetchUsers(''); }}
        className="glass-subtle border-none h-9 w-full flex items-center gap-2 px-3 rounded-md text-sm transition-all duration-300 hover:ring-1 hover:ring-primary/40 text-left"
      >
        <span className={selectedName ? 'text-foreground truncate' : 'text-muted-foreground/40'}>{selectedName || 'All Users'}</span>
        {selectedName && (
          <button type="button" onClick={(e) => { e.stopPropagation(); onChange(''); setSelectedName(''); }} className="ml-auto flex-shrink-0 p-0.5 rounded-full text-muted-foreground/40 hover:text-foreground transition-colors">
            <X className="h-3 w-3" />
          </button>
        )}
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground/50 ${selectedName ? '' : 'ml-auto'} flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-[100] rounded-lg overflow-hidden border border-border/50 shadow-2xl animate-fade-in bg-background backdrop-blur-3xl" style={{ WebkitBackdropFilter: 'blur(60px)', backdropFilter: 'blur(60px)' }}>
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border/30">
            <Search className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />
            <input ref={inputRef} type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users…" className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 outline-none w-full" />
          </div>
          <div className={`max-h-[240px] overflow-y-auto py-1 transition-opacity ${fetching ? 'opacity-50' : ''}`}>
            <button type="button" onClick={() => { onChange(''); setSelectedName(''); setOpen(false); }} className={`w-full flex items-center px-3 py-2 text-left text-sm transition-colors duration-150 hover:bg-primary/10 ${!value ? 'bg-primary/10' : ''}`}>
              All Users
            </button>
            {users.map(u => (
              <button key={u.id} type="button" onClick={() => { onChange(u.name); setSelectedName(u.name); setOpen(false); setSearch(''); }} className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors duration-150 hover:bg-primary/10 ${value === u.name ? 'bg-primary/10' : ''}`}>
                <div className="flex flex-col min-w-0 leading-tight">
                  <span className="text-sm text-foreground truncate">{u.name}</span>
                  <span className="text-[10px] text-muted-foreground/50 truncate">{u.email}</span>
                </div>
              </button>
            ))}
            {users.length === 0 && <div className="px-3 py-4 text-center text-xs text-muted-foreground/50">{fetching ? 'Loading…' : 'No users found'}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

const DATE_OPTIONS = [
  { value: 'all', label: 'All Dates' },
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_30', label: 'Last 30 Days' },
  { value: 'last_90', label: 'Last 90 Days' },
];

function AllSubmissionsTab({ sessions, onRefresh }: { sessions: SessionRow[]; onRefresh: () => Promise<void> }) {
  const [filterAccount, setFilterAccount] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterDate, setFilterDate] = useState('all');
  const [editingSession, setEditingSession] = useState<SessionRow | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = [...sessions];

    if (filterAccount) {
      const q = filterAccount.toLowerCase();
      list = list.filter(s => s.account_name?.toLowerCase().includes(q));
    }

    if (filterUser) {
      const q = filterUser.toLowerCase();
      list = list.filter(s => s.sf_user_name?.toLowerCase().includes(q));
    }

    if (filterDate !== 'all') {
      const now = new Date();
      let cutoff: Date;
      switch (filterDate) {
        case 'today':
          cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'this_week': {
          const day = now.getDay();
          cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
          break;
        }
        case 'this_month':
          cutoff = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'last_30':
          cutoff = new Date(now.getTime() - 30 * 86400000);
          break;
        case 'last_90':
          cutoff = new Date(now.getTime() - 90 * 86400000);
          break;
        default:
          cutoff = new Date(0);
      }
      list = list.filter(s => new Date(s.created_at) >= cutoff);
    }

    // Default sort: newest first
    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return list;
  }, [sessions, filterAccount, filterUser, filterDate]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('calculator_sessions').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete', { description: error.message });
    } else {
      toast.success('Session deleted.');
      setDeleteConfirmId(null);
      await onRefresh();
    }
  };

  return (
    <>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <AdminAccountFilter value={filterAccount} onChange={setFilterAccount} />
        <AdminUserFilter value={filterUser} onChange={setFilterUser} />
        <AdminFilterDropdown label="All Dates" value={filterDate} options={DATE_OPTIONS} onChange={setFilterDate} />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <div className="rounded-xl overflow-hidden border border-border/30 min-w-[1600px]">
          <div className="grid" style={{ gridTemplateColumns: '90px 130px 150px 130px 55px 75px 85px 105px 90px 100px 100px 100px 100px 100px 100px 110px' }}>
            {['Date', 'Submitted By', 'Account', 'SF User', 'Reps', 'Connect %', 'ACV', 'Funnel', 'Tier', 'Grow Cost', 'Grow Pipe', 'Acc Cost', 'Acc Pipe', 'Scale Cost', 'Scale Pipe', 'Actions'].map(h => (
              <div key={h} style={{ background: '#1A1A1A' }} className="px-3 py-3 text-[10px] uppercase tracking-[0.12em] font-bold text-muted-foreground">{h}</div>
            ))}
          </div>
          {filtered.map((s, i) => {
            const bg = i % 2 === 0 ? '#1A1A1A' : '#2A2A2A';
            const cell = "px-3 py-2.5 text-xs text-foreground/80 truncate";
            return (
              <div key={s.id || i} className="grid" style={{ gridTemplateColumns: '90px 130px 150px 130px 55px 75px 85px 105px 90px 100px 100px 100px 100px 100px 100px 110px' }}>
                <div style={{ background: bg }} className={cell}>{s.session_date}</div>
                <div style={{ background: bg }} className={cell}>{s.submitted_by_name}</div>
                <div style={{ background: bg }} className={cell}>{s.account_name}</div>
                <div style={{ background: bg }} className={cell}>{s.sf_user_name}</div>
                <div style={{ background: bg }} className={cell}>{s.inp_reps}</div>
                <div style={{ background: bg }} className={cell}>{s.inp_connect_rate}%</div>
                <div style={{ background: bg }} className={cell}>{fCurrency(s.inp_acv)}</div>
                <div style={{ background: bg }} className={cell}>{FUNNEL_LABELS[s.funnel_depth] ?? s.funnel_depth}</div>
                <div style={{ background: bg }} className={cell}>
                  {s.recommended_tier && (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(255,0,76,0.2)', color: '#FF004C' }}>
                      {s.recommended_tier}
                    </span>
                  )}
                </div>
                <div style={{ background: bg }} className={cell}>{s.out_grow_cost_annual != null ? fCurrency(s.out_grow_cost_annual) : '—'}</div>
                <div style={{ background: bg }} className={cell}>{s.out_grow_annual_pipeline != null ? fCurrency(s.out_grow_annual_pipeline) : '—'}</div>
                <div style={{ background: bg }} className={cell}>{s.out_acc_cost_annual != null ? fCurrency(s.out_acc_cost_annual) : '—'}</div>
                <div style={{ background: bg }} className={cell}>{s.out_acc_annual_pipeline != null ? fCurrency(s.out_acc_annual_pipeline) : '—'}</div>
                <div style={{ background: bg }} className={cell}>{s.out_scale_cost_annual != null ? fCurrency(s.out_scale_cost_annual) : '—'}</div>
                <div style={{ background: bg }} className={cell}>{s.out_scale_annual_pipeline != null ? fCurrency(s.out_scale_annual_pipeline) : '—'}</div>
                <div style={{ background: bg }} className={cn(cell, "flex items-center gap-1")}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button onClick={() => window.open(`/?session=${s.id}`, '_blank')} className="p-1 rounded hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Present to Client</TooltipContent>
                  </Tooltip>
                  <button onClick={() => setEditingSession(s)} className="p-1 rounded hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setDeleteConfirmId(s.id)} className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground/50">No sessions found.</div>
          )}
        </div>
      </div>

      {/* Delete Confirmation */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setDeleteConfirmId(null)}>
          <div className="glass-strong rounded-xl p-6 max-w-sm w-full space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-foreground">Delete this session?</h3>
            <p className="text-sm text-muted-foreground">This cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" size="sm" onClick={() => setDeleteConfirmId(null)} className="glass-subtle border-none">Cancel</Button>
              <Button size="sm" onClick={() => handleDelete(deleteConfirmId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingSession && (
        <EditModal
          session={editingSession}
          onClose={() => setEditingSession(null)}
          onSaved={async () => { setEditingSession(null); await onRefresh(); }}
        />
      )}
    </>
  );
}

/* ───── Edit Modal ───── */

function EditModal({ session, onClose, onSaved }: { session: SessionRow; onClose: () => void; onSaved: () => void }) {
  const [sessionDate, setSessionDate] = useState<Date>(new Date(session.session_date + 'T12:00:00'));
  const [accountId, setAccountId] = useState(session.sf_account_id ?? '');
  const [sfUserId, setSfUserId] = useState(session.sf_user_id ?? '');
  const [recommendedTier, setRecommendedTier] = useState(session.recommended_tier ?? '');
  const [funnelDepth, setFunnelDepth] = useState<FunnelDepth>((session.funnel_depth as FunnelDepth) ?? 'meetings_set');
  const [reps, setReps] = useState<number | null>(session.inp_reps ?? null);
  const [annualCostPerRep, setAnnualCostPerRep] = useState<number | null>(session.inp_annual_cost_per_rep ?? null);
  const [dialsPerDay, setDialsPerDay] = useState<number | null>(session.inp_dials_per_day ?? null);
  const [connectRate, setConnectRate] = useState<number | null>(session.inp_connect_rate ?? null);
  const [conversationRate, setConversationRate] = useState<number | null>(session.inp_conversation_rate ?? null);
  const [meetingRate, setMeetingRate] = useState<number | null>(session.inp_meeting_rate ?? null);
  const [meetingShowRate, setMeetingShowRate] = useState<number | null>(session.inp_meeting_show_rate ?? null);
  const [oppQualRate, setOppQualRate] = useState<number | null>(session.inp_opp_qualification_rate ?? null);
  const [winRate, setWinRate] = useState<number | null>(session.inp_win_rate ?? null);
  const [acv, setAcv] = useState<number | null>(session.inp_acv ?? null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('calculator_sessions')
      .update({
        session_date: format(sessionDate, 'yyyy-MM-dd'),
        sf_account_id: accountId || null,
        sf_user_id: sfUserId || null,
        recommended_tier: recommendedTier || null,
        funnel_depth: funnelDepth,
        inp_reps: reps,
        inp_annual_cost_per_rep: annualCostPerRep,
        inp_dials_per_day: dialsPerDay,
        inp_connect_rate: connectRate,
        inp_conversation_rate: conversationRate,
        inp_meeting_rate: meetingRate,
        inp_meeting_show_rate: meetingShowRate,
        inp_opp_qualification_rate: oppQualRate,
        inp_win_rate: winRate,
        inp_acv: acv,
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.id);

    setSaving(false);
    if (error) {
      toast.error('Failed to save', { description: error.message });
    } else {
      toast.success('Session updated.');
      onSaved();
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-strong rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-foreground">Edit Session</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-muted transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Date */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">Session Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("glass-subtle border-none h-9 w-full justify-start text-sm font-normal")}>
                  <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground/70" />
                  {format(sessionDate, 'PPP')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 glass-strong border-none z-[300]" align="start">
                <Calendar mode="single" selected={sessionDate} onSelect={(d) => d && setSessionDate(d)} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>

          {/* Tier */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">Recommended Tier</label>
            <select
              value={recommendedTier}
              onChange={e => setRecommendedTier(e.target.value)}
              className="glass-subtle border-none h-9 w-full px-3 rounded-md text-sm text-foreground bg-transparent"
            >
              <option value="">None</option>
              <option value="grow">Grow</option>
              <option value="accelerate">Accelerate</option>
              <option value="scale">Scale</option>
            </select>
          </div>

          {/* Account */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">Account</label>
            <AccountSelector value={accountId} onChange={setAccountId} />
          </div>

          {/* SF User */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">SF User</label>
            <UserSelector value={sfUserId} onChange={setSfUserId} />
          </div>
        </div>

        {/* Funnel Depth */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">Funnel Depth</label>
          <div className="flex rounded-lg overflow-hidden border border-border/30">
            {FUNNEL_DEPTHS.map(d => (
              <button
                key={d.value}
                onClick={() => setFunnelDepth(d.value)}
                className={cn(
                  "flex-1 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider transition-all duration-300",
                  funnelDepth === d.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input Fields */}
        <div className="grid grid-cols-2 gap-4">
          <NumericInput label="Reps" value={reps} onChange={setReps} />
          <NumericInput label="Annual Cost Per Rep" value={annualCostPerRep} onChange={setAnnualCostPerRep} prefix="$" commas />
          <NumericInput label="Dials / Day / Rep" value={dialsPerDay} onChange={setDialsPerDay} />
          <NumericInput label="Connect Rate" value={connectRate} onChange={setConnectRate} suffix="%" />
          <NumericInput label="Conversation Rate" value={conversationRate} onChange={setConversationRate} suffix="%" />
          <NumericInput label="Meeting Rate" value={meetingRate} onChange={setMeetingRate} suffix="%" />
          {depthAtLeast(funnelDepth, 'meetings_held') && (
            <NumericInput label="Meeting Show Rate" value={meetingShowRate} onChange={setMeetingShowRate} suffix="%" />
          )}
          {depthAtLeast(funnelDepth, 'opps') && (
            <NumericInput label="Opp Qualification Rate" value={oppQualRate} onChange={setOppQualRate} suffix="%" />
          )}
          {funnelDepth === 'closed_won' && (
            <NumericInput label="Win Rate" value={winRate} onChange={setWinRate} suffix="%" />
          )}
          {depthAtLeast(funnelDepth, 'opps') && (
            <NumericInput label="ACV" value={acv} onChange={setAcv} prefix="$" commas />
          )}
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <Button variant="outline" size="sm" onClick={onClose} className="glass-subtle border-none">Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="bg-primary/90 text-primary-foreground hover:bg-primary">
            <Save className="h-3.5 w-3.5 mr-1.5" /> {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   TAB 2 — BY ACCOUNT
   ═══════════════════════════════════════════════════════ */

interface Account {
  id: string;
  name: string;
  domain: string | null;
}

function ByAccountTab({ onCreateSession }: { onCreateSession: (accountId: string) => void }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountSearch, setAccountSearch] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [editingSession, setEditingSession] = useState<SessionRow | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from('sf_accounts')
        .select('id, name, domain')
        .order('name');
      setAccounts(data ?? []);
    })();
  }, []);

  const filteredAccounts = useMemo(() => {
    if (!accountSearch) return accounts;
    const q = accountSearch.toLowerCase();
    return accounts.filter(a => a.name.toLowerCase().includes(q) || a.domain?.toLowerCase().includes(q));
  }, [accounts, accountSearch]);

  const loadSessions = async (account: Account) => {
    setSelectedAccount(account);
    setLoadingSessions(true);
    const { data } = await supabase
      .from('admin_sessions_view')
      .select('*')
      .eq('account_name', account.name)
      .order('created_at', { ascending: false });
    setSessions(data ?? []);
    setLoadingSessions(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('calculator_sessions').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete', { description: error.message });
    } else {
      toast.success('Session deleted.');
      setDeleteConfirmId(null);
      if (selectedAccount) loadSessions(selectedAccount);
    }
  };

  return (
    <div className="grid grid-cols-[320px_1fr] gap-6 min-h-[600px]">
      {/* Left — Account List */}
      <div className="glass rounded-xl overflow-hidden flex flex-col">
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border/30">
          <Search className="h-3.5 w-3.5 text-muted-foreground/50" />
          <input
            type="text"
            value={accountSearch}
            onChange={e => setAccountSearch(e.target.value)}
            placeholder="Search accounts…"
            className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 outline-none w-full"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredAccounts.map(a => (
            <button
              key={a.id}
              onClick={() => loadSessions(a)}
              className={cn(
                "w-full text-left px-4 py-3 border-b border-border/20 transition-colors hover:bg-primary/10",
                selectedAccount?.id === a.id ? "bg-primary/10" : ""
              )}
            >
              <div className="text-sm text-foreground truncate">{a.name}</div>
              <div className="text-[10px] text-muted-foreground/50 truncate">{a.domain}</div>
            </button>
          ))}
          {filteredAccounts.length === 0 && (
            <div className="px-4 py-8 text-center text-xs text-muted-foreground/50">No accounts found</div>
          )}
        </div>
      </div>

      {/* Right — Sessions */}
      <div>
        {!selectedAccount ? (
          <div className="glass rounded-xl p-16 text-center text-muted-foreground/60">
            <div className="text-3xl mb-3 opacity-30">📋</div>
            Select an account to view sessions.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary Card */}
            <div className="glass rounded-xl p-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-foreground">{selectedAccount.name}</h3>
                <p className="text-xs text-muted-foreground">{selectedAccount.domain} · {sessions.length} session{sessions.length !== 1 ? 's' : ''}</p>
              </div>
              <Button
                onClick={() => onCreateSession(selectedAccount.id)}
                className="bg-primary/90 text-primary-foreground hover:bg-primary"
              >
                Create New Session
              </Button>
            </div>

            {/* Session Cards */}
            {loadingSessions ? (
              <div className="flex justify-center py-12">
                <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="glass rounded-xl p-8 text-center text-sm text-muted-foreground/50">No sessions for this account.</div>
            ) : (
              sessions.map(s => (
                <div key={s.id} className="glass rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-foreground">{s.session_date}</span>
                      <span className="text-xs text-muted-foreground">by {s.submitted_by_name}</span>
                      {s.recommended_tier && (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(255,0,76,0.2)', color: '#FF004C' }}>
                          {s.recommended_tier}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditingSession(s)} className="p-1.5 rounded hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setDeleteConfirmId(s.id)} className="p-1.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <SessionMetricCard label="SF User" value={s.sf_user_name ?? '—'} />
                    <SessionMetricCard label="Reps" value={String(s.inp_reps ?? '—')} />
                    <SessionMetricCard label="Connect Rate" value={`${s.inp_connect_rate ?? '—'}%`} />
                    <SessionMetricCard label="Funnel" value={FUNNEL_LABELS[s.funnel_depth] ?? s.funnel_depth} />
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-2 border-t border-border/20">
                    <div className="text-center">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Grow</div>
                      <div className="text-xs text-foreground">{s.out_grow_cost_annual != null ? fCurrency(s.out_grow_cost_annual) : '—'} cost</div>
                      <div className="text-xs text-primary">{s.out_grow_annual_pipeline != null ? fCurrency(s.out_grow_annual_pipeline) : '—'} pipeline</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Accelerate</div>
                      <div className="text-xs text-foreground">{s.out_acc_cost_annual != null ? fCurrency(s.out_acc_cost_annual) : '—'} cost</div>
                      <div className="text-xs text-primary">{s.out_acc_annual_pipeline != null ? fCurrency(s.out_acc_annual_pipeline) : '—'} pipeline</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Scale</div>
                      <div className="text-xs text-foreground">{s.out_scale_cost_annual != null ? fCurrency(s.out_scale_cost_annual) : '—'} cost</div>
                      <div className="text-xs text-primary">{s.out_scale_annual_pipeline != null ? fCurrency(s.out_scale_annual_pipeline) : '—'} pipeline</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setDeleteConfirmId(null)}>
          <div className="glass-strong rounded-xl p-6 max-w-sm w-full space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-foreground">Delete this session?</h3>
            <p className="text-sm text-muted-foreground">This cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" size="sm" onClick={() => setDeleteConfirmId(null)} className="glass-subtle border-none">Cancel</Button>
              <Button size="sm" onClick={() => handleDelete(deleteConfirmId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingSession && (
        <EditModal
          session={editingSession}
          onClose={() => setEditingSession(null)}
          onSaved={() => { setEditingSession(null); if (selectedAccount) loadSessions(selectedAccount); }}
        />
      )}
    </div>
  );
}

function SessionMetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-subtle rounded-md px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold text-foreground truncate">{value}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   TAB 3 — NEW SESSION (reuses Calculator logic)
   ═══════════════════════════════════════════════════════ */

function NewSessionTab({ userId, prefilledAccountId, onSaved }: { userId: string; prefilledAccountId: string; onSaved: (accountId: string) => void }) {
  const [selectedAccountId, setSelectedAccountId] = useState(prefilledAccountId);
  const [selectedSfUserId, setSelectedSfUserId] = useState('');
  const [sessionDate, setSessionDate] = useState<Date>(new Date());
  const [model, setModel] = useState<string>('blended');
  const [recommendedTier, setRecommendedTier] = useState<string | null>(null);
  const [funnelDepth, setFunnelDepth] = useState<FunnelDepth>('meetings_set');

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

  const handleSave = async () => {
    if (!results || !tierData) { toast.error('Complete all inputs first'); return; }

    const td = tierData;
    const { error } = await supabase.from('calculator_sessions').insert({
      app_user_id: userId,
      sf_account_id: selectedAccountId || null,
      sf_user_id: selectedSfUserId || null,
      session_date: format(sessionDate, 'yyyy-MM-dd'),
      model,
      funnel_depth: funnelDepth,
      recommended_tier: recommendedTier || null,

      inp_reps: customer.reps,
      inp_annual_cost_per_rep: customer.annualCostPerRep,
      inp_dials_per_day: customer.dialsPerDay,
      inp_connect_rate: customer.connectRate,
      inp_conversation_rate: customer.conversationRate,
      inp_meeting_rate: customer.meetingRate,
      inp_meeting_show_rate: customer.meetingShowRate,
      inp_opp_qualification_rate: customer.oppQualificationRate,
      inp_win_rate: customer.winRate,
      inp_acv: customer.acv,

      inp_high_intent: titanx.highIntent,
      inp_high_intent_reach: titanx.highIntentReach,
      inp_avg_phones: titanx.avgPhones,
      inp_titanx_connect_rate: titanx.titanxConnectRate,
      inp_credit_price_grow: titanx.creditPriceGrow,
      inp_credit_price_accelerate: titanx.creditPriceAccelerate,
      inp_credit_price_scale: titanx.creditPriceScale,
      inp_multiple_grow: titanx.multipleGrow,
      inp_multiple_accelerate: titanx.multipleAccelerate,
      inp_multiple_scale: titanx.multipleScale,

      out_cs_monthly_dials: results.currentState.monthlyDials,
      out_cs_monthly_connects: results.currentState.monthlyConnects,
      out_cs_monthly_conversations: results.currentState.monthlyConversations,
      out_cs_monthly_meetings: results.currentState.monthlyMeetings,
      out_cs_annual_meetings: results.currentState.annualMeetings,
      out_cs_annual_cost_reps: results.currentState.annualCostReps,
      out_cs_cost_per_connect: results.currentState.costPerConnect,
      out_cs_cost_per_meeting: results.currentState.costPerMeeting,
      out_cs_monthly_meetings_held: results.currentState.funnel.monthlyMeetingsHeld ?? null,
      out_cs_monthly_opps: results.currentState.funnel.monthlyOpps ?? null,
      out_cs_monthly_closed_won: results.currentState.funnel.monthlyClosedWon ?? null,
      out_cs_annual_pipeline: results.currentState.funnel.annualPipelineGenerated ?? null,
      out_cs_annual_revenue: results.currentState.funnel.annualClosedWonRevenue ?? null,

      out_grow_monthly_dials: td.grow.monthlyDials,
      out_grow_monthly_connects: td.grow.monthlyConnects,
      out_grow_monthly_conversations: td.grow.monthlyConversations,
      out_grow_monthly_meetings: td.grow.monthlyMeetings,
      out_grow_annual_meetings: td.grow.annualMeetings,
      out_grow_credits_per_month: td.grow.creditsPerMonth,
      out_grow_cost_monthly: td.grow.costMonthly,
      out_grow_cost_annual: td.grow.costAnnual,
      out_grow_total_annual_cost: td.grow.totalAnnualCost,
      out_grow_cost_per_connect: td.grow.costPerConnect,
      out_grow_cost_per_meeting: td.grow.costPerMeeting,
      out_grow_rep_production_equiv: td.grow.repProductionEquivalent,
      out_grow_cost_of_equiv_reps: td.grow.costOfEquivReps,
      out_grow_pct_of_current_dials: td.grow.pctOfCurrentDials,
      out_grow_monthly_meetings_held: td.grow.funnel.monthlyMeetingsHeld ?? null,
      out_grow_monthly_opps: td.grow.funnel.monthlyOpps ?? null,
      out_grow_monthly_closed_won: td.grow.funnel.monthlyClosedWon ?? null,
      out_grow_annual_pipeline: td.grow.funnel.annualPipelineGenerated ?? null,
      out_grow_annual_revenue: td.grow.funnel.annualClosedWonRevenue ?? null,

      out_acc_monthly_dials: td.accelerate.monthlyDials,
      out_acc_monthly_connects: td.accelerate.monthlyConnects,
      out_acc_monthly_conversations: td.accelerate.monthlyConversations,
      out_acc_monthly_meetings: td.accelerate.monthlyMeetings,
      out_acc_annual_meetings: td.accelerate.annualMeetings,
      out_acc_credits_per_month: td.accelerate.creditsPerMonth,
      out_acc_cost_monthly: td.accelerate.costMonthly,
      out_acc_cost_annual: td.accelerate.costAnnual,
      out_acc_total_annual_cost: td.accelerate.totalAnnualCost,
      out_acc_cost_per_connect: td.accelerate.costPerConnect,
      out_acc_cost_per_meeting: td.accelerate.costPerMeeting,
      out_acc_rep_production_equiv: td.accelerate.repProductionEquivalent,
      out_acc_cost_of_equiv_reps: td.accelerate.costOfEquivReps,
      out_acc_pct_of_current_dials: td.accelerate.pctOfCurrentDials,
      out_acc_monthly_meetings_held: td.accelerate.funnel.monthlyMeetingsHeld ?? null,
      out_acc_monthly_opps: td.accelerate.funnel.monthlyOpps ?? null,
      out_acc_monthly_closed_won: td.accelerate.funnel.monthlyClosedWon ?? null,
      out_acc_annual_pipeline: td.accelerate.funnel.annualPipelineGenerated ?? null,
      out_acc_annual_revenue: td.accelerate.funnel.annualClosedWonRevenue ?? null,

      out_scale_monthly_dials: td.scale.monthlyDials,
      out_scale_monthly_connects: td.scale.monthlyConnects,
      out_scale_monthly_conversations: td.scale.monthlyConversations,
      out_scale_monthly_meetings: td.scale.monthlyMeetings,
      out_scale_annual_meetings: td.scale.annualMeetings,
      out_scale_credits_per_month: td.scale.creditsPerMonth,
      out_scale_cost_monthly: td.scale.costMonthly,
      out_scale_cost_annual: td.scale.costAnnual,
      out_scale_total_annual_cost: td.scale.totalAnnualCost,
      out_scale_cost_per_connect: td.scale.costPerConnect,
      out_scale_cost_per_meeting: td.scale.costPerMeeting,
      out_scale_rep_production_equiv: td.scale.repProductionEquivalent,
      out_scale_cost_of_equiv_reps: td.scale.costOfEquivReps,
      out_scale_pct_of_current_dials: td.scale.pctOfCurrentDials,
      out_scale_monthly_meetings_held: td.scale.funnel.monthlyMeetingsHeld ?? null,
      out_scale_monthly_opps: td.scale.funnel.monthlyOpps ?? null,
      out_scale_monthly_closed_won: td.scale.funnel.monthlyClosedWon ?? null,
      out_scale_annual_pipeline: td.scale.funnel.annualPipelineGenerated ?? null,
      out_scale_annual_revenue: td.scale.funnel.annualClosedWonRevenue ?? null,
    });

    if (error) {
      toast.error('Failed to save', { description: error.message });
    } else {
      toast.success('Session saved!');
      if (selectedAccountId) {
        onSaved(selectedAccountId);
      }
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-6">
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
              <Button variant="outline" className={cn("glass-subtle border-none h-9 w-full justify-start text-sm font-normal")}>
                <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground/70" />
                {format(sessionDate, 'PPP')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 glass-strong border-none" align="start">
              <Calendar mode="single" selected={sessionDate} onSelect={(d) => d && setSessionDate(d)} initialFocus className="p-3 pointer-events-auto" />
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
          </div>

          {/* Funnel Depth */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">Measure To</label>
            <div className="flex rounded-lg overflow-hidden border border-border/30">
              {FUNNEL_DEPTHS.map(d => (
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
            <NumericInput label="Connect Rate" value={customer.connectRate} onChange={updateCustomer('connectRate')} suffix="%" />
            <NumericInput label="Conversation Rate" value={customer.conversationRate} onChange={updateCustomer('conversationRate')} suffix="%" />
            <NumericInput label="Meeting Rate" value={customer.meetingRate} onChange={updateCustomer('meetingRate')} suffix="%" />
            {depthAtLeast(funnelDepth, 'meetings_held') && (
              <NumericInput label="Meeting Show Rate" value={customer.meetingShowRate} onChange={updateCustomer('meetingShowRate')} suffix="%" />
            )}
            {depthAtLeast(funnelDepth, 'opps') && (
              <NumericInput label="Opp Qualification Rate" value={customer.oppQualificationRate} onChange={updateCustomer('oppQualificationRate')} suffix="%" />
            )}
            {funnelDepth === 'closed_won' && (
              <NumericInput label="Win Rate" value={customer.winRate} onChange={updateCustomer('winRate')} suffix="%" />
            )}
            {depthAtLeast(funnelDepth, 'opps') && (
              <NumericInput label="ACV" value={customer.acv} onChange={updateCustomer('acv')} prefix="$" commas />
            )}
          </div>
        </div>

        {/* TitanX Inputs */}
        <div className="glass rounded-xl p-5 space-y-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-primary">Scoring Profile</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <NumericInput label="High Intent %" value={titanx.highIntent} onChange={updateTitanx('highIntent')} suffix="%" />
            <NumericInput label="7-dial Reach" value={titanx.highIntentReach} onChange={updateTitanx('highIntentReach')} suffix="%" />
            <NumericInput label="Avg Phones / Contact" value={titanx.avgPhones} onChange={updateTitanx('avgPhones')} />
            <NumericInput label="TitanX Connect Rate" value={titanx.titanxConnectRate} onChange={updateTitanx('titanxConnectRate')} suffix="%" />
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

        {/* Multiples */}
        <div className="glass rounded-xl p-5 space-y-4 relative overflow-hidden md:col-span-2">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-primary">Desired Production Lift</span>
          <div className="grid grid-cols-3 gap-4">
            <NumericInput label="Grow" value={titanx.multipleGrow} onChange={updateTitanx('multipleGrow')} suffix="×" step="0.5" />
            <NumericInput label="Accelerate" value={titanx.multipleAccelerate} onChange={updateTitanx('multipleAccelerate')} suffix="×" step="0.5" />
            <NumericInput label="Scale" value={titanx.multipleScale} onChange={updateTitanx('multipleScale')} suffix="×" step="0.5" />
          </div>
        </div>
      </div>

      {/* Full Results */}
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

      {/* Model Toggle + Save */}
      <div className="flex items-center justify-between">
        <ToggleGroup type="single" value={model} onValueChange={(v) => v && setModel(v)} className="glass rounded-lg p-0.5">
          <ToggleGroupItem value="blended" className="text-xs px-5 py-2 rounded-md data-[state=on]:bg-primary/20 data-[state=on]:text-primary border-none transition-all duration-300">
            Blended Calling
          </ToggleGroupItem>
          <ToggleGroupItem value="highIntent" className="text-xs px-5 py-2 rounded-md data-[state=on]:bg-primary/20 data-[state=on]:text-primary border-none transition-all duration-300">
            High Intent Only
          </ToggleGroupItem>
        </ToggleGroup>

        <Button onClick={handleSave} disabled={!results} className="bg-primary/90 text-primary-foreground hover:bg-primary glow-primary transition-all duration-300 border-none">
          <Save className="h-4 w-4 mr-1.5" /> Save Session
        </Button>
      </div>
    </div>
  );
}
