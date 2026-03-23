import { useState, useEffect, useMemo } from "react";
import { TalentTable } from "../components/TalentTable";
import { TalentProfileDialog } from "../components/TalentProfile";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { updateStatus, assignManager } from "../services/api";
import type { Talent, TalentDetails } from "@/types/talent";
import { StatusDropdown } from "@/components/StatusDropdown";
import { ManagerDropdown } from "@/components/ManagerDropdown";
import {
  RefreshCw,
  LayoutGrid,
  List,
  User,
  Search,
  FileText,
  Loader2,
  ChevronDown,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function parseInstagram(value: string): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  const username = trimmed.replace(/^@/, "");
  return `https://instagram.com/${username}`;
}

function renderInstagramLink(value: string | undefined) {
  if (!value || value.trim() === "") {
    return <span className="text-muted-foreground">-</span>;
  }
  const trimmed = value.trim();
  let display = trimmed.replace(/^https?:\/\/(www\.)?instagram\.com\//, "@").replace(/\/+$/, "");
  if (!display.startsWith("@")) display = "@" + display;
  const href = parseInstagram(trimmed);
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
      {display}
    </a>
  );
}

function mergeTalentWithDetails(
  talent: Talent,
  detailsMap: Map<string, TalentDetails>
): Talent & Partial<TalentDetails> {
  const phone = talent["Phone"];
  if (phone) {
    const details = detailsMap.get(String(phone).trim());
    if (details) {
      return { ...talent, ...details };
    }
  }
  return talent;
}

function extractDriveFileId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/[-\w]{25,}/);
  if (match) return match[1];
  return null;
}

function getDriveThumbnailUrl(url: string): string | null {
  const fileId = extractDriveFileId(url);
  if (!fileId) return null;
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w200`;
}

function parsePolaroidLinks(polaroidField: string | undefined): string[] {
  if (!polaroidField) return [];
  return polaroidField.split(/[\n,]+/).map((l) => l.trim()).filter(Boolean);
}

function getStatusVariant(status: string | undefined): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "Onboarded": return "default";
    case "Meeting Required": return "secondary";
    case "KYC Required": return "outline";
    case "Rejected": return "destructive";
    default: return "outline";
  }
}

function formatHeight(height: string | number | undefined | null): string {
  if (!height) return "-";
  return String(height).trim() || "-";
}

// ─── StatCard ──────────────────────────────────────────────────────────────────

function StatCard({
  label, value, color, isActive, onClick, icon,
}: {
  label: string;
  value: number;
  color: string;
  isActive: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  const colorMap: Record<string, string> = {
    purple: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    orange: "bg-orange-500/10 text-orange-400 border-orange-500/30",
    green: "bg-green-500/10 text-green-400 border-green-500/30",
  };
  return (
    <Card className={`stat-card cursor-pointer transition-all ${isActive ? colorMap[color] : "bg-card"} ${isActive ? "ring-1 ring-" + color + "-500/50" : ""}`} onClick={onClick}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorMap[color]}`}>{icon}</div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </div>
    </Card>
  );
}

// ─── TalentGridView ────────────────────────────────────────────────────────────

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
  talents, talentDetailsMap, isLoading, onTalentClick, pendingUpdates,
  onStatusUpdate, onManagerAssign, filtersOpen = true, onFiltersToggle,
  statusFilter: externalStatusFilter, onStatusFilterChange: externalOnStatusFilterChange,
}: TalentGridViewProps) {
  const [search, setSearch] = useState("");
  const [internalStatusFilter, setInternalStatusFilter] = useState<string>("all");
  const [managerFilter, setManagerFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");

  const statusFilter = externalStatusFilter !== undefined ? externalStatusFilter : internalStatusFilter;
  const setStatusFilter = (value: string) => {
    if (externalOnStatusFilterChange) externalOnStatusFilterChange(value);
    else setInternalStatusFilter(value);
  };

  const getUniqueValues = (arr: Talent[], key: keyof Talent): string[] => {
    const values = arr.map((t) => t[key]).filter((v) => v && v.toString().trim() !== "");
    return [...new Set(values)].sort() as string[];
  };

  const uniqueStatuses = getUniqueValues(talents, "Status");
  const uniqueManagers = getUniqueValues(talents, "Talent Manager");
  const uniqueCities = getUniqueValues(talents, "City");

  const filteredTalents = useMemo(() => {
    const filtered = talents.filter((talent) => {
      const searchLower = search.toLowerCase();
      const matchesSearch = !search || talent["Full Name"]?.toLowerCase().includes(searchLower) || talent["Instagram"]?.toLowerCase().includes(searchLower) || talent["City"]?.toLowerCase().includes(searchLower);
      const matchesStatus = statusFilter === "all" ? talent["Status"] !== "Rejected" && talent["Status"] !== "Onboarded" : talent["Status"] === statusFilter;
      const matchesManager = managerFilter === "all" || talent["Talent Manager"] === managerFilter;
      const matchesCity = cityFilter === "all" || talent["City"] === cityFilter;
      return matchesSearch && matchesStatus && matchesManager && matchesCity;
    });
    return filtered.sort((a, b) => b.rowIndex - a.rowIndex);
  }, [talents, search, statusFilter, managerFilter, cityFilter]);

  const handleManagerSelect = (rowIndex: number, manager: string) => {
    onManagerAssign(rowIndex, manager);
  };

  if (isLoading && talents.length === 0) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (talents.length === 0) {
    return <div className="empty-state text-muted-foreground">No talents found</div>;
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, Instagram, or city..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <div className="flex items-center justify-between mt-3 md:hidden">
          <span className="text-sm text-muted-foreground">{filteredTalents.length} of {talents.length} talents</span>
          <button onClick={onFiltersToggle} className="text-sm text-primary hover:underline flex items-center gap-1">
            {filtersOpen ? "Hide" : "Show"} Filters
            <ChevronDown className={`h-4 w-4 transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
          </button>
        </div>
        <div className={`filters-collapsible ${filtersOpen ? "open" : ""} mt-3`}>
          <div className="flex flex-wrap gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px] text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {uniqueStatuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={managerFilter} onValueChange={setManagerFilter}>
              <SelectTrigger className="w-[150px] text-sm"><SelectValue placeholder="Manager" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Managers</SelectItem>
                {uniqueManagers.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="w-[130px] text-sm"><SelectValue placeholder="City" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {uniqueCities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="hidden md:block text-sm text-muted-foreground mt-2">Showing {filteredTalents.length} of {talents.length} talents</div>
        </div>
      </Card>

      <div className="talent-grid">
        {filteredTalents.map((talent) => {
          const mergedTalent = mergeTalentWithDetails(talent, talentDetailsMap);
          const polaroidLinks = parsePolaroidLinks(mergedTalent["Upload Polaroids (Required)"]);
          const profileImageUrl = polaroidLinks.length > 0 ? getDriveThumbnailUrl(polaroidLinks[0]) : null;

          return (
            <Card key={talent.rowIndex} className="talent-card">
              <div className="flex flex-col gap-3 h-full">
                <div className="cursor-pointer flex-1" onClick={() => onTalentClick(talent["Full Name"], talent.rowIndex!)}>
                  <div className="flex items-start gap-3">
                    <div className="bg-muted p-1 rounded-lg shrink-0 overflow-hidden">
                      {profileImageUrl ? (
                        <img src={profileImageUrl} alt={talent["Full Name"]} className="h-10 w-10 object-cover rounded-md" onError={(e) => { e.currentTarget.style.display = "none"; e.currentTarget.nextElementSibling?.classList.remove("hidden"); }} />
                      ) : null}
                      <div className={`bg-muted p-2 rounded-lg shrink-0 ${profileImageUrl ? "hidden" : ""}`}>
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-foreground truncate capitalize">{talent["Full Name"]}</div>
                      <div className="text-sm text-muted-foreground truncate">
                        {talent["Instagram"] ? renderInstagramLink(talent["Instagram"]) : <span className="text-muted-foreground/50">No Instagram</span>}
                      </div>
                    </div>
                    <Badge variant={getStatusVariant(talent["Status"])} className="shrink-0 text-xs">{talent["Status"] || "New"}</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground truncate">{talent["City"] || "Unknown city"}</span>
                  </div>
                  <div className="text-sm text-muted-foreground truncate">{talent["Talent Manager"] || "No manager"}</div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    {talent["Gender"] && <span className="whitespace-nowrap">{talent["Gender"]}</span>}
                    {talent["Gender"] && talent["Age"] && <span className="text-border">&bull;</span>}
                    {talent["Age"] && <span className="whitespace-nowrap">{talent["Age"]} yrs</span>}
                    {(talent["Gender"] || talent["Age"]) && talent["Height"] && <span className="text-border">&bull;</span>}
                    {talent["Height"] && <span className="whitespace-nowrap">{formatHeight(talent["Height"])}</span>}
                    {talent["Phone"] && (
                      <div className="flex items-center gap-1.5 ml-auto">
                        <button onClick={(e) => { e.stopPropagation(); window.location.href = `tel:${talent["Phone"]}`; }} className="h-8 w-8 flex items-center justify-center rounded-lg bg-blue-500/15 text-blue-500 hover:bg-blue-500/25 transition-colors" title="Call">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); const phone = String(talent["Phone"]).replace(/\D/g, ""); window.open(`https://wa.me/${phone}`, "_blank"); }} className="h-8 w-8 flex items-center justify-center rounded-lg bg-green-500/15 text-green-500 hover:bg-green-500/25 transition-colors" title="WhatsApp">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="pt-2 border-t border-border/50 card-actions">
                  <div className="flex flex-row sm:flex-col items-center sm:items-stretch justify-between gap-2">
                    <ManagerDropdown currentManager={talent["Talent Manager"]} rowIndex={talent.rowIndex!} onManagerChange={handleManagerSelect} disabled={!!pendingUpdates[talent.rowIndex]} />
                    <StatusDropdown currentStatus={(talent["Status"] as any) || "New"} rowIndex={talent.rowIndex} onStatusChange={onStatusUpdate} disabled={!!pendingUpdates[talent.rowIndex]} isLoading={pendingUpdates[talent.rowIndex] === "status"} hasManager={!!talent["Talent Manager"]} />
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      {filteredTalents.length === 0 && <div className="empty-state text-muted-foreground">No talents match your filters</div>}
    </div>
  );
}

// ─── TalentPage Component ──────────────────────────────────────────────────────

interface TalentPageProps {
  talents: Talent[];
  talentDetailsMap: Map<string, TalentDetails>;
  isLoading: boolean;
  lastUpdated: Date | null;
  loadTalents: () => Promise<void>;
}

export function TalentPage({ talents, talentDetailsMap, isLoading, lastUpdated, loadTalents }: TalentPageProps) {
  const [selectedTalent, setSelectedTalent] = useState<string | null>(null);
  const [selectedTalentRowIndex, setSelectedTalentRowIndex] = useState<number | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [pendingUpdates, setPendingUpdates] = useState<Record<number, "status" | "manager">>({});
  const [viewMode, setViewMode] = useState<"list" | "grid">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("toabh-view-mode") as "list" | "grid";
      if (saved) return saved;
      const isMobile = window.innerWidth < 1024;
      const key = isMobile ? "toabh-default-view-mobile" : "toabh-default-view-desktop";
      const defaultView = localStorage.getItem(key) as "list" | "grid" | null;
      if (defaultView === "list" || defaultView === "grid") return defaultView;
      return isMobile ? "grid" : "list";
    }
    return "list";
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  const [activeTile, setActiveTile] = useState<string | null>(null);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
      setPendingUpdates((prev) => { const next = { ...prev }; delete next[row]; return next; });
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
      setPendingUpdates((prev) => { const next = { ...prev }; delete next[row]; return next; });
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
    setActiveTile(tile === "Total" ? null : tile);
  };

  const handleStatusFilterChange = (status: string) => {
    setActiveTile(status === "all" ? null : status);
  };

  const totalTalents = talents.length;
  const onboardedCount = talents.filter((t) => t["Status"] === "Onboarded").length;
  const meetingRequiredCount = talents.filter((t) => t["Status"] === "Meeting Required").length;
  const kycRequiredCount = talents.filter((t) => t["Status"] === "KYC Required").length;

  return (
    <>
      {/* Stats Cards */}
      <div className="stats-scroll mb-6 stagger-children">
        <StatCard label="Total Talents" value={totalTalents} color="purple" isActive={activeTile === null} onClick={() => handleTileClick("Total")} icon={<User className="h-4 w-4" />} />
        <StatCard label="Meeting Scheduled" value={meetingRequiredCount} color="blue" isActive={activeTile === "Meeting Required"} onClick={() => handleTileClick("Meeting Required")} icon={<User className="h-4 w-4" />} />
        <StatCard label="Contract Signing" value={kycRequiredCount} color="orange" isActive={activeTile === "KYC Required"} onClick={() => handleTileClick("KYC Required")} icon={<FileText className="h-4 w-4" />} />
        <StatCard label="Onboarded" value={onboardedCount} color="green" isActive={activeTile === "Onboarded"} onClick={() => handleTileClick("Onboarded")} icon={<User className="h-4 w-4" />} />
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-2">
          <button onClick={loadTalents} disabled={isLoading} className="btn-premium bg-secondary hover:bg-secondary/80 text-secondary-foreground">
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Sync</span>
          </button>
          {lastUpdated && <span className="hidden md:block text-xs text-muted-foreground">{lastUpdated.toLocaleTimeString()}</span>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setFiltersOpen(!filtersOpen)} className="lg:hidden btn-premium bg-secondary hover:bg-secondary/80 text-secondary-foreground">
            <SlidersHorizontal className="h-4 w-4" />
          </button>
          <div className="toggle-group">
            <button onClick={() => handleViewModeChange("list")} className={`toggle-btn ${viewMode === "list" ? "toggle-btn-active" : ""} ${windowWidth < 1024 ? "opacity-50 cursor-not-allowed" : ""}`} title={windowWidth < 1024 ? "List view not available on mobile" : "List View"} disabled={windowWidth < 1024}>
              <List className="h-4 w-4" />
            </button>
            <button onClick={() => handleViewModeChange("grid")} className={`toggle-btn ${viewMode === "grid" ? "toggle-btn-active" : ""}`} title="Grid View">
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Table: Desktop list view */}
      {viewMode === "list" && windowWidth >= 1024 && (
        <TalentTable talents={talents} onStatusUpdate={handleStatusUpdate} onManagerAssign={handleManagerAssign} onTalentClick={handleTalentClick} isLoading={isLoading} onRefresh={loadTalents} lastUpdated={lastUpdated} pendingUpdates={pendingUpdates} statusFilter={activeTile || "all"} onStatusFilterChange={handleStatusFilterChange} />
      )}

      {/* Grid view */}
      {viewMode === "grid" || windowWidth < 1024 ? (
        <TalentGridView talents={talents} talentDetailsMap={talentDetailsMap} isLoading={isLoading} onTalentClick={handleTalentClick} pendingUpdates={pendingUpdates} onStatusUpdate={handleStatusUpdate} onManagerAssign={handleManagerAssign} filtersOpen={filtersOpen} onFiltersToggle={() => setFiltersOpen(!filtersOpen)} statusFilter={activeTile || "all"} onStatusFilterChange={handleStatusFilterChange} />
      ) : null}

      {/* Talent Profile Dialog */}
      <TalentProfileDialog name={selectedTalent} open={profileOpen} onOpenChange={setProfileOpen} rowIndex={selectedTalentRowIndex ?? undefined} onStatusUpdate={handleStatusUpdate} onManagerAssign={handleManagerAssign} />
    </>
  );
}
