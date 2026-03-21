import { useState, useEffect, useCallback, useMemo } from "react";
import { TalentTable } from "./components/TalentTable";
import { TalentProfileDialog } from "./components/TalentProfile";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Badge } from "./components/ui/badge";
import { fetchTalentMaster, updateStatus, assignManager } from "./services/api";
import type { Talent } from "@/types/talent";
import { RefreshCw, Users, AlertCircle, LayoutGrid, List, User, Search, ExternalLink } from "lucide-react";
import { toast, Toaster } from "sonner";

const REFRESH_INTERVAL = 30000; // 30 seconds

// Helper to render Instagram as clickable link
const renderInstagramLink = (instagram: string | undefined): React.ReactNode => {
  if (!instagram || instagram.trim() === "") return <span className="text-muted-foreground">-</span>;
  const trimmed = instagram.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return (
      <a href={trimmed} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
        {trimmed.replace(/^https?:\/\/(www\.)?instagram\.com\//, "@").replace(/\/$/, "")}
        <ExternalLink className="h-3 w-3" />
      </a>
    );
  }
  const handle = trimmed.replace(/^@/, "").replace(/\/$/, "");
  if (handle) {
    return (
      <a href={`https://www.instagram.com/${handle}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
        @{handle}
        <ExternalLink className="h-3 w-3" />
      </a>
    );
  }
  return <span className="text-muted-foreground">-</span>;
};

function App() {
  const [talents, setTalents] = useState<Talent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedTalent, setSelectedTalent] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  // Track pending updates per rowIndex to show loading state on action buttons
  const [pendingUpdates, setPendingUpdates] = useState<Record<number, "status" | "manager">>({});
  // Tab navigation
  const [activeTab, setActiveTab] = useState<"talent-master" | "talent-profile">("talent-master");
  // View mode (list/grid), persisted to localStorage
  const [viewMode, setViewMode] = useState<"list" | "grid">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("toabh-view-mode") as "list" | "grid") || "list";
    }
    return "list";
  });
  // Profile tab search
  const [profileSearch, setProfileSearch] = useState("");
  const [selectedProfile, setSelectedProfile] = useState<Talent | null>(null);

  const loadTalents = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchTalentMaster();
      // Filter out empty rows
      const validTalents = data.filter(
        (t) => t["Full Name"] && t["Full Name"].trim() !== ""
      );
      setTalents(validTalents);
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

  const handleTalentClick = (name: string) => {
    setSelectedTalent(name);
    setProfileOpen(true);
  };

  const handleViewModeChange = (mode: "list" | "grid") => {
    setViewMode(mode);
    localStorage.setItem("toabh-view-mode", mode);
  };

  // Stats
  const totalTalents = talents.length;
  const onboardedCount = talents.filter((t) => t["Status"] === "Onboarded").length;
  const meetingRequiredCount = talents.filter((t) => t["Status"] === "Meeting Required").length;
  const kycRequiredCount = talents.filter((t) => t["Status"] === "KYC Required").length;

  // Profile search filtering
  const profileSearchResults = useMemo(() => {
    if (!profileSearch.trim()) return talents.slice(0, 20); // Show first 20 if no search
    const search = profileSearch.toLowerCase();
    return talents.filter(t =>
      t["Full Name"]?.toLowerCase().includes(search) ||
      t["Instagram"]?.toLowerCase().includes(search) ||
      t["City"]?.toLowerCase().includes(search)
    ).slice(0, 20);
  }, [talents, profileSearch]);

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

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="glass sticky top-0 z-10 border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary/20 p-2.5 rounded-xl glow-primary">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">TOABH Talent Dashboard</h1>
                <p className="text-sm text-muted-foreground">
                  Talent Management CRM
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadTalents}
              disabled={isLoading}
              className="hover:bg-accent/50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Sync
            </Button>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center gap-1 border-b border-border/50 pb-px">
          <button
            onClick={() => setActiveTab("talent-master")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors relative ${
              activeTab === "talent-master"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <List className="h-4 w-4" />
            Talent Master
            {activeTab === "talent-master" && (
              <span className="absolute bottom-0 left-0 right-0 h-px bg-primary" />
            )}
          </button>
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
        </div>
      </div>

      <main className="container mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="hover-glow transition-all duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Talents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{totalTalents}</div>
            </CardContent>
          </Card>
          <Card className="hover-glow transition-all duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Onboarded
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success glow-success rounded-lg p-2">
                {onboardedCount}
              </div>
            </CardContent>
          </Card>
          <Card className="hover-glow transition-all duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Meeting Required
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-warning glow-warning rounded-lg p-2">
                {meetingRequiredCount}
              </div>
            </CardContent>
          </Card>
          <Card className="hover-glow transition-all duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                KYC Required
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-info glow-info rounded-lg p-2">
                {kycRequiredCount}
              </div>
            </CardContent>
          </Card>
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
          <>
            {/* View Toggle */}
            <div className="flex justify-end mb-4">
              <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-1">
                <button
                  onClick={() => handleViewModeChange("list")}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === "list"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="List View"
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleViewModeChange("grid")}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === "grid"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>
            </div>

            {viewMode === "list" ? (
              <TalentTable
                talents={talents}
                onStatusUpdate={handleStatusUpdate}
                onManagerAssign={handleManagerAssign}
                onTalentClick={handleTalentClick}
                isLoading={isLoading}
                onRefresh={loadTalents}
                lastUpdated={lastUpdated}
                pendingUpdates={pendingUpdates}
              />
            ) : (
              <TalentGridView
                talents={talents}
                isLoading={isLoading}
                onTalentClick={handleTalentClick}
                pendingUpdates={pendingUpdates}
                onStatusUpdate={handleStatusUpdate}
                onManagerAssign={handleManagerAssign}
              />
            )}
          </>
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
                          <div className="font-medium text-foreground truncate">
                            {talent["Full Name"]}
                          </div>
                          <div className="text-sm text-muted-foreground truncate">
                            {renderInstagramLink(talent["Instagram"])}
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

                {/* Basic Info */}
                <Card className="p-4">
                  <h4 className="text-base font-semibold text-foreground mb-4">Basic Information</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {renderProfileField("Full Name", selectedProfile["Full Name"])}
                    {renderProfileField("Email", (selectedProfile as any)["Email "] || (selectedProfile as any)["Email"])}
                    {renderProfileField("Phone", selectedProfile["Phone"])}
                    {renderProfileField("City", selectedProfile["City"])}
                    {renderProfileField("Gender", selectedProfile["Gender"])}
                    {renderProfileField("Age", selectedProfile["Age"])}
                    {renderProfileField("Height", selectedProfile["Height"])}
                    {renderProfileField("Instagram", selectedProfile["Instagram"])}
                  </div>
                </Card>

                {/* Physical Info */}
                <Card className="p-4">
                  <h4 className="text-base font-semibold text-foreground mb-4">Physical Attributes</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {renderProfileField("Measurements - Chest", (selectedProfile as any)["Measurements - Chest"])}
                    {renderProfileField("Measurements - Waist", (selectedProfile as any)["Measurements - Waist"])}
                    {renderProfileField("Measurements - Hips", (selectedProfile as any)["Measurements - Hips"])}
                    {renderProfileField("Measurements - Shoe", (selectedProfile as any)["Measurements - Shoe"])}
                    {renderProfileField("Hair Color", (selectedProfile as any)["Measurements - Hair Color"])}
                    {renderProfileField("Hair Length", (selectedProfile as any)["Measurements - Hair Length"])}
                    {renderProfileField("Eye Color", (selectedProfile as any)["Measurements - Eye Color"])}
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

                {/* Skills */}
                {(selectedProfile as any)["Skills - Languages"] && (
                  <Card className="p-4">
                    <h4 className="text-base font-semibold text-foreground mb-4">Skills</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {renderProfileField("Languages", (selectedProfile as any)["Skills - Languages"])}
                      {renderProfileField("Acting", (selectedProfile as any)["Skills - Acting"])}
                      {renderProfileField("Dancing", (selectedProfile as any)["Skills - Dancing"])}
                      {renderProfileField("Singing", (selectedProfile as any)["Skills - Singing"])}
                      {renderProfileField("Modeling", (selectedProfile as any)["Skills - Modeling"])}
                    </div>
                  </Card>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Talent Profile Dialog */}
      <TalentProfileDialog
        name={selectedTalent}
        open={profileOpen}
        onOpenChange={setProfileOpen}
      />

      {/* Toast notifications */}
      <Toaster 
        position="top-right" 
        theme="dark"
        toastOptions={{
          style: {
            background: 'oklch(0.15 0.02 255)',
            border: '1px solid oklch(0.35 0.02 255 / 0.5)',
            color: 'oklch(0.95 0.01 255)',
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
  isLoading: boolean;
  onTalentClick: (name: string) => void;
  pendingUpdates: Record<number, "status" | "manager">;
  onStatusUpdate: (row: number, status: string) => void;
  onManagerAssign: (row: number, manager: string) => void;
}

import { Loader2 } from "lucide-react";
import { ACTION_STATUSES, MANAGERS } from "@/types/talent";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function TalentGridView({
  talents,
  isLoading,
  onTalentClick,
  pendingUpdates,
  onStatusUpdate,
  onManagerAssign,
}: TalentGridViewProps) {
  // Sort by rowIndex descending (newest first)
  const sortedTalents = useMemo(() => {
    return [...talents].sort((a, b) => b.rowIndex - a.rowIndex);
  }, [talents]);

  const handleStatusClick = (talent: Talent, status: string) => {
    if (status === "Onboarded" && !talent["Talent Manager"]) {
      toast.error("Please assign a Talent Manager first");
      return;
    }
    onStatusUpdate(talent.rowIndex, status);
  };

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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {sortedTalents.map((talent) => (
        <Card
          key={talent.rowIndex}
          className="p-4 hover:bg-accent/30 transition-colors cursor-pointer glass-card"
          onClick={() => onTalentClick(talent["Full Name"])}
        >
          <div className="flex flex-col gap-3">
            {/* Header: Name + Status */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground truncate">
                  {talent["Full Name"]}
                </div>
                <div className="text-sm text-muted-foreground truncate">
                  {renderInstagramLink(talent["Instagram"])}
                </div>
              </div>
              <Badge variant={getStatusVariant(talent["Status"])} className="shrink-0">
                {talent["Status"] || "New"}
              </Badge>
            </div>

            {/* Info */}
            <div className="text-sm text-muted-foreground space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-16 text-xs">City:</span>
                <span className="text-foreground">{talent["City"] || "Not provided"}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-16 text-xs">Gender:</span>
                <span className="text-foreground">{talent["Gender"] || "Not provided"}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-16 text-xs">Manager:</span>
                {talent["Talent Manager"] ? (
                  <span className="text-foreground">{talent["Talent Manager"]}</span>
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs"
                        disabled={!!pendingUpdates[talent.rowIndex]}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {pendingUpdates[talent.rowIndex] === "manager" ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          "Assign"
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {MANAGERS.map((m) => (
                        <DropdownMenuItem
                          key={m}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleManagerSelect(talent.rowIndex, m);
                          }}
                        >
                          {m}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-1 pt-2 border-t border-border/30">
              {ACTION_STATUSES.map((status) => (
                <Button
                  key={status}
                  variant="outline"
                  size="sm"
                  className="text-xs h-7 px-2 hover:bg-accent/50 transition-all duration-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatusClick(talent, status);
                  }}
                  disabled={talent["Status"] === status || pendingUpdates[talent.rowIndex] === "status"}
                >
                  {pendingUpdates[talent.rowIndex] === "status" ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    status
                  )}
                </Button>
              ))}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export default App;
