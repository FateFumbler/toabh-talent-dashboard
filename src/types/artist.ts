export interface Artist {
  "Full Name": string;
  "Talent Category": string;
  "Gender": string;
  "Age": string;
  "City & State (Current location)": string;
  "Phone Number": number | string;
  "Email": string;
  "Instagram Link": string;
  "IMDB (If Available)": string;
  "Notable Projects (Brand/Film/Campaings)": string;
  "Portfolio / Work Images": string;
  "Status ": string;
  "Talent Manager": string;
  "Notes": string;
  "rowIndex": number;
  // Allow additional API fields
  [key: string]: string | number;
}

export type ArtistStatusValue = "New" | "Meeting Required" | "KYC Required" | "Onboarded" | "Rejected";

export const ARTIST_STATUS_VALUES: ArtistStatusValue[] = [
  "New",
  "Meeting Required",
  "KYC Required",
  "Onboarded",
  "Rejected",
];

export const ARTIST_MANAGERS = ["Aryan", "Saloni Kale", "Jhalak", "Prashant", "Anvitha", "Khadija"];

export const ARTIST_ACTION_STATUSES: ArtistStatusValue[] = [
  "Meeting Required",
  "KYC Required",
  "Onboarded",
  "Rejected",
];
