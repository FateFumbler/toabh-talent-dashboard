import { useState, useEffect, useCallback } from "react";
import { ContractsTab } from "./components/ContractsTab";
import { ErrorBoundary } from "./components/ErrorBoundary";
import {
  fetchTalentMaster,
  fetchTalentDetails,
} from "./services/api";
import type { Talent, TalentDetails } from "@/types/talent";
import { Settings as SettingsIcon } from "lucide-react";
import { Toaster } from "sonner";
import {
  Settings,
  type Theme,
  getStoredTheme,
  useTheme,
} from "./components/Settings";
import { TalentPage } from "./pages/TalentPage";

const REFRESH_INTERVAL = 30000;

function App() {
  const [talents, setTalents] = useState<Talent[]>([]);
  const [talentDetailsMap, setTalentDetailsMap] = useState<Map<string, TalentDetails>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<"talent-master" | "settings" | "contracts">("talent-master");
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);
  const { setTheme } = useTheme();

  const handleThemeChange = (t: Theme) => {
    setThemeState(t);
    setTheme(t);
  };

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
      const sortedTalents = [...validTalents].sort((a, b) => (b.rowIndex || 0) - (a.rowIndex || 0));
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

  useEffect(() => { loadTalents(); }, [loadTalents]);
  useEffect(() => {
    const interval = setInterval(loadTalents, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [loadTalents]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="header-bar" style={{ paddingTop: "env(safe-area-inset-top, 0)" }}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            <img src="/logo_white.png" alt="TOABH" className="logo-white h-8 w-auto" />
            <img src="/logo_black.png" alt="TOABH" className="logo-black h-8 w-auto" />
            <h1 className="text-base font-bold text-foreground tracking-tight">Scouting Dashboard</h1>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button onClick={() => setActiveTab("talent-master")} className={`nav-tab ${activeTab === "talent-master" ? "nav-tab-active" : ""}`}>Talent</button>
            <button onClick={() => setActiveTab("contracts")} className={`nav-tab ${activeTab === "contracts" ? "nav-tab-active" : ""}`}>Contracts</button>
          </div>
          <button onClick={() => setActiveTab("settings")} className={`nav-tab ${activeTab === "settings" ? "nav-tab-active" : ""}`} title="Settings">
            <SettingsIcon className="h-[18px] w-[18px]" />
          </button>
        </div>
        <div className="border-b border-border" />
      </div>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 border border-destructive/50 bg-destructive/10 rounded-lg">
            <div className="flex items-center gap-2 text-destructive text-sm">{error}</div>
          </div>
        )}

        {/* Talent Tab — fully isolated */}
        {activeTab === "talent-master" && (
          <ErrorBoundary>
            <TalentPage talents={talents} talentDetailsMap={talentDetailsMap} isLoading={isLoading} lastUpdated={lastUpdated} loadTalents={loadTalents} />
          </ErrorBoundary>
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

export default App;
