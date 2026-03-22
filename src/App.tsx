import { useState, useEffect, useCallback, useMemo } from "react";
import { TalentTable } from "./components/TalentTable";
import { TalentProfileDialog } from "./components/TalentProfile";
import { ContractsTab } from "./components/ContractsTab";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Card, CardContent } from "./components/ui/card";
import { BorderGlow } from "./components/ui/BorderGlow";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Badge } from "./components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { fetchTalentMaster, fetchTalentDetails, updateStatus, assignManager } from "./services/api";
import type { Talent, TalentDetails } from "@/types/talent";
import { RefreshCw, AlertCircle, LayoutGrid, List, User, Search, ExternalLink, FileText, Loader2, ChevronDown, Settings as SettingsIcon } from "lucide-react";
import { toast, Toaster } from "sonner";
import { Settings, type Theme, getStoredTheme, useTheme } from "./components/Settings";

const REFRESH_INTERVAL = 30000; // 30 seconds

// Parse Instagram value to full URL
function parseInstagram(value: string): string {
  if (!value) return '';
  const trimmed = value.trim();
  // If already a full URL (starts with http/https), use as-is
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  // Otherwise treat as username/handle
  // Remove @ if present
  let username = trimmed.replace(/^@/, '');
  // Remove any existing instagram.com prefix
  username = username.replace(/^(https?:\/\/)?(www\.)?instagram\.com\//, '');
  // Remove any query params or fragments
  username = username.split('?')[0].split('#')[0];
  // Remove trailing slashes
  username = username.replace(/\/+$/, '');
  return `https://instagram.com/${username}`;
}

// Helper to render Instagram as clickable link
const renderInstagramLink = (instagram: string | undefined): React.ReactNode => {
  if (!instagram || instagram.trim() === "") return <span className="text-muted-foreground">-</span>;
  const url = parseInstagram(instagram);
  // Strip URL prefix and any query params/fragments, keep just the handle
  const display = instagram.trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//, "@")
    .replace(/\/+$/, "")
    .split('?')[0]
    .split('#')[0];
  // Ensure it starts with @
  const handle = display.startsWith('@') ? display : `@${display}`;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
      {handle}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
};

// Merge talent-master with talent-details by phone number (primary) or email (fallback)
function mergeTalentWithDetails(talent: Talent, detailsMap: Map<string, TalentDetails>): Talent & Partial<TalentDetails> {
  const phone = String(talent["Phone"] || "").trim();
  const email = (talent["Email "] || "").trim().toLowerCase();
  
  let details: TalentDetails | undefined;
  
  // Try phone match first
  if (phone) {
    details = detailsMap.get(phone);
  }
  
  // Fallback to email match
  if (!details && email) {
    for (const d of detailsMap.values()) {
      if ((d["Email Address"] || "").trim().toLowerCase() === email) {
        details = d;
        break;
      }
    }
  }
  
  if (!details) {
    return talent;
  }
  
  return {
    ...talent,
    // From talent-details - use exact Google Sheet column names
    "Full Name": details["Full Name"] || talent["Full Name"],
    "Email Address": details["Email Address"],
    "Phone Number": details["Phone Number"],
    "Gender": details["Gender"] || talent["Gender"],
    "Age": details["Age"] || talent["Age"],
    "Date of Birth": details["Date of Birth"],
    "Nationality": details["Nationality"],
    "City & State": details["City & State"],
    "Height (in feet & inches)": details["Height (in feet & inches)"] || talent["Height"],
    "Chest/Bust (in inches)": details["Chest/Bust (in inches)"],
    "Waist (in inches)": details["Waist (in inches)"],
    "Hips (in inches)": details["Hips (in inches)"],
    "Shoe Size (UK)": details["Shoe Size (UK)"],
    "Hair Color": details["Hair Color"],
    "Eye Color": details["Eye Color"],
    "Skin Tone": details["Skin Tone"],
    "Instagram Link": details["Instagram Link"],
    "YouTube Channel": details["YouTube Channel"],
    "IMDb": details["IMDb"],
    "Prior modelling/acting experience": details["Prior modelling/acting experience"],
    "Previous Agency": details["Previous Agency"],
    "Acting Workshop Attended": details["Acting Workshop Attended"],
    "CINTAA/Union Card": details["CINTAA/Union Card"],
    "Languages Known": details["Languages Known"],
    "Dance Forms": details["Dance Forms"],
    "Extra-Curricular": details["Extra-Curricular"],
    "Scope of Work Interested In": details["Scope of Work Interested In"],
    "Open for placement abroad": details["Open for placement abroad"],
    "Valid Passport": details["Valid Passport"],
    "Can drive 2-wheeler": details["Can drive 2-wheeler"],
    "Can drive 4-wheeler": details["Can drive 4-wheeler"],
    "Can Swim": details["Can Swim"],
    "Gamer": details["Gamer"],
    "Lingerie/bikini shoots": details["Lingerie/bikini shoots"],
    "Bold content for web/films": details["Bold content for web/films"],
    "Condom brand promotions": details["Condom brand promotions"],
    "Alcohol brand shoots": details["Alcohol brand shoots"],
    "Reality TV shows": details["Reality TV shows"],
    "Daily soaps": details["Daily soaps"],
    "Mother/father roles": details["Mother/father roles"],
    "Haircut": details["Haircut"],
    "Hair color changes": details["Hair color changes"],
    "Upload Polaroids (Required)": details["Upload Polaroids (Required)"],
  };
}

// Extract Google Drive file ID from various URL formats
function extractDriveFileId(url: string): string | null {
  if (!url) return null;
  
  // Match /file/d/FILE_ID or /open?id=FILE_ID or /thumbnail?id=FILE_ID etc.
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /\/open\?id=([a-zA-Z0-9_-]+)/,
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

// Convert Drive link to thumbnail URL
function getDriveThumbnailUrl(url: string): string | null {
  const fileId = extractDriveFileId(url);
  if (!fileId) return null;
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
}

// Get full-size Drive image URL
function getDriveImageUrl(url: string): string | null {
  const fileId = extractDriveFileId(url);
  if (!fileId) return null;
  return `https://drive.google.com/uc?export=view&id=${fileId}`;
}

// Parse polaroid links (may be comma or newline separated)
function parsePolaroidLinks(polaroidField: string | undefined): string[] {
  if (!polaroidField || !polaroidField.trim()) return [];
  // Split by comma or newline
  return polaroidField.split(/[,\n]/).map(s => s.trim()).filter(Boolean);
}

// Render a polaroid thumbnail or link
function PolaroidGallery({ links }: { links: string[] }) {
  if (links.length === 0) {
    return <span className="text-muted-foreground/50">Not provided</span>;
  }
  
  return (
    <div className="flex flex-wrap gap-2">
      {links.map((link, idx) => {
        const thumbnailUrl = getDriveThumbnailUrl(link);
        const fullUrl = getDriveImageUrl(link);
        
        if (thumbnailUrl && fullUrl) {
          return (
            <a
              key={idx}
              href={fullUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative"
            >
              <img
                src={thumbnailUrl}
                alt={`Polaroid ${idx + 1}`}
                className="h-20 w-20 object-cover rounded-lg border border-border/50 hover:border-primary/50 transition-colors"
                onError={(e) => {
                  // Fallback to text link if image fails
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <div className="hidden absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                <ExternalLink className="h-5 w-5 text-white" />
              </div>
            </a>
          );
        }
        
        // Fallback: show text link with icon
        return (
          <a
            key={idx}
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline text-sm"
          >
            <FileText className="h-4 w-4" />
            View {idx + 1}
          </a>
        );
      })}
    </div>
  );
}

function App() {
  const [talents, setTalents] = useState<Talent[]>([]);
  const [talentDetailsMap, setTalentDetailsMap] = useState<Map<string, TalentDetails>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedTalent, setSelectedTalent] = useState<string | null>(null);
  const [selectedTalentRowIndex, setSelectedTalentRowIndex] = useState<number | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  // Track pending updates per rowIndex to show loading state on action buttons
  const [pendingUpdates, setPendingUpdates] = useState<Record<number, "status" | "manager">>({});
  // Tab navigation
  const [activeTab, setActiveTab] = useState<"talent-master" | "talent-profile" | "settings" | "contracts">("talent-master");
  // Theme state
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);
  const { setTheme } = useTheme();

  const handleThemeChange = (t: Theme) => {
    setThemeState(t);
    setTheme(t);
  };
  // View mode (list/grid), persisted to localStorage
  // Auto-detect default based on screen size: mobile (<768) & tablet (<1024) default to grid, desktop to list
  const [viewMode, setViewMode] = useState<"list" | "grid">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("toabh-view-mode") as "list" | "grid";
      if (saved) return saved;
      // Auto-detect based on screen width
      const width = window.innerWidth;
      if (width < 1024) return "grid"; // Mobile & tablet default to grid
      return "list"; // Desktop default to list
    }
    return "list";
  });
  // Profile tab search
  const [profileSearch, setProfileSearch] = useState("");
  const [selectedProfile, setSelectedProfile] = useState<(Talent & Partial<TalentDetails>) | null>(null);
  // Mobile filters visibility
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Track window width for responsive behavior
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1200
  );
  
  // Update window width on resize
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  // Active tile for quick filters (bi-directional sync with status dropdown)
  const [activeTile, setActiveTile] = useState<string | null>(null);

  const loadTalents = useCallback(async () => {
    try {
      setError(null);
      const [talentData, detailsData] = await Promise.all([
        fetchTalentMaster(),
        fetchTalentDetails()
      ]);
      
      // Filter out empty rows from talent-master
      const validTalents = talentData.filter(
        (t) => t["Full Name"] && t["Full Name"].trim() !== ""
      );
      
      // Sort talents by rowIndex descending (newest first)
      // Higher rowIndex = newer entry in the sheet
      const sortedTalents = [...validTalents].sort((a, b) => {
        const aRow = a.rowIndex || 0;
        const bRow = b.rowIndex || 0;
        return bRow - aRow; // Descending: highest rowIndex first
      });
      
      // Build details map keyed by phone number
      const detailsMap = new Map<string, TalentDetails>();
      for (const d of detailsData) {
        if (d["Phone Number"]) {
          detailsMap.set(String(d["Phone Number"]).trim(), d);
        }
      }
      
      setTalents(sortedTalents);
      setTalentDetailsMap(detailsMap);
      setLastUpdated(new Date());
    } catch (err) {
      setError("Failed to load talents. Please check your connection.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTalents();
  }, [loadTalents]);

  useEffect(() => {
    const interval = setInterval(loadTalents, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [loadTalents]);

  const handleStatusUpdate = async (row: number, status: string) => {
    setPendingUpdates((prev) => ({ ...prev, [row]: "status" }));
    try {
      await updateStatus(row, status);
      toast.success(`Status updated to "${status}"`);
      // Refresh to reflect the change
      await loadTalents();
    } catch (err) {
      toast.error("Failed to update status. Please try again.");
      console.error(err);
    } finally {
      setPendingUpdates((prev) => {
        const next = { ...prev };
        delete next[row];
        return next;
      });
    }
  };

  const handleManagerAssign = async (row: number, manager: string) => {
    setPendingUpdates((prev) => ({ ...prev, [row]: "manager" }));
    try {
      await assignManager(row, manager);
      toast.success(`Manager assigned: ${manager}`);
      // Refresh to reflect the change
      await loadTalents();
    } catch (err) {
      toast.error("Failed to assign manager. Please try again.");
      console.error(err);
    } finally {
      setPendingUpdates((prev) => {
        const next = { ...prev };
        delete next[row];
        return next;
      });
    }
  };

  const handleTalentClick = (name: string, rowIndex: number) => {
    setSelectedTalent(name);
    setSelectedTalentRowIndex(rowIndex);
    setProfileOpen(true);
  };

  const handleViewModeChange = (mode: "list" | "grid") => {
    setViewMode(mode);
    localStorage.setItem("toabh-view-mode", mode);
  };

  // Handle tile click for quick filtering
  const handleTileClick = (tile: string) => {
    if (tile === 'Total') {
      setActiveTile(null);
    } else {
      setActiveTile(tile);
    }
  };

  // Handle status filter change from dropdown (bi-directional sync)
  const handleStatusFilterChange = (status: string) => {
    if (status === 'all') {
      setActiveTile(null);
    } else {
      setActiveTile(status);
    }
  };

  // Get merged talent for profile display
  const getMergedTalent = useCallback((talent: Talent): (Talent & Partial<TalentDetails>) => {
    return mergeTalentWithDetails(talent, talentDetailsMap);
  }, [talentDetailsMap]);

  // Stats
  const totalTalents = talents.length;
  const onboardedCount = talents.filter((t) => t["Status"] === "Onboarded").length;
  const meetingRequiredCount = talents.filter((t) => t["Status"] === "Meeting Required").length;
  const kycRequiredCount = talents.filter((t) => t["Status"] === "KYC Required").length;

  // Profile search filtering - using merged data
  const profileSearchResults = useMemo(() => {
    const mergedResults = talents.map(t => getMergedTalent(t));
    if (!profileSearch.trim()) return mergedResults.slice(0, 20); // Show first 20 if no search
    const search = profileSearch.toLowerCase();
    return mergedResults.filter(t =>
      t["Full Name"]?.toLowerCase().includes(search) ||
      (t["Instagram Link"] || t["Instagram"] || "")?.toLowerCase().includes(search) ||
      (t["City & State"] || t["City"] || "")?.toLowerCase().includes(search)
    ).slice(0, 20);
  }, [talents, profileSearch, getMergedTalent]);

  const getStatusVariant = (status: string): "default" | "success" | "warning" | "destructive" | "info" => {
    switch (status) {
      case "Onboarded": return "success";
      case "Meeting Required": return "warning";
      case "KYC Required": return "info";
      case "Rejected": return "destructive";
      case "New": return "default";
      default: return "default";
    }
  };

  // Helper to format date values (YYYY-MM-DD only, no timestamp)
  const formatDateValue = (value: string | number | undefined | null): string | number | undefined | null => {
    if (!value) return value;
    const str = value.toString();
    return str.split('T')[0];
  };

  const renderProfileField = (label: string, value: string | number | undefined | null) => {
    if (!value || value.toString().trim() === "") {
      return (
        <div className="text-sm">
          <dt className="text-muted-foreground font-medium">{label}</dt>
          <dd className="text-muted-foreground/50 mt-0.5">Not provided</dd>
        </div>
      );
    }
    return (
      <div className="text-sm">
        <dt className="text-muted-foreground font-medium">{label}</dt>
        <dd className="mt-0.5 text-foreground">{value}</dd>
      </div>
    );
  };

  const renderClickableLink = (label: string, value: string | undefined, baseUrl: string = "") => {
    if (!value || value.trim() === "") {
      return renderProfileField(label, value);
    }
    const trimmed = value.trim();
    let href = trimmed;
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
      href = baseUrl + trimmed;
    }
    return (
      <div className="text-sm">
        <dt className="text-muted-foreground font-medium">{label}</dt>
        <dd className="mt-0.5">
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
            {trimmed}
            <ExternalLink className="h-3 w-3" />
          </a>
        </dd>
      </div>
    );
  };

  const renderYesNoField = (label: string, value: string | undefined) => {
    if (!value || value.trim() === "") {
      return renderProfileField(label, value);
    }
    const trimmed = value.trim();
    const isYes = /^(yes|y|true|1)$/i.test(trimmed);
    // Capitalize first letter: "no" -> "No", "yes" -> "Yes"
    const displayValue = trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
    return (
      <div className="text-sm">
        <dt className="text-muted-foreground font-medium">{label}</dt>
        <dd className={`mt-0.5 ${isYes ? "text-green-500" : "text-muted-foreground"}`}>
          {displayValue}
        </dd>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="glass sticky top-0 z-10 border-b border-border/50" style={{ paddingTop: 'env(safe-area-inset-top, 0)' }}>
        <div className="container mx-auto px-4 py-4">
          {/* Mobile: logo centered on top with title below, tight spacing */}
          <div className="flex flex-col items-center gap-1">
            {/* Logo - white on dark mode, black on light mode */}
            <img 
              src="/logo_white.png" 
              alt="TOABH" 
              className="hidden dark:block h-8 w-auto" 
            />
            <img 
              src="/logo_black.png" 
              alt="TOABH" 
              className="block dark:hidden h-8 w-auto" 
            />
            {/* Title */}
            <h1 className="text-base font-bold text-foreground tracking-tight">
              Scouting Dashboard
            </h1>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between border-b border-border/50 pb-px">
          <div className="flex items-center gap-4 sm:gap-8">
            <button
              onClick={() => setActiveTab("talent-master")}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 text-sm font-medium transition-colors relative ${
                activeTab === "talent-master"
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <List className="h-4 w-4" />
              <span className="hidden xs:inline">Talent Master</span>
              <span className="xs:hidden">Talent</span>
              {activeTab === "talent-master" && (
                <span className="absolute bottom-0 left-0 right-0 h-px bg-primary" />
              )}
            </button>
            {/* [HIDDEN] Talent Profile nav button - kept for future use
            <button
              onClick={() => setActiveTab("talent-profile")}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors relative ${
                activeTab === "talent-profile"
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <User className="h-4 w-4" />
              Talent Profile
              {activeTab === "talent-profile" && (
                <span className="absolute bottom-0 left-0 right-0 h-px bg-primary" />
              )}
            </button>
            */}
            <button
              onClick={() => setActiveTab("contracts")}
              className={`flex items-center gap-2 px-2 sm:px-4 py-2.5 text-sm font-medium transition-colors relative ${
                activeTab === "contracts"
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileText className="h-4 w-4" />
              <span className="text-sm">Contracts</span>
              {activeTab === "contracts" && (
                <span className="absolute bottom-0 left-0 right-0 h-px bg-primary" />
              )}
            </button>
          </div>
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 text-sm font-medium transition-colors relative ${
              activeTab === "settings"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <SettingsIcon className="h-4 w-4" />
            <span className="hidden xs:inline">Settings</span>
            {activeTab === "settings" && (
              <span className="absolute bottom-0 left-0 right-0 h-px bg-primary" />
            )}
          </button>
        </div>
      </div>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Stats Cards - horizontally scrollable on mobile */}
        <div className="relative">
          {activeTile !== null && (
            <button
              onClick={() => handleTileClick('Total')}
              className="absolute -top-2 right-0 z-10 flex items-center gap-1 px-2 py-1 text-xs bg-indigo-500/20 text-indigo-400 rounded-full hover:bg-indigo-500/30 transition-colors border border-indigo-500/50"
            >
              <span>Clear filter</span>
              <span>✕</span>
            </button>
          )}
          <div className="stats-scroll mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <BorderGlow color="#a855f7" intensity={2.4} className="h-full">
              <Card 
                className={`hover-glow transition-all duration-300 cursor-pointer stats-card flex flex-col justify-between h-full p-3 border-l-8 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)] ${
                  activeTile === null ? 'ring-2 ring-indigo-500/50 bg-zinc-800/80' : ''
                }`}
                onClick={() => handleTileClick('Total')}
              >
                <h3 className="text-gray-400 text-xs uppercase flex items-center justify-between">
                  Total Talents
                  {activeTile === null && (
                    <span className="h-2 w-2 rounded-full bg-indigo-500" />
                  )}
                </h3>
                <p className="text-xl font-bold text-white bg-gray-700/50 rounded-xl px-3 py-2 mt-2 text-center">{totalTalents}</p>
              </Card>
            </BorderGlow>
            <BorderGlow color="#3b82f6" intensity={2.4} className="h-full">
              <Card 
                className={`hover-glow transition-all duration-300 cursor-pointer stats-card flex flex-col justify-between h-full p-3 border-l-8 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.4)] ${
                  activeTile === 'Meeting Required' ? 'ring-2 ring-indigo-500/50 bg-zinc-800/80' : ''
                }`}
                onClick={() => handleTileClick('Meeting Required')}
              >
                <h3 className="text-gray-400 text-xs uppercase flex items-center justify-between">
                  Meeting Scheduled
                  {activeTile === 'Meeting Required' && (
                    <span className="h-2 w-2 rounded-full bg-indigo-500" />
                  )}
                </h3>
                <p className="text-xl font-bold text-white bg-gray-700/50 rounded-xl px-3 py-2 mt-2 text-center">{meetingRequiredCount}</p>
              </Card>
            </BorderGlow>
            <BorderGlow color="#f97316" intensity={2.4} className="h-full">
              <Card 
                className={`hover-glow transition-all duration-300 cursor-pointer stats-card flex flex-col justify-between h-full p-3 border-l-8 border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.4)] ${
                  activeTile === 'KYC Required' ? 'ring-2 ring-indigo-500/50 bg-zinc-800/80' : ''
                }`}
                onClick={() => handleTileClick('KYC Required')}
              >
                <h3 className="text-gray-400 text-xs uppercase flex items-center justify-between">
                  Contract Signing
                  {activeTile === 'KYC Required' && (
                    <span className="h-2 w-2 rounded-full bg-indigo-500" />
                  )}
                </h3>
                <p className="text-xl font-bold text-white bg-gray-700/50 rounded-xl px-3 py-2 mt-2 text-center">{kycRequiredCount}</p>
              </Card>
            </BorderGlow>
            <BorderGlow color="#22c55e" intensity={2.4} className="h-full">
              <Card 
                className={`hover-glow transition-all duration-300 cursor-pointer stats-card flex flex-col justify-between h-full p-3 border-l-8 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)] ${
                  activeTile === 'Onboarded' ? 'ring-2 ring-indigo-500/50 bg-zinc-800/80' : ''
                }`}
                onClick={() => handleTileClick('Onboarded')}
              >
                <h3 className="text-gray-400 text-xs uppercase flex items-center justify-between">
                  Onboarded
                  {activeTile === 'Onboarded' && (
                    <span className="h-2 w-2 rounded-full bg-indigo-500" />
                  )}
                </h3>
                <p className="text-xl font-bold text-white bg-gray-700/50 rounded-xl px-3 py-2 mt-2 text-center">{onboardedCount}</p>
              </Card>
            </BorderGlow>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <Card className="mb-6 border-destructive/50 bg-destructive/10">
            <CardContent className="flex items-center gap-2 py-4 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </CardContent>
          </Card>
        )}

        {/* Talent Master Tab */}
        {activeTab === "talent-master" && (
          <ErrorBoundary>
          <>
            {/* Sync & View Toggle Row */}
            <div className="flex items-center justify-between mb-4 px-2 py-2 bg-gray-800/50 rounded-lg">
              {/* Left: Sync button */}
              <button
                onClick={loadTalents}
                disabled={isLoading}
                className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                <span className="text-sm">Sync</span>
              </button>
              
              {/* Right: View toggle */}
              <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
                {/* Mobile: Show filter toggle */}
                <button
                  onClick={() => setFiltersOpen(!filtersOpen)}
                  className="md:hidden p-2 rounded-md transition-colors text-muted-foreground hover:text-foreground"
                  title="Toggle Filters"
                >
                  <Search className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleViewModeChange("list")}
                  className={`px-3 py-2 rounded-md transition-colors ${
                    viewMode === "list"
                      ? "bg-purple-600 text-white"
                      : "text-gray-400 hover:text-white"
                  }`}
                  title="List View"
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleViewModeChange("grid")}
                  className={`px-3 py-2 rounded-md transition-colors ${
                    viewMode === "grid"
                      ? "bg-purple-600 text-white"
                      : "text-gray-400 hover:text-white"
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* List view: only show on desktop when in list mode */}
            {viewMode === "list" && windowWidth >= 1024 && (
              <TalentTable
                talents={talents}
                onStatusUpdate={handleStatusUpdate}
                onManagerAssign={handleManagerAssign}
                onTalentClick={handleTalentClick}
                isLoading={isLoading}
                onRefresh={loadTalents}
                lastUpdated={lastUpdated}
                pendingUpdates={pendingUpdates}
                statusFilter={activeTile || "all"}
                onStatusFilterChange={handleStatusFilterChange}
              />
            )}
            
            {/* Grid view: shown on mobile/tablet OR when grid mode is selected on desktop */}
            {viewMode === "grid" || windowWidth < 1024 ? (
              <TalentGridView
                talents={talents}
                talentDetailsMap={talentDetailsMap}
                isLoading={isLoading}
                onTalentClick={handleTalentClick}
                pendingUpdates={pendingUpdates}
                onStatusUpdate={handleStatusUpdate}
                onManagerAssign={handleManagerAssign}
                filtersOpen={filtersOpen}
                onFiltersToggle={() => setFiltersOpen(!filtersOpen)}
                statusFilter={activeTile || "all"}
                onStatusFilterChange={handleStatusFilterChange}
              />
            ) : null}
          </>
          </ErrorBoundary>
        )}

        {/* Talent Profile Tab */}
        {activeTab === "talent-profile" && (
          <div className="space-y-6">
            {/* Search */}
            <Card className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search talent by name, Instagram, or city..."
                  value={profileSearch}
                  onChange={(e) => setProfileSearch(e.target.value)}
                  className="pl-10 bg-input/50"
                />
              </div>
              {profileSearch.trim() && (
                <div className="mt-2 text-sm text-muted-foreground">
                  {profileSearchResults.length} result{profileSearchResults.length !== 1 ? "s" : ""} found
                </div>
              )}
            </Card>

            {/* Search Results / Selection */}
            {!selectedProfile ? (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  {profileSearch.trim() ? "Search Results" : "Recent Talents"}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {profileSearchResults.map((talent) => (
                    <Card
                      key={talent.rowIndex}
                      className="p-4 hover:bg-accent/30 cursor-pointer transition-colors"
                      onClick={() => setSelectedProfile(talent)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="bg-primary/20 p-2 rounded-lg">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground truncate capitalize">
                            {talent["Full Name"]}
                          </div>
                          <div className="text-sm text-muted-foreground truncate">
                            {renderInstagramLink(talent["Instagram"] || talent["Instagram Link"])}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant={getStatusVariant(talent["Status"])} className="text-xs">
                              {talent["Status"] || "New"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
                {profileSearchResults.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    No talents found
                  </div>
                )}
              </div>
            ) : (
              /* Selected Talent Full Profile */
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <Button variant="outline" size="sm" onClick={() => setSelectedProfile(null)}>
                    ← Back to search
                  </Button>
                  <h3 className="text-lg font-semibold text-foreground">
                    {selectedProfile["Full Name"]}
                  </h3>
                </div>

                {/* Status and Manager */}
                <div className="flex flex-wrap gap-2">
                  <Badge variant={getStatusVariant(selectedProfile["Status"])}>
                    {selectedProfile["Status"] || "New"}
                  </Badge>
                  {selectedProfile["Talent Manager"] && (
                    <Badge variant="outline">
                      Manager: {selectedProfile["Talent Manager"]}
                    </Badge>
                  )}
                </div>

                {/* Basic Information */}
                <Card className="p-4">
                  <h4 className="text-base font-semibold text-foreground mb-4">Basic Information</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {renderProfileField("Full Name", selectedProfile["Full Name"])}
                    {renderProfileField("Email", selectedProfile["Email Address"] || (selectedProfile as any)["Email "])}
                    {renderProfileField("Phone", selectedProfile["Phone Number"] || selectedProfile["Phone"])}
                    {renderProfileField("City", selectedProfile["City & State"] || selectedProfile["City"])}
                    {renderProfileField("Gender", selectedProfile["Gender"])}
                    {renderProfileField("Age", selectedProfile["Age"])}
                    {renderProfileField("Date of Birth", formatDateValue(selectedProfile["Date of Birth"]))}
                    {renderProfileField("Nationality", selectedProfile["Nationality"])}
                    {renderProfileField("Height (in feet & inches)", (selectedProfile as any)["Height (in feet & inches)"] || selectedProfile["Height"])}
                  </div>
                </Card>

                {/* Physical Attributes */}
                <Card className="p-4">
                  <h4 className="text-base font-semibold text-foreground mb-4">Physical Attributes</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {renderProfileField("Height (in feet & inches)", (selectedProfile as any)["Height (in feet & inches)"])}
                    {renderProfileField("Chest/Bust (in inches)", (selectedProfile as any)["Chest/Bust (in inches)"])}
                    {renderProfileField("Waist (in inches)", (selectedProfile as any)["Waist (in inches)"])}
                    {renderProfileField("Hips (in inches)", (selectedProfile as any)["Hips (in inches)"])}
                    {renderProfileField("Shoe Size (UK)", (selectedProfile as any)["Shoe Size (UK)"])}
                    {renderProfileField("Hair Color", selectedProfile["Hair Color"])}
                    {renderProfileField("Eye Color", selectedProfile["Eye Color"])}
                    {renderProfileField("Skin Tone", selectedProfile["Skin Tone"])}
                  </div>
                </Card>

                {/* Social & Media */}
                <Card className="p-4">
                  <h4 className="text-base font-semibold text-foreground mb-4">Social & Media</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {(selectedProfile["Instagram Link"] || selectedProfile["Instagram"]) ? (() => {
                      const ig = selectedProfile["Instagram Link"] || selectedProfile["Instagram"];
                      const url = parseInstagram(ig);
                      const display = ig.trim().replace(/^https?:\/\/(www\.)?instagram\.com\//, "@").replace(/\/+$/, "");
                      return (
                        <div className="text-sm">
                          <dt className="text-muted-foreground font-medium">Instagram</dt>
                          <dd className="mt-0.5">
                            <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                              {display}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </dd>
                        </div>
                      );
                    })() : renderProfileField("Instagram", undefined)}
                    {renderClickableLink("YouTube", selectedProfile["YouTube Channel"], "https://www.youtube.com/")}
                    {renderClickableLink("IMDb", selectedProfile["IMDb"], "https://www.imdb.com/name/")}
                  </div>
                </Card>

                {/* Experience */}
                <Card className="p-4">
                  <h4 className="text-base font-semibold text-foreground mb-4">Experience</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {renderProfileField("Prior modelling/acting experience", selectedProfile["Prior modelling/acting experience"])}
                    {renderProfileField("Previous Agency", selectedProfile["Previous Agency"])}
                    {renderProfileField("Acting Workshop Attended", selectedProfile["Acting Workshop Attended"])}
                    {renderProfileField("CINTAA/Union Card", selectedProfile["CINTAA/Union Card"])}
                    {renderProfileField("Languages Known", selectedProfile["Languages Known"])}
                    {renderProfileField("Dance Forms", selectedProfile["Dance Forms"])}
                    {renderProfileField("Extra-Curricular", selectedProfile["Extra-Curricular"])}
                  </div>
                </Card>

                {/* Work Preferences */}
                <Card className="p-4">
                  <h4 className="text-base font-semibold text-foreground mb-4">Work Preferences</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {renderProfileField("Scope of Work Interested In", selectedProfile["Scope of Work Interested In"])}
                    {renderYesNoField("Open for placement abroad", selectedProfile["Open for placement abroad"])}
                    {renderYesNoField("Valid Passport", selectedProfile["Valid Passport"])}
                    {renderYesNoField("Can drive 2-wheeler", selectedProfile["Can drive 2-wheeler"])}
                    {renderYesNoField("Can drive 4-wheeler", selectedProfile["Can drive 4-wheeler"])}
                    {renderYesNoField("Can Swim", selectedProfile["Can Swim"])}
                    {renderYesNoField("Gamer", selectedProfile["Gamer"])}
                  </div>
                </Card>

                {/* Comfort/Consent */}
                <Card className="p-4">
                  <h4 className="text-base font-semibold text-foreground mb-4">Comfort & Consent</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {renderYesNoField("Lingerie/bikini shoots", selectedProfile["Lingerie/bikini shoots"])}
                    {renderYesNoField("Bold content for web/films", selectedProfile["Bold content for web/films"])}
                    {renderYesNoField("Condom brand promotions", selectedProfile["Condom brand promotions"])}
                    {renderYesNoField("Alcohol brand shoots", selectedProfile["Alcohol brand shoots"])}
                    {renderYesNoField("Reality TV shows", selectedProfile["Reality TV shows"])}
                    {renderYesNoField("Daily soaps", selectedProfile["Daily soaps"])}
                    {renderYesNoField("Mother/father roles", selectedProfile["Mother/father roles"])}
                    {renderYesNoField("Haircut", selectedProfile["Haircut"])}
                    {renderYesNoField("Hair color changes", selectedProfile["Hair color changes"])}
                  </div>
                </Card>

                {/* Documents - Polaroids */}
                <Card className="p-4">
                  <h4 className="text-base font-semibold text-foreground mb-4">Documents</h4>
                  <div className="space-y-3">
                    <div>
                      <dt className="text-sm text-muted-foreground font-medium mb-2">Upload Polaroids (Required)</dt>
                      <dd>
                        <PolaroidGallery links={parsePolaroidLinks(selectedProfile["Upload Polaroids (Required)"])} />
                      </dd>
                    </div>
                  </div>
                </Card>

                {/* Onboarding Info */}
                <Card className="p-4">
                  <h4 className="text-base font-semibold text-foreground mb-4">Onboarding</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {renderProfileField("Status", selectedProfile["Status"])}
                    {renderProfileField("Talent Manager", selectedProfile["Talent Manager"])}
                    {renderProfileField("Progress", selectedProfile["Progress"])}
                    {renderProfileField("Notes", selectedProfile["Notes"])}
                  </div>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* Contracts Tab */}
        {activeTab === "contracts" && (
          <ErrorBoundary>
            <ContractsTab />
          </ErrorBoundary>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <div className="max-w-2xl">
            <Settings theme={theme} onThemeChange={handleThemeChange} />
          </div>
        )}
      </main>

      {/* Talent Profile Dialog */}
      <TalentProfileDialog
        name={selectedTalent}
        open={profileOpen}
        onOpenChange={setProfileOpen}
        rowIndex={selectedTalentRowIndex ?? undefined}
        onStatusUpdate={handleStatusUpdate}
        onManagerAssign={handleManagerAssign}
      />

      {/* Toast notifications */}
      <Toaster 
        position="top-right" 
        theme="system"
        toastOptions={{
          style: {
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
          },
        }}
      />

      {/* Footer */}
      <footer className="glass mt-8 border-t border-border/50">
        <div className="container mx-auto px-4 py-4 text-center text-sm text-muted-foreground">
          TOABH Talent Dashboard — Internal Use Only
        </div>
      </footer>
    </div>
  );
}

// Grid View Component
interface TalentGridViewProps {
  talents: Talent[];
  talentDetailsMap: Map<string, TalentDetails>;
  isLoading: boolean;
  onTalentClick: (name: string, rowIndex: number) => void;
  pendingUpdates: Record<number, "status" | "manager">;
  onStatusUpdate: (row: number, status: string) => void;
  onManagerAssign: (row: number, manager: string) => void;
  filtersOpen?: boolean;
  onFiltersToggle?: () => void;
  // Controlled status filter for bi-directional sync with quick filters
  statusFilter?: string;
  onStatusFilterChange?: (status: string) => void;
}

function TalentGridView({
  talents,
  talentDetailsMap,
  isLoading,
  onTalentClick,
  pendingUpdates,
  onStatusUpdate,
  onManagerAssign,
  filtersOpen = true,
  onFiltersToggle,
  statusFilter: externalStatusFilter,
  onStatusFilterChange: externalOnStatusFilterChange,
}: TalentGridViewProps) {
  // Search and filter state
  const [search, setSearch] = useState("");
  const [internalStatusFilter, setInternalStatusFilter] = useState<string>("all");
  const [managerFilter, setManagerFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  
  // Use external status filter if provided (controlled), otherwise use internal
  const statusFilter = externalStatusFilter !== undefined ? externalStatusFilter : internalStatusFilter;
  const setStatusFilter = (value: string) => {
    if (externalOnStatusFilterChange) {
      externalOnStatusFilterChange(value);
    } else {
      setInternalStatusFilter(value);
    }
  };

  // Get unique values for filters
  const getUniqueValues = (arr: Talent[], key: keyof Talent): string[] => {
    const values = arr.map((t) => t[key]).filter((v) => v && v.toString().trim() !== "");
    return [...new Set(values)].sort() as string[];
  };

  const uniqueStatuses = getUniqueValues(talents, "Status");
  const uniqueManagers = getUniqueValues(talents, "Talent Manager");
  const uniqueCities = getUniqueValues(talents, "City");

  // Filter and sort talents
  const filteredTalents = useMemo(() => {
    const filtered = talents.filter((talent) => {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        !search ||
        talent["Full Name"]?.toLowerCase().includes(searchLower) ||
        talent["Instagram"]?.toLowerCase().includes(searchLower) ||
        talent["City"]?.toLowerCase().includes(searchLower);

      const matchesStatus = statusFilter === "all" || talent["Status"] === statusFilter;
      const matchesManager = managerFilter === "all" || talent["Talent Manager"] === managerFilter;
      const matchesCity = cityFilter === "all" || talent["City"] === cityFilter;

      return matchesSearch && matchesStatus && matchesManager && matchesCity;
    });
    // Sort by rowIndex descending (newest first)
    return filtered.sort((a, b) => b.rowIndex - a.rowIndex);
  }, [talents, search, statusFilter, managerFilter, cityFilter]);

  const handleManagerSelect = (rowIndex: number, manager: string) => {
    onManagerAssign(rowIndex, manager);
  };

  const getStatusVariant = (status: string): "default" | "success" | "warning" | "destructive" | "info" => {
    switch (status) {
      case "Onboarded": return "success";
      case "Meeting Required": return "warning";
      case "KYC Required": return "info";
      case "Rejected": return "destructive";
      case "New": return "default";
      default: return "default";
    }
  };

  if (isLoading && talents.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (talents.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No talents found
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Bar - Always visible on mobile */}
      <Card className="p-4">
        <div className="relative mobile-search">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, Instagram, or city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-input/50"
          />
        </div>
        
        {/* Filter toggle button - visible on mobile */}
        <div className="flex items-center justify-between mt-3 md:hidden">
          <span className="text-sm text-muted-foreground">
            {filteredTalents.length} of {talents.length} talents
          </span>
          <button
            onClick={onFiltersToggle}
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            {filtersOpen ? "Hide" : "Show"} Filters
            <ChevronDown className={`h-4 w-4 transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
          </button>
        </div>

        {/* Filters - Collapsible on mobile, always visible on desktop */}
        <div className={`filters-collapsible ${filtersOpen ? "open" : ""} mt-3`}>
          <div className="flex flex-wrap gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px] bg-input/50 text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {uniqueStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={managerFilter} onValueChange={setManagerFilter}>
              <SelectTrigger className="w-[150px] bg-input/50 text-sm">
                <SelectValue placeholder="Manager" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Managers</SelectItem>
                {uniqueManagers.map((manager) => (
                  <SelectItem key={manager} value={manager}>
                    {manager}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="w-[130px] bg-input/50 text-sm">
                <SelectValue placeholder="City" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {uniqueCities.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Desktop: show count */}
          <div className="hidden md:block text-sm text-muted-foreground mt-2">
            Showing {filteredTalents.length} of {talents.length} talents
          </div>
        </div>
      </Card>

      {/* Talent Cards Grid */}
      <div className="talent-grid">
        {filteredTalents.map((talent) => {
          // Get merged talent for polaroid images
          const mergedTalent = mergeTalentWithDetails(talent, talentDetailsMap);
          const polaroidLinks = parsePolaroidLinks(mergedTalent["Upload Polaroids (Required)"]);
          const profileImageUrl = polaroidLinks.length > 0 ? getDriveThumbnailUrl(polaroidLinks[0]) : null;
          
          return (
          <Card
            key={talent.rowIndex}
            className="p-4 hover:bg-accent/30 transition-colors cursor-pointer glass-card talent-card overflow-visible"
            onClick={() => onTalentClick(talent["Full Name"], talent.rowIndex!)}
          >
            <div className="flex flex-col gap-3">
              {/* Header: Photo + Name + Status */}
              <div className="flex items-start gap-3">
                {/* Profile Photo or Initials Avatar */}
                <div className="bg-primary/20 p-1 rounded-lg shrink-0 overflow-hidden">
                  {profileImageUrl ? (
                    <img 
                      src={profileImageUrl} 
                      alt={talent["Full Name"]}
                      className="h-10 w-10 object-cover rounded-md"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`bg-primary/20 p-2 rounded-lg shrink-0 ${profileImageUrl ? 'hidden' : ''}`}>
                    <User className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-foreground truncate capitalize">
                    {talent["Full Name"]}
                  </div>
                  <div className="text-sm text-muted-foreground truncate">
                    {talent["Instagram"] ? (
                      renderInstagramLink(talent["Instagram"])
                    ) : (
                      <span className="text-muted-foreground/50">No Instagram</span>
                    )}
                  </div>
                </div>
                <Badge variant={getStatusVariant(talent["Status"])} className="shrink-0 text-xs">
                  {talent["Status"] || "New"}
                </Badge>
              </div>

              {/* Info Row - City | Manager */}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground truncate">
                  {talent["City"] || "Unknown city"}
                </span>
                <span className="text-muted-foreground/30">•</span>
                <span className="text-muted-foreground truncate">
                  {talent["Talent Manager"] || "No manager"}
                </span>
              </div>

              {/* Additional Info Row - Gender | Age | Height */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {talent["Gender"] && (
                  <>
                    <span className="truncate">{talent["Gender"]}</span>
                    <span className="text-muted-foreground/30">•</span>
                  </>
                )}
                {talent["Age"] && (
                  <>
                    <span className="truncate">{talent["Age"]} yrs</span>
                    <span className="text-muted-foreground/30">•</span>
                  </>
                )}
                {talent["Height"] && (
                  <span className="truncate">{talent["Height"]}</span>
                )}
              </div>

              {/* Actions Dropdown - Mobile friendly */}
              <div className="pt-2 border-t border-border/30 card-actions">
                <div className="flex items-center justify-between">
                  {/* Status dropdown */}
                  <StatusDropdown
                    currentStatus={(talent["Status"] as any) || "New"}
                    rowIndex={talent.rowIndex}
                    onStatusChange={onStatusUpdate}
                    disabled={!!pendingUpdates[talent.rowIndex]}
                    isLoading={pendingUpdates[talent.rowIndex] === "status"}
                    hasManager={!!talent["Talent Manager"]}
                  />
                  
                  {/* More actions menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="sr-only">Open menu</span>
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                          <circle cx="12" cy="5" r="2" />
                          <circle cx="12" cy="12" r="2" />
                          <circle cx="12" cy="19" r="2" />
                        </svg>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[160px]">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleManagerSelect(talent.rowIndex, "");
                        }}
                      >
                        {talent["Talent Manager"] ? "Change Manager" : "Assign Manager"}
                      </DropdownMenuItem>
                      {MANAGERS.filter(m => m !== talent["Talent Manager"]).map((m) => (
                        <DropdownMenuItem
                          key={m}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleManagerSelect(talent.rowIndex, m);
                          }}
                          className="pl-6"
                        >
                          {m}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </Card>
          );
        })}
      </div>

      {filteredTalents.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No talents match your filters
        </div>
      )}
    </div>
  );
}

import { MANAGERS } from "@/types/talent";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusDropdown } from "@/components/StatusDropdown";

export default App;

