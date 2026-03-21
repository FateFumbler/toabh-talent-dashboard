import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Talent, TalentDetails } from "@/types/talent";
import { fetchTalentMaster, fetchTalentDetails } from "@/services/api";
import { Loader2, User, FileText } from "lucide-react";

interface TalentProfileProps {
  name: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ProfileSection {
  title: string;
  fields: { label: string; value: string | undefined }[];
}

// Extract Google Drive file ID from various URL formats
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

// Convert Drive link to thumbnail URL
function getDriveThumbnailUrl(url: string): string | null {
  const fileId = extractDriveFileId(url);
  if (!fileId) return null;
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
}

// Get full-size Drive image URL
function getDriveImageUrl(url: string): string | null {
  const fileId = extractDriveFileId(url);
  if (!fileId) return null;
  return `https://drive.google.com/uc?export=view&id=${fileId}`;
}

// Parse polaroid links (may be comma or newline separated)
function parsePolaroidLinks(polaroidField: string | undefined): string[] {
  if (!polaroidField || !polaroidField.trim()) return [];
  return polaroidField.split(/[,\n]/).map(s => s.trim()).filter(Boolean);
}

export function TalentProfileDialog({
  name,
  open,
  onOpenChange,
}: TalentProfileProps) {
  const [profile, setProfile] = useState<(Talent & Partial<TalentDetails>) | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (name && open) {
      loadProfile();
    }
  }, [name, open]);

  // Normalize phone number for matching - remove spaces, dashes, +91 prefix
  const normalizePhone = (phone: string): string => {
    if (!phone) return "";
    // Remove all non-digit characters except +
    let normalized = phone.replace(/[^\d+]/g, "");
    // Remove +91 prefix if present
    if (normalized.startsWith("+91")) {
      normalized = normalized.substring(3);
    }
    // Remove leading zeros
    normalized = normalized.replace(/^0+/, "");
    return normalized;
  };

  const loadProfile = async () => {
    if (!name) return;
    setIsLoading(true);
    setError(null);
    try {
      // Fetch both talent-master and talent-details
      const [talentData, detailsData] = await Promise.all([
        fetchTalentMaster(),
        fetchTalentDetails()
      ]);
      
      // Build details map with normalized phone keys
      const detailsMapByPhone = new Map<string, TalentDetails>();
      // Also build a map by email for fallback
      const detailsMapByEmail = new Map<string, TalentDetails>();
      
      for (const d of detailsData) {
        if (d["Phone Number"]) {
          const normalized = normalizePhone(String(d["Phone Number"]));
          if (normalized) {
            detailsMapByPhone.set(normalized, d);
          }
        }
        if (d["Email Address"]) {
          detailsMapByEmail.set(d["Email Address"].trim().toLowerCase(), d);
        }
      }
      
      // Find the talent by name in talent-master
      const talent = talentData.find(t => t["Full Name"] === name);
      if (!talent) {
        setError("Talent not found in master sheet");
        setIsLoading(false);
        return;
      }
      
      // Try to find matching details
      const talentPhone = normalizePhone(String(talent["Phone"] || ""));
      const talentEmail = (talent["Email "] || "").trim().toLowerCase();
      
      let matchedDetails: TalentDetails | undefined;
      
      // Primary: match by normalized phone
      if (talentPhone && detailsMapByPhone.has(talentPhone)) {
        matchedDetails = detailsMapByPhone.get(talentPhone);
        console.log("[Profile] Matched by phone:", talentPhone);
      }
      
      // Fallback: match by email
      if (!matchedDetails && talentEmail && detailsMapByEmail.has(talentEmail)) {
        matchedDetails = detailsMapByEmail.get(talentEmail);
        console.log("[Profile] Matched by email:", talentEmail);
      }
      
      if (!matchedDetails) {
        console.log("[Profile] No match found. Phone:", talentPhone, "Email:", talentEmail);
        console.log("[Profile] Available phones:", Array.from(detailsMapByPhone.keys()));
        console.log("[Profile] Available emails:", Array.from(detailsMapByEmail.keys()));
      }
      
      // Merge talent with details
      const merged: Talent & Partial<TalentDetails> = {
        ...talent,
      };
      
      if (matchedDetails) {
        // Copy all fields from details
        Object.assign(merged, matchedDetails);
      }
      
      setProfile(merged);
    } catch (err) {
      setError("Failed to load profile");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusVariant = (status: string): "default" | "success" | "warning" | "destructive" | "info" => {
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

  // Helper to format field values - capitalize yes/no, keep others as-is
  const formatFieldValue = (value: string | undefined): string | undefined => {
    if (!value || value.trim() === "") return undefined;
    const trimmed = value.trim();
    // Check if it's a yes/no value (case insensitive)
    if (/^(yes|no|y|n|true|false|1|0)$/i.test(trimmed)) {
      // Capitalize first letter: "no" -> "No", "yes" -> "Yes"
      return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
    }
    return value;
  };

  const renderSection = (section: ProfileSection) => {
    const hasValues = section.fields.some((f) => f.value);
    if (!hasValues) return null;

    return (
      <Card key={section.title} className="bg-card/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-foreground">{section.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
            {section.fields.map((field) =>
              field.value ? (
                <div key={field.label} className="text-sm">
                  <dt className="text-muted-foreground font-medium">{field.label}</dt>
                  <dd className="mt-0.5 text-foreground">{formatFieldValue(field.value)}</dd>
                </div>
              ) : null
            )}
          </dl>
        </CardContent>
      </Card>
    );
  };

  const getBasicInfo = (): ProfileSection => ({
    title: "Basic Information",
    fields: [
      { label: "Full Name", value: profile?.["Full Name"] },
      { label: "Email", value: profile?.["Email Address"] || (profile as any)?.["Email "] },
      { label: "Phone", value: (profile?.["Phone Number"] || profile?.["Phone"])?.toString() },
      { label: "City", value: profile?.["City & State"] || profile?.["City"] },
      { label: "Gender", value: profile?.["Gender"] },
      { label: "Age", value: profile?.["Age"]?.toString() },
      { label: "Date of Birth", value: profile?.["Date of Birth"] },
      { label: "Nationality", value: profile?.["Nationality"] },
      { label: "Height (in feet & inches)", value: (profile as any)?.["Height (in feet & inches)"] || profile?.["Height"] },
    ],
  });

  const getPhysicalAttributes = (): ProfileSection => ({
    title: "Physical Attributes",
    fields: [
      { label: "Height (in feet & inches)", value: (profile as any)?.["Height (in feet & inches)"] },
      { label: "Chest/Bust (in inches)", value: (profile as any)?.["Chest/Bust (in inches)"] },
      { label: "Waist (in inches)", value: (profile as any)?.["Waist (in inches)"] },
      { label: "Hips (in inches)", value: (profile as any)?.["Hips (in inches)"] },
      { label: "Shoe Size (UK)", value: (profile as any)?.["Shoe Size (UK)"] },
      { label: "Hair Color", value: profile?.["Hair Color"] },
      { label: "Eye Color", value: profile?.["Eye Color"] },
      { label: "Skin Tone", value: profile?.["Skin Tone"] },
    ],
  });

  const getSocialMedia = (): ProfileSection => ({
    title: "Social & Media",
    fields: [
      { label: "Instagram", value: profile?.["Instagram Link"] || profile?.["Instagram"] },
      { label: "YouTube", value: profile?.["YouTube Channel"] },
      { label: "IMDb", value: profile?.["IMDb"] },
    ],
  });

  const getExperience = (): ProfileSection => ({
    title: "Experience",
    fields: [
      { label: "Prior modelling/acting experience", value: profile?.["Prior modelling/acting experience"] },
      { label: "Previous Agency", value: profile?.["Previous Agency"] },
      { label: "Acting Workshop Attended", value: profile?.["Acting Workshop Attended"] },
      { label: "CINTAA/Union Card", value: profile?.["CINTAA/Union Card"] },
      { label: "Languages Known", value: profile?.["Languages Known"] },
      { label: "Dance Forms", value: profile?.["Dance Forms"] },
      { label: "Extra-Curricular", value: profile?.["Extra-Curricular"] },
    ],
  });

  const getWorkPreferences = (): ProfileSection => ({
    title: "Work Preferences",
    fields: [
      { label: "Scope of Work Interested In", value: profile?.["Scope of Work Interested In"] },
      { label: "Open for placement abroad", value: profile?.["Open for placement abroad"] },
      { label: "Valid Passport", value: profile?.["Valid Passport"] },
      { label: "Can drive 2-wheeler", value: profile?.["Can drive 2-wheeler"] },
      { label: "Can drive 4-wheeler", value: profile?.["Can drive 4-wheeler"] },
      { label: "Can Swim", value: profile?.["Can Swim"] },
      { label: "Gamer", value: profile?.["Gamer"] },
    ],
  });

  const getComfortConsent = (): ProfileSection => ({
    title: "Comfort & Consent",
    fields: [
      { label: "Lingerie/bikini shoots", value: profile?.["Lingerie/bikini shoots"] },
      { label: "Bold content for web/films", value: profile?.["Bold content for web/films"] },
      { label: "Condom brand promotions", value: profile?.["Condom brand promotions"] },
      { label: "Alcohol brand shoots", value: profile?.["Alcohol brand shoots"] },
      { label: "Reality TV shows", value: profile?.["Reality TV shows"] },
      { label: "Daily soaps", value: profile?.["Daily soaps"] },
      { label: "Mother/father roles", value: profile?.["Mother/father roles"] },
      { label: "Haircut", value: profile?.["Haircut"] },
      { label: "Hair color changes", value: profile?.["Hair color changes"] },
    ],
  });

  const getManagementInfo = (): ProfileSection => ({
    title: "Management",
    fields: [
      { label: "Status", value: profile?.["Status"] },
      { label: "Talent Manager", value: profile?.["Talent Manager"] },
      { label: "Notes", value: profile?.["Notes"] },
      { label: "Progress", value: profile?.["Progress"] },
    ],
  });

  // Parse polaroids for gallery display
  const polaroidLinks = profile ? parsePolaroidLinks(profile["Upload Polaroids (Required)"]) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-dialog max-w-3xl max-h-[90vh] overflow-y-auto">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-12 text-destructive">
            <p>{error}</p>
          </div>
        )}

        {profile && !isLoading && (
          <div className="space-y-6">
            {/* Header: Name as large heading + Status/Manager */}
            <div className="space-y-3">
              <h2 className="text-2xl font-bold text-foreground">
                {profile["Full Name"]}
              </h2>
              <div className="flex flex-wrap gap-2">
                <Badge variant={getStatusVariant(profile["Status"])} className="text-sm">
                  {profile["Status"] || "New"}
                </Badge>
                {profile["Talent Manager"] && (
                  <Badge variant="outline" className="text-sm">
                    Manager: {profile["Talent Manager"]}
                  </Badge>
                )}
              </div>
            </div>

            {/* Image Gallery - prominently displayed */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Photos
              </h3>
              {polaroidLinks.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {polaroidLinks.map((link, idx) => {
                    const thumbnailUrl = getDriveThumbnailUrl(link);
                    const fullUrl = getDriveImageUrl(link);
                    return (
                      <div
                        key={idx}
                        className="relative aspect-square rounded-lg overflow-hidden border border-border/50 bg-card"
                      >
                        {thumbnailUrl ? (
                          <a
                            href={fullUrl || link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full h-full"
                          >
                            <img
                              src={thumbnailUrl}
                              alt={`Photo ${idx + 1}`}
                              className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                            <div className="hidden absolute inset-0 flex items-center justify-center bg-muted">
                              <FileText className="h-8 w-8 text-muted-foreground" />
                            </div>
                          </a>
                        ) : (
                          <a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute inset-0 flex flex-col items-center justify-center bg-muted hover:bg-muted/80 transition-colors"
                          >
                            <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                            <span className="text-xs text-muted-foreground">View {idx + 1}</span>
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 bg-muted/30 rounded-lg border border-border/50">
                  <div className="bg-muted p-4 rounded-full mb-3">
                    <User className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground text-sm">No photos yet</p>
                </div>
              )}
            </div>

            {/* Basic Information */}
            {renderSection(getBasicInfo())}

            {/* Physical Attributes */}
            {renderSection(getPhysicalAttributes())}

            {/* Social & Media */}
            {renderSection(getSocialMedia())}

            {/* Experience */}
            {renderSection(getExperience())}

            {/* Work Preferences */}
            {renderSection(getWorkPreferences())}

            {/* Comfort & Consent */}
            {renderSection(getComfortConsent())}

            {/* Management Info */}
            {renderSection(getManagementInfo())}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
