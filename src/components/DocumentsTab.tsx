import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Search, Folder, FolderOpen, FileText, ExternalLink, RefreshCw, ArrowUpDown, LayoutGrid, List } from 'lucide-react';
import type { DocumentUser } from '../types/document';
import { fetchDocuments } from '../services/documentsApi';

// Placeholder data — replace with API data once URL is provided
const PLACEHOLDER_DATA: DocumentUser[] = [
  {
    fullName: 'Priya Sharma',
    email: 'priya.sharma@email.com',
    phone: '9876543210',
    documents: {
      aadhaar: 'https://drive.google.com/file/d/placeholder_aadhaar_1/view',
      pan: 'https://drive.google.com/file/d/placeholder_pan_1/view',
      passport: 'https://drive.google.com/file/d/placeholder_passport_1/view',
    },
    rowIndex: 1,
  },
  {
    fullName: 'Rahul Verma',
    email: 'rahul.verma@email.com',
    phone: '9123456789',
    documents: {
      aadhaar: 'https://drive.google.com/file/d/placeholder_aadhaar_2/view',
      pan: 'https://drive.google.com/file/d/placeholder_pan_2/view',
      passport: undefined,
    },
    rowIndex: 2,
  },
  {
    fullName: 'Sneha Patel',
    email: 'sneha.patel@email.com',
    phone: '9988776655',
    documents: {
      aadhaar: 'https://drive.google.com/file/d/placeholder_aadhaar_3/view',
      pan: undefined,
      passport: 'https://drive.google.com/file/d/placeholder_passport_3/view',
    },
    rowIndex: 3,
  },
  {
    fullName: 'Arjun Nair',
    email: 'arjun.nair@email.com',
    phone: '9001234567',
    documents: {
      aadhaar: undefined,
      pan: 'https://drive.google.com/file/d/placeholder_pan_4/view',
      passport: 'https://drive.google.com/file/d/placeholder_passport_4/view',
    },
    rowIndex: 4,
  },
];

type SortOption = 'name-az' | 'name-za' | 'newest';

// FolderCard component for grid/list view
const FolderCard = ({
  user,
  onClick,
}: {
  user: DocumentUser;
  onClick: () => void;
}) => (
  <div
    onClick={onClick}
    className="bg-card rounded-xl p-4 hover:bg-accent/30 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer border border-border flex flex-col items-center gap-2"
  >
    <Folder className="w-10 h-10 text-primary mx-auto" />
    <h3 className="font-semibold text-foreground text-center">{user.fullName}</h3>
    <p className="text-muted-foreground text-xs text-center">{user.email || 'N/A'}</p>
  </div>
);

// DocumentCard component for individual documents inside a user's folder
const DocumentCard = ({
  label,
  link,
}: {
  label: string;
  link?: string;
}) => (
  <div className="bg-card rounded-xl p-4 hover:shadow-lg hover:-translate-y-0.5 transition-all border border-border flex flex-col items-center gap-2 min-w-[140px]">
    <FileText className="w-10 h-10 text-primary mx-auto" />
    <span className="text-sm font-medium text-foreground text-center">{label}</span>
    {link ? (
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-500/20 text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300 rounded-lg text-xs font-medium transition-colors"
      >
        View Document <ExternalLink className="h-3 w-3" />
      </a>
    ) : (
      <span className="text-xs text-muted-foreground">Not Uploaded</span>
    )}
  </div>
);

export function DocumentsTab() {
  const [users, setUsers] = useState<DocumentUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'list' | 'grid'>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('name-az');
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<DocumentUser | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      // Try API first, fall back to placeholder data
      const apiData = await fetchDocuments();
      if (apiData.length > 0) {
        setUsers(apiData);
      } else {
        setUsers(PLACEHOLDER_DATA);
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
      setUsers(PLACEHOLDER_DATA);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter by search across all fields
  const filteredUsers = users.filter((user) => {
    const searchLower = search.toLowerCase();
    return (
      user.fullName.toLowerCase().includes(searchLower) ||
      (user.email?.toLowerCase().includes(searchLower)) ||
      (user.phone?.toLowerCase().includes(searchLower))
    );
  });

  // Sort users
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    switch (sortBy) {
      case 'name-az':
        return a.fullName.localeCompare(b.fullName);
      case 'name-za':
        return b.fullName.localeCompare(a.fullName);
      case 'newest':
        return (b.rowIndex || 0) - (a.rowIndex || 0);
      default:
        return 0;
    }
  });

  // Count documents for a user
  const countDocuments = (user: DocumentUser): number => {
    return Object.values(user.documents).filter(Boolean).length;
  };

  // Documents view when a folder is clicked
  if (selectedUser) {
    const { documents } = selectedUser;
    const hasAnyDoc = documents.aadhaar || documents.pan || documents.passport;

    return (
      <div className="space-y-4">
        {/* Back button and title */}
        <div className="px-4 py-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedUser(null)}
            className="mb-3"
          >
            ← Back to Documents
          </Button>
          <h2 className="text-lg font-bold text-foreground">{selectedUser.fullName}</h2>
          <p className="text-xs text-muted-foreground">
            {selectedUser.email && <span>{selectedUser.email} • </span>}
            {selectedUser.phone && <span>{selectedUser.phone}</span>}
          </p>
        </div>

        {/* Document cards */}
        <div className="px-4">
          {hasAnyDoc ? (
            <div className="flex flex-wrap gap-4">
              {documents.aadhaar && (
                <DocumentCard label="Aadhaar Card" link={documents.aadhaar} />
              )}
              {documents.pan && (
                <DocumentCard label="PAN Card" link={documents.pan} />
              )}
              {documents.passport && (
                <DocumentCard label="Passport" link={documents.passport} />
              )}
              {/* Show "Not Uploaded" for missing docs */}
              {!documents.aadhaar && (
                <DocumentCard label="Aadhaar Card" />
              )}
              {!documents.pan && (
                <DocumentCard label="PAN Card" />
              )}
              {!documents.passport && (
                <DocumentCard label="Passport" />
              )}
            </div>
          ) : (
            <div className="flex flex-wrap gap-4">
              <DocumentCard label="Aadhaar Card" />
              <DocumentCard label="PAN Card" />
              <DocumentCard label="Passport" />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main documents view (folder grid/list)
  return (
    <div className="space-y-4">
      {/* Header - title and count on row 1, buttons on row 2 */}
      <div className="px-4 py-3 space-y-3">
        {/* Row 1: Title and count */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">Documents</h2>
            <p className="text-xs text-muted-foreground">
              {users.length} user{users.length !== 1 ? 's' : ''} found
            </p>
          </div>
        </div>

        {/* Row 2: Action buttons */}
        <div className="flex justify-between items-center gap-2 overflow-x-auto">
          {/* Left group: Sync + Sort */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadData} className="px-2 sm:px-3">
              <RefreshCw className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Sync</span>
            </Button>
            {/* Sort dropdown */}
            <div className="relative overflow-hidden">
              <button
                onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
                className="p-2 bg-input border border-border rounded-lg hover:bg-accent transition-colors"
                title="Sort"
              >
                <ArrowUpDown className="h-4 w-4 text-foreground" />
              </button>
              {sortDropdownOpen && (
                <div className="absolute right-0 mt-1 z-50 bg-popover border border-border rounded-xl shadow-xl max-h-[50vh] overflow-y-auto dropdown-animate">
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
                  <button
                    onClick={() => { setSortBy('newest'); setSortDropdownOpen(false); }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-accent transition-colors ${sortBy === 'newest' ? 'text-primary font-medium' : 'text-foreground'}`}
                  >
                    Recently Added
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right group: View toggle */}
          <div className="flex items-center gap-2">
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
          </div>
        </div>
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
          Loading documents...
        </div>
      )}

      {/* Grid View */}
      {!loading && sortedUsers.length > 0 && view === 'grid' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 px-4">
          {sortedUsers.map((user) => (
            <FolderCard
              key={user.fullName}
              user={user}
              onClick={() => setSelectedUser(user)}
            />
          ))}
        </div>
      )}

      {/* List View */}
      {!loading && sortedUsers.length > 0 && view === 'list' && (
        <Card className="overflow-hidden mx-4">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Full Name
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Phone
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Documents
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedUsers.map((user) => (
                  <tr
                    key={user.fullName}
                    className="border-t cursor-pointer hover:bg-accent/30 transition-colors"
                    onClick={() => setSelectedUser(user)}
                  >
                    <td className="px-4 py-3 text-sm text-foreground font-medium">
                      {user.fullName}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {user.email || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {user.phone || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {countDocuments(user)} / 3
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {!loading && sortedUsers.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No documents found.
        </div>
      )}
    </div>
  );
}
