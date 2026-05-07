import { useEffect, useMemo, useState } from 'react';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Search,
  FileText,
  ExternalLink,
  RefreshCw,
  Plus,
  ChevronDown,
  LayoutGrid,
  List,
  ArrowUpDown,
  Pencil,
  Trash2,
  MoreVertical,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Contract } from '../types/contract';
import { fetchContracts, resendContract } from '../services/contractsApi';
import { fetchTalentMaster } from '../services/api';
import { getLocalContracts, addLocalContract, deleteLocalContract, editContract } from '../services/localContracts';

function normalizeStatus(status?: string): string {
  const value = (status || '').trim().toUpperCase();
  if (value === 'COMPLETED') return 'Completed';
  if (value === 'IN_PROGRESS') return 'Signing Pending';
  if (!value) return '';
  return status || '';
}

function getStatusClasses(status?: string): string {
  const value = (status || '').trim().toUpperCase();
  if (value === 'COMPLETED') {
    return 'bg-emerald-100/20 text-emerald-400 border border-emerald-500/40 dark:bg-emerald-900/20 dark:text-emerald-300';
  }
  if (value === 'IN_PROGRESS') {
    return 'bg-indigo-100/20 text-indigo-400 border border-indigo-500/40 dark:bg-indigo-900/20 dark:text-indigo-300';
  }
  if (!value) {
    return 'bg-muted text-muted-foreground border border-border';
  }
  return 'bg-amber-100/20 text-amber-400 border border-amber-500/40 dark:bg-amber-900/20 dark:text-amber-300';
}

function getSourceClasses(source: Contract['source']): string {
  return source === 'sheet'
    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
}

export function ContractsTab() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'list' | 'grid'>('grid');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name-az' | 'name-za'>('newest');
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [showDeleteButtons, setShowDeleteButtons] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    contractLink: '',
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    contractLink: '',
  });
  const [formError, setFormError] = useState('');
  const [talents, setTalents] = useState<any[]>([]);
  const [talentSearch, setTalentSearch] = useState('');
  const [resendTarget, setResendTarget] = useState<Contract | null>(null);
  const [resendLoading, setResendLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sheetContracts, local] = await Promise.all([
        fetchContracts(),
        Promise.resolve(getLocalContracts()),
      ]);
      setContracts([...sheetContracts, ...local]);
    } catch (error) {
      console.error('Failed to load contracts:', error);
      toast.error('Failed to load contracts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('toabh_contracts_show_delete');
    if (saved === 'true') setShowDeleteButtons(true);
  }, []);

  useEffect(() => {
    loadData();
    fetchTalentMaster()
      .then((data) => {
        if (Array.isArray(data)) {
          setTalents(data.filter((t: any) => t && t['Full Name']));
        } else if (data && typeof data === 'object' && Array.isArray((data as any).talents)) {
          setTalents((data as any).talents.filter((t: any) => t && t['Full Name']));
        } else {
          setTalents([]);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch talent master:', err);
        setTalents([]);
      });
  }, []);

  const handleViewContract = (link: string) => {
    if (link) window.open(link, '_blank', 'noopener,noreferrer');
  };

  const handleAddContract = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('Name is required');
      return;
    }
    if (!formData.phone.trim()) {
      setFormError('Phone number is required');
      return;
    }

    addLocalContract({
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      contractLink: formData.contractLink.trim(),
    });

    setFormData({ name: '', email: '', phone: '', contractLink: '' });
    setShowAddForm(false);
    setTalentSearch('');
    loadData();
  };

  const handleDeleteLocal = (id: string) => {
    deleteLocalContract(id);
    loadData();
  };

  const startEdit = (contract: Contract) => {
    setEditingId(contract.id || null);
    setEditForm({
      name: contract.name || '',
      email: contract.email || '',
      phone: contract.phone || '',
      contractLink: contract.contractLink || '',
    });
  };

  const saveEdit = () => {
    if (!editingId) return;
    editContract(editingId, {
      name: editForm.name,
      email: editForm.email,
      phone: editForm.phone,
      contractLink: editForm.contractLink,
    });
    setEditingId(null);
    loadData();
  };

  const handleResendConfirm = async () => {
    if (!resendTarget?.email) {
      toast.error('Missing contract email');
      return;
    }

    setResendLoading(true);
    try {
      const result = await resendContract(resendTarget.email);
      if (!result.success) {
        throw new Error(result.error || 'Failed to resend contract');
      }
      const versionText = result.version ? ` Version updated to ${result.version}.` : '';
      toast.success(`Contract resent successfully.${versionText}`);
      setResendTarget(null);
      await loadData();
      await fetchTalentMaster(true).catch(() => undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to resend contract';
      toast.error(message);
    } finally {
      setResendLoading(false);
    }
  };

  const filteredContracts = useMemo(() => {
    return contracts.filter((contract) => {
      const searchLower = search.toLowerCase();
      return (
        contract.name?.toLowerCase().includes(searchLower) ||
        contract.email?.toLowerCase().includes(searchLower) ||
        String(contract.phone || '').toLowerCase().includes(searchLower)
      );
    });
  }, [contracts, search]);

  const sortedContracts = useMemo(() => {
    return [...filteredContracts].sort((a, b) => {
      const getSortRow = (contract: Contract) => contract.rowNumber ?? contract.rowIndex ?? 0;
      const getNewestFirstRank = (contract: Contract) => {
        if (contract.source === 'sheet') return getSortRow(contract);
        const createdAt = contract.createdAt ? new Date(contract.createdAt).getTime() : 0;
        return Number.isNaN(createdAt) ? 0 : createdAt;
      };

      switch (sortBy) {
        case 'newest':
          return getNewestFirstRank(b) - getNewestFirstRank(a);
        case 'oldest':
          return getNewestFirstRank(a) - getNewestFirstRank(b);
        case 'name-az':
          return (a.name || '').localeCompare(b.name || '');
        case 'name-za':
          return (b.name || '').localeCompare(a.name || '');
        default:
          return 0;
      }
    });
  }, [filteredContracts, sortBy]);

  const filteredTalents = useMemo(() => {
    return (talents || []).filter((t) => {
      if (!t) return false;
      const value = talentSearch.toLowerCase();
      const name = (t['Full Name'] || '').toLowerCase();
      const phone = String(t['Phone'] || '').toLowerCase();
      const email = (t['Email '] || t['Email'] || '').toLowerCase();
      return name.includes(value) || phone.includes(value) || email.includes(value);
    });
  }, [talents, talentSearch]);

  const ContractMeta = ({ contract, showSource = true }: { contract: Contract; showSource?: boolean }) => (
    <div className="flex flex-wrap gap-2 mt-2">
      {showSource && (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${getSourceClasses(contract.source)}`}>
          {contract.source === 'sheet' ? 'Sheet' : 'Local'}
        </span>
      )}
      {contract.version && (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-muted text-foreground border border-border">
          {contract.version}
        </span>
      )}
      {contract.zohoStatus && (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${getStatusClasses(contract.zohoStatus)}`}>
          {normalizeStatus(contract.zohoStatus)}
        </span>
      )}
      {contract.zohoError && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-amber-100/20 text-amber-400 border border-amber-500/40 dark:bg-amber-900/20 dark:text-amber-300">
          <AlertTriangle className="h-3 w-3" />
          Warning
        </span>
      )}
    </div>
  );

  const ContractActions = ({ contract }: { contract: Contract }) => {
    const isLocal = contract.source === 'local' && contract.id;
    const canResend = contract.source === 'sheet' && !!contract.email;

    return (
      <div className="flex items-center gap-2">
        {contract.signedPdfUrl && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleViewContract(contract.signedPdfUrl!)}
            className="gap-1.5"
          >
            Signed PDF
            <ExternalLink className="h-3 w-3" />
          </Button>
        )}

        {isLocal && editingId === contract.id ? (
          <>
            <button onClick={saveEdit} className="text-xs text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300 transition-colors">
              Save
            </button>
            <button onClick={() => setEditingId(null)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Cancel
            </button>
          </>
        ) : null}

        {(isLocal || canResend) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canResend && (
                <DropdownMenuItem onClick={() => setResendTarget(contract)}>
                  Resend contract
                </DropdownMenuItem>
              )}
              {isLocal && contract.id && (
                <>
                  <DropdownMenuItem onClick={() => startEdit(contract)}>
                    Edit
                  </DropdownMenuItem>
                  {showDeleteButtons && (
                    <DropdownMenuItem onClick={() => handleDeleteLocal(contract.id!)}>
                      Delete
                    </DropdownMenuItem>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    );
  };

  const ContractCard = ({ contract }: { contract: Contract }) => (
    <div className="bg-card rounded-xl p-4 hover:bg-accent/30 hover:shadow-lg hover:-translate-y-0.5 transition-all border border-border">
      <div className="flex items-start justify-between gap-3 mb-3">
        <a
          href={contract.contractLink}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
          onClick={(e) => e.stopPropagation()}
        >
          <FileText className="w-10 h-10 text-primary hover:text-primary/80 transition-colors" />
        </a>
        <ContractActions contract={contract} />
      </div>

      {editingId === contract.id ? (
        <div className="space-y-2">
          <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full bg-input border border-border rounded px-2 py-1 text-foreground text-sm" />
          <input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="w-full bg-input border border-border rounded px-2 py-1 text-foreground text-sm" />
          <input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="w-full bg-input border border-border rounded px-2 py-1 text-foreground text-sm" />
          <input value={editForm.contractLink} onChange={(e) => setEditForm({ ...editForm, contractLink: e.target.value })} className="w-full bg-input border border-border rounded px-2 py-1 text-foreground text-sm" />
        </div>
      ) : (
        <>
          <h3 className="font-semibold text-foreground mb-1">{contract.name || 'N/A'}</h3>
          <p className="text-muted-foreground text-sm">{contract.phone || 'N/A'}</p>
          <p className="text-muted-foreground text-xs break-all mt-1">{contract.email || 'N/A'}</p>
          <ContractMeta contract={contract} showSource={false} />
          {contract.zohoSentAt && (
            <p className="text-[11px] text-muted-foreground mt-2">Sent: {contract.zohoSentAt}</p>
          )}
          {contract.zohoError && (
            <p className="text-xs text-amber-400 mt-2 break-words">{contract.zohoError}</p>
          )}
        </>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">Contracts</h2>
            <p className="text-xs text-muted-foreground">
              {contracts.length} contract{contracts.length !== 1 ? 's' : ''} found
            </p>
          </div>
        </div>

        <div className="flex justify-between items-center gap-2 overflow-x-auto">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadData} className="px-2 sm:px-3">
              <RefreshCw className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Sync</span>
            </Button>
            <div className="relative overflow-hidden">
              <button onClick={() => setSortDropdownOpen(!sortDropdownOpen)} className="p-2 bg-input border border-border rounded-lg hover:bg-accent transition-colors" title="Sort">
                <ArrowUpDown className="h-4 w-4 text-foreground" />
              </button>
              {sortDropdownOpen && (
                <div className="absolute right-0 mt-1 z-50 bg-popover border border-border rounded-xl shadow-xl max-h-[50vh] overflow-y-auto dropdown-animate">
                  <button onClick={() => { setSortBy('newest'); setSortDropdownOpen(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-accent transition-colors ${sortBy === 'newest' ? 'text-primary font-medium' : 'text-foreground'}`}>
                    Newest
                  </button>
                  <button onClick={() => { setSortBy('oldest'); setSortDropdownOpen(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-accent transition-colors ${sortBy === 'oldest' ? 'text-primary font-medium' : 'text-foreground'}`}>
                    Oldest
                  </button>
                  <button onClick={() => { setSortBy('name-az'); setSortDropdownOpen(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-accent transition-colors ${sortBy === 'name-az' ? 'text-primary font-medium' : 'text-foreground'}`}>
                    Name A-Z
                  </button>
                  <button onClick={() => { setSortBy('name-za'); setSortDropdownOpen(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-accent transition-colors ${sortBy === 'name-za' ? 'text-primary font-medium' : 'text-foreground'}`}>
                    Name Z-A
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1 border border-border/50">
              <button onClick={() => setView('list')} className={`p-2 rounded-md transition-colors ${view === 'list' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'}`} title="List View">
                <List className="h-4 w-4" />
              </button>
              <button onClick={() => setView('grid')} className={`p-2 rounded-md transition-colors ${view === 'grid' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'}`} title="Grid View">
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
            <Button variant="default" size="sm" onClick={() => {
              setShowAddForm(!showAddForm);
              if (!showAddForm) {
                setFormData({ name: '', email: '', phone: '', contractLink: '' });
                setTalentSearch('');
              }
            }} className="px-2 sm:px-3">
              <Plus className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Add</span>
            </Button>
          </div>
        </div>
      </div>

      {showAddForm && (
        <Card className="p-4 border-primary/50">
          <h3 className="font-semibold mb-3">Add Local Contract</h3>
          <form onSubmit={handleAddContract} className="space-y-3">
            <div className="mb-3 relative">
              <label className="block text-xs font-medium text-muted-foreground mb-1">Select Talent (for linking)</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search talent by name, phone, or email..."
                  value={talentSearch}
                  onChange={(e) => setTalentSearch(e.target.value)}
                  className="w-full bg-input border border-border rounded-lg px-3 py-2 pr-10 text-foreground text-sm"
                />
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
              {talentSearch && (
                <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-xl shadow-xl max-h-60 overflow-y-auto">
                  {filteredTalents.length === 0 ? (
                    <div className="px-3 py-2 text-muted-foreground text-sm">No talents found</div>
                  ) : (
                    filteredTalents.map((t, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setFormData({
                            name: t['Full Name'] || '',
                            phone: t['Phone']?.toString() || '',
                            email: t['Email '] || t['Email'] || '',
                            contractLink: formData.contractLink,
                          });
                          setTalentSearch('');
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-accent text-foreground text-sm border-b border-border last:border-b-0"
                      >
                        <div className="font-medium">{t['Full Name']}</div>
                        <div className="text-xs text-muted-foreground">{t['Phone']} • {t['Email '] || t['Email']}</div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground">Name *</label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Talent name" className="mt-1" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Phone *</label>
                <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="Phone number" className="mt-1" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Email</label>
                <Input value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="Email address" className="mt-1" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Contract Link</label>
                <Input value={formData.contractLink} onChange={(e) => setFormData({ ...formData, contractLink: e.target.value })} placeholder="Google Doc link" className="mt-1" />
              </div>
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <div className="flex gap-2">
              <Button type="submit" size="sm">Save Contract</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => {
                setShowAddForm(false);
                setFormData({ name: '', email: '', phone: '', contractLink: '' });
                setTalentSearch('');
              }}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, email, or phone..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-input/50" />
        </div>
      </Card>

      {loading && <div className="text-center py-12 text-muted-foreground">Loading contracts...</div>}

      {!loading && sortedContracts.length > 0 && (
        view === 'list' ? (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Talent</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Contact</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Contract</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedContracts.map((contract, idx) => (
                    <tr key={contract.id || `${contract.email}-${contract.phone}-${idx}`} className="border-t align-top">
                      <td className="px-4 py-3 text-sm">
                        {editingId === contract.id ? (
                          <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full bg-input border border-border rounded px-2 py-1 text-foreground text-sm" />
                        ) : (
                          <div>
                            <div className="font-medium text-foreground">{contract.name || 'N/A'}</div>
                            <ContractMeta contract={contract} />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {editingId === contract.id ? (
                          <div className="space-y-2">
                            <input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="w-full bg-input border border-border rounded px-2 py-1 text-foreground text-sm" />
                            <input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="w-full bg-input border border-border rounded px-2 py-1 text-foreground text-sm" />
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div>{contract.phone || 'N/A'}</div>
                            <div className="break-all">{contract.email || 'N/A'}</div>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {editingId === contract.id ? (
                          <input value={editForm.contractLink} onChange={(e) => setEditForm({ ...editForm, contractLink: e.target.value })} className="w-full bg-input border border-border rounded px-2 py-1 text-foreground text-sm" placeholder="Contract link" />
                        ) : (
                          <div className="space-y-2">
                            <Button variant="outline" size="sm" onClick={() => handleViewContract(contract.contractLink)} className="text-xs gap-1.5">
                              <FileText className="h-3 w-3" />
                              Open Doc
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                            {contract.signedPdfUrl && (
                              <Button variant="outline" size="sm" onClick={() => handleViewContract(contract.signedPdfUrl!)} className="text-xs gap-1.5">
                                Signed PDF
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="space-y-2">
                          {contract.zohoStatus && <div className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${getStatusClasses(contract.zohoStatus)}`}>{normalizeStatus(contract.zohoStatus)}</div>}
                          {contract.version && <div className="text-xs text-muted-foreground">{contract.version}</div>}
                          {contract.zohoSentAt && <div className="text-xs text-muted-foreground">Sent: {contract.zohoSentAt}</div>}
                          {contract.zohoError && <div className="text-xs text-amber-400 break-words">{contract.zohoError}</div>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <ContractActions contract={contract} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-hidden">
            {sortedContracts.map((contract, idx) => (
              <ContractCard key={contract.id || `${contract.email}-${contract.phone}-${idx}`} contract={contract} />
            ))}
          </div>
        )
      )}

      {!loading && sortedContracts.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No contracts found. Add contracts manually or sync to refresh.
        </div>
      )}

      <Dialog open={!!resendTarget} onOpenChange={(open) => !open && !resendLoading && setResendTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Resend contract</DialogTitle>
            <DialogDescription>
              This will resend the currently edited Google Doc contract to the talent for signing. The old Zoho Sign request will be replaced. Continue?
            </DialogDescription>
          </DialogHeader>
          {resendTarget && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
              <div className="font-medium text-foreground">{resendTarget.name || 'Unnamed Contract'}</div>
              <div className="text-muted-foreground break-all">{resendTarget.email || 'No email'}</div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setResendTarget(null)} disabled={resendLoading}>
              Cancel
            </Button>
            <Button onClick={handleResendConfirm} disabled={resendLoading || !resendTarget?.email}>
              {resendLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Resend Contract
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
