import React, { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, RefreshCw, Loader2, X, SlidersHorizontal, ChevronDown, User } from "lucide-react";
import type { Artist, ArtistStatusValue } from "@/types/artist";
import { StatusDropdown } from "./StatusDropdown";

const MANAGER_COLORS = [
  { bg: "#F3E8FF", text: "#7C3AED", border: "#DDD6FE" },
  { bg: "#DBEAFE", text: "#2563EB", border: "#BFDBFE" },
  { bg: "#D1FAE5", text: "#059669", border: "#A7F3D0" },
  { bg: "#FEE2E2", text: "#DC2626", border: "#FECACA" },
  { bg: "#FEF3C7", text: "#D97706", border: "#FDE68A" },
  { bg: "#FCE7F3", text: "#DB2777", border: "#FBCFE8" },
  { bg: "#CFFAFE", text: "#0891B2", border: "#A5F3FC" },
  { bg: "#E0E7FF", text: "#4F46E5", border: "#C7D2FE" },
  { bg: "#FFEDD5", text: "#EA580C", border: "#FED7AA" },
];

function getManagerColor(name: string): { bg: string; text: string; border: string } {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return MANAGER_COLORS[Math.abs(hash) % MANAGER_COLORS.length];
}

function getStatusVariant(status: string): "default" | "success" | "warning" | "destructive" | "info" {
  switch (status) {
    case "Onboarded": return "success";
    case "Meeting Required": return "warning";
    case "KYC Required": return "info";
    case "Rejected": return "destructive";
    case "New": return "default";
    default: return "default";
  }
}

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

function getDriveThumbnailUrl(url: string): string | null {
  const fileId = extractDriveFileId(url);
  if (!fileId) return null;
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w300`;
}

function parsePortfolioLinks(field: unknown): string[] {
  if (!field) return [];
  const str = String(field);
  if (!str.trim()) return [];
  return str.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
}

function parseInstagram(value: string): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  let username = trimmed.replace(/^@/, "");
  username = username.replace(/^(https?:\/\/)?(www\.)?instagram\.com\//, "");
  username = username.split("?")[0].split("#")[0];
  username = username.replace(/\/+$/, "");
  return `https://instagram.com/${username}`;
}

function renderInstagramLink(instagram: string | undefined): React.ReactNode {
  if (!instagram || instagram.trim() === "") return null;
  const url = parseInstagram(instagram);
  const display = instagram.trim().replace(/^https?:\/\/(www\.)?instagram\.com\//, "@").replace(/\/+$/, "");
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
      {display}
    </a>
  );
}

interface ArtistGridViewProps {
  artists: Artist[];
  onStatusUpdate: (row: number, status: string) => void;
  onManagerAssign: (row: number, manager: string) => void;
  onArtistClick: (name: string, rowIndex: number) => void;
  isLoading: boolean;
  onRefresh: () => void;
  lastUpdated: Date | null;
  pendingUpdates?: Record<number, "status" | "manager">;
  updatingIds?: Set<number>;
  managers?: string[];
}

const getAllManagers = (artists: Artist[], apiManagers: string[] = []): string[] => {
  const dynamicManagers = artists
    .map(a => (a["Manager"] || "").toString().trim())
    .filter(m => m.length > 0);
  const all = [...apiManagers, ...dynamicManagers].map(m => m.trim());
  const normalized = all.map(m => m.toLowerCase());
  const uniqueNormalized = Array.from(new Set(normalized));
  return uniqueNormalized.map(norm => all[normalized.indexOf(norm)]).sort();
};

export function ArtistGridView({
  artists,
  onStatusUpdate,
  onManagerAssign,
  onArtistClick,
  isLoading,
  onRefresh,
  lastUpdated,
  pendingUpdates = {},
  updatingIds = new Set(),
  managers = [],
}: ArtistGridViewProps) {
  const [search, setSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<Artist[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [managerFilter, setManagerFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [openManagerDropdown, setOpenManagerDropdown] = useState<number | null>(null);
  const [managerDropdownPosition, setManagerDropdownPosition] = useState<{ top: number; left: number } | null>(null);

  const getUniqueValues = (arr: Artist[], key: keyof Artist): string[] => {
    const values = arr.map(a => (a[key] || "").toString().trim()).filter(v => v.length > 0);
    return Array.from(new Set(values)).sort();
  };

  const uniqueStatuses = getUniqueValues(artists, "Status");
  if (!uniqueStatuses.includes("New")) uniqueStatuses.unshift("New");
  const uniqueManagers = getAllManagers(artists, managers);
  const uniqueCategories = getUniqueValues(artists, "Category");

  const filteredArtists = useMemo(() => {
    return artists.filter((artist) => {
      const searchLower = search.toLowerCase();
      const hasSearch = search.trim().length > 0;
      const matchesSearch =
        !hasSearch ||
        (artist["Full Name"] || "").toLowerCase().includes(searchLower) ||
        (artist["Email"] || "").toLowerCase().includes(searchLower) ||
        String(artist["Phone"] || "").toLowerCase().includes(searchLower) ||
        (artist["Instagram"] || "").toLowerCase().includes(searchLower);

      const matchesStatus = hasSearch
        ? true
        : statusFilter === "all"
          ? artist["Status"] !== "Rejected" && artist["Status"] !== "Onboarded"
          : statusFilter === "New"
            ? !artist["Status"] || artist["Status"] === "New"
            : artist["Status"] === statusFilter;
      const matchesManager = managerFilter === "all" || artist["Manager"] === managerFilter;
      const matchesCategory = categoryFilter === "all" || artist["Category"] === categoryFilter;

      return matchesSearch && matchesStatus && matchesManager && matchesCategory;
    }).sort((a, b) => b.rowIndex - a.rowIndex);
  }, [artists, search, statusFilter, managerFilter, categoryFilter]);

  const updateSuggestions = (value: string) => {
    setSearch(value);
    if (value.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    const searchLower = value.toLowerCase();
    const matches = artists
      .filter(a => {
        const name = (a["Full Name"] || "").toLowerCase();
        const email = (a["Email"] || "").toLowerCase();
        const phone = String(a["Phone"] || "").toLowerCase();
        return name.includes(searchLower) || email.includes(searchLower) || phone.includes(searchLower);
      })
      .slice(0, 7);
    setSuggestions(matches);
    setShowSuggestions(matches.length > 0);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) setShowSuggestions(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && showSuggestions) setShowSuggestions(false);
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [showSuggestions]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") { setOpenManagerDropdown(null); setManagerDropdownPosition(null); }
    }
    if (openManagerDropdown !== null) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [openManagerDropdown]);

  const handleManagerTriggerClick = (rowIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (openManagerDropdown === rowIndex) { setOpenManagerDropdown(null); setManagerDropdownPosition(null); }
    else {
      if (e.currentTarget instanceof HTMLElement) {
        const rect = e.currentTarget.getBoundingClientRect();
        const top = rect.bottom - 1;
        setManagerDropdownPosition({ top, left: rect.left });
      }
      setOpenManagerDropdown(rowIndex);
    }
  };

  const handleManagerSelect = (rowIndex: number, manager: string) => {
    onManagerAssign(rowIndex, manager);
    setOpenManagerDropdown(null);
    setManagerDropdownPosition(null);
  };

  const hasActiveFilters = () =>
    statusFilter !== "all" || managerFilter !== "all" || categoryFilter !== "all" || search !== "";

  const clearAllFilters = () => { setStatusFilter("all"); setManagerFilter("all"); setCategoryFilter("all"); setSearch(""); };

  if (isLoading && artists.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (artists.length === 0) {
    return <div className="empty-state text-muted-foreground">No artists found</div>;
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Search + Filters Card */}
      <Card className="p-4">
        <div className="relative" ref={searchRef} style={{ overflow: 'visible' }}>
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, Instagram, or location..."
            value={search}
            onChange={(e) => updateSuggestions(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && showSuggestions) setShowSuggestions(false); }}
            className="pl-10"
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-[100] w-full mt-1 bg-background border border-border rounded-lg shadow-lg overflow-hidden">
              {suggestions.map((artist) => (
                <button
                  key={artist.rowIndex}
                  onClick={() => { setSearch(artist["Full Name"] || ""); setShowSuggestions(false); }}
                  className="w-full px-3 py-2 text-left hover:bg-accent/50 transition-colors flex items-center gap-2"
                >
                  <span className="font-medium truncate capitalize">{artist["Full Name"]}</span>
                  {String(artist["Phone"] || "") && (
                    <span className="text-muted-foreground text-sm truncate">{artist["Phone"]}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-3 md:hidden">
          <span className="text-sm text-muted-foreground">
            {filteredArtists.length} of {artists.length} artists
          </span>
          <button onClick={() => setFiltersOpen(!filtersOpen)} className="text-sm text-primary hover:underline flex items-center gap-1">
            {filtersOpen ? "Hide" : "Show"} Filters
            <ChevronDown className={`h-4 w-4 transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
          </button>
        </div>

        <div className={`filters-collapsible ${filtersOpen ? "open" : ""} mt-3`}>
          <div className="flex flex-wrap gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px] text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {uniqueStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={managerFilter} onValueChange={setManagerFilter}>
              <SelectTrigger className="w-[150px] text-sm">
                <SelectValue placeholder="Manager" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Managers</SelectItem>
                {uniqueManagers.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[150px] text-sm">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {uniqueCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="hidden md:block text-sm text-muted-foreground mt-2">
            Showing {filteredArtists.length} of {artists.length} artists
          </div>
        </div>
      </Card>

      {/* Artist Cards Grid */}
      <div className="talent-grid">
        {filteredArtists.map((artist) => {
          const portfolioLinks = parsePortfolioLinks(artist["Portfolio"]);
          const profileImageUrl = portfolioLinks.length > 0 ? getDriveThumbnailUrl(portfolioLinks[0]) : null;

          return (
            <Card
              key={artist.rowIndex}
              className="talent-card"
            >
              <div className="flex flex-col gap-3 h-full">
                <div
                  className="cursor-pointer flex-1"
                  onClick={() => onArtistClick(artist["Full Name"], artist.rowIndex!)}
                >
                  {/* Header */}
                  <div className="flex items-start gap-3">
                    <div className="bg-muted p-1 rounded-lg shrink-0 overflow-hidden">
                      {profileImageUrl ? (
                        <img
                          src={profileImageUrl}
                          alt={artist["Full Name"]}
                          className="h-10 w-10 object-cover rounded-md"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      ) : null}
                      {!profileImageUrl && (
                        <div className="h-10 w-10 flex items-center justify-center">
                          <User className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-foreground truncate capitalize">
                        {artist["Full Name"]}
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        {artist["Instagram"] ? renderInstagramLink(artist["Instagram"]) : (
                          <span className="text-muted-foreground/50">No Instagram</span>
                        )}
                      </div>
                    </div>
                    <Badge variant={getStatusVariant(artist["Status"])} className="shrink-0 text-xs">
                      {artist["Status"] || "New"}
                    </Badge>
                  </div>

                  {/* Info Row */}
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground truncate">
                      {artist["Location"] || "Unknown location"}
                    </span>
                  </div>

                  {/* Category Row */}
                  <div className="text-sm text-muted-foreground truncate">
                    {artist["Category"] || "Uncategorized"}
                  </div>

                  {/* Manager Row */}
                  <div className="text-sm text-muted-foreground truncate">
                    {artist["Manager"] || "No manager"}
                  </div>

                  {/* Details Row */}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    {artist["Gender"] && <span className="whitespace-nowrap">{artist["Gender"]}</span>}
                    {artist["Gender"] && artist["Age"] && <span className="text-border">•</span>}
                    {artist["Age"] && <span className="whitespace-nowrap">{artist["Age"]} yrs</span>}
                    {artist["Phone"] && (
                      <div className="flex items-center gap-1.5 ml-auto">
                        <button
                          onClick={(e) => { e.stopPropagation(); window.location.href = `tel:${artist["Phone"]}`; }}
                          className="h-8 w-8 flex items-center justify-center rounded-lg bg-blue-500/15 text-blue-500 hover:bg-blue-500/25 transition-colors"
                          title="Call"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); const phone = String(artist["Phone"]).replace(/\D/g, ""); window.open(`https://wa.me/${phone}`, "_blank"); }}
                          className="h-8 w-8 flex items-center justify-center rounded-lg bg-green-500/15 text-green-500 hover:bg-green-500/25 transition-colors"
                          title="WhatsApp"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-border/50 card-actions">
                  <div className="flex flex-row sm:flex-col items-center sm:items-stretch justify-between gap-2">
                    {/* Manager button */}
                    {artist["Manager"] ? (() => {
                      const mc = getManagerColor(artist["Manager"]);
                      return (
                        <button
                          onClick={(e) => handleManagerTriggerClick(artist.rowIndex!, e)}
                          disabled={!!pendingUpdates[artist.rowIndex] || updatingIds.has(artist.rowIndex!)}
                          className="flex items-center gap-2 hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-left flex-1 min-w-0"
                        >
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-medium text-xs"
                            style={{ backgroundColor: mc.bg, color: mc.text, border: `1px solid ${mc.border}` }}
                          >
                            {artist["Manager"].split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium truncate">{artist["Manager"]}</span>
                        </button>
                      );
                    })() : (
                      <button
                        onClick={(e) => handleManagerTriggerClick(artist.rowIndex!, e)}
                        disabled={!!pendingUpdates[artist.rowIndex] || updatingIds.has(artist.rowIndex!)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-secondary-foreground rounded-full text-sm font-medium hover:bg-secondary/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left flex-1 justify-center sm:min-w-[140px]"
                      >
                        Assign...
                      </button>
                    )}

                    <StatusDropdown
                      currentStatus={(artist["Status"] as ArtistStatusValue) || "New"}
                      rowIndex={artist.rowIndex}
                      onStatusChange={onStatusUpdate}
                      disabled={!!pendingUpdates[artist.rowIndex] || updatingIds.has(artist.rowIndex!)}
                      isLoading={updatingIds.has(artist.rowIndex!)}
                      hasManager={!!artist["Manager"]}
                    />
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Manager Dropdown Portal */}
      {openManagerDropdown !== null && managerDropdownPosition && typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-50"
            style={{ top: 0 }}
            onClick={(e) => {
              const dropdown = document.getElementById("artist-grid-manager-panel");
              if (dropdown && !dropdown.contains(e.target as Node)) {
                setOpenManagerDropdown(null);
                setManagerDropdownPosition(null);
              }
            }}
          >
            <div
              id="artist-grid-manager-panel"
              className="bg-popover border border-border rounded-xl shadow-xl animate-scale-in"
              style={{
                position: "fixed",
                top: `${managerDropdownPosition.top}px`,
                left: `${Math.max(8, Math.min(managerDropdownPosition.left, window.innerWidth - 220))}px`,
                width: "200px",
                maxWidth: "calc(100vw - 16px)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="py-1">
                {uniqueManagers.map((manager) => {
                  const mc = getManagerColor(manager);
                  return (
                    <button
                      key={manager}
                      onClick={() => handleManagerSelect(openManagerDropdown, manager)}
                      className="w-full flex items-center gap-2 px-3 py-3 sm:py-2.5 text-sm text-popover-foreground hover:bg-accent transition-colors min-h-[44px] text-left"
                    >
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-medium text-xs"
                        style={{ backgroundColor: mc.bg, color: mc.text, border: `1px solid ${mc.border}` }}
                      >
                        {manager.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <span className="font-medium">{manager}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
