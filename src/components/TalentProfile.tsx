import { useEffect, useState, useCallback, useRef, Component } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Talent, TalentDetails, StatusValue } from "@/types/talent";
import { fetchTalentMaster, fetchTalentDetails } from "@/services/api";
import { fetchContracts } from "@/services/contractsApi";
import { getLocalContracts } from "@/services/localContracts";
import {
  Loader2,
  User,
  FileText,
  AlertTriangle,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import type { Contract } from "@/types/contract";

interface TalentProfileProps {
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
    console.error(
      "[ProfileErrorBoundary] Caught error:",
      error,
      errorInfo
    );
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
            {this.state.error?.message ||
              "Failed to render profile. Please try again."}
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

function parsePolaroidLinks(polaroidField: unknown): string[] {
  if (!polaroidField) return [];
  const str = String(polaroidField);
  if (!str.trim()) return [];
  return str.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
}

// Manager badge colors (matching ManagerDropdown.tsx)
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
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://")
  ) {
    return trimmed;
  }
  let username = trimmed.replace(/^@/, "");
  username = username.replace(
    /^(https?:\/\/)?(www\.)?instagram\.com\//,
    ""
  );
  username = username.split("?")[0].split("#")[0];
  username = username.replace(/\/+$/, "");
  return `https://instagram.com/${username}`;
}

const renderInstagramLink = (
  instagram: string | undefined
): React.ReactNode => {
  if (!instagram || instagram.trim() === "") return "-";
  const url = parseInstagram(instagram);
  const display = instagram
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//, "@")
    .replace(/\/+$/, "");
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary hover:underline"
    >
      {display}
    </a>
  );
};

function safeField(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string") return value.trim() || undefined;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.join(", ") || undefined;
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function TalentProfileDialog({
  name,
  open,
  onOpenChange,
  onStatusUpdate,
  onManagerAssign,
  managers,
  rowIndex,
}: TalentProfileProps) {
  const [profile, setProfile] = useState<
    (Talent & Partial<TalentDetails>) | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const imageCountRef = useRef(0);

  // Dropdown refs and state - managed at TalentProfileDialog level to avoid Dialog stacking context issues
  const statusTriggerRef = useRef<HTMLButtonElement>(null);
  const managerTriggerRef = useRef<HTMLButtonElement>(null);
  const [statusDropdown, setStatusDropdown] = useState<{
    open: boolean;
    position: { top: number; left: number; width: number } | null;
  }>({ open: false, position: null });
  const [managerDropdown, setManagerDropdown] = useState<{
    open: boolean;
    position: { top: number; left: number; width: number } | null;
  }>({ open: false, position: null });

  // Close dropdowns when dialog closes
  useEffect(() => {
    if (!open) {
      setProfile(null);
      setError(null);
      setIsLoading(false);
      setIsModalOpen(false);
      setCurrentImageIndex(0);
      imageCountRef.current = 0;
      setStatusDropdown({ open: false, position: null });
      setManagerDropdown({ open: false, position: null });
    }
  }, [open]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      // Don't close if clicking inside a trigger
      if (statusTriggerRef.current?.contains(target) || managerTriggerRef.current?.contains(target)) {
        return;
      }
      // Don't close if clicking inside the dialog content (portals are outside)
      const dialogContent = document.querySelector('[role="dialog"]');
      if (dialogContent?.contains(target)) {
        return;
      }
      setStatusDropdown({ open: false, position: null });
      setManagerDropdown({ open: false, position: null });
    }

    if (statusDropdown.open || managerDropdown.open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [statusDropdown.open, managerDropdown.open]);

  // Close dropdowns on escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setStatusDropdown({ open: false, position: null });
        setManagerDropdown({ open: false, position: null });
      }
    }
    if (statusDropdown.open || managerDropdown.open) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [statusDropdown.open, managerDropdown.open]);

  const openModal = (index: number) => {
    setCurrentImageIndex(index);
    setIsModalOpen(true);
  };

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  // Status dropdown handlers
  const handleStatusTriggerClick = useCallback(() => {
    if (statusTriggerRef.current) {
      const rect = statusTriggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const margin = 16;
      const dropdownHeight = 260;
      const flipUp = spaceBelow < dropdownHeight + margin && spaceAbove > spaceBelow;
      const top = flipUp ? rect.top - dropdownHeight - 8 : rect.bottom + 4;
      const left = Math.max(margin, Math.min(rect.left, window.innerWidth - rect.width - margin));
      setStatusDropdown({
        open: !statusDropdown.open,
        position: { top, left, width: rect.width }
      });
    }
    // Close manager dropdown if open
    if (managerDropdown.open) {
      setManagerDropdown({ open: false, position: null });
    }
  }, [statusDropdown.open, managerDropdown.open]);

  const handleStatusSelect = useCallback((status: StatusValue) => {
    const currentProfileManager = profile?.["Talent Manager"] as string | undefined;
    if (status === "Onboarded" && !currentProfileManager) {
      toast.error("Please assign a Talent Manager first");
      setStatusDropdown({ open: false, position: null });
      return;
    }
    onStatusUpdate?.(rowIndex!, status);
    toast.success(`Status updated to ${status}`);
    setStatusDropdown({ open: false, position: null });
  }, [rowIndex, onStatusUpdate, profile]);

  // Manager dropdown handlers
  const handleManagerTriggerClick = useCallback(() => {
    if (managerTriggerRef.current) {
      const rect = managerTriggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const margin = 16;
      const dropdownHeight = 320;
      const flipUp = spaceBelow < dropdownHeight + margin && spaceAbove > spaceBelow;
      const top = flipUp ? rect.top - dropdownHeight - 8 : rect.bottom + 4;
      const left = Math.max(margin, Math.min(rect.left, window.innerWidth - 280 - margin));
      setManagerDropdown({
        open: !managerDropdown.open,
        position: { top, left, width: rect.width }
      });
    }
    // Close status dropdown if open
    if (statusDropdown.open) {
      setStatusDropdown({ open: false, position: null });
    }
  }, [managerDropdown.open, statusDropdown.open]);

  const handleManagerSelect = useCallback((manager: string) => {
    const currentProfileManager = profile?.["Talent Manager"] as string | undefined;
    if (manager === currentProfileManager) {
      setManagerDropdown({ open: false, position: null });
      return;
    }
    onManagerAssign?.(rowIndex!, manager);
    toast.success(`Manager updated to ${manager}`);
    setManagerDropdown({ open: false, position: null });
  }, [rowIndex, onManagerAssign, profile]);

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
        case "Escape":
          closeModal();
          break;
        case "ArrowLeft":
          goToPrevious();
          break;
        case "ArrowRight":
          goToNext();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen, closeModal, goToPrevious, goToNext]);

  useEffect(() => {
    const trimmedName = name?.trim();
    if (trimmedName && open) {
      console.log("[Profile] Loading profile for:", trimmedName);
      loadProfile();
    }
  }, [name, open]);

  const normalizePhone = (phone: string | number): string => {
    if (!phone) return "";
    return String(phone)
      .replace(/\D/g, "")
      .slice(-10);
  };

  const loadProfile = async () => {
    if (!name) return;
    setIsLoading(true);
    setError(null);
    try {
      const [talentData, detailsData] = await Promise.all([
        fetchTalentMaster(),
        fetchTalentDetails(),
      ]);

      const detailsMapByPhone = new Map<string, TalentDetails>();
      const detailsMapByEmail = new Map<string, TalentDetails>();

      for (const d of detailsData) {
        if (d["Phone Number"]) {
          const normalized = normalizePhone(String(d["Phone Number"]));
          if (normalized) {
            detailsMapByPhone.set(normalized, d);
          }
        }
        if (d["Email Address"]) {
          detailsMapByEmail.set(
            d["Email Address"].trim().toLowerCase(),
            d
          );
        }
      }

      const normalizedName = name.toLowerCase().trim();
      const talent = talentData.find(
        (t) => t["Full Name"]?.toLowerCase().trim() === normalizedName
      );
      if (!talent) {
        console.error(
          "[Profile] Talent not found in master sheet. Looking for:",
          name,
          "Normalized:",
          normalizedName
        );
        setError("Talent not found in master sheet");
        setIsLoading(false);
        return;
      }

      const talentPhone = normalizePhone(String(talent["Phone"] || ""));
      const talentEmail = (talent["Email "] || "").trim().toLowerCase();

      let matchedDetails: TalentDetails | undefined;

      if (talentPhone && detailsMapByPhone.has(talentPhone)) {
        matchedDetails = detailsMapByPhone.get(talentPhone);
      }

      if (!matchedDetails && talentEmail && detailsMapByEmail.has(talentEmail)) {
        matchedDetails = detailsMapByEmail.get(talentEmail);
      }

      const merged: Talent & Partial<TalentDetails> = {
        ...talent,
      };

      if (matchedDetails) {
        Object.assign(merged, matchedDetails);
      }

      setProfile(merged);

      try {
        const [sheetContracts, localContracts] = await Promise.all([
          fetchContracts(),
          Promise.resolve(getLocalContracts()),
        ]);
        const allContracts = [...sheetContracts, ...localContracts];
        const talentContracts = allContracts.filter((contract: Contract) => {
          const contractPhone = normalizePhone(contract.phone || "");
          if (contractPhone === talentPhone) return true;
          // Name-based fallback for local contracts
          if (contract.source === 'local') {
            const talentName = String(talent["Full Name"] || "").toLowerCase().trim();
            const contractName = String(contract.name || "").toLowerCase().trim();
            if (talentName && contractName && talentName === contractName) return true;
          }
          return false;
        });
        setContracts(talentContracts);
      } catch (err) {
        console.error("[Profile] Failed to fetch contracts:", err);
        setContracts([]);
      }
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
      case "Onboarded":
        return "success";
      case "Meeting Required":
        return "warning";
      case "KYC Required":
        return "info";
      case "Rejected":
        return "destructive";
      case "New":
        return "default";
      default:
        return "default";
    }
  };

  const formatFieldValue = (value: string | undefined): string | undefined => {
    if (!value) return undefined;
    const strValue = String(value);
    if (strValue.trim() === "") return undefined;
    const trimmed = strValue.trim();
    if (/^(yes|no|y|n|true|false|1|0)$/i.test(trimmed)) {
      return (
        trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase()
      );
    }
    return strValue;
  };

  const renderSection = (section: ProfileSection) => {
    const hasValues = section.fields.some((f) => f.value);
    if (!hasValues) return null;

    const isUrlField = (label: string) =>
      /instagram|youtube|imdb|wiki|link|website|facebook|twitter|tiktok/i.test(
        label
      );

    return (
      <div key={section.title} className="profile-card">
        <h3 className="profile-section-title">{section.title}</h3>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1">
          {section.fields.map((field) =>
            field.value ? (
              <div key={field.label} className="profile-field">
                <dt className="profile-field-label">{field.label}</dt>
                <dd
                  className={`profile-field-value ${isUrlField(field.label) ? "url-text" : ""}`}
                >
                  {typeof field.value === "string"
                    ? formatFieldValue(field.value)
                    : field.value}
                </dd>
              </div>
            ) : null
          )}
        </dl>
      </div>
    );
  };

  const formatDateField = (value: string | undefined): string | undefined => {
    if (!value) return undefined;
    return value.split("T")[0];
  };

  const gf = (key: string): string | undefined => {
    if (!profile) return undefined;
    const profileAny = profile as unknown as Record<string, unknown>;
    return safeField(profileAny?.[key]);
  };

  const getBasicInfo = (): ProfileSection => {
    const email = gf("Email Address") || gf("Email ");
    const phone = (
      gf("Phone Number") || gf("Phone")
    )?.toString();
    return {
      title: "Basic Information",
      fields: [
        { label: "Full Name", value: gf("Full Name") },
        {
          label: "Email",
          value: email ? (
            <a
              href={`mailto:${email}`}
              className="text-primary hover:underline"
              style={{ wordBreak: "break-all" }}
            >
              {email}
            </a>
          ) : undefined,
        },
        {
          label: "Phone",
          value: phone ? (
            <a href={`tel:${phone}`} className="text-primary hover:underline">
              {phone}
            </a>
          ) : undefined,
        },
        {
          label: "City",
          value:
            gf("City & State (Current location)") ||
            gf("City & State") ||
            gf("City"),
        },
        { label: "Gender", value: gf("Gender") },
        { label: "Age", value: gf("Age")?.toString() },
        { label: "Date of Birth", value: formatDateField(gf("Date of Birth ")) },
        { label: "Nationality", value: gf("Nationality") },
        {
          label: "Height (in feet & inches)",
          value:
            gf("Height (in feet & inches)") || gf("Height"),
        },
      ],
    };
  };

  const getPhysicalAttributes = (): ProfileSection => ({
    title: "Physical Attributes",
    fields: [
      {
        label: "Height (in feet & inches)",
        value: gf("Height (in feet & inches)") || gf("Height"),
      },
      { label: "Chest/Bust (in inches)", value: gf("Chest/Bust (in inches)") },
      { label: "Waist (in inches)", value: gf("Waist (in inches)") },
      { label: "Hips (in inches)", value: gf("Hips (in inches)") },
      { label: "Shoe Size (UK)", value: gf("Shoe Size (UK)") },
      { label: "Hair Color", value: gf("Hair Color") },
      { label: "Eye Color", value: gf("Eye Color") },
      { label: "Skin Tone", value: gf("Skin Tone") },
    ],
  });

  const getSocialMedia = (): ProfileSection => ({
    title: "Social & Media",
    fields: [
      {
        label: "Instagram",
        value: renderInstagramLink(gf("Instagram Link") || gf("Instagram")),
      },
      {
        label: "YouTube",
        value: gf("YouTube Channel (if any)") || gf("YouTube Channel"),
      },
      {
        label: "IMDb",
        value: gf("IMDb / Wikipedia Page (if any) ") || gf("IMDb"),
      },
    ],
  });

  const getExperience = (): ProfileSection => ({
    title: "Experience",
    fields: [
      {
        label: "Prior modelling/acting experience",
        value: gf(
          "Do you have any prior modeling or acting experience?"
        ),
      },
      {
        label: "Experience details",
        value: gf(
          "If Yes, briefly describe your experience or list any brands/projects"
        ),
      },
      {
        label: "Previous Agency",
        value: gf("Any Previous Agency?"),
      },
      {
        label: "Acting Workshop Attended",
        value: gf("Any Acting Workshop Attended?  "),
      },
      {
        label: "CINTAA/Union Card",
        value: gf("Do you have a CINTAA / Union Card?"),
      },
      { label: "Languages Known", value: gf("Languages Known") },
      { label: "Dance Forms", value: gf("Dance Forms Known (if any)") },
      {
        label: "Extra-Curricular",
        value: gf("Extra-Curricular Activities (if any)"),
      },
    ],
  });

  const getWorkPreferences = (): ProfileSection => ({
    title: "Work Preferences",
    fields: [
      {
        label: "Scope of Work Interested In",
        value: gf(
          "Scope of Work Interested In (e.g., TV, Web, Fashion, Commercials)"
        ),
      },
      {
        label: "Open for placement abroad",
        value: gf("Are you open for placement abroad?"),
      },
      { label: "Valid Passport", value: gf("Valid Passport?") },
      {
        label: "Can drive 2-wheeler",
        value: gf("Can you drive a 2-wheeler? (Geared / Non-Geared)"),
      },
      {
        label: "Can drive 4-wheeler",
        value: gf("Can you drive a 4-wheeler? "),
      },
      { label: "Can Swim", value: gf("Can you swim?  ") },
      { label: "Gamer", value: gf("Are you a Gamer?") },
    ],
  });

  const getComfortConsent = (): ProfileSection => ({
    title: "Comfort & Consent",
    fields: [
      {
        label: "Lingerie/bikini shoots",
        value: gf("Comfortable with lingerie / bikini / briefs shoots?"),
      },
      {
        label: "Bold content for web/films",
        value: gf("Comfortable with bold content for web series or films?"),
      },
      {
        label: "Condom brand promotions",
        value: gf(
          "Comfortable with condom brand promotions or awareness campaigns?"
        ),
      },
      {
        label: "Alcohol brand shoots",
        value: gf("Comfortable with alcohol brand shoots or commercials?"),
      },
      {
        label: "Reality TV shows",
        value: gf("Comfortable participating in reality TV shows?"),
      },
      {
        label: "Daily soaps",
        value: gf("Comfortable working in daily soaps or TV roles?"),
      },
      {
        label: "Mother/father roles",
        value: gf(
          "Comfortable playing mother or father roles? (for applicants aged 23+)"
        ),
      },
      { label: "Haircut", value: gf("Comfortable with haircut?") },
      {
        label: "Hair color changes",
        value: gf("Comfortable with hair color changes?"),
      },
    ],
  });

  const getManagementInfo = (): ProfileSection => ({
    title: "Management",
    fields: [
      { label: "Status", value: gf("Status") },
      { label: "Talent Manager", value: gf("Talent Manager") },
      { label: "Notes", value: gf("Notes") },
      { label: "Progress", value: gf("Progress") },
    ],
  });

  const getContractsSection = (): React.ReactNode => {
    if (contracts.length === 0) {
      return (
        <div className="profile-card">
          <h3 className="profile-section-title">Contracts</h3>
          <div className="text-center py-6">
            <FileText className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No contracts linked yet
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="profile-card">
        <h3 className="profile-section-title">
          Contracts ({contracts.length})
        </h3>
        <div className="space-y-3">
          {contracts.map((contract, idx) => (
            <div
              key={contract.id || idx}
              className="border border-border rounded-xl p-4 bg-card hover:border-primary/40 transition-colors"
            >
              <div className="flex items-start gap-3">
                {/* Document Icon */}
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>

                {/* Contract Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground">
                      {contract.name || "Unnamed Contract"}
                    </span>
                    <Badge
                      variant="secondary"
                      className={`text-xs px-2 py-0.5 ${
                        contract.source === 'local'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}
                    >
                      {contract.source === 'local' ? 'Local' : 'Sheet'}
                    </Badge>
                  </div>

                  <div className="mt-1 flex flex-col gap-0.5 text-xs text-muted-foreground">
                    {contract.email && (
                      <span className="truncate">{contract.email}</span>
                    )}
                    {contract.phone && (
                      <span className="truncate">{contract.phone}</span>
                    )}
                  </div>
                </div>

                {/* CTA Button */}
                {contract.contractLink && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() =>
                      window.open(
                        contract.contractLink,
                        "_blank",
                        "noopener,noreferrer"
                      )
                    }
                    className="flex-shrink-0 gap-1.5"
                  >
                    View Talent Management Agreement
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const profileAny = profile as unknown as Record<string, unknown>;
  const polaroidLinks = profile
    ? parsePolaroidLinks(profileAny?.["Upload Polaroids (Required)"])
    : [];

  useEffect(() => {
    imageCountRef.current = polaroidLinks.length;
  }, [polaroidLinks.length]);

  const profileName = gf("Full Name") || "Unknown Talent";
  const profileStatus = gf("Status") || "New";
  const profileManager = gf("Talent Manager");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 bg-background border-border animate-scale-in">
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
                <h2 className="text-xl sm:text-2xl font-bold text-foreground break-words">
                  {profileName}
                </h2>
                <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-3 mt-3">
                  {typeof rowIndex === "number" && onStatusUpdate ? (
                    <button
                      ref={statusTriggerRef}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusTriggerClick();
                      }}
                      className={`inline-flex items-center gap-2 px-3 py-2 sm:px-2 sm:py-1 rounded-full text-sm sm:text-xs font-medium transition-all whitespace-nowrap min-h-[44px] sm:min-h-[auto] border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        profileStatus === "Onboarded"
                          ? "bg-green-100/15 text-green-400 border-green-500/40 dark:bg-green-900/20 dark:text-green-300 dark:border-green-500/30"
                          : profileStatus === "Meeting Required"
                          ? "bg-orange-100/15 text-orange-400 border-orange-500/40 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-500/30"
                          : profileStatus === "KYC Required"
                          ? "bg-blue-100/15 text-blue-400 border-blue-500/40 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-500/30"
                          : profileStatus === "Rejected"
                          ? "bg-red-100/15 text-red-400 border-red-500/40 dark:bg-red-900/20 dark:text-red-300 dark:border-red-500/30"
                          : "bg-muted text-muted-foreground border-muted"
                      }`}
                      style={{ minWidth: "140px", justifyContent: "center" }}
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${
                        profileStatus === "Onboarded"
                          ? "bg-green-400 dark:bg-green-300"
                          : profileStatus === "Meeting Required"
                          ? "bg-orange-400 dark:bg-orange-300"
                          : profileStatus === "KYC Required"
                          ? "bg-blue-400 dark:bg-blue-300"
                          : profileStatus === "Rejected"
                          ? "bg-red-400 dark:bg-red-300"
                          : "bg-muted-foreground"
                      }`} />
                      <span>{profileStatus || "New"}</span>
                      <ChevronDown
                        className="h-4 w-4 sm:h-3 sm:w-3 transition-transform duration-200"
                        style={{ transform: statusDropdown.open ? "rotate(180deg)" : "rotate(0deg)" }}
                      />
                    </button>
                  ) : (
                    <Badge
                      variant={getStatusVariant(profileStatus)}
                      className="text-xs sm:text-sm"
                    >
                      {profileStatus}
                    </Badge>
                  )}

                  {/* Manager */}
                  {typeof rowIndex === "number" && onManagerAssign ? (
                    <button
                      ref={managerTriggerRef}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleManagerTriggerClick();
                      }}
                      className={`inline-flex items-center gap-2 px-3 py-2 sm:px-2.5 sm:py-1 rounded-lg text-sm font-medium transition-all whitespace-nowrap min-h-[44px] sm:min-h-[auto] border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                      style={{
                        minWidth: "150px",
                        justifyContent: "center",
                        backgroundColor: profileManager ? getManagerBadgeColor(profileManager).bg : "transparent",
                        color: profileManager ? getManagerBadgeColor(profileManager).text : "var(--muted-foreground)",
                        borderColor: profileManager ? getManagerBadgeColor(profileManager).border : "var(--border)",
                      }}
                    >
                      {profileManager ? (
                        <>
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center font-medium text-[10px]"
                            style={{
                              backgroundColor: getManagerBadgeColor(profileManager).text,
                              color: "#fff"
                            }}
                          >
                            {profileManager.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <span className="hidden sm:inline">{profileManager}</span>
                          <span className="sm:hidden">{profileManager.split(' ')[0]}</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">
                          <span className="sm:hidden">Assign</span>
                          <span className="hidden sm:inline">Assign Manager</span>
                        </span>
                      )}
                      <ChevronDown
                        className="h-4 w-4 sm:h-3 sm:w-3 transition-transform duration-200"
                        style={{ transform: managerDropdown.open ? "rotate(180deg)" : "rotate(0deg)" }}
                      />
                    </button>
                  ) : profileManager ? (
                    <Badge variant="outline" className="text-xs sm:text-sm break-words">
                      Manager: {profileManager}
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-xs sm:text-sm text-muted-foreground"
                    >
                      No Manager Assigned
                    </Badge>
                  )}
                </div>
              </div>

              {/* Photo Gallery */}
              <div className="space-y-2">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Photos
                </h3>
                {polaroidLinks.length > 0 ? (
                  <>
                    <div className="photos-thumbnail-grid">
                      {polaroidLinks.map((link, idx) => {
                        const thumbnailUrl = getDriveThumbnailUrl(link);
                        return (
                          <button
                            key={idx}
                            onClick={() => openModal(idx)}
                            className="thumbnail-item"
                            aria-label={`View photo ${idx + 1}`}
                          >
                            {thumbnailUrl ? (
                              <img
                                src={thumbnailUrl}
                                alt={`Photo ${idx + 1}`}
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
                              <FileText className="h-5 w-5 text-muted-foreground" />
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {isModalOpen && (
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
                            {currentImageIndex + 1} of {polaroidLinks.length}
                          </div>

                          <img
                            src={getModalImageUrl(
                              polaroidLinks[currentImageIndex]
                            )}
                            alt={`Photo ${currentImageIndex + 1}`}
                            className="image-modal-image"
                          />

                          {polaroidLinks.length > 1 && (
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
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 sm:py-14 bg-secondary/50 rounded-xl border border-border">
                    <div className="bg-muted p-4 rounded-full mb-3">
                      <User className="h-7 w-7 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground text-xs sm:text-sm">
                      No photos yet
                    </p>
                  </div>
                )}
              </div>

              {/* Profile Sections */}
              {renderSection(getBasicInfo())}
              {renderSection(getPhysicalAttributes())}
              {renderSection(getSocialMedia())}
              {renderSection(getExperience())}
              {renderSection(getWorkPreferences())}
              {renderSection(getComfortConsent())}
              {renderSection(getManagementInfo())}
              {getContractsSection()}
            </div>
          </ProfileErrorBoundary>
        )}
      </DialogContent>

      {/* Status Dropdown - rendered outside Dialog to avoid z-index stacking issues */}
      {typeof document !== "undefined" && statusDropdown.open && statusDropdown.position && (
        createPortal(
          <div
            className="fixed inset-0 z-[9999]"
            onMouseDown={() => setStatusDropdown({ open: false, position: null })}
          >
            <div
              className="dropdown-animate fixed bg-popover border border-border rounded-xl shadow-xl overflow-hidden"
              style={{
                top: `${statusDropdown.position.top}px`,
                left: `${Math.max(8, Math.min(statusDropdown.position.left, window.innerWidth - statusDropdown.position.width - 8))}px`,
                maxWidth: `${window.innerWidth - 16}px`,
                minWidth: `${statusDropdown.position.width}px`,
                zIndex: 9999,
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="py-1">
                {(["New", "Meeting Required", "KYC Required", "Onboarded", "Rejected"] as StatusValue[]).map((status) => {
                  const isSelected = status === profileStatus;
                  const statusColors = {
                    New: { dot: "bg-muted-foreground" },
                    "Meeting Required": { dot: "bg-orange-400 dark:bg-orange-300" },
                    "KYC Required": { dot: "bg-blue-400 dark:bg-blue-300" },
                    Onboarded: { dot: "bg-green-400 dark:bg-green-300" },
                    Rejected: { dot: "bg-red-400 dark:bg-red-300" },
                  };
                  return (
                    <button
                      key={status}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusSelect(status);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-3 sm:py-2.5 text-sm transition-colors min-h-[44px] ${
                        isSelected
                          ? "bg-accent/60 font-medium text-foreground"
                          : "text-popover-foreground hover:bg-accent"
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${statusColors[status].dot}`} />
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
        )
      )}

      {/* Manager Dropdown - rendered outside Dialog to avoid z-index stacking issues */}
      {typeof document !== "undefined" && managerDropdown.open && managerDropdown.position && (
        createPortal(
          <div
            className="fixed inset-0 z-[9999]"
            onMouseDown={() => setManagerDropdown({ open: false, position: null })}
          >
            <div
              className="fixed bg-popover border border-border rounded-xl shadow-xl overflow-hidden"
              style={{
                top: `${managerDropdown.position.top}px`,
                left: `${Math.max(16, Math.min(managerDropdown.position.left, window.innerWidth - 280 - 16))}px`,
                width: "280px",
                zIndex: 9999,
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="py-1">
                {/* Header */}
                <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Select Manager
                </div>

                {/* Unassigned option */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
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

                {/* Managers list */}
                {(managers || []).map((manager) => {
                  const mColor = getManagerBadgeColor(manager);
                  const isSelected = manager === profileManager;
                  return (
                    <button
                      key={manager}
                      onClick={(e) => {
                        e.stopPropagation();
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
        )
      )}
    </Dialog>
  );
}
