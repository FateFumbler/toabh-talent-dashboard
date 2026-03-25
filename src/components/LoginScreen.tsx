import { useState } from "react";
import { Lock, Eye, EyeOff, AlertCircle } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";

const DEFAULT_PASSWORD = "talents";
const PASSWORD_STORAGE_KEY = "toabh-dashboard-password";

export function getDashboardPassword(): string {
  if (typeof window === "undefined") return DEFAULT_PASSWORD;
  return localStorage.getItem(PASSWORD_STORAGE_KEY) || DEFAULT_PASSWORD;
}

export function setDashboardPassword(password: string): void {
  localStorage.setItem(PASSWORD_STORAGE_KEY, password);
}

interface LoginScreenProps {
  onLogin: () => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = () => {
    const correctPassword = getDashboardPassword();
    if (password === correctPassword) {
      setError(false);
      sessionStorage.setItem("toabh-authenticated", "true");
      onLogin();
    } else {
      setError(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-sm p-8 animate-fade-in">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img
            src="/logo_black.png"
            alt="TOABH"
            className="h-12 w-auto mb-4"
          />
          <h1 className="text-xl font-bold text-foreground">Talent Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Enter password to access</p>
        </div>

        {/* Password Input */}
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground block mb-2">
            Password
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <Lock className="h-4 w-4" />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Enter password..."
              autoFocus
              className={`w-full bg-secondary border rounded-lg px-3 py-2.5 pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all ${
                error ? "border-destructive" : "border-border"
              }`}
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

          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm mt-2 animate-fade-in">
              <AlertCircle className="h-4 w-4" />
              <span>Incorrect password. Please try again.</span>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          className="w-full mt-6"
          size="lg"
        >
          Login
        </Button>

        {/* Footer */}
        <p className="text-xs text-muted-foreground text-center mt-8">
          TOABH Talent Dashboard — Internal Use Only
        </p>
      </Card>
    </div>
  );
}

export function checkIsAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem("toabh-authenticated") === "true";
}

export function logout(): void {
  sessionStorage.removeItem("toabh-authenticated");
}
