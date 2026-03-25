import { useEffect, useCallback, useState } from "react";
import { Sun, Moon, Smartphone, Lock, Eye, EyeOff, Monitor, Grid3x3, List, KeyRound, Check, X } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { getDashboardPassword, setDashboardPassword } from "./LoginScreen";

export type Theme = "light" | "dark" | "system";

const THEME_STORAGE_KEY = "toabh-theme";
const SHOW_DELETE_STORAGE_KEY = "toabh_contracts_show_delete";
const DEFAULT_VIEW_MOBILE_KEY = "toabh-default-view-mobile";
const DEFAULT_VIEW_DESKTOP_KEY = "toabh-default-view-desktop";

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

interface ViewModeToggleProps {
  value: "list" | "grid";
  onChange: (mode: "list" | "grid") => void;
  label: string;
  icon: React.ReactNode;
}

function ViewModeToggle({ value, onChange, label, icon }: ViewModeToggleProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm text-foreground">{label}</span>
      </div>
      <div className="inline-flex items-center gap-1 bg-secondary/50 rounded-lg p-1">
        <button
          onClick={() => onChange("grid")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-all duration-200 ${
            value === "grid"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
          }`}
        >
          <Grid3x3 className="h-4 w-4" />
          Grid
        </button>
        <button
          onClick={() => onChange("list")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-all duration-200 ${
            value === "list"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
          }`}
        >
          <List className="h-4 w-4" />
          List
        </button>
      </div>
    </div>
  );
}

// Helper exports for App.tsx
export function getStoredViewDefault(device: "mobile" | "desktop"): "list" | "grid" {
  const key = device === "mobile" ? DEFAULT_VIEW_MOBILE_KEY : DEFAULT_VIEW_DESKTOP_KEY;
  const stored = localStorage.getItem(key);
  if (stored === "list" || stored === "grid") return stored;
  return "grid"; // default
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
  const [mobileView, setMobileView] = useState<"list" | "grid">("grid");
  const [desktopView, setDesktopView] = useState<"list" | "grid">("grid");
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordChangeError, setPasswordChangeError] = useState("");
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(SHOW_DELETE_STORAGE_KEY);
    setShowDeleteButtons(stored === "true");

    const storedMobile = localStorage.getItem(DEFAULT_VIEW_MOBILE_KEY);
    if (storedMobile === "list" || storedMobile === "grid") setMobileView(storedMobile);

    const storedDesktop = localStorage.getItem(DEFAULT_VIEW_DESKTOP_KEY);
    if (storedDesktop === "list" || storedDesktop === "grid") setDesktopView(storedDesktop);
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

  const handleMobileViewChange = (mode: "list" | "grid") => {
    setMobileView(mode);
    localStorage.setItem(DEFAULT_VIEW_MOBILE_KEY, mode);
  };

  const handleDesktopViewChange = (mode: "list" | "grid") => {
    setDesktopView(mode);
    localStorage.setItem(DEFAULT_VIEW_DESKTOP_KEY, mode);
  };

  const handlePasswordChange = () => {
    setPasswordChangeError("");
    setPasswordChangeSuccess(false);

    const correctCurrent = getDashboardPassword();
    if (currentPassword !== correctCurrent) {
      setPasswordChangeError("Current password is incorrect");
      return;
    }

    if (!newPassword.trim()) {
      setPasswordChangeError("New password cannot be empty");
      return;
    }

    if (newPassword.length < 3) {
      setPasswordChangeError("New password must be at least 3 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordChangeError("New passwords do not match");
      return;
    }

    setDashboardPassword(newPassword);
    setPasswordChangeSuccess(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setTimeout(() => {
      setPasswordChangeSuccess(false);
      setShowPasswordChange(false);
    }, 2000);
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

        {/* View Mode Defaults */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-3">Default View Mode</h3>
          <p className="text-xs text-muted-foreground mb-4">Choose the default layout when the dashboard loads</p>
          <div className="space-y-3">
            <ViewModeToggle
              value={mobileView}
              onChange={handleMobileViewChange}
              label="Mobile"
              icon={<Smartphone className="h-4 w-4 text-muted-foreground" />}
            />
            <ViewModeToggle
              value={desktopView}
              onChange={handleDesktopViewChange}
              label="Desktop"
              icon={<Monitor className="h-4 w-4 text-muted-foreground" />}
            />
          </div>
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

        <hr className="border-border my-6" />

        {/* Password Change Section */}
        <div>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Dashboard Password
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Change the password to access this dashboard
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPasswordChange(!showPasswordChange)}
            >
              <KeyRound className="h-4 w-4 mr-1.5" />
              {showPasswordChange ? "Cancel" : "Change"}
            </Button>
          </div>

          {showPasswordChange && (
            <div className="mt-4 p-4 bg-secondary/30 rounded-lg space-y-4 animate-fade-in">
              {/* Current Password */}
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value);
                      setPasswordChangeError("");
                    }}
                    placeholder="Enter current password..."
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setPasswordChangeError("");
                    }}
                    placeholder="Enter new password..."
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setPasswordChangeError("");
                    }}
                    placeholder="Confirm new password..."
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Error/Success Messages */}
              {passwordChangeError && (
                <div className="flex items-center gap-2 text-destructive text-sm animate-fade-in">
                  <X className="h-4 w-4" />
                  <span>{passwordChangeError}</span>
                </div>
              )}
              {passwordChangeSuccess && (
                <div className="flex items-center gap-2 text-green-500 text-sm animate-fade-in">
                  <Check className="h-4 w-4" />
                  <span>Password changed successfully!</span>
                </div>
              )}

              {/* Save Button */}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowPasswordChange(false);
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                    setPasswordChangeError("");
                  }}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={handlePasswordChange}>
                  Save Password
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
