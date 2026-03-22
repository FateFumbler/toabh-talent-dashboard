import { useEffect, useCallback, useState } from "react";
import { Sun, Moon, Smartphone, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

export type Theme = "light" | "dark" | "system";

const THEME_STORAGE_KEY = "toabh-theme";
const SHOW_DELETE_STORAGE_KEY = "toabh_contracts_show_delete";

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
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

  const handleSystemThemeChange = useCallback((_e: MediaQueryListEvent) => {
    const stored = getStoredTheme();
    if (stored === "system") {
      applyTheme("system");
    }
  }, []);

  useEffect(() => {
    // Apply initial theme
    const initial = getStoredTheme();
    applyTheme(initial);

    // Listen for system theme changes
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
    { value: "system", label: "System", icon: <Smartphone className="h-4 w-4" /> },
  ];

  return (
    <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-1">
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

  useEffect(() => {
    const stored = localStorage.getItem(SHOW_DELETE_STORAGE_KEY);
    setShowDeleteButtons(stored === "true");
  }, []);

  const handlePasswordSubmit = () => {
    if (password === "1231") {
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
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Settings (Password Protected)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Enter password to access settings</p>
            <div className="flex gap-2">
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handlePasswordSubmit();
                }}
                placeholder="Password..."
                className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
              />
              <button
                onClick={handlePasswordSubmit}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90 transition-opacity"
              >
                Unlock
              </button>
            </div>
            {passwordError && (
              <p className="text-sm text-destructive mt-2">Incorrect password</p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-foreground">
          Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground mb-3">Theme</p>
          <ThemeToggle currentTheme={theme} onThemeChange={onThemeChange} />
        </div>
        <p className="text-xs text-muted-foreground">
          {theme === "system"
            ? `Currently using ${getSystemTheme()} mode (detected from your device)`
            : `Currently using ${theme} mode`}
        </p>

        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Enable Contract Deletion</p>
              <p className="text-xs text-muted-foreground">Show delete button in Contracts table</p>
            </div>
            <button
              onClick={handleToggleDeleteButtons}
              className={`w-12 h-6 rounded-full transition-colors relative ${
                showDeleteButtons ? "bg-primary" : "bg-secondary"
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                  showDeleteButtons ? "translate-x-6" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
