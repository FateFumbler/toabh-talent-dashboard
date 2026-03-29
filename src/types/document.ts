export interface DocumentUser {
  fullName: string;
  email?: string;
  phone?: string;
  documents: {
    aadhaarFront?: string; // Google Drive link
    aadhaarBack?: string;  // Google Drive link
    pan?: string;          // Google Drive link
    passportFront?: string; // Google Drive link
    passportBack?: string; // Google Drive link
  };
  rowIndex?: number;
}

// Raw API response row from DOCUMENTS_DB
export interface DocumentApiRow {
  "Full Name"?: string;
  "Email"?: string;
  "Phone"?: string;
  "Aadhaar Front"?: string;
  "Aadhaar Back"?: string;
  "PAN"?: string;
  "Passport Front"?: string;
  "Passport Back"?: string;
  rowIndex?: number;
}
