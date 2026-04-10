import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";

let deferredPrompt: any = null;

export function PwaInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("toabh-pwa-dismissed");
    if (dismissed) return;

    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e;
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Also check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setShowPrompt(false);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    setShowPrompt(false);
    if (outcome === "accepted") {
      localStorage.setItem("toabh-pwa-dismissed", "installed");
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("toabh-pwa-dismissed", "true");
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 mx-auto max-w-sm z-50 animate-slide-up">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
          <Download className="h-5 w-5 text-indigo-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">Install TOABH App</p>
          <p className="text-xs text-gray-500 mt-0.5">Add to home screen for quick access</p>
          <button
            onClick={handleInstall}
            className="mt-2 w-full bg-indigo-600 text-white text-sm font-medium py-2 px-4 rounded-lg hover:bg-indigo-700 active:scale-[0.98] transition-all"
          >
            Install Now
          </button>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 p-0.5"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
