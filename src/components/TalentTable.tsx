import { useState, useMemo } from "react";
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
import { MANAGERS, ACTION_STATUSES } from "@/types/talent";
import { Search, RefreshCw } from "lucide-react";

interface TalentTableProps {
  talents: Talent[];
  onStatusUpdate: (row: number, status: string) => void;
  onManagerAssign: (row: number, manager: string) => void;
  onTalentClick: (name: string) => void;
  isLoading: boolean;
  onRefresh: () => void;
  lastUpdated: Date | null;
}

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
}: TalentTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [managerFilter, setManagerFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [selectedManagers, setSelectedManagers] = useState<Record<number, string>>({});

  const uniqueStatuses = getUniqueValues(talents, "Status");
  const uniqueManagers = getUniqueValues(talents, "Talent Manager");
  const uniqueCities = getUniqueValues(talents, "City");

  const filteredTalents = useMemo(() => {
    return talents.filter((talent) => {
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
  }, [talents, search, statusFilter, managerFilter, cityFilter]);

  const handleStatusClick = (talent: Talent, status: StatusValue) => {
    if (status === "Onboarded" && !talent["Talent Manager"]) {
      alert("Please assign a Talent Manager first");
      return;
    }
    onStatusUpdate(talent.rowIndex, status);
  };

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
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
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

              <Select value={managerFilter} onValueChange={setManagerFilter}>
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

              <Select value={cityFilter} onValueChange={setCityFilter}>
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

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {filteredTalents.length} of {talents.length} talents
              {lastUpdated && (
                <span className="ml-2">
                  (Updated: {lastUpdated.toLocaleTimeString()})
                </span>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </Card>

      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Name</TableHead>
              <TableHead>Instagram</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Talent Manager</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && filteredTalents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Loading talents...
                </TableCell>
              </TableRow>
            ) : filteredTalents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  No talents found
                </TableCell>
              </TableRow>
            ) : (
              filteredTalents.map((talent) => (
                <TableRow key={talent.rowIndex}>
                  <TableCell>
                    <button
                      onClick={() => onTalentClick(talent["Full Name"])}
                      className="text-blue-600 hover:underline font-medium text-left"
                    >
                      {talent["Full Name"]}
                    </button>
                  </TableCell>
                  <TableCell>{talent["Instagram"] || "-"}</TableCell>
                  <TableCell>{talent["City"] || "-"}</TableCell>
                  <TableCell>{talent["Gender"] || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(talent["Status"])}>
                      {talent["Status"] || "New"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {talent["Talent Manager"] ? (
                      <span className="text-sm">{talent["Talent Manager"]}</span>
                    ) : (
                      <Select
                        value={selectedManagers[talent.rowIndex] || ""}
                        onValueChange={(v) => handleManagerSelect(talent.rowIndex, v)}
                      >
                        <SelectTrigger className="w-[130px] h-8 text-xs">
                          <SelectValue placeholder="Assign..." />
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
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-1">
                      {ACTION_STATUSES.map((status) => (
                        <Button
                          key={status}
                          variant="outline"
                          size="sm"
                          className="text-xs h-7 px-2"
                          onClick={() => handleStatusClick(talent, status)}
                          disabled={talent["Status"] === status}
                        >
                          {status}
                        </Button>
                      ))}
                    </div>
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
