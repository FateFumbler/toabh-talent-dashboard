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
  FileText,
  Image as ImageIcon,
  User,
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
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
}

function getDriveImageUrl(url: string): string | null {
  const fileId = extractDriveFileId(url);
  if (!fileId) return null;
  return `https://drive.google.com/uc?export=view&id=${fileId}`;
}

function getDrivePreviewUrl(url: string): string | null {
  const fileId = extractDriveFileId(url);
  if (!fileId) return null;
  return `https://lh3.googleusercontent.com/d/${fileId}=w1200`;
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

function getFileType(url: string): "image" | "pdf" | "other" {
  if (!url) return "other";
  const lower = url.toLowerCase();
  if (lower.includes(".pdf") || lower.includes("export=pdf") || lower.includes("format=pdf")) {
    return "pdf";
  }
  // Check for common image extensions
  if (/\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/i.test(lower)) {
    return "image";
  }
  // Check Drive thumbnail which works for images
  if (lower.includes("drive.google.com") || lower.includes("thumbnail")) {
    return "image";
  }
  return "other";
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
    if (manager === profile?.["Talent Manager"]) {
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
    const currentManager = profile?.["Talent Manager"];
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
      console.log("ARTIST DATA:", artist);
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
    const label = trimmed.startsWith("http") ? "IMDB" : trimmed;
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
        {label}
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
              <div key={field.label} className="profile-field">
                <dt className="profile-field-label">{field.label}</dt>
                <dd className={`profile-field-value ${/instagram|imdb|youtube|wiki|link|website|facebook|twitter|tiktok/i.test(field.label) ? "url-text" : ""}`}>
                  {field.value}
                </dd>
              </div>
            ) : null
          )}
        </dl>
      </div>
    );
  };

  // Parse portfolio links
  const portfolioLinks = profile ? parsePortfolioLinks(profile["Portfolio / Work Images"]) : [];
  
  // Separate images from non-images
  const imageItems = portfolioLinks.filter(link => getFileType(link) === "image");
  const nonImageItems = portfolioLinks.filter(link => getFileType(link) !== "image");

  useEffect(() => {
    imageCountRef.current = imageItems.length;
  }, [imageItems.length]);

  const profileName = profile ? profile["Full Name"] || "Unknown Artist" : (name || "Unknown Artist");
  const profileStatus = profile ? (profile["Status "] || "New") : "New";
  const profileManager = profile ? profile["Talent Manager"] : null;
  const statusColor = STATUS_COLORS[profileStatus as ArtistStatusValue] || STATUS_COLORS["New"];

  const managerColor = profileManager ? getManagerBadgeColor(profileManager) : null;

  // Image modal helper
  const currentModalImage = isModalOpen && imageItems.length > 0 ? imageItems[currentImageIndex] : null;

  // Handle image click
  const handleImageClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // Only open if clicking an image thumbnail
    if (!target.closest('.image-clickable')) return;
    const button = target.closest('.image-clickable') as HTMLElement;
    const idxAttr = button?.dataset?.idx;
    if (idxAttr !== undefined) {
      openModal(parseInt(idxAttr, 10));
    }
  }, [openModal]);

  // ==========================================
  // MANAGER DROPDOWN PORTAL
  // ==========================================
  const ManagerDropdownPortal = () => {
    if (!isManagerOpen || !managerPosition || typeof document === "undefined") return null;

    return ReactDOM.createPortal(
      <div
        ref={managerDropdownRef}
        className="dropdown-container fixed inset-0 z-[99999] pointer-events-auto"
        style={{ pointerEvents: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="dropdown-animate pointer-events-auto absolute bg-popover border border-border rounded-xl shadow-xl overflow-hidden"
          style={{
            top: `${managerPosition.top}px`,
            left: `${Math.max(16, Math.min(managerPosition.left, window.innerWidth - 280 - 16))}px`,
            width: "280px",
            zIndex: 99999,
            pointerEvents: 'auto',
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="py-1">
            <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Select Manager
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleManagerSelect("");
              }}
              className={`w-full flex items-center gap-3 px-3 py-3 sm:py-2.5 text-sm transition-colors min-h-[48px] hover:bg-accent ${
                !profileManager
                  ? "bg-accent/80 font-medium text-foreground"
                  : "text-popover-foreground"
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="flex-1 text-left">Unassigned</span>
              {!profileManager && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Current</Badge>
              )}
            </button>

            <div className="h-px bg-border mx-3 my-1" />

            {(managers || []).map((manager) => {
              const mColor = getManagerBadgeColor(manager);
              const isSelected = manager === profileManager;
              return (
                <button
                  key={manager}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleManagerSelect(manager);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-3 sm:py-2.5 text-sm transition-colors min-h-[48px] hover:bg-accent ${
                    isSelected ? "bg-accent/60" : "text-popover-foreground"
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-medium text-xs"
                    style={{
                      backgroundColor: mColor.bg,
                      color: mColor.text,
                      border: `1px solid ${mColor.border}`
                    }}
                  >
                    {manager.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <span className="flex-1 text-left font-medium">{manager}</span>
                  {isSelected && (
                    <Badge
                      className="text-[10px] px-1.5 py-0 font-normal"
                      style={{
                        backgroundColor: mColor.bg,
                        color: mColor.text,
                        borderColor: mColor.border
                      }}
                    >
                      Selected
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>,
      document.body
    );
  };

  // ==========================================
  // STATUS DROPDOWN PORTAL
  // ==========================================
  const StatusDropdownPortal = () => {
    if (!isStatusOpen || !statusPosition || typeof document === "undefined") return null;

    return ReactDOM.createPortal(
      <div
        ref={statusDropdownRef}
        className="dropdown-container fixed inset-0 z-[99999] pointer-events-auto"
        style={{ pointerEvents: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="dropdown-animate pointer-events-auto absolute bg-popover border border-border rounded-xl shadow-xl overflow-hidden"
          style={{
            top: `${statusPosition.top}px`,
            left: `${Math.max(8, Math.min(statusPosition.left, window.innerWidth - 200 - 8))}px`,
            minWidth: "200px",
            maxWidth: `${window.innerWidth - 16}px`,
            zIndex: 99999,
            pointerEvents: 'auto',
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="py-1">
            {(["New", "Meeting Required", "KYC Required", "Onboarded", "Rejected"] as ArtistStatusValue[]).map((status) => {
              const colors = STATUS_COLORS[status];
              const isSelected = status === profileStatus;
              return (
                <button
                  key={status}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleStatusSelect(status);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-3 sm:py-2.5 text-sm transition-colors min-h-[44px] ${
                    isSelected
                      ? "bg-accent/60 font-medium text-foreground"
                      : "text-popover-foreground hover:bg-accent"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${colors.dot}`} />
                  <span className="flex-1 text-left">{status}</span>
                  {isSelected && (
                    <span className="text-xs text-muted-foreground shrink-0">Current</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>,
      document.body
    );
  };

  // ==========================================
  // SECTIONS
  // ==========================================
  const gf = (key: keyof Artist): string | undefined => {
    if (!profile) return undefined;
    return safeField(profile[key]);
  };

  const getBasicInfo = (): ProfileSection => ({
    title: "Basic Information",
    fields: [
      { label: "Full Name", value: gf("Full Name") },
      { label: "Category", value: gf("Talent Category") },
      { label: "Gender", value: gf("Gender") },
      { label: "Age", value: gf("Age") },
      { label: "Location", value: gf("City & State (Current location)") },
    ],
  });

  const getContact = (): ProfileSection => ({
    title: "Contact",
    fields: [
      {
        label: "Phone",
        value: gf("Phone Number") ? (
          <a href={`tel:${gf("Phone Number")}`} className="text-primary hover:underline">
            {gf("Phone Number")}
          </a>
        ) : undefined,
      },
      {
        label: "Email",
        value: gf("Email") ? (
          <a href={`mailto:${gf("Email")}`} className="text-primary hover:underline" style={{ wordBreak: "break-all" }}>
            {gf("Email")}
          </a>
        ) : undefined,
      },
    ],
  });

  const getSocialMedia = (): ProfileSection => ({
    title: "Social & Media",
    fields: [
      { label: "Instagram", value: renderInstagramLink(gf("Instagram Link")) },
      { label: "IMDb", value: renderIMDBLink(gf("IMDB (If Available)")) },
    ],
  });

  const getWork = (): ProfileSection => ({
    title: "Work",
    fields: [
      { label: "Work", value: gf("Notable Projects (Brand/Film/Campaings)") },
    ],
  });

  const getManagementInfo = (): ProfileSection => ({
    title: "Management",
    fields: [
      { label: "Status", value: profileStatus },
      { label: "Manager", value: profileManager || "Unassigned" },
      { label: "Notes", value: gf("Notes") },
    ],
  });

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 bg-background border-border animate-scale-in"
        onClick={handleImageClick}
      >
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-16 text-destructive px-6">
            <p>{error}</p>
          </div>
        )}

        {profile && !isLoading && (
          <ProfileErrorBoundary>
            <div className="talent-profile space-y-5 p-6">
              {/* Header */}
              <div className="profile-header">
                <h2 className="text-xl sm:text-2xl font-bold text-foreground break-words capitalize">
                  {profileName}
                </h2>
                <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2 mt-2">
                  {profile?.["Talent Category"] && (
                    <Badge variant="outline" className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border-primary/20">
                      {profile["Talent Category"]}
                    </Badge>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-3 mt-3">
                  {profileManager ? (
                    <Badge variant="outline" className="text-xs sm:text-sm break-words">
                      Manager: {profileManager}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs sm:text-sm text-muted-foreground">
                      No Manager Assigned
                    </Badge>
                  )}
                  <Badge variant={getStatusVariant(profileStatus)} className="text-xs sm:text-sm">
                    {profileStatus}
                  </Badge>
                </div>
              </div>

              {/* Portfolio Gallery */}
              {portfolioLinks.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Portfolio
                  </h3>

                  {/* Image thumbnails */}
                  {imageItems.length > 0 && (
                    <>
                      <div className="photos-thumbnail-grid">
                        {imageItems.map((link, idx) => {
                          const thumbnailUrl = getDriveThumbnailUrl(link);
                          return (
                            <button
                              key={`img-${idx}`}
                              data-idx={idx}
                              className="thumbnail-item image-clickable"
                              aria-label={`View photo ${idx + 1}`}
                            >
                              {thumbnailUrl ? (
                                <img
                                  src={thumbnailUrl}
                                  alt={`Portfolio ${idx + 1}`}
                                  loading="lazy"
                                  onError={(e) => {
                                    const img = e.currentTarget;
                                    img.style.display = "none";
                                    const fallback = img.parentElement?.querySelector(
                                      ".fallback-div"
                                    ) as HTMLElement | null;
                                    if (fallback) fallback.classList.remove("hidden");
                                  }}
                                />
                              ) : null}
                              <div className="hidden fallback-div absolute inset-0 flex items-center justify-center bg-muted rounded-md">
                                <ImageIcon className="h-5 w-5 text-muted-foreground" />
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Image Lightbox Modal */}
                      {isModalOpen && currentModalImage && (
                        <div
                          className="image-modal-overlay"
                          onClick={closeModal}
                          role="dialog"
                          aria-modal="true"
                          aria-label="Image preview"
                        >
                          <div
                            className="image-modal-content"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={closeModal}
                              className="image-modal-close"
                              aria-label="Close preview"
                            >
                              <X className="h-6 w-6" />
                            </button>

                            <div className="image-modal-counter">
                              {currentImageIndex + 1} of {imageItems.length}
                            </div>

                            <img
                              src={getDrivePreviewUrl(currentModalImage) || getDriveThumbnailUrl(currentModalImage) || ""}
                              alt={`Photo ${currentImageIndex + 1}`}
                              className="image-modal-image"
                              onError={(e) => {
                                const img = e.currentTarget;
                                const thumbUrl = getDriveThumbnailUrl(currentModalImage);
                                if (thumbUrl && img.src !== thumbUrl) {
                                  img.src = thumbUrl;
                                  return;
                                }
                                img.style.display = "none";
                                const fallback = img.parentElement?.querySelector(".fallback-div") as HTMLElement | null;
                                if (fallback) fallback.classList.remove("hidden");
                              }}
                            />
                            <div className="hidden fallback-div absolute inset-0 flex items-center justify-center bg-black/50">
                              <ImageIcon className="h-12 w-12 text-white/60" />
                            </div>

                            {imageItems.length > 1 && (
                              <>
                                <button
                                  onClick={goToPrevious}
                                  className="image-modal-nav image-modal-nav-prev"
                                  aria-label="Previous image"
                                >
                                  <ChevronLeft className="h-8 w-8" />
                                </button>
                                <button
                                  onClick={goToNext}
                                  className="image-modal-nav image-modal-nav-next"
                                  aria-label="Next image"
                                >
                                  <ChevronRight className="h-8 w-8" />
                                </button>
                              </>
                            )}

                            <a
                              href={currentModalImage}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="absolute bottom-3 right-3 h-9 px-3 flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              Open in Drive
                            </a>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Non-image files (PDFs, documents, etc.) */}
                  {nonImageItems.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {nonImageItems.map((link, idx) => {
                        const isPdf = getFileType(link) === "pdf";
                        const fileIndex = imageItems.length + idx;
                        return (
                          <a
                            key={`file-${idx}`}
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors border border-border text-sm"
                          >
                            <FileText className={`h-4 w-4 ${isPdf ? "text-red-500" : "text-primary"}`} />
                            <span className="text-foreground">
                              {isPdf ? "PDF Document" : `File ${fileIndex + 1}`}
                            </span>
                            <ExternalLink className="h-3 w-3 text-muted-foreground" />
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {portfolioLinks.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 sm:py-14 bg-secondary/50 rounded-xl border border-border">
                  <div className="bg-muted p-4 rounded-full mb-3">
                    <ImageIcon className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground text-xs sm:text-sm">
                    No portfolio uploaded
                  </p>
                </div>
              )}

              {/* Profile Sections */}
              {renderSection(getBasicInfo())}
              {renderSection(getContact())}
              {renderSection(getSocialMedia())}
              {renderSection(getWork())}
              {renderSection(getManagementInfo())}
            </div>
          </ProfileErrorBoundary>
        )}
      </DialogContent>

      {/* Manager Dropdown Portal - FIRST */}
      <ManagerDropdownPortal />

      {/* Status Dropdown Portal - SECOND */}
      <StatusDropdownPortal />
    </Dialog>
  );
}
