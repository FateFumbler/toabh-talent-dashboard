import type { DocumentUser } from '../types/document';

const API_URL = 'DOCUMENTS_API_URL_PLACEHOLDER';
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

export async function fetchDocuments(): Promise<DocumentUser[]> {
  // Return cached data if available
  const cached = getCachedData();
  if (cached) return cached;

  try {
    const response = await fetch(`${API_URL}?action=documents`);
    const data = await response.json();
    const documents: DocumentUser[] = data.documents || [];
    setCachedData(documents);
    return documents;
  } catch (error) {
    console.error('Failed to fetch documents:', error);
    return [];
  }
}
