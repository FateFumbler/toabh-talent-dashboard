import { useEffect, useState, useCallback, useRef, Component } from "react";
import type { ReactNode } from "react";
import ReactDOM from "react-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Artist, ArtistStatusValue } from "@/types/artist";
import { fetchArtistMaster } from "@/services/artistsApi";
import {
  Loader2,
  AlertTriangle,
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

interface ArtistProfileProps {
  name: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusUpdate?: (row: number, status: string) => void;
  onManagerAssign?: (row: number, manager: string) => void;
  managers?: string[];
  rowIndex?: number;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ProfileErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ArtistProfile] Caught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertTriangle className="h-12 w-12 text-warning mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Something went wrong
          </h3>
          <p className="text-muted-foreground text-sm max-w-md">
            {this.state.error?.message || "Failed to render profile. Please try again."}
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

interface ProfileSection {
  title: string;
  fields: { label: string; value: string | undefined | ReactNode }[];
}

const STATUS_COLORS: Record<ArtistStatusValue, { dot: string; bg: string; border: string; text: string }> = {
  "New": { dot: "bg-muted-foreground", bg: "bg-muted", border: "border-muted", text: "text-muted-foreground" },
  "Meeting Required": { dot: "bg-orange-400 dark:bg-orange-300", bg: "bg-orange-100/15 dark:bg-orange-900/20", border: "border-orange-500/40", text: "text-orange-400 dark:text-orange-300" },
  "KYC Required": { dot: "bg-blue-400 dark:bg-blue-300", bg: "bg-blue-100/15 dark:bg-blue-900/20", border: "border-blue-500/40", text: "text-blue-400 dark:text-blue-300" },
  "Onboarded": { dot: "bg-green-400 dark:bg-green-300", bg: "bg-green-100/15 dark:bg-green-900/20", border: "border-green-500/40", text: "text-green-400 dark:text-green-300" },
  "Rejected": { dot: "bg-red-400 dark:bg-red-300", bg: "bg-red-100/15 dark:bg-red-900/20", border: "border-red-500/40", text: "text-red-400 dark:text-red-300" },
};

function extractDriveFileId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /\/open\?id=([a-zA-Z0-9_-]+)/,
    /\/thumbnail\?id=([a-zA-Z0-9_-]+)/,
    /id=([a-zA-Z0-9_-]+)/,
    /\/uc\?.*id=([a-zA-Z0-9_-]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function getDriveThumbnailUrl(url: string): string | null {
  const fileId = extractDriveFileId(url);
  if (!fileId) return null;
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w300`;
}

function getModalImageUrl(url: string): string | undefined {
  const fileId = extractDriveFileId(url);
  if (!fileId) return undefined;
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
}

const MANAGER_COLORS = [
  { bg: "#F3E8FF", text: "#7C3AED", border: "#DDD6FE" },
  { bg: "#DBEAFE", text: "#2563EB", border: "#BFDBFE" },
  { bg: "#D1FAE5", text: "#059669", border: "#A7F3D0" },
  { bg: "#FEE2E2", text: "#DC2626", border: "#FECACA" },
  { bg: "#FEF3C7", text: "#D97706", border: "#FDE68A" },
  { bg: "#FCE7F3", text: "#DB2777", border: "#FBCFE8" },
  { bg: "#CFFAFE", text: "#0891B2", border: "#A5F3FC" },
  { bg: "#E0E7FF", text: "#4F46E5", border: "#C7D2FE" },
  { bg: "#FFEDD5", text: "#EA580C", border: "#FED7AA" },
];

function getManagerBadgeColor(name: string): { bg: string; text: string; border: string } {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return MANAGER_COLORS[Math.abs(hash) % MANAGER_COLORS.length];
}

function parseInstagram(value: string): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  let username = trimmed.replace(/^@/, "");
  username = username.replace(/^(https?:\/\/)?(www\.)?instagram\.com\//, "");
  username = username.split("?")[0].split("#")[0];
  username = username.replace(/\/+$/, "");
  return `https://instagram.com/${username}`;
}

function parsePortfolioLinks(field: unknown): string[] {
  if (!field) return [];
  const str = String(field);
  if (!str.trim()) return [];
  return str.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
}

function safeField(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string") return value.trim() || undefined;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.join(", ") || undefined;
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function ArtistProfileDialog({
  name,
  open,
  onOpenChange,
  onStatusUpdate,
  onManagerAssign,
  managers = [],
  rowIndex,
}: ArtistProfileProps) {
  const [profile, setProfile] = useState<Artist | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const imageCountRef = useRef(0);

  const managerButtonRef = useRef<HTMLButtonElement>(null);
  const managerDropdownRef = useRef<HTMLDivElement>(null);
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [managerPosition, setManagerPosition] = useState<{ top: number; left: number } | null>(null);

  const statusButtonRef = useRef<HTMLButtonElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [statusPosition, setStatusPosition] = useState<{ top: number; left: number } | null>(null);

  const openManagerDropdown = useCallback(() => {
    if (managerButtonRef.current) {
      const rect = managerButtonRef.current.getBoundingClientRect();
      setManagerPosition({ top: rect.bottom + 6, left: rect.left });
      setIsManagerOpen(true);
      setIsStatusOpen(false);
    }
  }, []);

  const closeManagerDropdown = useCallback(() => setIsManagerOpen(false), []);

  const handleManagerSelect = useCallback((manager: string) => {
    if (manager === profile?.["Manager"]) {
      closeManagerDropdown();
      return;
    }
    onManagerAssign?.(rowIndex!, manager);
    toast.success(`Manager updated to ${manager || "Unassigned"}`);
    closeManagerDropdown();
  }, [profile, onManagerAssign, rowIndex, closeManagerDropdown]);

  useEffect(() => {
    if (!isManagerOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        managerDropdownRef.current &&
        !managerDropdownRef.current.contains(e.target as Node) &&
        managerButtonRef.current &&
        !managerButtonRef.current.contains(e.target as Node)
      ) {
        closeManagerDropdown();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isManagerOpen, closeManagerDropdown]);

  useEffect(() => {
    if (!isManagerOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeManagerDropdown();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isManagerOpen, closeManagerDropdown]);

  const openStatusDropdown = useCallback(() => {
    if (statusButtonRef.current) {
      const rect = statusButtonRef.current.getBoundingClientRect();
      setStatusPosition({ top: rect.bottom + 6, left: rect.left });
      setIsStatusOpen(true);
      setIsManagerOpen(false);
    }
  }, []);

  const closeStatusDropdown = useCallback(() => setIsStatusOpen(false), []);

  const handleStatusSelect = useCallback((status: ArtistStatusValue) => {
    const currentManager = profile?.["Manager"];
    if (status === "Onboarded" && !currentManager) {
      toast.error("Please assign a Manager first");
      closeStatusDropdown();
      return;
    }
    if (typeof rowIndex !== 'number' || isNaN(rowIndex) || rowIndex < 1) {
      toast.error("Cannot update: invalid row");
      closeStatusDropdown();
      return;
    }
    onStatusUpdate?.(rowIndex, status);
    toast.success(`Status updated to ${status}`);
    closeStatusDropdown();
  }, [profile, onStatusUpdate, rowIndex, closeStatusDropdown]);

  useEffect(() => {
    if (!isStatusOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        statusDropdownRef.current &&
        !statusDropdownRef.current.contains(e.target as Node) &&
        statusButtonRef.current &&
        !statusButtonRef.current.contains(e.target as Node)
      ) {
        closeStatusDropdown();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isStatusOpen, closeStatusDropdown]);

  useEffect(() => {
    if (!isStatusOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeStatusDropdown();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isStatusOpen, closeStatusDropdown]);

  useEffect(() => {
    if (!open) {
      setProfile(null);
      setError(null);
      setIsLoading(false);
      setIsModalOpen(false);
      setCurrentImageIndex(0);
      imageCountRef.current = 0;
      closeStatusDropdown();
      closeManagerDropdown();
    }
  }, [open, closeStatusDropdown, closeManagerDropdown]);

  const openModal = (index: number) => {
    setCurrentImageIndex(index);
    setIsModalOpen(true);
  };

  const closeModal = useCallback(() => setIsModalOpen(false), []);

  const goToPrevious = useCallback(() => {
    setCurrentImageIndex((prev) =>
      prev === 0 ? imageCountRef.current - 1 : prev - 1
    );
  }, []);

  const goToNext = useCallback(() => {
    setCurrentImageIndex((prev) =>
      prev === imageCountRef.current - 1 ? 0 : prev + 1
    );
  }, []);

  useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape": closeModal(); break;
        case "ArrowLeft": goToPrevious(); break;
        case "ArrowRight": goToNext(); break;
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen, closeModal, goToPrevious, goToNext]);

  useEffect(() => {
    const isDropdownOpen = isManagerOpen || isStatusOpen;
    if (!isDropdownOpen || !open) return;
    const handleOverlayMouseDown = (e: MouseEvent) => {
      const isInsideManagerDropdown = managerDropdownRef.current?.contains(e.target as Node);
      const isInsideStatusDropdown = statusDropdownRef.current?.contains(e.target as Node);
      if (isInsideManagerDropdown || isInsideStatusDropdown) {
        e.stopPropagation();
        e.preventDefault();
      }
    };
    document.addEventListener("mousedown", handleOverlayMouseDown, true);
    return () => document.removeEventListener("mousedown", handleOverlayMouseDown, true);
  }, [isManagerOpen, isStatusOpen, open]);

  useEffect(() => {
    const trimmedName = name?.trim();
    if (trimmedName && open) {
      loadProfile();
    }
  }, [name, open]);

  const loadProfile = async () => {
    if (!name) return;
    setIsLoading(true);
    setError(null);
    try {
      const artistData = await fetchArtistMaster();
      const normalizedName = name.toLowerCase().trim();
      const artist = artistData.find(
        (a) => a["Full Name"]?.toLowerCase().trim() === normalizedName
      );
      if (!artist) {
        setError("Artist not found in master sheet");
        setIsLoading(false);
        return;
      }
      setProfile(artist);
    } catch (err) {
      setError("Failed to load profile");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusVariant = (
    status: string
  ): "default" | "success" | "warning" | "destructive" | "info" => {
    switch (status) {
      case "Onboarded": return "success";
      case "Meeting Required": return "warning";
      case "KYC Required": return "info";
      case "Rejected": return "destructive";
      case "New": return "default";
      default: return "default";
    }
  };

  const renderInstagramLink = (instagram: string | undefined): React.ReactNode => {
    if (!instagram || instagram.trim() === "") return "-";
    const url = parseInstagram(instagram);
    const display = instagram.trim()
      .replace(/^https?:\/\/(www\.)?instagram\.com\//, "@")
      .replace(/\/+$/, "");
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
        {display}
      </a>
    );
  };

  const renderIMDBLink = (imdb: string | undefined): React.ReactNode => {
    if (!imdb || imdb.trim() === "") return "-";
    const trimmed = imdb.trim();
    const url = trimmed.startsWith("http") ? trimmed : `https://www.imdb.com/name/${trimmed}`;
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
        {trimmed.startsWith("http") ? "IMDB" : trimmed}
        <ExternalLink className="h-3 w-3" />
      </a>
    );
  };

  const renderSection = (section: ProfileSection) => {
    const hasValues = section.fields.some((f) => f.value);
    if (!hasValues) return null;
    return (
      <div key={section.title} className="profile-card">
        <h3 className="profile-section-title">{section.title}</h3>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1">
          {section.fields.map((field) =>
            field.value ? (
              <div key={field.label} className="flex flex-col py-0.5">
                <dt className="text-xs text-muted-foreground font-medium">
                  {field.label}
                </dt>
                <dd className="text-sm text-foreground font-medium break-words">
                  {field.value}
                </dd>
              </div>
            ) : null
          )}
        </dl>
      </div>
    );
  };

  if (!profile) {
    const sections: ProfileSection[] = [
      {
        title: "Basic Info",
        fields: [
          { label: "Full Name", value: safeField(name) },
        ],
      },
    ];

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground text-sm">Loading profile...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <AlertTriangle className="h-10 w-10 text-destructive" />
              <p className="text-muted-foreground text-sm">{error}</p>
            </div>
          ) : (
            sections.map(renderSection)
          )}
        </DialogContent>
      </Dialog>
    );
  }

  const status = profile["Status"] || "New";
  const statusColor = STATUS_COLORS[status as ArtistStatusValue] || STATUS_COLORS["New"];
  const managerColor = profile["Manager"]
    ? getManagerBadgeColor(profile["Manager"])
    : null;

  const portfolioLinks = parsePortfolioLinks(profile["Portfolio"]);

  const sections: ProfileSection[] = [
    {
      title: "Basic Info",
      fields: [
        { label: "Full Name", value: safeField(profile["Full Name"]) },
        { label: "Category", value: safeField(profile["Category"]) },
        { label: "Gender", value: safeField(profile["Gender"]) },
        { label: "Age", value: safeField(profile["Age"]) },
        { label: "Location", value: safeField(profile["Location"]) },
      ],
    },
    {
      title: "Contact",
      fields: [
        { label: "Phone", value: safeField(profile["Phone"]) },
        { label: "Email", value: safeField(profile["Email"]) },
      ],
    },
    {
      title: "Social & Media",
      fields: [
        { label: "Instagram", value: renderInstagramLink(profile["Instagram"]) },
        { label: "IMDB", value: renderIMDBLink(profile["IMDB"]) },
      ],
    },
    {
      title: "Work",
      fields: [
        { label: "Work", value: safeField(profile["Work"]) },
      ],
    },
  ];

  const allImages = portfolioLinks
    .map((link, i) => ({ link, label: `Portfolio ${i + 1}` }))
    .filter((item) => getDriveThumbnailUrl(item.link));

  return (
    <ProfileErrorBoundary>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground text-sm">Loading profile...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <AlertTriangle className="h-10 w-10 text-destructive" />
              <p className="text-muted-foreground text-sm">{error}</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-foreground capitalize mb-1">
                    {profile["Full Name"] || "—"}
                  </h2>
                  {profile["Category"] && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                      {profile["Category"]}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isStatusOpen && statusPosition && typeof document !== "undefined" &&
                    ReactDOM.createPortal(
                      <div
                        className="fixed inset-0 z-[9999]"
                        onClick={(e) => {
                          const panel = document.getElementById("artist-status-panel");
                          if (panel && !panel.contains(e.target as Node)) {
                            closeStatusDropdown();
                          }
                        }}
                      >
                        <div
                          id="artist-status-panel"
                          className="bg-popover border border-border rounded-xl shadow-xl animate-scale-in overflow-hidden"
                          style={{ position: 'fixed', top: `${statusPosition.top}px`, left: `${Math.max(8, Math.min(statusPosition.left, window.innerWidth - 180))}px` }}
                        >
                          {(["New", "Meeting Required", "KYC Required", "Onboarded", "Rejected"] as ArtistStatusValue[]).map((s) => {
                            const colors = STATUS_COLORS[s];
                            const isSelected = s === status;
                            return (
                              <button
                                key={s}
                                onClick={() => handleStatusSelect(s)}
                                className={`w-full flex items-center gap-2 px-4 py-3 text-sm transition-colors hover:bg-accent ${isSelected ? "bg-accent font-medium" : ""}`}
                              >
                                <span className={`w-2 h-2 rounded-full shrink-0 ${colors.dot}`} />
                                <span>{s}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>,
                      document.body
                    )}
                  {isManagerOpen && managerPosition && typeof document !== "undefined" &&
                    ReactDOM.createPortal(
                      <div
                        className="fixed inset-0 z-[9999]"
                        onClick={(e) => {
                          const panel = document.getElementById("artist-manager-panel");
                          if (panel && !panel.contains(e.target as Node)) {
                            closeManagerDropdown();
                          }
                        }}
                      >
                        <div
                          id="artist-manager-panel"
                          className="bg-popover border border-border rounded-xl shadow-xl animate-scale-in overflow-hidden"
                          style={{ position: 'fixed', top: `${managerPosition.top}px`, left: `${Math.max(8, Math.min(managerPosition.left, window.innerWidth - 200))}px`, width: '180px' }}
                        >
                          {managers.map((m) => {
                            const mc = getManagerBadgeColor(m);
                            const isSelected = m === profile["Manager"];
                            return (
                              <button
                                key={m}
                                onClick={() => handleManagerSelect(m)}
                                className={`w-full flex items-center gap-2 px-3 py-3 text-sm transition-colors hover:bg-accent ${isSelected ? "bg-accent font-medium" : ""}`}
                              >
                                <div
                                  className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-medium"
                                  style={{ backgroundColor: mc.bg, color: mc.text, border: `1px solid ${mc.border}` }}
                                >
                                  {m.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                                </div>
                                <span>{m}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>,
                      document.body
                    )}
                  {/* Status badge */}
                  <button
                    ref={statusButtonRef}
                    onClick={openStatusDropdown}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors hover:bg-accent"
                    style={{ backgroundColor: statusColor.bg, borderColor: statusColor.border, color: statusColor.text }}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${statusColor.dot}`} />
                    {status}
                  </button>
                  {/* Manager badge */}
                  {managerColor ? (
                    <button
                      ref={managerButtonRef}
                      onClick={openManagerDropdown}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors hover:opacity-80"
                      style={{ backgroundColor: managerColor.bg, borderColor: managerColor.border, color: managerColor.text }}
                    >
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs font-medium"
                        style={{ backgroundColor: managerColor.text + "20", color: managerColor.text }}
                      >
                        {profile["Manager"].split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      {profile["Manager"]}
                    </button>
                  ) : (
                    <button
                      ref={managerButtonRef}
                      onClick={openManagerDropdown}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground border border-border/50 hover:bg-secondary/80 transition-colors"
                    >
                      Assign Manager
                    </button>
                  )}
                </div>
              </div>

              {/* Profile Sections */}
              {sections.map(renderSection)}

              {/* Portfolio Section */}
              <div className="profile-card">
                <h3 className="profile-section-title">Portfolio</h3>
                {allImages.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {allImages.map((item, i) => (
                      <button
                        key={i}
                        onClick={() => { imageCountRef.current = allImages.length; openModal(i); }}
                        className="relative aspect-square rounded-lg overflow-hidden border border-border hover:border-primary transition-colors group"
                      >
                        <img
                          src={getDriveThumbnailUrl(item.link) || ""}
                          alt={item.label}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                          <ExternalLink className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic py-2">No portfolio uploaded</p>
                )}
              </div>

              {/* Notes */}
              {profile["Notes"] && (
                <div className="profile-card">
                  <h3 className="profile-section-title">Notes</h3>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{profile["Notes"]}</p>
                </div>
              )}

              {/* Image Lightbox */}
              <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-3xl p-0 bg-black/95 border-none max-h-[90vh] flex flex-col">
                  <div className="flex items-center justify-between p-3 absolute top-0 left-0 right-0 z-10">
                    <span className="text-white text-sm">
                      {currentImageIndex + 1} / {allImages.length}
                    </span>
                    <button
                      onClick={closeModal}
                      className="h-8 w-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                    >
                      <X className="h-4 w-4 text-white" />
                    </button>
                  </div>
                  {allImages[currentImageIndex] && (
                    <img
                      src={getModalImageUrl(allImages[currentImageIndex].link)}
                      alt={allImages[currentImageIndex].label}
                      className="w-full h-full object-contain"
                    />
                  )}
                  {allImages.length > 1 && (
                    <>
                      <button
                        onClick={goToPrevious}
                        className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                      >
                        <ChevronLeft className="h-5 w-5 text-white" />
                      </button>
                      <button
                        onClick={goToNext}
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                      >
                        <ChevronRight className="h-5 w-5 text-white" />
                      </button>
                    </>
                  )}
                  <a
                    href={allImages[currentImageIndex]?.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute bottom-3 right-3 h-9 px-3 flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open in Drive
                  </a>
                </DialogContent>
              </Dialog>
            </>
          )}
        </DialogContent>
      </Dialog>
    </ProfileErrorBoundary>
  );
}
