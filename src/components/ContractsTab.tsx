import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Search, FileText, ExternalLink, RefreshCw, Plus, Trash2, ChevronDown, Pencil, LayoutGrid, List, ArrowUpDown } from 'lucide-react';
import type { Contract } from '../types/contract';
import { fetchContracts } from '../services/contractsApi';
import { fetchTalentMaster } from '../services/api';
import { getLocalContracts, addLocalContract, deleteLocalContract, editContract } from '../services/localContracts';

export function ContractsTab() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'list' | 'grid'>('grid');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name-az' | 'name-za'>('newest');
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);

  // Settings state (from existing Settings component)
  const [showDeleteButtons, setShowDeleteButtons] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    contractLink: '',
  });

  // ContractCard component for grid view
  const ContractCard = ({ contract }: { contract: Contract }) => (
    <div className="bg-card rounded-xl p-4 hover:bg-accent/30 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer border border-border">
      {/* Doc icon at top - clickable */}
      {editingId === contract.id ? (
        <input
          value={editForm.contractLink}
          onChange={(e) => setEditForm({ ...editForm, contractLink: e.target.value })}
          className="w-full bg-input border border-border rounded px-2 py-1 text-foreground text-sm mb-2"
          placeholder="Contract link"
        />
      ) : (
        <a
          href={contract.contractLink}
          target="_blank"
          rel="noopener noreferrer"
          className="block mb-3"
          onClick={(e) => e.stopPropagation()}
        >
          <FileText className="w-10 h-10 text-primary mx-auto hover:text-primary/80 transition-colors" />
        </a>
      )}

      {/* Talent Name */}
      {editingId === contract.id ? (
        <input
          value={editForm.name}
          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
          className="w-full bg-input border border-border rounded px-2 py-1 text-foreground text-sm text-center mb-1"
        />
      ) : (
        <h3 className="font-semibold text-foreground text-center mb-1">{contract.name || 'N/A'}</h3>
      )}

      {/* Phone */}
      {editingId === contract.id ? (
        <input
          value={editForm.phone}
          onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
          className="w-full bg-input border border-border rounded px-2 py-1 text-foreground text-sm text-center mb-1"
        />
      ) : (
        <p className="text-muted-foreground text-sm text-center">{contract.phone}</p>
      )}

      {/* Email */}
      {editingId === contract.id ? (
        <input
          value={editForm.email}
          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
          className="w-full bg-input border border-border rounded px-2 py-1 text-foreground text-sm text-center mb-2"
        />
      ) : (
        <p className="text-muted-foreground text-xs text-center mb-2">{contract.email || 'N/A'}</p>
      )}

      {/* Source tag */}
      <span className={`inline-block px-2 py-0.5 rounded text-xs mx-auto ${
        contract.source === 'sheet'
          ? 'bg-info/20 text-info dark:bg-info/30'
          : 'bg-success/20 text-success dark:bg-success/30'
      }`}>
        {contract.source === 'sheet' ? 'Sheet' : 'Local'}
      </span>

      {/* Action buttons for local contracts */}
      {contract.source === 'local' && contract.id && (
        <div className="mt-2 flex justify-center gap-2">
          {editingId === contract.id ? (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  saveEdit();
                }}
                className="text-xs text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300 transition-colors"
              >
                Save
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingId(null);
                }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startEdit(contract);
                }}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 transition-colors"
              >
                Edit
              </button>
              {showDeleteButtons && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteLocal(contract.id!);
                  }}
                  className="text-xs text-destructive hover:text-destructive/80 transition-colors"
                >
                  Delete
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );

  // Form state for adding new contract
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

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch both sources
      const [sheetContracts, local] = await Promise.all([
        fetchContracts(),
        Promise.resolve(getLocalContracts()),
      ]);
      // Merge: sheet first, then local
      setContracts([...sheetContracts, ...local]);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
    setLoading(false);
  };

  // Load settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('toabh_contracts_show_delete');
    if (saved === 'true') {
      setShowDeleteButtons(true);
    }
  }, []);

  useEffect(() => {
    loadData();
    // Fetch talent master for dropdown
    fetchTalentMaster()
      .then((data) => {
        if (Array.isArray(data)) {
          setTalents(data.filter((t: any) => t && t["Full Name"]));
        } else if (data && typeof data === 'object' && Array.isArray((data as any).talents)) {
          // Handle case where API returns { talents: [...] }
          setTalents((data as any).talents.filter((t: any) => t && t["Full Name"]));
        } else {
          console.warn('Unexpected talent master data format:', data);
          setTalents([]);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch talent master:', err);
        setTalents([]);
      });
  }, []);

  const handleViewContract = (link: string) => {
    if (link && link !== '') {
      window.open(link, '_blank', 'noopener,noreferrer');
    }
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

    // Reset form and refresh
    setFormData({ name: '', email: '', phone: '', contractLink: '' });
    setShowAddForm(false);
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

  // Filter contracts by search
  const filteredContracts = contracts.filter((contract) => {
    const searchLower = search.toLowerCase();
    return (
      contract.name?.toLowerCase().includes(searchLower) ||
      contract.email?.toLowerCase().includes(searchLower) ||
      String(contract.phone || '').toLowerCase().includes(searchLower)
    );
  });

  // Sort contracts
  const sortedContracts = [...filteredContracts].sort((a, b) => {
    // For newest/oldest: normalize rowIndex and createdAt to comparable scales
    // rowIndex: higher = newer (more recently added to sheet)
    // createdAt: higher = newer (more recently created locally)
    
    // Compute min/max for normalization (only for mixed-source comparison)
    const sheetContracts = filteredContracts.filter(c => c.source === 'sheet' && c.rowIndex !== undefined);
    const localContracts = filteredContracts.filter(c => c.source === 'local' && c.createdAt);
    const maxRowIndex = sheetContracts.length > 0 ? Math.max(...sheetContracts.map(c => c.rowIndex!)) : 2000;
    const minCreatedAt = localContracts.length > 0 ? Math.min(...localContracts.map(c => new Date(c.createdAt!).getTime())) : 0;
    const maxCreatedAt = localContracts.length > 0 ? Math.max(...localContracts.map(c => new Date(c.createdAt!).getTime())) : Date.now();
    const createdAtRange = maxCreatedAt - minCreatedAt || 1;

    // Get normalized "newer score" (0-1 scale, higher = newer)
    const getNewerScore = (contract: Contract): number => {
      if (contract.source === 'sheet' && contract.rowIndex !== undefined) {
        // Higher rowIndex = newer in sheet (normalize to 0-1 where 1 = max rowIndex)
        return contract.rowIndex / maxRowIndex;
      }
      if (contract.source === 'local' && contract.createdAt) {
        // Higher createdAt = newer (normalize to 0-1 based on actual range)
        const ts = new Date(contract.createdAt).getTime();
        return (ts - minCreatedAt) / createdAtRange;
      }
      return 0; // Default for missing data
    };

    switch (sortBy) {
      case 'newest': {
        // Newest = highest rowIndex for sheet, most recent for local
        // Use normalized newerScore for comparison (higher = newer)
        const scoreA = getNewerScore(a);
        const scoreB = getNewerScore(b);
        if (scoreB !== scoreA) return scoreB - scoreA;
        // Fallback: same score, use raw values
        if (a.source === 'sheet' && b.source === 'sheet') {
          return (b.rowIndex || 0) - (a.rowIndex || 0);
        }
        if (a.source === 'local' && b.source === 'local') {
          return new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime();
        }
        return 0;
      }
      case 'oldest': {
        // Oldest = lowest rowIndex for sheet, earliest for local
        // Use normalized newerScore (lower = older)
        const scoreA = getNewerScore(a);
        const scoreB = getNewerScore(b);
        if (scoreA !== scoreB) return scoreA - scoreB;
        // Fallback: same score, use raw values
        if (a.source === 'sheet' && b.source === 'sheet') {
          return (a.rowIndex || 0) - (b.rowIndex || 0);
        }
        if (a.source === 'local' && b.source === 'local') {
          return new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime();
        }
        return 0;
      }
      case 'name-az': {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        if (nameA === nameB) return 0;
        // Empty names go to end
        if (!nameA) return 1;
        if (!nameB) return -1;
        return nameA.localeCompare(nameB);
      }
      case 'name-za': {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        if (nameA === nameB) return 0;
        // Empty names go to start
        if (!nameA) return -1;
        if (!nameB) return 1;
        return nameB.localeCompare(nameA);
      }
      default:
        return 0;
    }
  });

  // Filter talents for searchable dropdown
  const filteredTalents = (talents || []).filter(t => {
    if (!t) return false;
    const search = talentSearch.toLowerCase();
    const name = (t["Full Name"] || '').toLowerCase();
    const phone = String(t["Phone"] || '').toLowerCase();
    const email = (t["Email "] || t["Email"] || '').toLowerCase();
    return name.includes(search) || phone.includes(search) || email.includes(search);
  });

  // Group by phone for display
  const contractsByPhone = sortedContracts.reduce(
    (acc, contract) => {
      const phone = contract.phone || 'Unknown';
      if (!acc[phone]) acc[phone] = [];
      acc[phone].push(contract);
      return acc;
    },
    {} as Record<string, Contract[]>
  );

  return (
    <div className="space-y-4">
      {/* Header - title and count on row 1, buttons on row 2 */}
      <div className="px-4 py-3 space-y-3">
        {/* Row 1: Title and count */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">Contracts</h2>
            <p className="text-xs text-muted-foreground">
              {contracts.length} contract{contracts.length !== 1 ? 's' : ''} found
            </p>
          </div>
        </div>

        {/* Row 2: Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View toggle - icon only */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1 border border-border/50">
            <button
              onClick={() => setView('list')}
              className={`p-2 rounded-md transition-colors ${
                view === 'list'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
              }`}
              title="List View"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView('grid')}
              className={`p-2 rounded-md transition-colors ${
                view === 'grid'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
          {/* Sort dropdown - icon only */}
          <div className="relative">
            <button
              onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
              className="p-2 bg-input border border-border rounded-lg hover:bg-accent transition-colors"
              title="Sort"
            >
              <ArrowUpDown className="h-4 w-4 text-foreground" />
            </button>
            {sortDropdownOpen && (
              <div className="absolute left-0 sm:right-0 mt-1 z-50 bg-popover border border-border rounded-xl shadow-xl overflow-hidden dropdown-animate">
                <button
                  onClick={() => { setSortBy('newest'); setSortDropdownOpen(false); }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-accent transition-colors ${sortBy === 'newest' ? 'text-primary font-medium' : 'text-foreground'}`}
                >
                  Newest
                </button>
                <button
                  onClick={() => { setSortBy('oldest'); setSortDropdownOpen(false); }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-accent transition-colors ${sortBy === 'oldest' ? 'text-primary font-medium' : 'text-foreground'}`}
                >
                  Oldest
                </button>
                <button
                  onClick={() => { setSortBy('name-az'); setSortDropdownOpen(false); }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-accent transition-colors ${sortBy === 'name-az' ? 'text-primary font-medium' : 'text-foreground'}`}
                >
                  Name A-Z
                </button>
                <button
                  onClick={() => { setSortBy('name-za'); setSortDropdownOpen(false); }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-accent transition-colors ${sortBy === 'name-za' ? 'text-primary font-medium' : 'text-foreground'}`}
                >
                  Name Z-A
                </button>
              </div>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={loadData} className="px-2 sm:px-3">
            <RefreshCw className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Sync</span>
          </Button>
          <Button variant="default" size="sm" onClick={() => {
            setShowAddForm(!showAddForm);
            if (!showAddForm) {
              // Reset form when opening
              setFormData({ name: '', email: '', phone: '', contractLink: '' });
              setTalentSearch('');
            }
          }} className="px-2 sm:px-3">
            <Plus className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Add</span>
          </Button>
        </div>
      </div>

      {/* Add Contract Form */}
      {showAddForm && (
        <Card className="p-4 border-primary/50">
          <h3 className="font-semibold mb-3">Add Local Contract</h3>
          <form onSubmit={handleAddContract} className="space-y-3">
            <div className="mb-3 relative">
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Select Talent (for linking)
              </label>
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
              {/* Dropdown results */}
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
                          const talent = t;
                          setFormData({
                            name: talent["Full Name"] || '',
                            phone: talent["Phone"]?.toString() || '',
                            email: talent["Email "] || talent["Email"] || '',
                            contractLink: formData.contractLink,
                          });
                          setTalentSearch(''); // Close dropdown
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-accent text-foreground text-sm border-b border-border last:border-b-0"
                      >
                        <div className="font-medium">{t["Full Name"]}</div>
                        <div className="text-xs text-muted-foreground">{t["Phone"]} • {t["Email "] || t["Email"]}</div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground">Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Talent name"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Phone *</label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Phone number"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Email</label>
                <Input
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Email address"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Contract Link</label>
                <Input
                  value={formData.contractLink}
                  onChange={(e) => setFormData({ ...formData, contractLink: e.target.value })}
                  placeholder="Google Drive link"
                  className="mt-1"
                />
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

      {/* Search */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-input/50"
          />
        </div>
      </Card>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12 text-muted-foreground">
          Loading contracts...
        </div>
      )}

      {/* Contracts List/Grid View */}
      {!loading && sortedContracts.length > 0 && (
        view === 'list' ? (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Talent Name
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Phone
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Contract Doc Link
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Source
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(contractsByPhone).map(([phone, phoneContracts]) => {
                    // Guard against empty arrays
                    if (!phoneContracts || phoneContracts.length === 0) {
                      return null;
                    }
                    const firstContract = phoneContracts[0];
                    return (
                    <tr key={phone} className="border-t">
                      <td className="px-4 py-3 text-sm text-foreground font-medium">
                        {editingId === firstContract.id ? (
                          <input
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="w-full bg-input border border-border rounded px-2 py-1 text-foreground text-sm"
                          />
                        ) : (
                          firstContract.name || 'N/A'
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {phone}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {editingId === firstContract.id ? (
                          <input
                            value={editForm.email}
                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                            className="w-full bg-input border border-border rounded px-2 py-1 text-foreground text-sm"
                          />
                        ) : (
                          firstContract.email || 'N/A'
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {editingId === firstContract.id ? (
                          <input
                            value={editForm.contractLink}
                            onChange={(e) => setEditForm({ ...editForm, contractLink: e.target.value })}
                            className="w-full bg-input border border-border rounded px-2 py-1 text-foreground text-sm"
                            placeholder="Contract link"
                          />
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {phoneContracts.map((contract, idx) => (
                              <Button
                                key={idx}
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleViewContract(contract.contractLink)
                                }
                                className="text-xs"
                              >
                                <FileText className="h-3 w-3 mr-1" />
                                {idx + 1}
                                <ExternalLink className="h-3 w-3 ml-1" />
                              </Button>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {phoneContracts.map((contract, idx) => (
                            <span
                              key={idx}
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${
                                contract.source === 'local'
                                  ? 'bg-primary/20 text-primary dark:bg-primary/30'
                                  : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {contract.source === 'local' ? 'Local' : 'Sheet'}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {phoneContracts.map((contract, idx) =>
                            contract.source === 'local' && contract.id ? (
                              editingId === contract.id ? (
                                <div key={idx} className="flex gap-1 items-center">
                                  <button
                                    onClick={saveEdit}
                                    className="text-xs text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300 px-1"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setEditingId(null)}
                                    className="text-xs text-muted-foreground hover:text-foreground px-1"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <div key={idx} className="flex flex-wrap gap-1">
                                  <button
                                    onClick={() => startEdit(contract)}
                                    className="h-7 px-2 text-blue-400 hover:text-blue-300 transition-colors"
                                    title="Edit"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </button>
                                  {showDeleteButtons && (
                                    <button
                                      onClick={() => handleDeleteLocal(contract.id!)}
                                      className="h-7 px-2 text-red-400 hover:text-red-300 transition-colors"
                                      title="Delete"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                              )
                            ) : null
                          )}
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-hidden">
            {sortedContracts.map((contract) => (
              <ContractCard key={contract.id || contract.phone} contract={contract} />
            ))}
          </div>
        )
      )}

      {/* Empty State */}
      {!loading && sortedContracts.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No contracts found. Add contracts manually or sync to refresh.
        </div>
      )}
    </div>
  );
}
