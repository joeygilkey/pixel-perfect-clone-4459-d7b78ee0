import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';

interface Account {
  name: string;
  domain: string;
}

const DUMMY_ACCOUNTS: Account[] = [
  { name: 'Acme Corporation', domain: 'acme.com' },
  { name: 'Adobe Systems', domain: 'adobe.com' },
  { name: 'Amazon Web Services', domain: 'aws.amazon.com' },
  { name: 'Apple Inc.', domain: 'apple.com' },
  { name: 'Atlassian', domain: 'atlassian.com' },
  { name: 'Block Inc.', domain: 'block.xyz' },
  { name: 'Cisco Systems', domain: 'cisco.com' },
  { name: 'Cloudflare', domain: 'cloudflare.com' },
  { name: 'CrowdStrike', domain: 'crowdstrike.com' },
  { name: 'Datadog', domain: 'datadoghq.com' },
  { name: 'Dell Technologies', domain: 'dell.com' },
  { name: 'DocuSign', domain: 'docusign.com' },
  { name: 'Figma', domain: 'figma.com' },
  { name: 'Google Cloud', domain: 'cloud.google.com' },
  { name: 'HubSpot', domain: 'hubspot.com' },
  { name: 'IBM', domain: 'ibm.com' },
  { name: 'Intuit', domain: 'intuit.com' },
  { name: 'Microsoft', domain: 'microsoft.com' },
  { name: 'MongoDB', domain: 'mongodb.com' },
  { name: 'Netflix', domain: 'netflix.com' },
  { name: 'Okta', domain: 'okta.com' },
  { name: 'Oracle', domain: 'oracle.com' },
  { name: 'Palo Alto Networks', domain: 'paloaltonetworks.com' },
  { name: 'Salesforce', domain: 'salesforce.com' },
  { name: 'ServiceNow', domain: 'servicenow.com' },
  { name: 'Shopify', domain: 'shopify.com' },
  { name: 'Slack Technologies', domain: 'slack.com' },
  { name: 'Snowflake', domain: 'snowflake.com' },
  { name: 'Splunk', domain: 'splunk.com' },
  { name: 'Stripe', domain: 'stripe.com' },
  { name: 'Twilio', domain: 'twilio.com' },
  { name: 'Uber Technologies', domain: 'uber.com' },
  { name: 'VMware', domain: 'vmware.com' },
  { name: 'Workday', domain: 'workday.com' },
  { name: 'Zendesk', domain: 'zendesk.com' },
  { name: 'Zoom Video', domain: 'zoom.us' },
  { name: 'ZoomInfo', domain: 'zoominfo.com' },
];

function SalesforceIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20.1 10.8C21.6 9.2 23.7 8.2 26 8.2C29 8.2 31.6 9.9 33 12.4C34.2 11.7 35.6 11.3 37.1 11.3C42 11.3 46 15.3 46 20.3C46 25.3 42 29.3 37.1 29.3C36.5 29.3 35.9 29.2 35.3 29.1C34.1 32.4 30.9 34.8 27.2 34.8C25.9 34.8 24.7 34.5 23.6 33.9C22.3 37 19.2 39.2 15.6 39.2C11.7 39.2 8.4 36.6 7.3 33C6.8 33.1 6.3 33.2 5.8 33.2C2.6 33.2 0 30.6 0 27.4C0 25.2 1.2 23.3 3 22.3C2.4 21.2 2.1 20 2.1 18.7C2.1 14.3 5.7 10.7 10.1 10.7C12 10.7 13.8 11.4 15.2 12.5C16.3 11.6 17.6 10.9 19 10.6L20.1 10.8Z" fill="#00A1E0"/>
    </svg>
  );
}

export default function AccountSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedAccount = useMemo(() => DUMMY_ACCOUNTS.find(a => a.name === value), [value]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return DUMMY_ACCOUNTS
      .filter(a => a.name.toLowerCase().includes(q) || a.domain.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [search]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => { setOpen(!open); setSearch(''); }}
        className="glass-subtle border-none h-9 w-full flex items-center gap-2 px-3 rounded-md text-sm transition-all duration-300 hover:ring-1 hover:ring-primary/40 text-left"
      >
        {selectedAccount ? (
          <>
            <SalesforceIcon className="h-4 w-4 flex-shrink-0" />
            <div className="flex flex-col min-w-0 leading-tight">
              <span className="text-foreground truncate text-sm">{selectedAccount.name}</span>
            </div>
          </>
        ) : (
          <span className="text-muted-foreground/40">Search accounts…</span>
        )}
        {selectedAccount && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(''); }}
            className="ml-auto flex-shrink-0 p-0.5 rounded-full text-muted-foreground/40 hover:text-foreground transition-colors"
            aria-label="Clear selection"
          >
            <X className="h-3 w-3" />
          </button>
        )}
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground/50 ${selectedAccount ? '' : 'ml-auto'} flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-[100] rounded-lg overflow-hidden border border-border/50 shadow-2xl animate-fade-in bg-background backdrop-blur-3xl" style={{ WebkitBackdropFilter: 'blur(60px)', backdropFilter: 'blur(60px)' }}>
          {/* Search input */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border/30">
            <Search className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search accounts…"
              className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 outline-none w-full"
            />
          </div>

          {/* List */}
          <div className="max-h-[240px] overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-muted-foreground/50">No accounts found</div>
            ) : (
              filtered.map(account => (
                <button
                  key={account.name}
                  type="button"
                  onClick={() => {
                    onChange(account.name);
                    setOpen(false);
                    setSearch('');
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors duration-150 hover:bg-primary/10 ${value === account.name ? 'bg-primary/10' : ''}`}
                >
                  <SalesforceIcon className="h-4 w-4 flex-shrink-0" />
                  <div className="flex flex-col min-w-0 leading-tight">
                    <span className="text-sm text-foreground truncate">{account.name}</span>
                    <span className="text-[10px] text-muted-foreground/50 truncate">{account.domain}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
