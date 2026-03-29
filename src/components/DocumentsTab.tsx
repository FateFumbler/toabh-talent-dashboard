import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Search, Folder, FileText, ExternalLink, RefreshCw, ArrowUpDown, LayoutGrid, List } from 'lucide-react';
import type { DocumentUser } from '../types/document';
import { fetchDocuments } from '../services/documentsApi';

// Extract Google Drive file ID from various URL formats
function extractDriveFileId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /\/open\?id=([a-zA-Z0-9_-]+)/,
    /\/document\/d\/([a-zA-Z0-9_-]+)/,
    /\/thumbnail\?id=([a-zA-Z0-9_-]+)/,
    /id=([a-zA-Z0-9_-]+)/,
    /\/uc\?.*id=([a-zA-Z0-9_-]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Normalize Google Drive URL to view format
function normalizeDriveUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  
  // Already a valid view URL
  if (trimmed.includes('/view') || trimmed.includes('drive.google.com/thumbnail')) {
    return trimmed;
  }
  
  const fileId = extractDriveFileId(trimmed);
  if (fileId) {
    // Check if it's a Google Doc
    if (trimmed.includes('/document/d/')) {
      return `https://docs.google.com/document/d/${fileId}/edit`;
    }
    return `https://drive.google.com/file/d/${fileId}/view`;
  }
  
  return trimmed;
}

// Get display-friendly label for document types
function getDocumentLabel(type: string, side?: string): string {
  switch (type) {
    case 'aadhaarFront':
      return 'Aadhaar Front';
    case 'aadhaarBack':
      return 'Aadhaar Back';
    case 'pan':
      return 'PAN Card';
    case 'passportFront':
      return 'Passport Front';
    case 'passportBack':
      return 'Passport Back';
    default:
      return type;
  }
}

// Get icon for document type
function getDocumentIcon(type: string): string {
  switch (type) {
    case 'aadhaarFront':
    case 'aadhaarBack':
      return '🪪';
    case 'pan':
      return '🆔';
    case 'passportFront':
    case 'passportBack':
      return '📘';
    default:
      return '📄';
  }
}

type SortOption = 'name-az' | 'name-za' | 'newest';

// FolderCard component for grid/list view
const FolderCard = ({
  user,
  onClick,
}: {
  user: DocumentUser;
  onClick: () => void;
}) => {
  const docCount = useMemo(() => {
    return Object.values(user.documents).filter(Boolean).length;
  }, [user.documents]);
  
  return (
    <div
      onClick={onClick}
      className="bg-card rounded-xl p-4 hover:bg-accent/30 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer border border-border flex flex-col items-center gap-2"
    >
      <Folder className="w-10 h-10 text-primary mx-auto" />
      <h3 className="font-semibold text-foreground text-center">{user.fullName}</h3>
      <p className="text-muted-foreground text-xs text-center">{user.email || 'N/A'}</p>
      {docCount > 0 && (
        <span className="text-xs text-muted-foreground">{docCount} document{docCount !== 1 ? 's' : ''}</span>
      )}
    </div>
  );
};

// DocumentCard component for individual documents inside a user's folder
const DocumentCard = ({
  label,
  icon,
  link,
}: {
  label: string;
  icon: string;
  link?: string;
}) => {
  const normalizedLink = link ? normalizeDriveUrl(link) : undefined;
  
  return (
    <div className="bg-card rounded-xl p-4 hover:shadow-lg hover:-translate-y-0.5 transition-all border border-border flex flex-col items-center gap-2 min-w-[140px]">
      <span className="text-3xl">{icon}</span>
      <span className="text-sm font-medium text-foreground text-center">{label}</span>
      {normalizedLink ? (
        <a
          href={normalizedLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-500/20 text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300 rounded-lg text-xs font-medium transition-colors"
        >
          View Document <ExternalLink className="h-3 w-3" />
        </a>
      ) : (
        <span className="text-xs text-muted-foreground px-2 py-1 bg-muted/50 rounded">Not Uploaded</span>
      )}
    </div>
  );
};

// List row for a single document type
const DocumentListRow = ({
  label,
  icon,
  link,
}: {
  label: string;
  icon: string;
  link?: string;
}) => {
  const normalizedLink = link ? normalizeDriveUrl(link) : undefined;
  
  return (
    <div className="flex items-center justify-between py-2 px-3 hover:bg-accent/30 rounded-lg transition-colors">
      <div className="flex items-center gap-3">
        <span className="text-xl">{icon}</span>
        <span className="text-sm font-medium text-foreground">{label}</span>
      </div>
      {normalizedLink ? (
        <a
          href={normalizedLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-500/20 text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300 rounded-lg text-xs font-medium transition-colors"
        >
          View <ExternalLink className="h-3 w-3" />
        </a>
      ) : (
        <span className="text-xs text-muted-foreground px-2 py-1 bg-muted/50 rounded">Not Uploaded</span>
      )}
    </div>
  );
};

export function DocumentsTab() {
  const [users, setUsers] = useState<DocumentUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'list' | 'grid'>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('name-az');
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<DocumentUser | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const apiData = await fetchDocuments();
      setUsers(apiData);
    } catch (error) {
      console.error('Failed to load documents:', error);
      setUsers([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Memoized filtered users for search
  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const searchLower = search.toLowerCase();
    return users.filter((user) => {
      return (
        user.fullName.toLowerCase().includes(searchLower) ||
        (user.email?.toLowerCase().includes(searchLower)) ||
        (user.phone?.includes(searchLower))
      );
    });
  }, [users, search]);

  // Memoized sorted users
  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => {
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
  }, [filteredUsers, sortBy]);

  // Memoized document types list for selected user
  const documentTypes = useMemo(() => {
    return [
      { key: 'aadhaarFront', label: 'Aadhaar Front', icon: '🪪' },
      { key: 'aadhaarBack', label: 'Aadhaar Back', icon: '🪪' },
      { key: 'pan', label: 'PAN Card', icon: '🆔' },
      { key: 'passportFront', label: 'Passport Front', icon: '📘' },
      { key: 'passportBack', label: 'Passport Back', icon: '📘' },
    ];
  }, []);

  // Documents view when a folder is clicked
  if (selectedUser) {
    const { documents } = selectedUser;

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
            {!selectedUser.email && !selectedUser.phone && <span>No contact info</span>}
          </p>
        </div>

        {/* Document cards - responsive grid */}
        <div className="px-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {documentTypes.map(({ key, label, icon }) => {
              const link = (documents as Record<string, string | undefined>)[key];
              return (
                <DocumentCard
                  key={key}
                  label={label}
                  icon={icon}
                  link={link}
                />
              );
            })}
          </div>
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
              {sortedUsers.length} user{sortedUsers.length !== 1 ? 's' : ''} found
              {users.length !== sortedUsers.length && ` (${users.length} total)`}
            </p>
          </div>
        </div>

        {/* Row 2: Action buttons */}
        <div className="flex justify-between items-center gap-2 overflow-x-auto">
          {/* Left group: Sync + Sort */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadData} className="px-2 sm:px-3">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline ml-1">Sync</span>
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
          {sortedUsers.map((user, index) => (
            <FolderCard
              key={`${user.fullName}-${user.rowIndex || index}`}
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
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedUsers.map((user, index) => {
                  const docCount = Object.values(user.documents).filter(Boolean).length;
                  return (
                    <tr
                      key={`${user.fullName}-${user.rowIndex || index}`}
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
                        {docCount} / 5
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedUser(user);
                          }}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {!loading && sortedUsers.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          {users.length === 0 ? (
            <>
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No documents found.</p>
              <p className="text-xs mt-2">Click Sync to refresh or check if the API is configured.</p>
            </>
          ) : (
            <p>No documents match your search.</p>
          )}
        </div>
      )}
    </div>
  );
}
