export interface Artist {
  "Full Name": string;
  "Category": string;
  "Gender": string;
  "Age": string;
  "Location": string;
  "Phone": number | string;
  "Email": string;
  "Instagram": string;
  "IMDB": string;
  "Work": string;
  "Portfolio": string;
  "Status": string;
  "Manager": string;
  "Notes": string;
  "rowIndex": number;
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
