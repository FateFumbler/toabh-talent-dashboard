import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Search, FileText, ExternalLink, RefreshCw, Plus, X } from 'lucide-react';
import type { Contract } from '../types/contract';
import { fetchContracts, addContract } from '../services/contractsApi';
import { fetchTalentMaster } from '../services/api';
import type { Talent } from '../types/talent';

export function ContractsTab() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [talents, setTalents] = useState<Talent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [lastSync, setLastSync] = useState<Date | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    contractLink: '',
    talentName: '',
  });
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [contractsData, talentData] = await Promise.all([
        fetchContracts(),
        fetchTalentMaster(),
      ]);

      setContracts(contractsData);
      setTalents(talentData);
      setLastSync(new Date());
    } catch (error) {
      console.error('Failed to load data:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddContract = async () => {
    if (!formData.name || !formData.phone || !formData.contractLink) {
      alert('Please fill in Name, Phone, and Contract Link');
      return;
    }

    setSaving(true);
    try {
      const result = await addContract({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        contractLink: formData.contractLink,
      });
      if (result.success) {
        setFormData({ name: '', email: '', phone: '', contractLink: '', talentName: '' });
        setShowForm(false);
        await loadData();
      } else {
        alert(result.error || 'Failed to add contract. Please try again.');
      }
    } catch (error) {
      console.error('Failed to add contract:', error);
      alert('Failed to add contract. Please try again.');
    }
    setSaving(false);
  };

  const handleTalentSelect = (talentName: string) => {
    const talent = talents.find((t) => t['Full Name'] === talentName);
    if (talent) {
      const talentAny = talent as any;
      setFormData((prev) => ({
        ...prev,
        talentName,
        name: talentAny['Full Name'] || talentName,
        email: talentAny['Email '] || talentAny['Email'] || '',
        phone: talentAny['Phone'] || talentAny['Phone Number'] || '',
      }));
    } else {
      setFormData((prev) => ({ ...prev, talentName }));
    }
  };

  const handleViewContract = (link: string) => {
    if (link && link !== '') {
      window.open(link, '_blank', 'noopener,noreferrer');
    }
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
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Contract
          </Button>
        </div>
      </div>

      {/* Add Contract Form */}
      {showForm && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Add New Contract</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowForm(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Select Talent Dropdown */}
          <div>
            <label className="text-sm font-medium mb-2 block">Select Talent *</label>
            <select
              value={formData.talentName}
              onChange={(e) => handleTalentSelect(e.target.value)}
              className="w-full h-10 px-3 bg-background border border-input rounded-md text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="">Select a talent from Talent Master...</option>
              {talents.map((talent) => {
                const talentAny = talent as any;
                return (
                  <option
                    key={talent.rowIndex}
                    value={talentAny['Full Name'] || ''}
                  >
                    {talentAny['Full Name']} -{' '}
                    {talentAny['Phone'] || talentAny['Phone Number'] || 'No phone'}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Name *
              </label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Enter name"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="Enter email"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Phone *
              </label>
              <Input
                value={formData.phone}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, phone: e.target.value }))
                }
                placeholder="Enter phone number"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Google Doc Link *
              </label>
              <Input
                value={formData.contractLink}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, contractLink: e.target.value }))
                }
                placeholder="Paste Google Doc link..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddContract} disabled={saving}>
              {saving ? 'Adding...' : 'Add Contract'}
            </Button>
          </div>
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
          No contracts found. Click &quot;Add Contract&quot; to add your first
          contract.
        </div>
      )}
    </div>
  );
}
