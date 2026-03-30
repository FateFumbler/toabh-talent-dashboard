import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  FolderOpen,
  Search,
  FileText,
  ExternalLink,
  ArrowLeft,
  RefreshCw,
  User,
} from 'lucide-react';
import { fetchAllDocuments, type DocumentUser, type TalentDocuments } from '../services/documentsApi';

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeDriveUrl(url: string): string {
  if (!url) return '';
  const t = url.trim();
  if (t.includes('/view') || t.includes('thumbnail')) return t;
  const m =
    t.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
    t.match(/\/open\?id=([a-zA-Z0-9_-]+)/) ||
    t.match(/\/document\/d\/([a-zA-Z0-9_-]+)/) ||
    t.match(/id=([a-zA-Z0-9_-]+)/);
  if (!m) return t;
  const id = m[1];
  return t.includes('/document/d/')
    ? `https://docs.google.com/document/d/${id}/edit`
    : `https://drive.google.com/file/d/${id}/view`;
}

function docIcon(key: string) {
  if (key === 'aadhaar') return '🪪';
  if (key === 'pan') return '🆔';
  return '📘';
}

function initials(name: string | number | undefined | null) {
  return String(name ?? '').split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';
}

const SECTIONS: { key: keyof TalentDocuments; label: string }[] = [
  { key: 'aadhaar', label: 'Aadhaar' },
  { key: 'pan', label: 'PAN' },
  { key: 'passport', label: 'Passport' },
];

// ── Document Card ─────────────────────────────────────────────────────────────

function DocCard({ label, url }: { label: string; url: string }) {
  return (
    <a
      href={normalizeDriveUrl(url)}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-card hover:bg-card/80 hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer no-underline text-center"
    >
      <span className="text-3xl transition-transform group-hover:scale-110">{docIcon(label.toLowerCase())}</span>
      <span className="text-sm font-medium text-foreground leading-tight">{label}</span>
      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium rounded-full transition-colors">
        View <ExternalLink className="h-3 w-3" />
      </span>
    </a>
  );
}

// ── Section ──────────────────────────────────────────────────────────────────

function DocSection({
  label,
  links,
}: {
  label: string;
  links: string[];
}) {
  if (links.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-base">{docIcon(label.toLowerCase())}</span>
          <h3 className="text-sm font-semibold text-foreground">{label}</h3>
        </div>
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-border bg-muted/30">
          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm text-muted-foreground">No documents uploaded</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-base">{docIcon(label.toLowerCase())}</span>
        <h3 className="text-sm font-semibold text-foreground">{label}</h3>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {links.length} file{links.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {links.map((link, i) => (
          <DocCard key={i} label={`${label} ${i + 1}`} url={link} />
        ))}
      </div>
    </div>
  );
}

// ── User Files View (inline, replaces folder grid) ─────────────────────────────

function UserFilesView({
  user,
  onBack,
}: {
  user: DocumentUser;
  onBack: () => void;
}) {
  const name = String(user.name || '');
  const hasAny = SECTIONS.some((s) => (user[s.key] ?? []).length > 0);

  return (
    <div className="space-y-6">
      {/* Breadcrumb / Back */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          All Documents
        </button>
        <span className="text-muted-foreground">/</span>
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
            {initials(name)}
          </div>
          <span className="text-sm font-medium text-foreground truncate">{name}</span>
          {user.email && (
            <span className="text-xs text-muted-foreground hidden sm:inline">{user.email}</span>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Sections */}
      {!hasAny ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <FileText className="h-12 w-12 opacity-40" />
          <p className="text-sm">No documents uploaded.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {SECTIONS.map(({ key, label }) => (
            <DocSection
              key={key}
              label={label}
              links={user[key] ?? []}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Folder Card ───────────────────────────────────────────────────────────────

function FolderCard({
  user,
  onClick,
}: {
  user: DocumentUser;
  onClick: () => void;
}) {
  const name = String(user.name || '');
  const email = user.email || '';
  const docCount =
    (user.aadhaar?.length ?? 0) +
    (user.pan?.length ?? 0) +
    (user.passport?.length ?? 0);

  return (
    <button
      onClick={onClick}
      className="group bg-card rounded-xl border border-border p-5 hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 text-left cursor-pointer w-full flex items-center gap-4"
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className="h-12 w-12 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-base">
          {initials(name) || <User className="h-6 w-6" />}
        </div>
        {docCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center">
            {docCount}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
          {name || '(No Name)'}
        </p>
        {email && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{email}</p>
        )}
      </div>

      {/* Doc badges */}
      {docCount > 0 && (
        <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
          {user.aadhaar?.length ? (
            <span className="text-xs bg-blue-500/15 text-blue-400 px-2 py-0.5 rounded-full">
              {user.aadhaar.length} Aadhaar
            </span>
          ) : null}
          {user.pan?.length ? (
            <span className="text-xs bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full">
              {user.pan.length} PAN
            </span>
          ) : null}
          {user.passport?.length ? (
            <span className="text-xs bg-purple-500/15 text-purple-400 px-2 py-0.5 rounded-full">
              {user.passport.length} Passport
            </span>
          ) : null}
        </div>
      )}

      {/* Arrow */}
      <ArrowLeft className="h-4 w-4 text-muted-foreground rotate-180 flex-shrink-0 group-hover:text-primary transition-colors" style={{ transform: 'rotate(180deg)' }} />
    </button>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function FolderSkeleton() {
  return (
    <div className="flex items-center gap-4 p-5 rounded-xl border border-border animate-pulse">
      <div className="h-12 w-12 rounded-full bg-muted flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-muted rounded w-1/3" />
        <div className="h-3 bg-muted rounded w-1/4" />
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export function DocumentsTab() {
  const [users, setUsers] = useState<DocumentUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<DocumentUser | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllDocuments();
      setUsers(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load documents');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return users;
    return users.filter(
      (u) =>
        (u.name || '').toString().toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q)
    );
  }, [users, query]);

  return (
    <div className="px-4 py-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-xl font-bold text-foreground">
            {selectedUser ? String(selectedUser.name || '') : 'Documents'}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {loading
              ? 'Loading...'
              : selectedUser
              ? 'Viewing documents'
              : `${users.length} user${users.length !== 1 ? 's' : ''} with documents`}
          </p>
        </div>
        {selectedUser ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedUser(null)}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="ml-1">Back</span>
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="ml-1 hidden sm:inline">Sync</span>
          </Button>
        )}
      </div>

      {/* Search (only in folder view) */}
      {!selectedUser && !loading && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <FolderSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="text-center py-16">
          <p className="text-destructive mb-3">{error}</p>
          <Button variant="outline" size="sm" onClick={load}>Retry</Button>
        </div>
      )}

      {/* User Files View (inline) */}
      {!loading && !error && selectedUser && (
        <UserFilesView
          user={selectedUser}
          onBack={() => setSelectedUser(null)}
        />
      )}

      {/* Folder Grid */}
      {!loading && !error && !selectedUser && users.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
          <FolderOpen className="h-14 w-14 opacity-40" />
          <p className="text-base font-medium">No documents found</p>
          <p className="text-sm">DOCUMENTS_DB is empty or the API is not returning data.</p>
        </div>
      )}

      {!loading && !error && !selectedUser && query && filtered.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <Search className="h-10 w-10 opacity-40" />
          <p>No users match "{query}"</p>
        </div>
      )}

      {/* Folder list */}
      {!loading && !error && !selectedUser && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((user) => (
            <FolderCard
              key={user.name?.toString() ?? Math.random()}
              user={user}
              onClick={() => setSelectedUser(user)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
