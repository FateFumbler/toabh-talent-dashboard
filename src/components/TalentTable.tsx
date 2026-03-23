import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Card } from "@/components/ui/card";
import type { Talent, StatusValue } from "@/types/talent";
import { MANAGERS } from "@/types/talent";
import { Search, RefreshCw, Loader2, X, SlidersHorizontal, ChevronDown } from "lucide-react";
import { StatusDropdown } from "./StatusDropdown";
import type { ColumnName } from "./ColumnVisibility";
import { getInitialColumns } from "./ColumnVisibility";

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

interface TalentTableProps {
  talents: Talent[];
  onStatusUpdate: (row: number, status: string) => void;
  onManagerAssign: (row: number, manager: string) => void;
  onTalentClick: (name: string, rowIndex: number) => void;
  isLoading: boolean;
  onRefresh: () => void;
  lastUpdated: Date | null;
  pendingUpdates?: Record<number, "status" | "manager">;
  visibleColumns?: ColumnName[];
  statusFilter?: string;
  onStatusFilterChange?: (status: string) => void;
}

function parseInstagram(value: string): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  let username = trimmed.replace(/^@/, "");
  username = username.replace(/^(https?:\/\/)?(www\.)?instagram\.com\//, "");
  username = username.split("?")[0].split("#")[0];
  username = username.replace(/\/+$/, "");
  return `https://instagram.com/${username}`;
}

const renderInstagramLink = (
  instagram: string | undefined
): React.ReactNode => {
  if (!instagram || instagram.trim() === "") return "-";
  const url = parseInstagram(instagram);
  const display = instagram
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//, "@")
    .replace(/\/+$/, "");
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={url}
      className="text-primary hover:underline block overflow-hidden text-ellipsis whitespace-nowrap max-w-[150px]"
    >
      {display}
    </a>
  );
};

const getStatusDot = (status: string): string => {
  switch (status) {
    case "Onboarded":
      return "bg-green-500";
    case "Meeting Required":
      return "bg-orange-400";
    case "KYC Required":
      return "bg-blue-500";
    case "Rejected":
      return "bg-red-500";
    case "New":
    default:
      return "bg-muted-foreground";
  }
};

const getStatusVariant = (
  status: string
): "default" | "success" | "warning" | "destructive" | "info" => {
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
};

const getUniqueValues = (talents: Talent[], key: keyof Talent): string[] => {
  const values = talents
    .map((t) => t[key])
    .filter((v) => v && v.toString().trim() !== "");
  return [...new Set(values)].sort() as string[];
};

export function TalentTable({
  talents,
  onStatusUpdate,
  onManagerAssign,
  onTalentClick,
  isLoading,
  onRefresh,
  lastUpdated,
  pendingUpdates = {},
  visibleColumns: externalVisibleColumns,
  statusFilter: externalStatusFilter,
  onStatusFilterChange: externalOnStatusFilterChange,
}: TalentTableProps) {
  const [search, setSearch] = useState("");
  const [internalStatusFilter, setInternalStatusFilter] = useState<string>("all");
  const [managerFilter, setManagerFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "az" | "za">("newest");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [openManagerDropdown, setOpenManagerDropdown] = useState<number | null>(null);
  const [managerDropdownPosition, setManagerDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);

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

  const visibleColumns = externalVisibleColumns || getInitialColumns();

  const uniqueStatuses = getUniqueValues(talents, "Status");
  const uniqueManagers = getUniqueValues(talents, "Talent Manager");
  const uniqueCities = getUniqueValues(talents, "City");

  const filteredTalents = useMemo(() => {
    let filtered = talents.filter((talent) => {
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
      const matchesCity =
        cityFilter === "all" || talent["City"] === cityFilter;

      return matchesSearch && matchesStatus && matchesManager && matchesCity;
    });

    switch (sortBy) {
      case "newest":
        filtered = filtered.sort((a, b) => b.rowIndex - a.rowIndex);
        break;
      case "oldest":
        filtered = filtered.sort((a, b) => a.rowIndex - b.rowIndex);
        break;
      case "az":
        filtered = filtered.sort((a, b) =>
          a["Full Name"].localeCompare(b["Full Name"])
        );
        break;
      case "za":
        filtered = filtered.sort((a, b) =>
          b["Full Name"].localeCompare(a["Full Name"])
        );
        break;
    }

    return filtered;
  }, [talents, search, statusFilter, managerFilter, cityFilter, sortBy]);

  const handleManagerSelect = (rowIndex: number, manager: string) => {
    onManagerAssign(rowIndex, manager);
  };

  // Manager dropdown handlers (portal-based, viewport-constrained)
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenManagerDropdown(null);
        setManagerDropdownPosition(null);
      }
    }
    if (openManagerDropdown !== null) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [openManagerDropdown]);

  useEffect(() => {
    if (openManagerDropdown === null) return;
    const handleScroll = () => {
      setOpenManagerDropdown(null);
      setManagerDropdownPosition(null);
    };
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleScroll);
    };
  }, [openManagerDropdown]);

  const handleManagerTriggerClick = (rowIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (pendingUpdates[rowIndex]) return;
    if (openManagerDropdown === rowIndex) {
      setOpenManagerDropdown(null);
      setManagerDropdownPosition(null);
    } else {
      if (e.currentTarget instanceof HTMLElement) {
        const rect = e.currentTarget.getBoundingClientRect();
        setManagerDropdownPosition({ top: rect.bottom + 4, left: rect.left, width: rect.width });
      }
      setOpenManagerDropdown(rowIndex);
    }
  };

  const handleManagerItemSelect = (manager: string) => {
    if (openManagerDropdown !== null) {
      handleManagerSelect(openManagerDropdown, manager);
      setOpenManagerDropdown(null);
      setManagerDropdownPosition(null);
    }
  };

  const hasActiveFilters = () => {
    return (
      statusFilter !== "all" ||
      managerFilter !== "all" ||
      cityFilter !== "all" ||
      search !== "" ||
      sortBy !== "newest"
    );
  };

  const clearAllFilters = () => {
    setStatusFilter("all");
    setManagerFilter("all");
    setCityFilter("all");
    setSearch("");
    setSortBy("newest");
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Toolbar */}
      <Card className="p-4">
        <div className="flex flex-col gap-4">
          {/* Search Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, Instagram, or city..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filter toggles */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFiltersOpen(!filtersOpen)}
                className={`btn-premium border ${filtersOpen ? "bg-primary text-primary-foreground border-primary" : "bg-secondary hover:bg-secondary/80 text-secondary-foreground border-border"}`}
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span className="hidden sm:inline">Filters</span>
                {hasActiveFilters() && (
                  <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                )}
              </button>

              <Select
                value={sortBy}
                onValueChange={(v: "newest" | "oldest" | "az" | "za") =>
                  setSortBy(v)
                }
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="oldest">Oldest</SelectItem>
                  <SelectItem value="az">A–Z</SelectItem>
                  <SelectItem value="za">Z–A</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isLoading}
                className="hover:bg-secondary/80"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          </div>

          {/* Expandable Filters */}
          <div
            className={`overflow-hidden transition-all duration-200 ${
              filtersOpen ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger className="w-[160px]">
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

              <Select
                value={managerFilter}
                onValueChange={setManagerFilter}
              >
                <SelectTrigger className="w-[160px]">
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

              <Select
                value={cityFilter}
                onValueChange={setCityFilter}
              >
                <SelectTrigger className="w-[140px]">
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
          </div>

          {/* Status Bar */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing{" "}
              <span className="font-medium text-foreground">
                {filteredTalents.length}
              </span>{" "}
              of{" "}
              <span className="font-medium text-foreground">{talents.length}</span>{" "}
              talents
              {lastUpdated && (
                <span className="ml-2 text-xs">
                  · Updated {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {hasActiveFilters() && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="text-xs text-muted-foreground hover:text-foreground h-7 px-2"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Table */}
      <div className="table-container overflow-x-auto relative">
        <div className="absolute right-0 top-0 bottom-0 w-6 pointer-events-none bg-gradient-to-l from-background to-transparent z-10 opacity-0 hover:opacity-100 transition-opacity scrollbar-hint" />
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-border">
              {visibleColumns.includes("Full Name") && (
                <TableHead className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[200px]">
                  Name
                </TableHead>
              )}
              {visibleColumns.includes("Instagram") && (
                <TableHead className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Instagram
                </TableHead>
              )}
              {visibleColumns.includes("City") && (
                <TableHead className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  City
                </TableHead>
              )}
              {visibleColumns.includes("Gender") && (
                <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Gender
                </TableHead>
              )}
              {visibleColumns.includes("Age") && (
                <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Age
                </TableHead>
              )}
              {visibleColumns.includes("Height") && (
                <TableHead className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Height
                </TableHead>
              )}
              {visibleColumns.includes("Status") && (
                <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </TableHead>
              )}
              {visibleColumns.includes("Talent Manager") && (
                <TableHead className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Talent Manager
                </TableHead>
              )}
              <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && filteredTalents.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={visibleColumns.length + 1}
                  className="text-center py-16"
                >
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Loading talents...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredTalents.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={visibleColumns.length + 1}
                  className="text-center py-16"
                >
                  <div className="empty-state">
                    <Search className="h-10 w-10 mb-3 mx-auto text-muted-foreground/40" />
                    <p className="text-muted-foreground">No talents found</p>
                    {hasActiveFilters() && (
                      <button
                        onClick={clearAllFilters}
                        className="mt-2 text-sm text-primary hover:underline"
                      >
                        Clear filters
                      </button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredTalents.map((talent, index) => (
                <TableRow
                  key={talent.rowIndex}
                  className={`group border-b border-border/50 transition-colors hover:bg-accent/30 ${
                    index % 2 === 1 ? "bg-muted/10" : ""
                  }`}
                >
                  <TableCell className="text-left py-3 px-4 align-middle">
                    <button
                      onClick={() =>
                        onTalentClick(talent["Full Name"], talent.rowIndex!)
                      }
                      className="text-foreground font-medium hover:text-primary transition-colors text-left"
                    >
                      {talent["Full Name"]}
                    </button>
                  </TableCell>
                  {visibleColumns.includes("Instagram") && (
                    <TableCell className="text-left py-3 px-4 align-middle text-sm text-muted-foreground">
                      {renderInstagramLink(talent["Instagram"])}
                    </TableCell>
                  )}
                  {visibleColumns.includes("City") && (
                    <TableCell className="text-left py-3 px-4 align-middle text-sm text-muted-foreground">
                      {talent["City"] || "-"}
                    </TableCell>
                  )}
                  {visibleColumns.includes("Gender") && (
                    <TableCell className="text-center py-3 px-4 align-middle text-sm text-muted-foreground">
                      {talent["Gender"] || "-"}
                    </TableCell>
                  )}
                  {visibleColumns.includes("Age") && (
                    <TableCell className="text-center py-3 px-4 align-middle text-sm text-muted-foreground">
                      {talent["Age"] || "-"}
                    </TableCell>
                  )}
                  {visibleColumns.includes("Height") && (
                    <TableCell className="text-left py-3 px-4 align-middle text-sm text-muted-foreground">
                      {formatHeight(talent["Height"])}
                    </TableCell>
                  )}
                  {visibleColumns.includes("Status") && (
                    <TableCell className="text-center py-3 px-4 align-middle">
                      <div className="flex items-center justify-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${getStatusDot(
                            talent["Status"]
                          )}`}
                        />
                        <Badge
                          variant={getStatusVariant(talent["Status"])}
                          className="text-xs"
                        >
                          {talent["Status"] || "New"}
                        </Badge>
                      </div>
                    </TableCell>
                  )}
                  {visibleColumns.includes("Talent Manager") && (
                    <TableCell className="text-left py-3 px-4 align-middle">
                      {talent["Talent Manager"] ? (
                        <span className="text-sm text-foreground">
                          {talent["Talent Manager"]}
                        </span>
                      ) : (
                        <button
                          onClick={(e) => handleManagerTriggerClick(talent.rowIndex!, e)}
                          disabled={!!pendingUpdates[talent.rowIndex]}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-secondary-foreground rounded-lg text-xs font-medium hover:bg-secondary/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-border/50 whitespace-nowrap"
                        >
                          {pendingUpdates[talent.rowIndex] === "manager" ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              <span>Assign...</span>
                              <ChevronDown className="h-3 w-3 opacity-70" />
                            </>
                          )}
                        </button>
                      )}
                    </TableCell>
                  )}
                  <TableCell className="text-right py-3 px-4 align-middle">
                    <StatusDropdown
                      currentStatus={
                        (talent["Status"] as StatusValue) || "New"
                      }
                      rowIndex={talent.rowIndex}
                      onStatusChange={onStatusUpdate}
                      disabled={!!pendingUpdates[talent.rowIndex]}
                      isLoading={pendingUpdates[talent.rowIndex] === "status"}
                      hasManager={!!talent["Talent Manager"]}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Manager dropdown portal — rendered outside table to avoid overflow clipping */}
      {openManagerDropdown !== null && managerDropdownPosition && typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-50"
            onMouseDown={() => {
              setOpenManagerDropdown(null);
              setManagerDropdownPosition(null);
            }}
          >
            <div
              className="bg-popover border border-border rounded-xl shadow-xl overflow-hidden animate-scale-in"
              style={{
                position: "fixed",
                top: `${managerDropdownPosition.top}px`,
                left: `${Math.max(8, Math.min(managerDropdownPosition.left, window.innerWidth - 182))}px`,
                width: "174px",
                maxWidth: "calc(100vw - 16px)",
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="py-1">
                {MANAGERS.map((manager) => (
                  <button
                    key={manager}
                    onClick={() => handleManagerItemSelect(manager)}
                    className="w-full flex items-center px-3 py-3 sm:py-2.5 text-sm text-popover-foreground hover:bg-accent transition-colors min-h-[44px] text-left"
                  >
                    {manager}
                  </button>
                ))}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
