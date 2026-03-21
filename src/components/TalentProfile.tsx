import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TalentProfile as TalentProfileType } from "@/types/talent";
import { fetchTalentProfile } from "@/services/api";
import { ExternalLink, Loader2, User } from "lucide-react";

interface TalentProfileProps {
  name: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ProfileSection {
  title: string;
  fields: { label: string; value: string | undefined }[];
}

export function TalentProfileDialog({
  name,
  open,
  onOpenChange,
}: TalentProfileProps) {
  const [profile, setProfile] = useState<TalentProfileType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (name && open) {
      loadProfile();
    }
  }, [name, open]);

  const loadProfile = async () => {
    if (!name) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchTalentProfile(name);
      setProfile(data);
    } catch (err) {
      setError("Failed to load profile");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const getPolaroids = (): { label: string; url: string }[] => {
    if (!profile) return [];
    const polaroids: { label: string; url: string }[] = [];
    for (let i = 1; i <= 6; i++) {
      const key = `Polaroid ${i}` as keyof TalentProfileType;
      const url = profile[key];
      if (url && typeof url === "string" && url.trim()) {
        polaroids.push({ label: `View Photo ${i}`, url: url.trim() });
      }
    }
    return polaroids;
  };

  const getBasicInfo = (): ProfileSection => ({
    title: "Basic Information",
    fields: [
      { label: "Full Name", value: profile?.["Full Name"] },
      { label: "Email", value: profile?.["Email "] || profile?.["Basic Info - Email"] },
      { label: "Phone", value: profile?.["Phone"]?.toString() || profile?.["Basic Info - Phone"] },
      { label: "City", value: profile?.["City"] || profile?.["Basic Info - City"] },
      { label: "Gender", value: profile?.["Gender"] || profile?.["Basic Info - Gender"] },
      { label: "Age", value: profile?.["Age"]?.toString() || profile?.["Basic Info - Age"] },
      { label: "Height", value: profile?.["Height"] || profile?.["Basic Info - Height"] },
      { label: "Instagram", value: profile?.["Instagram"] },
    ],
  });

  const getMeasurements = (): ProfileSection => ({
    title: "Measurements",
    fields: [
      { label: "Chest", value: profile?.["Measurements - Chest"] },
      { label: "Waist", value: profile?.["Measurements - Waist"] },
      { label: "Hips", value: profile?.["Measurements - Hips"] },
      { label: "Shoe Size", value: profile?.["Measurements - Shoe"] },
      { label: "Hair Color", value: profile?.["Measurements - Hair Color"] },
      { label: "Hair Length", value: profile?.["Measurements - Hair Length"] },
      { label: "Eye Color", value: profile?.["Measurements - Eye Color"] },
    ],
  });

  const getSkills = (): ProfileSection => ({
    title: "Skills",
    fields: [
      { label: "Languages", value: profile?.["Skills - Languages"] },
      { label: "Acting", value: profile?.["Skills - Acting"] },
      { label: "Dancing", value: profile?.["Skills - Dancing"] },
      { label: "Singing", value: profile?.["Skills - Singing"] },
      { label: "Modeling", value: profile?.["Skills - Modeling"] },
      { label: "Other Skills", value: profile?.["Skills - Other Skills"] },
    ],
  });

  const getWorkPreferences = (): ProfileSection => ({
    title: "Work Preferences",
    fields: [
      { label: "Comfortable Shoots", value: profile?.["Work Preferences - Comfortable Shoots"] },
      { label: "Uncomfortable Shoots", value: profile?.["Work Preferences - Uncomfortable Shoots"] },
      { label: "Willing to Travel", value: profile?.["Work Preferences - Travel"] },
      { label: "Out of City Work", value: profile?.["Work Preferences - Out of City"] },
    ],
  });

  const getComfortConsent = (): ProfileSection => ({
    title: "Comfort & Consent",
    fields: [
      { label: "Swimwear", value: profile?.["Comfort - Swimwear"] },
      { label: "Lingerie", value: profile?.["Comfort - Lingerie"] },
      { label: "Ethnic Wear", value: profile?.["Comfort - Ethnic"] },
      { label: "Western Wear", value: profile?.["Comfort - Western"] },
      { label: "Hair Cut", value: profile?.["Comfort - Hair Cut"] },
      { label: "Hair Color", value: profile?.["Comfort - Hair Color"] },
      { label: "Bodypaint", value: profile?.["Comfort - Bodypaint"] },
      { label: "Tattoo", value: profile?.["Comfort - Tattoo"] },
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

  const renderSection = (section: ProfileSection) => {
    const hasValues = section.fields.some((f) => f.value);
    if (!hasValues) return null;

    return (
      <Card key={section.title}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">{section.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
            {section.fields.map((field) =>
              field.value ? (
                <div key={field.label} className="text-sm">
                  <dt className="text-muted-foreground font-medium">{field.label}</dt>
                  <dd className="mt-0.5">{field.value}</dd>
                </div>
              ) : null
            )}
          </dl>
        </CardContent>
      </Card>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {name || "Talent Profile"}
          </DialogTitle>
          <DialogDescription>
            Full details for the selected talent
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="text-center py-12 text-destructive">
            {error}
          </div>
        )}

        {profile && !isLoading && (
          <div className="space-y-4 mt-4">
            {/* Status and Manager badges */}
            <div className="flex flex-wrap gap-2">
              <Badge variant={profile["Status"] === "Onboarded" ? "success" : "secondary"}>
                {profile["Status"] || "New"}
              </Badge>
              {profile["Talent Manager"] && (
                <Badge variant="outline">
                  Manager: {profile["Talent Manager"]}
                </Badge>
              )}
            </div>

            {/* Basic Info */}
            {renderSection(getBasicInfo())}

            {/* Measurements */}
            {renderSection(getMeasurements())}

            {/* Skills */}
            {renderSection(getSkills())}

            {/* Work Preferences */}
            {renderSection(getWorkPreferences())}

            {/* Comfort & Consent */}
            {renderSection(getComfortConsent())}

            {/* Management Info */}
            {renderSection(getManagementInfo())}

            {/* Polaroids */}
            {getPolaroids().length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Polaroids</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {getPolaroids().map((polaroid, idx) => (
                      <a
                        key={idx}
                        href={polaroid.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="outline" size="sm">
                          <ExternalLink className="h-4 w-4 mr-1" />
                          {polaroid.label}
                        </Button>
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
