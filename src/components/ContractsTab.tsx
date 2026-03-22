import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Search, FileText, ExternalLink, RefreshCw, Plus, Trash2, ChevronDown } from 'lucide-react';
import type { Contract } from '../types/contract';
import { fetchContracts } from '../services/contractsApi';
import { fetchTalentMaster } from '../services/api';
import { getLocalContracts, addLocalContract, deleteLocalContract } from '../services/localContracts';

export function ContractsTab() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [view, setView] = useState<'list' | 'grid'>('list');

  // ContractCard component for grid view
  const ContractCard = ({ contract }: { contract: Contract }) => (
    <div className="bg-gray-800 rounded-xl p-4 hover:bg-gray-750 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer border border-gray-700">
      {/* Doc icon at top - clickable */}
      <a
        href={contract.contractLink}
        target="_blank"
        rel="noopener noreferrer"
        className="block mb-3"
        onClick={(e) => e.stopPropagation()}
      >
        <FileText className="w-10 h-10 text-purple-400 mx-auto hover:text-purple-300 transition-colors" />
      </a>

      {/* Talent Name */}
      <h3 className="font-semibold text-white text-center mb-1">{contract.name || 'N/A'}</h3>

      {/* Phone */}
      <p className="text-gray-400 text-sm text-center">{contract.phone}</p>

      {/* Email */}
      <p className="text-gray-500 text-xs text-center mb-2">{contract.email || 'N/A'}</p>

      {/* Source tag */}
      <span className={`inline-block px-2 py-0.5 rounded text-xs mx-auto ${
        contract.source === 'sheet'
          ? 'bg-blue-600/20 text-blue-400'
          : 'bg-green-600/20 text-green-400'
      }`}>
        {contract.source === 'sheet' ? 'Sheet' : 'Local'}
      </span>

      {/* Delete button for local contracts */}
      {contract.source === 'local' && contract.id && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteLocal(contract.id!);
          }}
          className="mt-2 w-full text-center text-xs text-destructive hover:text-red-400 transition-colors"
        >
          Delete
        </button>
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
  const [selectedTalentIndex, setSelectedTalentIndex] = useState<number>(-1);
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
      setLastSync(new Date());
    } catch (error) {
      console.error('Failed to load data:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // Fetch talent master for dropdown
    fetchTalentMaster()
      .then((data) => {
        if (data) {
          setTalents(data.filter((t: any) => t["Full Name"]));
        }
      })
      .catch(console.error);
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
    setSelectedTalentIndex(-1);
    setShowAddForm(false);
    loadData();
  };

  const handleDeleteLocal = (id: string) => {
    deleteLocalContract(id);
    loadData();
  };

  // Filter contracts by search
  const filteredContracts = contracts.filter((contract) => {
    const searchLower = search.toLowerCase();
    return (
      contract.name?.toLowerCase().includes(searchLower) ||
      contract.email?.toLowerCase().includes(searchLower) ||
      contract.phone?.toLowerCase().includes(searchLower)
    );
  });

  // Filter talents for searchable dropdown
  const filteredTalents = talents.filter(t => {
    const search = talentSearch.toLowerCase();
    const name = (t["Full Name"] || '').toLowerCase();
    const phone = (t["Phone"] || '').toLowerCase();
    const email = (t["Email "] || t["Email"] || '').toLowerCase();
    return name.includes(search) || phone.includes(search) || email.includes(search);
  });

  // Group by phone for display
  const contractsByPhone = filteredContracts.reduce(
    (acc, contract) => {
      const phone = contract.phone || 'Unknown';
      if (!acc[phone]) acc[phone] = [];
      acc[phone].push(contract);
      return acc;
    },
    {} as Record<string, Contract[]>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contracts</h1>
          <p className="text-sm text-muted-foreground">
            {contracts.length} contract{contracts.length !== 1 ? 's' : ''} found
            {lastSync && ` • Last synced: ${lastSync.toLocaleTimeString()}`}
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-1 bg-gray-800/50 rounded-lg p-1">
            <button
              onClick={() => setView('list')}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                view === 'list'
                  ? 'bg-purple-600 text-white'
                  : 'bg-transparent text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setView('grid')}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                view === 'grid'
                  ? 'bg-purple-600 text-white'
                  : 'bg-transparent text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              Grid
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Sync
          </Button>
          <Button variant="default" size="sm" onClick={() => {
            setShowAddForm(!showAddForm);
            if (!showAddForm) {
              // Reset form when opening
              setFormData({ name: '', email: '', phone: '', contractLink: '' });
              setSelectedTalentIndex(-1);
              setTalentSearch('');
            }
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Contract
          </Button>
        </div>
      </div>

      {/* Add Contract Form */}
      {showAddForm && (
        <Card className="p-4 border-primary/50">
          <h3 className="font-semibold mb-3">Add Local Contract</h3>
          <form onSubmit={handleAddContract} className="space-y-3">
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Select Talent (for linking)
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search talent by name, phone, or email..."
                  value={talentSearch}
                  onChange={(e) => setTalentSearch(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 pr-10 text-white text-sm"
                />
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
              {/* Dropdown results */}
              {talentSearch && (
                <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                  {filteredTalents.length === 0 ? (
                    <div className="px-3 py-2 text-gray-500 text-sm">No talents found</div>
                  ) : (
                    filteredTalents.map((t, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          const talent = t;
                          setSelectedTalentIndex(talents.indexOf(talent));
                          setFormData({
                            name: talent["Full Name"] || '',
                            phone: talent["Phone"]?.toString() || '',
                            email: talent["Email "] || talent["Email"] || '',
                            contractLink: formData.contractLink,
                          });
                          setTalentSearch(''); // Close dropdown
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-gray-700 text-white text-sm border-b border-gray-700 last:border-b-0"
                      >
                        <div className="font-medium">{t["Full Name"]}</div>
                        <div className="text-xs text-gray-400">{t["Phone"]} • {t["Email "] || t["Email"]}</div>
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
                setSelectedTalentIndex(-1);
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
      {!loading && filteredContracts.length > 0 && (
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
                  {Object.entries(contractsByPhone).map(([phone, phoneContracts]) => (
                    <tr key={phone} className="border-t">
                      <td className="px-4 py-3 text-sm text-foreground font-medium">
                        {phoneContracts[0].name || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {phone}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {phoneContracts[0].email || 'N/A'}
                      </td>
                      <td className="px-4 py-3">
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
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {phoneContracts.map((contract, idx) => (
                            <span
                              key={idx}
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${
                                contract.source === 'local'
                                  ? 'bg-primary/20 text-primary'
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
                              <Button
                                key={idx}
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteLocal(contract.id!)}
                                className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            ) : null
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredContracts.map((contract) => (
              <ContractCard key={contract.id || contract.phone} contract={contract} />
            ))}
          </div>
        )
      )}

      {/* Empty State */}
      {!loading && filteredContracts.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No contracts found. Add contracts manually or sync to refresh.
        </div>
      )}
    </div>
  );
}
