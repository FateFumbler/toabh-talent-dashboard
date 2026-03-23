import { useEffect, useState, useCallback, useRef, Component } from "react";
import type { ReactNode } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Talent, TalentDetails, StatusValue } from "@/types/talent";
import { MANAGERS } from "@/types/talent";
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
  ExternalLink,
} from "lucide-react";
import type { Contract } from "@/types/contract";
import { toast } from "sonner";

interface TalentProfileProps {
  name: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusUpdate?: (row: number, status: string) => void;
  onManagerAssign?: (row: number, manager: string) => void;
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

function formatHeight(height: string | number | undefined | null): string {
  if (!height) return "-";
  const trimmed = String(height).trim();
  if (!trimmed) return "-";
  
  // Handle formats like "5'5 in feet 65 in inches" or "5'6 in feet"
  // Extract just the feet'inches portion
  const feetInchesMatch = trimmed.match(/(\d+'\d+"?)/);
  if (feetInchesMatch) {
    return feetInchesMatch[1].replace(/"/g, "");
  }
  
  if (trimmed.includes("'") || trimmed.includes("ft")) {
    // Clean up formats like 5'5" or 5'6
    return trimmed
      .replace(/"/g, "")
      .replace(/ ft /g, "'")
      .replace(/ in$/g, "\"")
      .replace(/ inches$/g, "\"");
  }
  const inches = parseInt(trimmed, 10);
  if (!isNaN(inches)) {
    if (inches >= 12) {
      const feet = Math.floor(inches / 12);
      const remainingInches = inches % 12;
      return remainingInches > 0
        ? `${feet}'${remainingInches}"`
        : `${feet}'`;
    } else {
      return `${inches}"`;
    }
  }
  return trimmed;
}

export function TalentProfileDialog({
  name,
  open,
  onOpenChange,
  onStatusUpdate,
  onManagerAssign,
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

  useEffect(() => {
    if (!open) {
      setProfile(null);
      setError(null);
      setIsLoading(false);
      setIsModalOpen(false);
      setCurrentImageIndex(0);
      imageCountRef.current = 0;
    }
  }, [open]);

  const openModal = (index: number) => {
    setCurrentImageIndex(index);
    setIsModalOpen(true);
  };

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

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

  const normalizePhone = (phone: string): string => {
    if (!phone) return "";
    let normalized = phone.replace(/[^\d+]/g, "");
    if (normalized.startsWith("+91")) {
      normalized = normalized.substring(3);
    }
    normalized = normalized.replace(/^0+/, "");
    return normalized;
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
          return contractPhone === talentPhone;
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
            formatHeight(gf("Height (in feet & inches)")) ||
            formatHeight(gf("Height")),
        },
      ],
    };
  };

  const getPhysicalAttributes = (): ProfileSection => ({
    title: "Physical Attributes",
    fields: [
      {
        label: "Height (in feet & inches)",
        value: formatHeight(gf("Height (in feet & inches)")),
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
        <div className="space-y-2">
          {contracts.map((contract, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2 bg-muted/30 rounded-lg"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">
                  {contract.name || "Unnamed"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {contract.email || "No email"} • {contract.phone || "No phone"}
                </div>
              </div>
              {contract.contractLink && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    window.open(
                      contract.contractLink,
                      "_blank",
                      "noopener,noreferrer"
                    )
                  }
                  className="ml-2 shrink-0"
                >
                  <FileText className="h-3 w-3 mr-1" />
                  View
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              )}
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
                    <Select
                      value={profileStatus as StatusValue}
                      onValueChange={(value) => {
                        if (value === "Onboarded" && !profileManager) {
                          toast.error("Please assign a Talent Manager first");
                          return;
                        }
                        onStatusUpdate(rowIndex, value);
                        toast.success(`Status updated to ${value}`);
                      }}
                    >
                      <SelectTrigger className="w-full sm:w-[180px] min-h-[44px]">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="New">New</SelectItem>
                        <SelectItem value="Meeting Required">Meeting Required</SelectItem>
                        <SelectItem value="KYC Required">KYC Required</SelectItem>
                        <SelectItem value="Onboarded">Onboarded</SelectItem>
                        <SelectItem value="Rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
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
                    <Select
                      value={profileManager || "unassigned"}
                      onValueChange={(value) => {
                        if (value === "unassigned") return;
                        onManagerAssign(rowIndex, value);
                        toast.success(`Manager updated to ${value}`);
                      }}
                    >
                      <SelectTrigger className="w-full sm:w-[200px] min-h-[44px] text-sm">
                        <SelectValue placeholder="Assign Manager" />
                      </SelectTrigger>
                      <SelectContent
                        className="sm:max-w-[200px] max-w-[calc(100vw-32px)]"
                        style={{ maxWidth: "min(100vw - 16px, 220px)" }}
                      >
                        <SelectItem value="unassigned" className="py-3 min-h-[44px]">Unassigned</SelectItem>
                        {MANAGERS.map((manager) => (
                          <SelectItem key={manager} value={manager} className="py-3 min-h-[44px]">
                            {manager}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
    </Dialog>
  );
}
