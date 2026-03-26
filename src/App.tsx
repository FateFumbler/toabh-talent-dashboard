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
  fetchManagers,
} from "./services/api";
import type { Talent, TalentDetails } from "@/types/talent";
import { StatusDropdown } from "@/components/StatusDropdown";
import { ManagerDropdown } from "@/components/ManagerDropdown";
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
import { LoginScreen, checkIsAuthenticated } from "./components/LoginScreen";

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
  const colorMap: Record<string, { shadow: string; glow: string }> = {
    purple: { shadow: "inset 4px 0 0 0 #a855f7", glow: "rgba(168, 85, 247, 0.25)" },
    blue: { shadow: "inset 4px 0 0 0 #3b82f6", glow: "rgba(59, 130, 246, 0.25)" },
    orange: { shadow: "inset 4px 0 0 0 #f97316", glow: "rgba(249, 115, 22, 0.25)" },
    green: { shadow: "inset 4px 0 0 0 #22c55e", glow: "rgba(34, 197, 94, 0.25)" },
  };
  const c = colorMap[color] || colorMap.purple;

  return (
    <button
      onClick={onClick}
      className={`stat-card text-left ${isActive ? "stat-card-active" : ""}`}
      style={{ boxShadow: c.shadow }}
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

// Helper to format height - returns raw value as-is
function formatHeight(height: string | number | undefined | null): string {
  if (!height) return "-";
  const trimmed = String(height).trim();
  return trimmed || "-";
}

// Get all available managers: merge API-provided managers with dynamic values from sheet
// Normalizes case for deduplication to handle whitespace/case variations
const getAllManagers = (talents: Talent[], apiManagers: string[] = []): string[] => {
  const dynamicManagers = talents
    .map(t => (t["Talent Manager"] || "").toString().trim())
    .filter(m => m.length > 0);

  // Merge API + dynamic, normalize for deduplication
  const all = [...apiManagers, ...dynamicManagers].map(m => m.trim());
  const normalized = all.map(m => m.toLowerCase());
  const uniqueNormalized = Array.from(new Set(normalized));
  return uniqueNormalized
    .map(norm => all[normalized.indexOf(norm)])
    .sort();
};



function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
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
  // Separate Set for tracking updating rows - used to prevent loadTalents deps changes
  const [updatingIds, setUpdatingIds] = useState<Set<number>>(new Set());
  // Ref for loadTalents to access updatingIds without being a dependency
  const updatingIdsRef = useRef<Set<number>>(new Set());
  // Track recently updated talents (key = rowIndex string, value = timestamp)
  const [recentlyUpdated, setRecentlyUpdated] = useState<Record<string, number>>({});
  // Ref for loadTalents to access recentlyUpdated without being a dependency
  const recentlyUpdatedRef = useRef<Record<string, number>>({});

  // Keep ref in sync with state
  useEffect(() => {
    updatingIdsRef.current = updatingIds;
  }, [updatingIds]);
  useEffect(() => {
    recentlyUpdatedRef.current = recentlyUpdated;
  }, [recentlyUpdated]);
  const [activeTab, setActiveTab] = useState<
    "talent-master" | "talent-profile" | "settings" | "contracts"
  >("talent-master");
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);
  const { setTheme } = useTheme();
  const [viewMode, setViewMode] = useState<"list" | "grid">(() => {
    if (typeof window !== "undefined") {
      // Check for manual override first
      const saved = localStorage.getItem("toabh-view-mode") as "list" | "grid";
      if (saved) return saved;
      // Fall back to Settings defaults (per-device)
      const isMobile = window.innerWidth < 1024;
      const key = isMobile ? "toabh-default-view-mobile" : "toabh-default-view-desktop";
      const defaultView = localStorage.getItem(key) as "list" | "grid" | null;
      if (defaultView === "list" || defaultView === "grid") return defaultView;
      // Default: grid for mobile, list for desktop
      return isMobile ? "grid" : "list";
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
  const [managers, setManagers] = useState<string[]>([]);



  const handleThemeChange = (t: Theme) => {
    setThemeState(t);
    setTheme(t);
  };

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Check auth on mount
  useEffect(() => {
    setIsAuthenticated(checkIsAuthenticated());
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const fetchManagersList = async () => {
    try {
      const data = await fetchManagers();
      const sorted = [...data].sort();
      setManagers(sorted);
    } catch (err) {
      console.log("Failed to fetch managers:", err);
    }
  };

  useEffect(() => {
    fetchManagersList();
  }, []);

  const loadTalents = useCallback(async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      setError(null);
      const [talentData, detailsData] = await Promise.all([
        fetchTalentMaster(forceRefresh),
        fetchTalentDetails(forceRefresh),
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

      // Preserve optimistically updated talents and recently-updated talents (30-sec lock)
      // Use refs to avoid adding to useCallback deps (which would cause refetch loops)
      const currentUpdatingIds = updatingIdsRef.current;
      const currentRecentlyUpdated = recentlyUpdatedRef.current;
      const LOCK_DURATION = 30000;
      setTalents((prev) => {
        if (currentUpdatingIds.size === 0 && Object.keys(currentRecentlyUpdated).length === 0) {
          // No pending updates or recently locked, use fresh data directly
          return sortedTalents;
        }
        // Create map of current talents for quick lookup
        const prevMap = new Map(prev.map((t) => [t.rowIndex, t]));
        // Merge: use fresh data except for items being updated or locked
        const merged: Talent[] = [];
        for (const t of sortedTalents) {
          const pending = prevMap.get(t.rowIndex);
          const rowId = String(t.rowIndex);
          const isLocked = currentRecentlyUpdated[rowId] &&
            (Date.now() - currentRecentlyUpdated[rowId] < LOCK_DURATION);
          // If talent is locked but not in prev, it was filtered out - skip it
          if (isLocked && !prevMap.has(t.rowIndex)) {
            continue;
          }
          if ((pending && currentUpdatingIds.has(t.rowIndex)) || isLocked) {
            // Don't overwrite - preserve the local version
            merged.push(pending || t);
          } else {
            merged.push(t);
          }
        }
        return merged;
      });
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
    console.log(`[handleStatusUpdate] row=${row}, status="${status}"`);
    if (typeof row !== 'number' || isNaN(row) || row < 1) {
      toast.error(`Invalid row number: ${row}`);
      return;
    }
    // Get old status before update for filter check
    const oldStatus = talents.find((t) => t.rowIndex === row)?.Status;
    // STEP 1: Instant UI update - remove talent from filtered list immediately
    // Optimistic update: update local state AND filter out if no longer matches filter
    setTalents((prev) => {
      const updated = prev.map((t) =>
        t.rowIndex === row ? { ...t, Status: status } : t
      );
      // If a specific status filter is active and talent no longer matches, remove it
      if (activeTile && activeTile !== "all") {
        // Get the new status value once to avoid multiple find calls and ensure consistency
        const newTalentStatus = updated.find((t) => t.rowIndex === row)?.Status;
        // For "New" filter: talent matches if Status is empty/undefined OR Status === "New"
        // For other filters: talent matches if Status === filter value
        const matchesNewStatus =
          activeTile === "New"
            ? !newTalentStatus || newTalentStatus === "New"
            : newTalentStatus === activeTile;
        // Check if old status matched the filter
        const matchedOld =
          activeTile === "New"
            ? !oldStatus || oldStatus === "New"
            : oldStatus === activeTile;
        // If old status matched but new status doesn't, filter out the talent immediately
        if (matchedOld && !matchesNewStatus) {
          return updated.filter((t) => t.rowIndex !== row);
        }
      }
      return updated;
    });
    // STEP 2: THEN apply lock AFTER UI update - prevents auto-refetch from restoring talent
    // Track in both pendingUpdates (for components) and updatingIds (for loadTalents)
    setPendingUpdates((prev) => ({ ...prev, [row]: "status" }));
    setUpdatingIds((prev) => new Set(prev).add(row));
    // Add 30-sec lock to prevent auto-refetch from overwriting optimistic update
    setRecentlyUpdated((prev) => ({ ...prev, [String(row)]: Date.now() }));
    try {
      await updateStatus(row, status);
      toast.success(`Status updated to "${status}"`);
    } catch (err) {
      // Revert on failure
      setTalents((prev) => {
        const original = prev.find((t) => t.rowIndex === row);
        if (!original) return prev;
        return prev.map((t) =>
          t.rowIndex === row ? { ...t, Status: original.Status } : t
        );
      });
      toast.error("Failed to update status. Please try again.");
      console.error(err);
    } finally {
      setPendingUpdates((prev) => {
        const next = { ...prev };
        delete next[row];
        return next;
      });
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(row);
        return next;
      });
    }
  };

  const handleManagerAssign = async (row: number, manager: string) => {
    // STEP 1: Instant UI update - update local state immediately
    setTalents((prev) =>
      prev.map((t) =>
        t.rowIndex === row ? { ...t, "Talent Manager": manager } : t
      )
    );
    // STEP 2: THEN apply lock AFTER UI update - prevents auto-refetch from restoring talent
    // Track in both pendingUpdates (for components) and updatingIds (for loadTalents)
    setPendingUpdates((prev) => ({ ...prev, [row]: "manager" }));
    setUpdatingIds((prev) => new Set(prev).add(row));
    // Add 30-sec lock to prevent auto-refetch from overwriting optimistic update
    setRecentlyUpdated((prev) => ({ ...prev, [String(row)]: Date.now() }));
    try {
      await assignManager(row, manager);
      toast.success(`Manager assigned: ${manager}`);
      fetchManagersList();
    } catch (err) {
      // Revert on failure
      setTalents((prev) => {
        const original = prev.find((t) => t.rowIndex === row);
        if (!original) return prev;
        return prev.map((t) =>
          t.rowIndex === row ? { ...t, "Talent Manager": original["Talent Manager"] } : t
        );
      });
      toast.error("Failed to assign manager. Please try again.");
      console.error(err);
    } finally {
      setPendingUpdates((prev) => {
        const next = { ...prev };
        delete next[row];
        return next;
      });
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(row);
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

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} />;
  }

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
      <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3">
        <div className="flex items-center justify-between">
          {/* Left: Talent + Contracts grouped */}
          <div className="flex items-center">
            <button
              onClick={() => setActiveTab("talent-master")}
              className={`nav-tab ${activeTab === "talent-master" ? "nav-tab-active" : ""}`}
            >
              Talent
            </button>
            <button
              onClick={() => setActiveTab("contracts")}
              className={`nav-tab ${activeTab === "contracts" ? "nav-tab-active" : ""}`}
            >
              Contracts
            </button>
          </div>
          {/* Right: Settings icon only */}
          <button
            onClick={() => setActiveTab("settings")}
            className={`nav-tab ${activeTab === "settings" ? "nav-tab-active" : ""}`}
            title="Settings"
          >
            <SettingsIcon className="h-[18px] w-[18px]" />
          </button>
        </div>
        <div className="border-b border-border" />
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
                    onClick={() => loadTalents(true)}
                    disabled={isLoading}
                    className="btn-premium bg-secondary hover:bg-secondary/80 text-secondary-foreground"
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
                    className="lg:hidden btn-premium bg-secondary hover:bg-secondary/80 text-secondary-foreground"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                  </button>

                  {/* View toggle */}
                  <div className="toggle-group">
                    <button
                      onClick={() => handleViewModeChange("list")}
                      className={`toggle-btn ${viewMode === "list" ? "toggle-btn-active" : ""} ${windowWidth < 1024 ? "opacity-50 cursor-not-allowed" : ""}`}
                      title={windowWidth < 1024 ? "List view not available on mobile" : "List View"}
                      disabled={windowWidth < 1024}
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
                  updatingIds={updatingIds}
                  statusFilter={activeTile || "all"}
                  onStatusFilterChange={handleStatusFilterChange}
                  managers={managers}
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
                  updatingIds={updatingIds}
                  onStatusUpdate={handleStatusUpdate}
                  onManagerAssign={handleManagerAssign}
                  filtersOpen={filtersOpen}
                  onFiltersToggle={() => setFiltersOpen(!filtersOpen)}
                  statusFilter={activeTile || "all"}
                  onStatusFilterChange={handleStatusFilterChange}
                  managers={managers}
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
        managers={managers}
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
  updatingIds?: Set<number>;
  onStatusUpdate: (row: number, status: string) => void;
  onManagerAssign: (row: number, manager: string) => void;
  filtersOpen?: boolean;
  onFiltersToggle?: () => void;
  statusFilter?: string;
  onStatusFilterChange?: (status: string) => void;
  managers?: string[];
}

function TalentGridView({
  talents,
  talentDetailsMap,
  isLoading,
  onTalentClick,
  pendingUpdates,
  updatingIds = new Set(),
  onStatusUpdate,
  onManagerAssign,
  filtersOpen = true,
  onFiltersToggle,
  statusFilter: externalStatusFilter,
  onStatusFilterChange: externalOnStatusFilterChange,
  managers = [],
}: TalentGridViewProps) {
  const [search, setSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<Talent[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
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
      .map((t) => (t[key] || "").toString().trim())
      .filter((v) => v.length > 0);
    return Array.from(new Set(values)).sort();
  };

  const uniqueStatuses = getUniqueValues(talents, "Status");
  // Always include "New" as an option in the status filter
  if (!uniqueStatuses.includes("New")) {
    uniqueStatuses.unshift("New");
  }
  const uniqueManagers = getAllManagers(talents, managers);
  const uniqueCities = getUniqueValues(talents, "City");

  const filteredTalents = useMemo(() => {
    // When search query is present, search across ALL talents regardless of status filter
    // This ensures search results are not limited by the current status filter
    const filtered = talents.filter((talent) => {
      const searchLower = search.toLowerCase();
      const hasSearch = search.trim().length > 0;

      // Search matches across full name, email, phone, and Instagram
      const matchesSearch =
        !hasSearch ||
        (talent["Full Name"] || "")?.toLowerCase().includes(searchLower) ||
        ((talent["Email "] as string) || "")?.toLowerCase().includes(searchLower) ||
        String(talent["Phone"] || "")?.toLowerCase().includes(searchLower) ||
        (talent["Instagram"] || "")?.toLowerCase().includes(searchLower);

      // When searching, ignore status filter (search all statuses)
      // When not searching, apply status filter normally
      const matchesStatus = hasSearch
        ? true // Search ignores status filter
        : statusFilter === "all"
          ? talent["Status"] !== "Rejected" && talent["Status"] !== "Onboarded"
          : statusFilter === "New"
            ? !talent["Status"] || talent["Status"] === "New"
            : talent["Status"] === statusFilter;
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

  // Autocomplete: compute suggestions when search changes
  const updateSuggestions = (value: string) => {
    setSearch(value);
    if (value.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const searchLower = value.toLowerCase();
    const matches = talents
      .filter((t) => {
        const name = (t["Full Name"] || "").toLowerCase();
        const email = ((t["Email "] as string) || "").toLowerCase();
        const phone = String(t["Phone"] || "").toLowerCase();
        return (
          name.includes(searchLower) ||
          email.includes(searchLower) ||
          phone.includes(searchLower)
        );
      })
      .slice(0, 7);
    setSuggestions(matches);
    setShowSuggestions(matches.length > 0);
  };

  // Autocomplete: click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Autocomplete: Escape key to close
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && showSuggestions) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [showSuggestions]);

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
        <div className="relative" ref={searchRef}>
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, Instagram, or city..."
            value={search}
            onChange={(e) => updateSuggestions(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && showSuggestions) {
                setShowSuggestions(false);
              }
            }}
            className="pl-10"
          />
          {/* Autocomplete dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-lg overflow-hidden">
              {suggestions.map((talent) => {
                const phone = String(talent["Phone"] || "");
                const email = ((talent["Email "] as string) || "").trim();
                return (
                  <button
                    key={talent.rowIndex}
                    onClick={() => {
                      onTalentClick(talent["Full Name"], talent.rowIndex!);
                      setShowSuggestions(false);
                      setSearch("");
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-accent/50 transition-colors flex items-center gap-2"
                  >
                    <span className="font-medium truncate capitalize">
                      {talent["Full Name"]}
                    </span>
                    {phone && (
                      <span className="text-muted-foreground text-sm truncate">
                        {phone}
                      </span>
                    )}
                    {email && (
                      <span className="text-muted-foreground text-sm truncate hidden sm:inline">
                        {email}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
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
            >
              <div className="flex flex-col gap-3 h-full">
                {/* Clickable header area */}
                <div
                  className="cursor-pointer flex-1"
                  onClick={() => onTalentClick(talent["Full Name"], talent.rowIndex!)}
                >
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
                        {(mergedTalent["Instagram"] || mergedTalent["Instagram Link"]) ? (
                          renderInstagramLink(mergedTalent["Instagram"] || mergedTalent["Instagram Link"])
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
                  </div>

                  {/* Manager Row */}
                  <div className="text-sm text-muted-foreground truncate">
                    {talent["Talent Manager"] || "No manager"}
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
                    {talent["Phone"] && (
                      <div className="flex items-center gap-1.5 ml-auto">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            window.location.href = `tel:${talent["Phone"]}`;
                          }}
                          className="h-8 w-8 flex items-center justify-center rounded-lg bg-blue-500/15 text-blue-500 hover:bg-blue-500/25 transition-colors"
                          title="Call"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const phone = String(talent["Phone"]).replace(/\D/g, '');
                            window.open(`https://wa.me/${phone}`, '_blank');
                          }}
                          className="h-8 w-8 flex items-center justify-center rounded-lg bg-green-500/15 text-green-500 hover:bg-green-500/25 transition-colors"
                          title="WhatsApp"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-border/50 card-actions">
                  <div className="flex flex-row sm:flex-col items-center sm:items-stretch justify-between gap-2">
                    <ManagerDropdown
                      currentManager={talent["Talent Manager"]}
                      managers={uniqueManagers}
                      rowIndex={talent.rowIndex!}
                      onManagerChange={handleManagerSelect}
                      disabled={updatingIds.has(talent.rowIndex!)}
                    />

                    <StatusDropdown
                      currentStatus={(talent["Status"] as any) || "New"}
                      rowIndex={talent.rowIndex}
                      onStatusChange={onStatusUpdate}
                      disabled={updatingIds.has(talent.rowIndex!)}
                      isLoading={updatingIds.has(talent.rowIndex!)}
                      hasManager={!!talent["Talent Manager"]}
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

export default App;
App;
