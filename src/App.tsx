import { useState, useEffect, useCallback } from "react";
import { TalentTable } from "./components/TalentTable";
import { TalentProfileDialog } from "./components/TalentProfile";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { fetchTalentMaster, updateStatus, assignManager } from "./services/api";
import type { Talent } from "@/types/talent";
import { RefreshCw, Users, AlertCircle } from "lucide-react";

const REFRESH_INTERVAL = 30000; // 30 seconds

function App() {
  const [talents, setTalents] = useState<Talent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedTalent, setSelectedTalent] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

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
    try {
      await updateStatus(row, status);
      await loadTalents();
    } catch (err) {
      alert("Failed to update status. Please try again.");
      console.error(err);
    }
  };

  const handleManagerAssign = async (row: number, manager: string) => {
    try {
      await assignManager(row, manager);
      await loadTalents();
    } catch (err) {
      alert("Failed to assign manager. Please try again.");
      console.error(err);
    }
  };

  const handleTalentClick = (name: string) => {
    setSelectedTalent(name);
    setProfileOpen(true);
  };

  // Stats
  const totalTalents = talents.length;
  const onboardedCount = talents.filter((t) => t["Status"] === "Onboarded").length;
  const meetingRequiredCount = talents.filter((t) => t["Status"] === "Meeting Required").length;
  const kycRequiredCount = talents.filter((t) => t["Status"] === "KYC Required").length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">TOABH Talent Dashboard</h1>
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
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Sync
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Talents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalTalents}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Onboarded
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {onboardedCount}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Meeting Required
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {meetingRequiredCount}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                KYC Required
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {kycRequiredCount}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error Message */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="flex items-center gap-2 py-4 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </CardContent>
          </Card>
        )}

        {/* Main Table */}
        <TalentTable
          talents={talents}
          onStatusUpdate={handleStatusUpdate}
          onManagerAssign={handleManagerAssign}
          onTalentClick={handleTalentClick}
          isLoading={isLoading}
          onRefresh={loadTalents}
          lastUpdated={lastUpdated}
        />
      </main>

      {/* Talent Profile Dialog */}
      <TalentProfileDialog
        name={selectedTalent}
        open={profileOpen}
        onOpenChange={setProfileOpen}
      />

      {/* Footer */}
      <footer className="bg-white border-t mt-8">
        <div className="container mx-auto px-4 py-4 text-center text-sm text-muted-foreground">
          TOABH Talent Dashboard — Internal Use Only
        </div>
      </footer>
    </div>
  );
}

export default App;
