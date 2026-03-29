import type { DocumentUser, DocumentApiRow } from '../types/document';

const API_URL = 'https://script.google.com/macros/s/AKfycbx6WHG6jE3ZqQoa-1V4PoeWcwsDnv22ZXlEnIWB4F84ujg4lojZUretZ0gOYsdJGDF5EA/exec';
const CACHE_KEY = 'toabh_documents_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  data: DocumentUser[];
  timestamp: number;
}

function getCachedData(): DocumentUser[] | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const entry: CacheEntry = JSON.parse(cached);
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

function setCachedData(data: DocumentUser[]): void {
  try {
    const entry: CacheEntry = { data, timestamp: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // localStorage full or unavailable
  }
}

// Map raw API row to DocumentUser
function mapApiRowToDocumentUser(row: DocumentApiRow): DocumentUser {
  return {
    fullName: row["Full Name"]?.trim() || 'Unknown',
    email: row["Email"]?.trim() || undefined,
    phone: row["Phone"]?.toString()?.trim() || undefined,
    documents: {
      aadhaarFront: row["Aadhaar Front"]?.trim() || undefined,
      aadhaarBack: row["Aadhaar Back"]?.trim() || undefined,
      pan: row["PAN"]?.trim() || undefined,
      passportFront: row["Passport Front"]?.trim() || undefined,
      passportBack: row["Passport Back"]?.trim() || undefined,
    },
    rowIndex: row.rowIndex,
  };
}

export async function fetchDocuments(): Promise<DocumentUser[]> {
  // Return cached data if available
  const cached = getCachedData();
  if (cached) return cached;

  try {
    const response = await fetch(`${API_URL}?action=documents`);
    const data = await response.json();
    
    // Handle API error response
    if (data.error) {
      console.warn('Documents API error:', data.error);
      return [];
    }
    
    // Handle { documents: [...] } format
    let rows: DocumentApiRow[] = [];
    if (Array.isArray(data.documents)) {
      rows = data.documents;
    } else if (Array.isArray(data)) {
      // Handle direct array response
      rows = data;
    }
    
    // Map all rows to DocumentUser, no skipping
    const documents: DocumentUser[] = rows
      .filter((row) => row && (row["Full Name"] || row["Email"] || row["Phone"]))
      .map(mapApiRowToDocumentUser);
    
    setCachedData(documents);
    return documents;
  } catch (error) {
    console.error('Failed to fetch documents:', error);
    return [];
  }
}
