import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Search, FileText, ExternalLink, RefreshCw, Plus, Trash2 } from 'lucide-react';
import type { Contract } from '../types/contract';
import { fetchContracts } from '../services/contractsApi';
import { getLocalContracts, addLocalContract, deleteLocalContract } from '../services/localContracts';

export function ContractsTab() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [lastSync, setLastSync] = useState<Date | null>(null);

  // Form state for adding new contract
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    contractLink: '',
  });
  const [formError, setFormError] = useState('');

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

  // Filter contracts by search
  const filteredContracts = contracts.filter((contract) => {
    const searchLower = search.toLowerCase();
    return (
      contract.name?.toLowerCase().includes(searchLower) ||
      contract.email?.toLowerCase().includes(searchLower) ||
      contract.phone?.toLowerCase().includes(searchLower)
    );
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
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Sync
          </Button>
          <Button variant="default" size="sm" onClick={() => setShowAddForm(!showAddForm)}>
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
              <Button type="button" variant="outline" size="sm" onClick={() => setShowAddForm(false)}>
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

      {/* Contracts Table */}
      {!loading && filteredContracts.length > 0 && (
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
