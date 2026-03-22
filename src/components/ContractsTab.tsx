import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Search, FileText, ExternalLink, RefreshCw } from 'lucide-react';

interface Contract {
  'Full Name': string;
  'Email': string;
  'Phone Number': string;
  'Contract Drive Link': string;
  rowIndex?: number;
}

export function ContractsTab() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const fetchContracts = async () => {
    setLoading(true);
    try {
      // Use the same API pattern as talent-master
      const response = await fetch(
        'https://script.google.com/macros/s/AKfycbyrHsfBPmcSb9YeAUKH9cQ0taILerK7VQ8kNjpI_OZvwSYgD2zw6Sh-xSgVKV40_bWIPQ/exec?action=contracts'
      );
      const data = await response.json();
      if (data.contracts) {
        setContracts(data.contracts);
        setLastSync(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch contracts:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchContracts();
  }, []);

  // Filter contracts by search
  const filteredContracts = contracts.filter(contract => {
    const searchLower = search.toLowerCase();
    return (
      contract['Full Name']?.toLowerCase().includes(searchLower) ||
      contract['Email']?.toLowerCase().includes(searchLower) ||
      contract['Phone Number']?.toLowerCase().includes(searchLower)
    );
  });

  // Group contracts by Phone Number (for talents with multiple contracts)
  const contractsByPhone = filteredContracts.reduce((acc, contract) => {
    const phone = contract['Phone Number'] || 'Unknown';
    if (!acc[phone]) {
      acc[phone] = [];
    }
    acc[phone].push(contract);
    return acc;
  }, {} as Record<string, Contract[]>);

  const handleViewContract = (link: string) => {
    if (link && link !== '') {
      window.open(link, '_blank', 'noopener,noreferrer');
    }
  };

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
        <Button variant="outline" size="sm" onClick={fetchContracts}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Sync
        </Button>
      </div>

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
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Full Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Phone Number</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Contracts</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(contractsByPhone).map(([phone, phoneContracts]) => (
                  <tr key={phone} className="border-t">
                    <td className="px-4 py-3 text-sm text-foreground">
                      {phoneContracts[0]['Full Name'] || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {phoneContracts[0]['Email'] || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {phone}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {phoneContracts.map((contract, idx) => (
                          <Button
                            key={idx}
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewContract(contract['Contract Drive Link'])}
                            className="text-xs"
                          >
                            <FileText className="h-3 w-3 mr-1" />
                            Contract {idx + 1}
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
          No contracts found
        </div>
      )}
    </div>
  );
}
