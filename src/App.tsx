import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { TalentTable } from "./components/TalentTable";
import { TalentProfileDialog } from "./components/TalentProfile";
import { ContractsTab } from "./components/ContractsTab";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Card } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Badge } from "./components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select";
import {
  fetchTalentMaster,
  fetchTalentDetails,
  updateStatus,
  assignManager,
} from "./services/api";
import type { Talent, TalentDetails } from "@/types/talent";
import { MANAGERS } from "@/types/talent";
import { StatusDropdown } from "@/components/StatusDropdown";
import {
  RefreshCw,
  LayoutGrid,
  List,
  User,
  Search,
  ExternalLink,
  FileText,
  Settings as SettingsIcon,
  Loader2,
  ChevronDown,
  SlidersHorizontal,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import {
  Settings,
  type Theme,
  getStoredTheme,
  useTheme,
} from "./components/Settings";

const REFRESH_INTERVAL = 30000;

// Parse Instagram value to full URL
function parseInstagram(value: string): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  let username = trimmed.replace(/^@/, "");
  username = username.replace(
    /^(https?:\/\/)?(www\.)?instagram\.com\//,
    ""
  );
  username = username.split("?")[0].split("#")[0];
  username = username.replace(/\/+$/, "");
  return `https://instagram.com/${username}`;
}

// Helper to render Instagram as clickable link
const renderInstagramLink = (
  instagram: string | undefined
): React.ReactNode => {
  if (!instagram || instagram.trim() === "")
    return <span className="text-muted-foreground">-</span>;
  const url = parseInstagram(instagram);
  const display = instagram.trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//, "@")
    .replace(/\/+$/, "")
    .split("?")[0]
    .split("#")[0];
  const handle = display.startsWith("@") ? display : `@${display}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary hover:underline inline-flex items-center gap-1"
    >
      {handle}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
};

// Merge talent-master with talent-details by phone number (primary) or email (fallback)
function mergeTalentWithDetails(
  talent: Talent,
  detailsMap: Map<string, TalentDetails>
): Talent & Partial<TalentDetails> {
  const phone = String(talent["Phone"] || "").trim();
  const email = (talent["Email "] || "").trim().toLowerCase();

  let details: TalentDetails | undefined;

  if (phone) {
    details = detailsMap.get(phone);
  }

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
    "Full Name": details["Full Name"] || talent["Full Name"],
    "Email Address": details["Email Address"],
    "Phone Number": details["Phone Number"],
    "Gender": details["Gender"] || talent["Gender"],
    "Age": details["Age"] || talent["Age"],
    "Date of Birth": details["Date of Birth"],
    "Nationality": details["Nationality"],
    "City & State": details["City & State"],
    "Height (in feet & inches)":
      details["Height (in feet & inches)"] || talent["Height"],
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
    "Prior modelling/acting experience":
      details["Prior modelling/acting experience"],
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
  return polaroidField
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// Render a polaroid thumbnail or link
function PolaroidGallery({ links }: { links: string[] }) {
  if (links.length === 0) {
    return (
      <span className="text-muted-foreground/50">Not provided</span>
    );
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
                  e.currentTarget.style.display = "none";
                  e.currentTarget.nextElementSibling?.classList.remove("hidden");
                }}
              />
              <div className="hidden absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                <ExternalLink className="h-5 w-5 text-white" />
              </div>
            </a>
          );
        }

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

// Status badge variant helper
function getStatusVariant(
  status: string
): "default" | "success" | "warning" | "destructive" | "info" {
  switch (status) {
    case "Onboarded":
      return "success";
    case "Meeting Required":
      return "warning";
    case "KYC Required":
      return "info";
    case "Rejected":
      return "destructive";
    case "New":
      return "default";
    default:
      return "default";
  }
}

// Stat card component
function StatCard({
  label,
  value,
  color,
  isActive,
  onClick,
  icon,
}: {
  label: string;
  value: number;
  color: string;
  isActive: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  const colorMap: Record<string, { border: string; glow: string }> = {
    purple: { border: "border-l-purple-500", glow: "rgba(168, 85, 247, 0.25)" },
    blue: { border: "border-l-blue-500", glow: "rgba(59, 130, 246, 0.25)" },
    orange: { border: "border-l-orange-500", glow: "rgba(249, 115, 22, 0.25)" },
    green: { border: "border-l-green-500", glow: "rgba(34, 197, 94, 0.25)" },
  };
  const c = colorMap[color] || colorMap.purple;

  return (
    <button
      onClick={onClick}
      className={`stat-card text-left border-l-4 ${c.border} ${
        isActive ? "stat-card-active" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="stat-label">{label}</span>
        {isActive && (
          <span className="h-2 w-2 rounded-full bg-primary animate-soft-pulse shrink-0" />
        )}
        <span className="text-muted-foreground/60">{icon}</span>
      </div>
      <p className="stat-value animate-count-in">{value}</p>
    </button>
  );
}

// Helper to format height properly
function formatHeight(height: string | number | undefined | null): string {
  if (!height) return "-";
  const trimmed = String(height).trim();
  if (!trimmed) return "-";
  
  // Handle formats like "5'5 in feet 65 in inches" or "5'6 in feet"
  // Extract just the feet'inches portion
  const feetInchesMatch = trimmed.match(/(\d+'\d+"?)/);
  if (feetInchesMatch) {
    return feetInchesMatch[1].replace(/"/g, "");
  }
  
  if (trimmed.includes("'") || trimmed.includes("ft")) {
    // Clean up formats like 5'5" or 5'6
    return trimmed.replace(/"/g, "").replace(/ ft /g, "'").replace(/ in$/g, "\"").replace(/ inches$/g, "\"");
  }
  const inches = parseInt(trimmed, 10);
  if (!isNaN(inches)) {
    if (inches >= 12) {
      const feet = Math.floor(inches / 12);
      const remainingInches = inches % 12;
      return remainingInches > 0 ? `${feet}'${remainingInches}"` : `${feet}'`;
    } else {
      return `${inches}"`;
    }
  }
  return trimmed;
}

function App() {
  const [talents, setTalents] = useState<Talent[]>([]);
  const [talentDetailsMap, setTalentDetailsMap] = useState<
    Map<string, TalentDetails>
  >(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedTalent, setSelectedTalent] = useState<string | null>(null);
  const [selectedTalentRowIndex, setSelectedTalentRowIndex] = useState<
    number | null
  >(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [pendingUpdates, setPendingUpdates] = useState<
    Record<number, "status" | "manager">
  >({});
  const [activeTab, setActiveTab] = useState<
    "talent-master" | "talent-profile" | "settings" | "contracts"
  >("talent-master");
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);
  const { setTheme } = useTheme();
  const [viewMode, setViewMode] = useState<"list" | "grid">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("toabh-view-mode") as "list" | "grid";
      if (saved) return saved;
      const width = window.innerWidth;
      if (width < 1024) return "grid";
      return "list";
    }
    return "list";
  });
  const [profileSearch, setProfileSearch] = useState("");
  const [selectedProfile, setSelectedProfile] = useState<
    (Talent & Partial<TalentDetails>) | null
  >(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1200
  );
  const [activeTile, setActiveTile] = useState<string | null>(null);

  const handleThemeChange = (t: Theme) => {
    setThemeState(t);
    setTheme(t);
  };

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const loadTalents = useCallback(async () => {
    try {
      setError(null);
      const [talentData, detailsData] = await Promise.all([
        fetchTalentMaster(),
        fetchTalentDetails(),
      ]);

      const validTalents = talentData.filter(
        (t) => t["Full Name"] && t["Full Name"].trim() !== ""
      );

      const sortedTalents = [...validTalents].sort((a, b) => {
        const aRow = a.rowIndex || 0;
        const bRow = b.rowIndex || 0;
        return bRow - aRow;
      });

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

  const handleTileClick = (tile: string) => {
    if (tile === "Total") {
      setActiveTile(null);
    } else {
      setActiveTile(tile);
    }
  };

  const handleStatusFilterChange = (status: string) => {
    if (status === "all") {
      setActiveTile(null);
    } else {
      setActiveTile(status);
    }
  };

  const getMergedTalent = useCallback(
    (talent: Talent): Talent & Partial<TalentDetails> => {
      return mergeTalentWithDetails(talent, talentDetailsMap);
    },
    [talentDetailsMap]
  );

  const totalTalents = talents.length;
  const onboardedCount = talents.filter(
    (t) => t["Status"] === "Onboarded"
  ).length;
  const meetingRequiredCount = talents.filter(
    (t) => t["Status"] === "Meeting Required"
  ).length;
  const kycRequiredCount = talents.filter(
    (t) => t["Status"] === "KYC Required"
  ).length;

  const profileSearchResults = useMemo(() => {
    const mergedResults = talents.map((t) => getMergedTalent(t));
    if (!profileSearch.trim())
      return mergedResults.slice(0, 20);
    const search = profileSearch.toLowerCase();
    return mergedResults
      .filter(
        (t) =>
          t["Full Name"]?.toLowerCase().includes(search) ||
          (t["Instagram Link"] || t["Instagram"] || "")?.toLowerCase().includes(search) ||
          (t["City & State"] || t["City"] || "")?.toLowerCase().includes(search)
      )
      .slice(0, 20);
  }, [talents, profileSearch, getMergedTalent]);

  const formatDateValue = (
    value: string | number | undefined | null
  ): string | number | undefined | null => {
    if (!value) return value;
    const str = value.toString();
    return str.split("T")[0];
  };

  const renderProfileField = (
    label: string,
    value: string | number | undefined | null
  ) => {
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

  const renderEmailField = (
    label: string,
    value: string | number | undefined | null
  ) => {
    if (!value || value.toString().trim() === "") {
      return renderProfileField(label, value);
    }
    const emailStr = value.toString();
    return (
      <div className="text-sm">
        <dt className="text-muted-foreground font-medium">{label}</dt>
        <dd className="mt-0.5 text-foreground" style={{ wordBreak: "break-all" }}>
          <a
            href={`mailto:${emailStr}`}
            className="text-primary hover:underline"
          >
            {emailStr}
          </a>
        </dd>
      </div>
    );
  };

  const renderClickableLink = (
    label: string,
    value: string | undefined,
    baseUrl: string = ""
  ) => {
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
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-1"
          >
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
    const displayValue =
      trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
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
      <header
        className="header-bar"
        style={{ paddingTop: "env(safe-area-inset-top, 0)" }}
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            {/* Logo */}
            <img
              src="/logo_white.png"
              alt="TOABH"
              className="logo-white h-8 w-auto"
            />
            <img
              src="/logo_black.png"
              alt="TOABH"
              className="logo-black h-8 w-auto"
            />
            <h1 className="text-base font-bold text-foreground tracking-tight">
              Scouting Dashboard
            </h1>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between border-b border-border pb-px">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setActiveTab("talent-master")}
              className={`nav-tab ${activeTab === "talent-master" ? "nav-tab-active" : ""}`}
            >
              <List className="h-4 w-4" />
              <span className="hidden xs:inline">Talent Master</span>
              <span className="xs:hidden">Talent</span>
            </button>
            <button
              onClick={() => setActiveTab("contracts")}
              className={`nav-tab ${activeTab === "contracts" ? "nav-tab-active" : ""}`}
            >
              <FileText className="h-4 w-4" />
              <span>Contracts</span>
            </button>
          </div>
          <button
            onClick={() => setActiveTab("settings")}
            className={`nav-tab ${activeTab === "settings" ? "nav-tab-active" : ""}`}
          >
            <SettingsIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
      </div>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Stats Cards */}
        <div className="stats-scroll mb-6 stagger-children">
          <StatCard
            label="Total Talents"
            value={totalTalents}
            color="purple"
            isActive={activeTile === null}
            onClick={() => handleTileClick("Total")}
            icon={<User className="h-4 w-4" />}
          />
          <StatCard
            label="Meeting Scheduled"
            value={meetingRequiredCount}
            color="blue"
            isActive={activeTile === "Meeting Required"}
            onClick={() => handleTileClick("Meeting Required")}
            icon={<User className="h-4 w-4" />}
          />
          <StatCard
            label="Contract Signing"
            value={kycRequiredCount}
            color="orange"
            isActive={activeTile === "KYC Required"}
            onClick={() => handleTileClick("KYC Required")}
            icon={<FileText className="h-4 w-4" />}
          />
          <StatCard
            label="Onboarded"
            value={onboardedCount}
            color="green"
            isActive={activeTile === "Onboarded"}
            onClick={() => handleTileClick("Onboarded")}
            icon={<User className="h-4 w-4" />}
          />
        </div>

        {/* Error Message */}
        {error && (
          <Card className="mb-6 border-destructive/50 bg-destructive/10 p-4">
            <div className="flex items-center gap-2 text-destructive text-sm">
              <span className="text-destructive">{error}</span>
            </div>
          </Card>
        )}

        {/* Talent Master Tab */}
        {activeTab === "talent-master" && (
          <ErrorBoundary>
            <>
              {/* Toolbar */}
              <div className="flex items-center justify-between mb-4 gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={loadTalents}
                    disabled={isLoading}
                    className="btn-premium bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                    />
                    <span className="hidden sm:inline">Sync</span>
                  </button>
                  {lastUpdated && (
                    <span className="hidden md:block text-xs text-muted-foreground">
                      {lastUpdated.toLocaleTimeString()}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Mobile filter toggle */}
                  <button
                    onClick={() => setFiltersOpen(!filtersOpen)}
                    className="lg:hidden btn-premium bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                  </button>

                  {/* View toggle */}
                  <div className="toggle-group">
                    <button
                      onClick={() => handleViewModeChange("list")}
                      className={`toggle-btn ${viewMode === "list" ? "toggle-btn-active" : ""}`}
                      title="List View"
                    >
                      <List className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleViewModeChange("grid")}
                      className={`toggle-btn ${viewMode === "grid" ? "toggle-btn-active" : ""}`}
                      title="Grid View"
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Table: Desktop list view */}
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

              {/* Grid view: mobile/tablet or desktop grid mode */}
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
          <div className="space-y-6 animate-fade-in">
            <Card className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search talent by name, Instagram, or city..."
                  value={profileSearch}
                  onChange={(e) => setProfileSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              {profileSearch.trim() && (
                <div className="mt-2 text-sm text-muted-foreground">
                  {profileSearchResults.length} result
                  {profileSearchResults.length !== 1 ? "s" : ""} found
                </div>
              )}
            </Card>

            {!selectedProfile ? (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  {profileSearch.trim()
                    ? "Search Results"
                    : "Recent Talents"}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {profileSearchResults.map((talent) => (
                    <Card
                      key={talent.rowIndex}
                      className="p-4 hover:bg-accent/30 cursor-pointer transition-colors"
                      onClick={() => setSelectedProfile(talent)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="bg-primary/20 p-2 rounded-lg shrink-0">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground truncate capitalize">
                            {talent["Full Name"]}
                          </div>
                          <div className="text-sm text-muted-foreground truncate">
                            {renderInstagramLink(
                              talent["Instagram"] || talent["Instagram Link"]
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge
                              variant={getStatusVariant(talent["Status"])}
                              className="text-xs"
                            >
                              {talent["Status"] || "New"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
                {profileSearchResults.length === 0 && (
                  <div className="empty-state text-muted-foreground">
                    No talents found
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedProfile(null)}
                  >
                    ← Back to search
                  </Button>
                  <h3 className="text-lg font-semibold text-foreground">
                    {selectedProfile["Full Name"]}
                  </h3>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant={getStatusVariant(selectedProfile["Status"])}
                  >
                    {selectedProfile["Status"] || "New"}
                  </Badge>
                  {selectedProfile["Talent Manager"] && (
                    <Badge variant="outline">
                      Manager: {selectedProfile["Talent Manager"]}
                    </Badge>
                  )}
                </div>

                <Card className="p-4">
                  <h4 className="text-base font-semibold text-foreground mb-4">
                    Basic Information
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {renderProfileField("Full Name", selectedProfile["Full Name"])}
                    {renderEmailField(
                      "Email",
                      selectedProfile["Email Address"] ||
                        (selectedProfile as any)["Email "]
                    )}
                    {renderProfileField(
                      "Phone",
                      selectedProfile["Phone Number"] || selectedProfile["Phone"]
                    )}
                    {renderProfileField(
                      "City",
                      selectedProfile["City & State"] || selectedProfile["City"]
                    )}
                    {renderProfileField("Gender", selectedProfile["Gender"])}
                    {renderProfileField("Age", selectedProfile["Age"])}
                    {renderProfileField(
                      "Date of Birth",
                      formatDateValue(selectedProfile["Date of Birth"])
                    )}
                    {renderProfileField("Nationality", selectedProfile["Nationality"])}
                    {renderProfileField(
                      "Height (in feet & inches)",
                      (selectedProfile as any)["Height (in feet & inches)"] ||
                        selectedProfile["Height"]
                    )}
                  </div>
                </Card>

                <Card className="p-4">
                  <h4 className="text-base font-semibold text-foreground mb-4">
                    Physical Attributes
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {renderProfileField(
                      "Height (in feet & inches)",
                      (selectedProfile as any)["Height (in feet & inches)"]
                    )}
                    {renderProfileField(
                      "Chest/Bust (in inches)",
                      (selectedProfile as any)["Chest/Bust (in inches)"]
                    )}
                    {renderProfileField(
                      "Waist (in inches)",
                      (selectedProfile as any)["Waist (in inches)"]
                    )}
                    {renderProfileField(
                      "Hips (in inches)",
                      (selectedProfile as any)["Hips (in inches)"]
                    )}
                    {renderProfileField(
                      "Shoe Size (UK)",
                      (selectedProfile as any)["Shoe Size (UK)"]
                    )}
                    {renderProfileField("Hair Color", selectedProfile["Hair Color"])}
                    {renderProfileField("Eye Color", selectedProfile["Eye Color"])}
                    {renderProfileField("Skin Tone", selectedProfile["Skin Tone"])}
                  </div>
                </Card>

                <Card className="p-4">
                  <h4 className="text-base font-semibold text-foreground mb-4">
                    Social & Media
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {(selectedProfile["Instagram Link"] ||
                      selectedProfile["Instagram"]) ? (
                      (() => {
                        const ig =
                          selectedProfile["Instagram Link"] ||
                          selectedProfile["Instagram"];
                        const url = parseInstagram(ig);
                        const display = ig
                          .trim()
                          .replace(
                            /^https?:\/\/(www\.)?instagram\.com\//,
                            "@"
                          )
                          .replace(/\/+$/, "");
                        return (
                          <div className="text-sm">
                            <dt className="text-muted-foreground font-medium">
                              Instagram
                            </dt>
                            <dd className="mt-0.5">
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline inline-flex items-center gap-1"
                              >
                                {display}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </dd>
                          </div>
                        );
                      })()
                    ) : (
                      renderProfileField("Instagram", undefined)
                    )}
                    {renderClickableLink(
                      "YouTube",
                      selectedProfile["YouTube Channel"],
                      "https://www.youtube.com/"
                    )}
                    {renderClickableLink(
                      "IMDb",
                      selectedProfile["IMDb"],
                      "https://www.imdb.com/name/"
                    )}
                  </div>
                </Card>

                <Card className="p-4">
                  <h4 className="text-base font-semibold text-foreground mb-4">
                    Experience
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {renderProfileField(
                      "Prior modelling/acting experience",
                      selectedProfile["Prior modelling/acting experience"]
                    )}
                    {renderProfileField(
                      "Previous Agency",
                      selectedProfile["Previous Agency"]
                    )}
                    {renderProfileField(
                      "Acting Workshop Attended",
                      selectedProfile["Acting Workshop Attended"]
                    )}
                    {renderProfileField(
                      "CINTAA/Union Card",
                      selectedProfile["CINTAA/Union Card"]
                    )}
                    {renderProfileField(
                      "Languages Known",
                      selectedProfile["Languages Known"]
                    )}
                    {renderProfileField(
                      "Dance Forms",
                      selectedProfile["Dance Forms"]
                    )}
                    {renderProfileField(
                      "Extra-Curricular",
                      selectedProfile["Extra-Curricular"]
                    )}
                  </div>
                </Card>

                <Card className="p-4">
                  <h4 className="text-base font-semibold text-foreground mb-4">
                    Work Preferences
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {renderProfileField(
                      "Scope of Work Interested In",
                      selectedProfile["Scope of Work Interested In"]
                    )}
                    {renderYesNoField(
                      "Open for placement abroad",
                      selectedProfile["Open for placement abroad"]
                    )}
                    {renderYesNoField(
                      "Valid Passport",
                      selectedProfile["Valid Passport"]
                    )}
                    {renderYesNoField(
                      "Can drive 2-wheeler",
                      selectedProfile["Can drive 2-wheeler"]
                    )}
                    {renderYesNoField(
                      "Can drive 4-wheeler",
                      selectedProfile["Can drive 4-wheeler"]
                    )}
                    {renderYesNoField("Can Swim", selectedProfile["Can Swim"])}
                    {renderYesNoField("Gamer", selectedProfile["Gamer"])}
                  </div>
                </Card>

                <Card className="p-4">
                  <h4 className="text-base font-semibold text-foreground mb-4">
                    Comfort & Consent
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {renderYesNoField(
                      "Lingerie/bikini shoots",
                      selectedProfile["Lingerie/bikini shoots"]
                    )}
                    {renderYesNoField(
                      "Bold content for web/films",
                      selectedProfile["Bold content for web/films"]
                    )}
                    {renderYesNoField(
                      "Condom brand promotions",
                      selectedProfile["Condom brand promotions"]
                    )}
                    {renderYesNoField(
                      "Alcohol brand shoots",
                      selectedProfile["Alcohol brand shoots"]
                    )}
                    {renderYesNoField(
                      "Reality TV shows",
                      selectedProfile["Reality TV shows"]
                    )}
                    {renderYesNoField(
                      "Daily soaps",
                      selectedProfile["Daily soaps"]
                    )}
                    {renderYesNoField(
                      "Mother/father roles",
                      selectedProfile["Mother/father roles"]
                    )}
                    {renderYesNoField("Haircut", selectedProfile["Haircut"])}
                    {renderYesNoField(
                      "Hair color changes",
                      selectedProfile["Hair color changes"]
                    )}
                  </div>
                </Card>

                <Card className="p-4">
                  <h4 className="text-base font-semibold text-foreground mb-4">
                    Documents
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <dt className="text-sm text-muted-foreground font-medium mb-2">
                        Upload Polaroids (Required)
                      </dt>
                      <dd>
                        <PolaroidGallery
                          links={parsePolaroidLinks(
                            selectedProfile["Upload Polaroids (Required)"]
                          )}
                        />
                      </dd>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <h4 className="text-base font-semibold text-foreground mb-4">
                    Onboarding
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {renderProfileField("Status", selectedProfile["Status"])}
                    {renderProfileField(
                      "Talent Manager",
                      selectedProfile["Talent Manager"]
                    )}
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
          <div className="max-w-2xl animate-fade-in">
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
            background: "var(--bg-secondary)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
          },
        }}
      />

      {/* Footer */}
      <footer className="footer-bar">
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
  const [search, setSearch] = useState("");
  const [internalStatusFilter, setInternalStatusFilter] = useState<string>("all");
  const [managerFilter, setManagerFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");

  const statusFilter =
    externalStatusFilter !== undefined
      ? externalStatusFilter
      : internalStatusFilter;
  const setStatusFilter = (value: string) => {
    if (externalOnStatusFilterChange) {
      externalOnStatusFilterChange(value);
    } else {
      setInternalStatusFilter(value);
    }
  };

  const getUniqueValues = (arr: Talent[], key: keyof Talent): string[] => {
    const values = arr
      .map((t) => t[key])
      .filter((v) => v && v.toString().trim() !== "");
    return [...new Set(values)].sort() as string[];
  };

  const uniqueStatuses = getUniqueValues(talents, "Status");
  const uniqueManagers = getUniqueValues(talents, "Talent Manager");
  const uniqueCities = getUniqueValues(talents, "City");

  const filteredTalents = useMemo(() => {
    const filtered = talents.filter((talent) => {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        !search ||
        talent["Full Name"]?.toLowerCase().includes(searchLower) ||
        talent["Instagram"]?.toLowerCase().includes(searchLower) ||
        talent["City"]?.toLowerCase().includes(searchLower);

      const matchesStatus =
        statusFilter === "all" || talent["Status"] === statusFilter;
      const matchesManager =
        managerFilter === "all" || talent["Talent Manager"] === managerFilter;
      const matchesCity = cityFilter === "all" || talent["City"] === cityFilter;

      return matchesSearch && matchesStatus && matchesManager && matchesCity;
    });
    return filtered.sort((a, b) => b.rowIndex - a.rowIndex);
  }, [talents, search, statusFilter, managerFilter, cityFilter]);

  const handleManagerSelect = (rowIndex: number, manager: string) => {
    onManagerAssign(rowIndex, manager);
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
      <div className="empty-state text-muted-foreground">No talents found</div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Search */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, Instagram, or city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Mobile filter toggle */}
        <div className="flex items-center justify-between mt-3 md:hidden">
          <span className="text-sm text-muted-foreground">
            {filteredTalents.length} of {talents.length} talents
          </span>
          <button
            onClick={onFiltersToggle}
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            {filtersOpen ? "Hide" : "Show"} Filters
            <ChevronDown
              className={`h-4 w-4 transition-transform ${filtersOpen ? "rotate-180" : ""}`}
            />
          </button>
        </div>

        {/* Filters */}
        <div className={`filters-collapsible ${filtersOpen ? "open" : ""} mt-3`}>
          <div className="flex flex-wrap gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px] text-sm">
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
              <SelectTrigger className="w-[150px] text-sm">
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
              <SelectTrigger className="w-[130px] text-sm">
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

          <div className="hidden md:block text-sm text-muted-foreground mt-2">
            Showing {filteredTalents.length} of {talents.length} talents
          </div>
        </div>
      </Card>

      {/* Talent Cards Grid */}
      <div className="talent-grid">
        {filteredTalents.map((talent) => {
          const mergedTalent = mergeTalentWithDetails(talent, talentDetailsMap);
          const polaroidLinks = parsePolaroidLinks(
            mergedTalent["Upload Polaroids (Required)"]
          );
          const profileImageUrl =
            polaroidLinks.length > 0 ? getDriveThumbnailUrl(polaroidLinks[0]) : null;

          return (
            <Card
              key={talent.rowIndex}
              className="talent-card"
              onClick={() => onTalentClick(talent["Full Name"], talent.rowIndex!)}
            >
              <div className="flex flex-col gap-3">
                {/* Header */}
                <div className="flex items-start gap-3">
                  <div className="bg-muted p-1 rounded-lg shrink-0 overflow-hidden">
                    {profileImageUrl ? (
                      <img
                        src={profileImageUrl}
                        alt={talent["Full Name"]}
                        className="h-10 w-10 object-cover rounded-md"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          e.currentTarget.nextElementSibling?.classList.remove("hidden");
                        }}
                      />
                    ) : null}
                    <div
                      className={`bg-muted p-2 rounded-lg shrink-0 ${profileImageUrl ? "hidden" : ""}`}
                    >
                      <User className="h-5 w-5 text-muted-foreground" />
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
                  <Badge
                    variant={getStatusVariant(talent["Status"])}
                    className="shrink-0 text-xs"
                  >
                    {talent["Status"] || "New"}
                  </Badge>
                </div>

                {/* Info Row */}
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground truncate">
                    {talent["City"] || "Unknown city"}
                  </span>
                  <span className="text-border">•</span>
                  <span className="text-muted-foreground truncate">
                    {talent["Talent Manager"] || "No manager"}
                  </span>
                </div>

                {/* Details Row */}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  {talent["Gender"] && (
                    <span className="whitespace-nowrap">{talent["Gender"]}</span>
                  )}
                  {talent["Gender"] && talent["Age"] && (
                    <span className="text-border">•</span>
                  )}
                  {talent["Age"] && (
                    <span className="whitespace-nowrap">{talent["Age"]} yrs</span>
                  )}
                  {(talent["Gender"] || talent["Age"]) && talent["Height"] && (
                    <span className="text-border">•</span>
                  )}
                  {talent["Height"] && (
                    <span className="whitespace-nowrap">{formatHeight(talent["Height"])}</span>
                  )}
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-border/50 card-actions">
                  <div className="flex items-center justify-between">
                    <StatusDropdown
                      currentStatus={(talent["Status"] as any) || "New"}
                      rowIndex={talent.rowIndex}
                      onStatusChange={onStatusUpdate}
                      disabled={!!pendingUpdates[talent.rowIndex]}
                      isLoading={pendingUpdates[talent.rowIndex] === "status"}
                      hasManager={!!talent["Talent Manager"]}
                    />

                    <GridMoreMenu
                      talent={talent}
                      onManagerSelect={handleManagerSelect}
                    />
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {filteredTalents.length === 0 && (
        <div className="empty-state text-muted-foreground">
          No talents match your filters
        </div>
      )}
    </div>
  );
}

// More menu for grid view cards
function GridMoreMenu({
  talent,
  onManagerSelect,
}: {
  talent: Talent;
  onManagerSelect: (rowIndex: number, manager: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ right: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const managers = MANAGERS as string[];
  const visibleManagers = showAll ? managers : managers.slice(0, 4);

  useEffect(() => {
    if (open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuWidth = 192; // w-48 = 12rem = 192px
      const leftEdge = rect.left - menuWidth;
      
      // Check if menu would overflow on the left
      if (leftEdge < 8) {
        setMenuPosition({ right: window.innerWidth - rect.right - 8, left: -1 });
      } else {
        setMenuPosition({ right: 0, left: -1 });
      }
    }
  }, [open]);

  return (
    <div className="relative">
      <Button
        ref={buttonRef}
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </Button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
          />
          <div 
            className="dropdown-animate absolute top-full mt-1 z-50 w-48 bg-popover border border-border rounded-xl shadow-xl p-1"
            style={{
              right: menuPosition?.right ?? 0,
              left: menuPosition?.left ?? 'auto',
              maxWidth: `${window.innerWidth - 16}px`,
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onManagerSelect(talent.rowIndex!, talent["Talent Manager"] || "");
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-popover-foreground hover:bg-accent rounded-lg transition-colors"
            >
              {talent["Talent Manager"] ? "Change Manager" : "Assign Manager"}
            </button>
            <hr className="my-1 border-border" />
            {visibleManagers.map((m: string) => (
              <button
                key={m}
                onClick={(e) => {
                  e.stopPropagation();
                  onManagerSelect(talent.rowIndex!, m);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-popover-foreground hover:bg-accent rounded-lg transition-colors"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                {m}
              </button>
            ))}
            {managers.length > 4 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAll(!showAll);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-accent rounded-lg transition-colors"
              >
                {showAll ? "Show less" : `+${managers.length - 4} more`}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default App;
App;
