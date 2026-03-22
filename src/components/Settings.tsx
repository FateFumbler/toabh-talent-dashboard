import { useEffect, useCallback, useState } from "react";
import { Sun, Moon, Smartphone, Lock, Eye, EyeOff } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";

export type Theme = "light" | "dark" | "system";

const THEME_STORAGE_KEY = "toabh-theme";
const SHOW_DELETE_STORAGE_KEY = "toabh_contracts_show_delete";

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === "system") {
    root.setAttribute("data-theme", getSystemTheme());
  } else {
    root.setAttribute("data-theme", theme);
  }
}

export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }
  return "dark";
}

export function useTheme() {
  const setTheme = useCallback((theme: Theme) => {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    applyTheme(theme);
  }, []);

  const handleSystemThemeChange = useCallback(
    (_e: MediaQueryListEvent) => {
      const stored = getStoredTheme();
      if (stored === "system") {
        applyTheme("system");
      }
    },
    []
  );

  useEffect(() => {
    const initial = getStoredTheme();
    applyTheme(initial);

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
    };
  }, [handleSystemThemeChange]);

  return { setTheme };
}

interface ThemeToggleProps {
  currentTheme: Theme;
  onThemeChange: (theme: Theme) => void;
}

function ThemeToggle({ currentTheme, onThemeChange }: ThemeToggleProps) {
  const options: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: "light", label: "Light", icon: <Sun className="h-4 w-4" /> },
    { value: "dark", label: "Dark", icon: <Moon className="h-4 w-4" /> },
    {
      value: "system",
      label: "System",
      icon: <Smartphone className="h-4 w-4" />,
    },
  ];

  return (
    <div className="inline-flex items-center gap-1 bg-secondary/50 rounded-lg p-1">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onThemeChange(option.value)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-all duration-200 ${
            currentTheme === option.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
          }`}
        >
          {option.icon}
          <span className="hidden sm:inline">{option.label}</span>
        </button>
      ))}
    </div>
  );
}

interface SettingsProps {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
}

export function Settings({ theme, onThemeChange }: SettingsProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [showDeleteButtons, setShowDeleteButtons] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(SHOW_DELETE_STORAGE_KEY);
    setShowDeleteButtons(stored === "true");
  }, []);

  const handlePasswordSubmit = () => {
    const CORRECT_PASSWORD = import.meta.env.VITE_SETTINGS_PASSWORD || "1231";
    if (password === CORRECT_PASSWORD) {
      setIsAuthenticated(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  };

  const handleToggleDeleteButtons = () => {
    const newValue = !showDeleteButtons;
    setShowDeleteButtons(newValue);
    localStorage.setItem(SHOW_DELETE_STORAGE_KEY, String(newValue));
  };

  if (!isAuthenticated) {
    return (
      <div className="animate-fade-in">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-primary/20 p-2.5 rounded-xl">
            <Lock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Settings</h2>
            <p className="text-sm text-muted-foreground">
              Password protected area
            </p>
          </div>
        </div>

        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground block mb-2">
                Enter password to access settings
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setPasswordError(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handlePasswordSubmit();
                    }}
                    placeholder="Enter password..."
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <Button onClick={handlePasswordSubmit} className="shrink-0">
                  Unlock
                </Button>
              </div>
              {passwordError && (
                <p className="text-sm text-destructive mt-2 animate-fade-in">
                  Incorrect password. Please try again.
                </p>
              )}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-primary/20 p-2.5 rounded-xl">
          <Lock className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Settings</h2>
          <p className="text-sm text-muted-foreground">Customize your dashboard</p>
        </div>
      </div>

      <Card className="p-6">
        {/* Theme Section */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-3">Appearance</h3>
          <ThemeToggle currentTheme={theme} onThemeChange={onThemeChange} />
          <p className="text-xs text-muted-foreground mt-2">
            {theme === "system"
              ? `Using ${getSystemTheme()} mode (detected from your device)`
              : `Using ${theme} mode`}
          </p>
        </div>

        <hr className="border-border my-6" />

        {/* Contract Settings */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Contract Management
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                Enable Contract Deletion
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Show delete button in Contracts table
              </p>
            </div>
            <button
              onClick={handleToggleDeleteButtons}
              className={`relative w-12 h-7 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                showDeleteButtons ? "bg-primary" : "bg-secondary border border-border"
              }`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                  showDeleteButtons ? "translate-x-6" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
