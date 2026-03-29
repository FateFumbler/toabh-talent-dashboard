export interface DocumentUser {
  fullName: string;
  email?: string;
  phone?: string;
  documents: {
    aadhaar?: string; // Google Drive link
    pan?: string;     // Google Drive link
    passport?: string; // Google Drive link
  };
  rowIndex?: number;
}
