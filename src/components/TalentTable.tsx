import React, { useState, useMemo } from "react";
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
import { Search, RefreshCw, Loader2 } from "lucide-react";
import { type ColumnName, getInitialColumns } from "./ColumnVisibility";
import { StatusDropdown } from "./StatusDropdown";

interface TalentTableProps {
  talents: Talent[];
  onStatusUpdate: (row: number, status: string) => void;
  onManagerAssign: (row: number, manager: string) => void;
  onTalentClick: (name: string) => void;
  isLoading: boolean;
  onRefresh: () => void;
  lastUpdated: Date | null;
  pendingUpdates?: Record<number, "status" | "manager">;
  visibleColumns?: ColumnName[];
  // Controlled status filter for bi-directional sync with quick filters
  statusFilter?: string;
  onStatusFilterChange?: (status: string) => void;
}

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
  if (!instagram || instagram.trim() === "") return "-";
  const url = parseInstagram(instagram);
  const display = instagram.trim().replace(/^https?:\/\/(www\.)?instagram\.com\//, "@").replace(/\/+$/, "");
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
      {display}
    </a>
  );
};

const getStatusDot = (status: string): string => {
  switch (status) {
    case "Onboarded":
      return "status-dot status-dot-onboarded";
    case "Meeting Required":
      return "status-dot status-dot-meeting";
    case "KYC Required":
      return "status-dot status-dot-kyc";
    case "Rejected":
      return "status-dot status-dot-rejected";
    case "New":
      return "status-dot status-dot-new";
    default:
      return "status-dot status-dot-new";
  }
};

const getStatusVariant = (status: string): "default" | "success" | "warning" | "destructive" | "info" => {
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
  const values = talents.map((t) => t[key]).filter((v) => v && v.toString().trim() !== "");
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
  const [selectedManagers, setSelectedManagers] = useState<Record<number, string>>({});
  
  // Use external status filter if provided (controlled), otherwise use internal
  const statusFilter = externalStatusFilter !== undefined ? externalStatusFilter : internalStatusFilter;
  const setStatusFilter = (value: string) => {
    if (externalOnStatusFilterChange) {
      externalOnStatusFilterChange(value);
    } else {
      setInternalStatusFilter(value);
    }
  };
  
  // Column visibility - use external if provided, otherwise use initial columns
  // Note: ColumnVisibility UI component (gear icon) has been removed
  const visibleColumns = externalVisibleColumns || getInitialColumns();

  const uniqueStatuses = getUniqueValues(talents, "Status");
  const uniqueManagers = getUniqueValues(talents, "Talent Manager");
  const uniqueCities = getUniqueValues(talents, "City");

  // Sort talents by rowIndex descending (latest/highest rowIndex first = newest talents)
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
    // Sort by rowIndex descending (newest first)
    return filtered.sort((a, b) => b.rowIndex - a.rowIndex);
  }, [talents, search, statusFilter, managerFilter, cityFilter]);

  const handleManagerSelect = (rowIndex: number, manager: string) => {
    setSelectedManagers((prev) => ({ ...prev, [rowIndex]: manager }));
    onManagerAssign(rowIndex, manager);
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, Instagram, or city..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-input/50"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px] bg-input/50">
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
                <SelectTrigger className="w-[160px] bg-input/50">
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
                <SelectTrigger className="w-[140px] bg-input/50">
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

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {filteredTalents.length} of {talents.length} talents
              {lastUpdated && (
                <span className="ml-2">
                  (Updated: {lastUpdated.toLocaleTimeString()})
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isLoading}
                className="hover:bg-accent/50"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <div className="glass-card rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border/30">
              {visibleColumns.includes("Full Name") && (
                <TableHead className="w-[200px] text-muted-foreground">Name</TableHead>
              )}
              {visibleColumns.includes("Instagram") && (
                <TableHead className="text-muted-foreground">Instagram</TableHead>
              )}
              {visibleColumns.includes("City") && (
                <TableHead className="text-muted-foreground">City</TableHead>
              )}
              {visibleColumns.includes("Gender") && (
                <TableHead className="text-muted-foreground">Gender</TableHead>
              )}
              {visibleColumns.includes("Age") && (
                <TableHead className="text-muted-foreground">Age</TableHead>
              )}
              {visibleColumns.includes("Height") && (
                <TableHead className="text-muted-foreground">Height</TableHead>
              )}
              {visibleColumns.includes("Status") && (
                <TableHead className="text-muted-foreground">Status</TableHead>
              )}
              {visibleColumns.includes("Talent Manager") && (
                <TableHead className="text-muted-foreground">Talent Manager</TableHead>
              )}
              <TableHead className="text-right text-muted-foreground">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && filteredTalents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={visibleColumns.length + 1} className="text-center py-8 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : filteredTalents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={visibleColumns.length + 1} className="text-center py-8 text-muted-foreground">
                  No talents found
                </TableCell>
              </TableRow>
            ) : (
              filteredTalents.map((talent, index) => (
                <TableRow 
                  key={talent.rowIndex} 
                  className={`hover:bg-zinc-800/40 transition-colors duration-150 ${
                    index % 2 === 1 ? 'bg-zinc-900/20' : ''
                  }`}
                >
                  <TableCell>
                    <button
                      onClick={() => onTalentClick(talent["Full Name"])}
                      className="text-primary hover:underline font-medium text-left truncate max-w-[180px] block"
                    >
                      {talent["Full Name"]}
                    </button>
                  </TableCell>
                  {visibleColumns.includes("Instagram") && (
                    <TableCell className="text-muted-foreground truncate max-w-[120px]">
                      {renderInstagramLink(talent["Instagram"])}
                    </TableCell>
                  )}
                  {visibleColumns.includes("City") && (
                    <TableCell className="text-muted-foreground">
                      {talent["City"] || "-"}
                    </TableCell>
                  )}
                  {visibleColumns.includes("Gender") && (
                    <TableCell className="text-muted-foreground">
                      {talent["Gender"] || "-"}
                    </TableCell>
                  )}
                  {visibleColumns.includes("Age") && (
                    <TableCell className="text-muted-foreground">
                      {talent["Age"] || "-"}
                    </TableCell>
                  )}
                  {visibleColumns.includes("Height") && (
                    <TableCell className="text-muted-foreground">
                      {talent["Height"] || "-"}
                    </TableCell>
                  )}
                  {visibleColumns.includes("Status") && (
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={getStatusDot(talent["Status"])} />
                        <Badge variant={getStatusVariant(talent["Status"])}>
                          {talent["Status"] || "New"}
                        </Badge>
                      </div>
                    </TableCell>
                  )}
                  {visibleColumns.includes("Talent Manager") && (
                    <TableCell>
                      {talent["Talent Manager"] ? (
                        <span className="text-sm text-foreground">{talent["Talent Manager"]}</span>
                      ) : (
                        <Select
                          value={selectedManagers[talent.rowIndex] || ""}
                          onValueChange={(v) => handleManagerSelect(talent.rowIndex, v)}
                          disabled={!!pendingUpdates[talent.rowIndex]}
                        >
                          <SelectTrigger className="w-[130px] h-8 text-xs bg-input/50">
                            {pendingUpdates[talent.rowIndex] === "manager" ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <SelectValue placeholder="Assign..." />
                            )}
                          </SelectTrigger>
                          <SelectContent>
                            {MANAGERS.map((m) => (
                              <SelectItem key={m} value={m}>
                                {m}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                  )}
                  <TableCell className="text-right">
                    <StatusDropdown
                      currentStatus={(talent["Status"] as StatusValue) || "New"}
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
    </div>
  );
}
