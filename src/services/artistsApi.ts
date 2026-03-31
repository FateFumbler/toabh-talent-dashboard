import type { Artist } from "../types/artist";

// TODO: Replace with Artist Master Sheet URL once Ainesh provides it
const API_URL = "https://script.google.com/macros/s/AKfycbxyBfw7eCBQUZ8wW3sT417zKHL5Y243ikMAvKhfCagmICxc06Om49P6OQ3MfyTcvfP6/exec";

// Cache config
const CACHE_PREFIX = `toabh_artist_cache_`;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(apiUrl: string): string {
  return `${CACHE_PREFIX}${apiUrl.slice(-20)}`;
}

interface CachedData<T> {
  data: T;
  timestamp: number;
}

function getCachedData<T>(key: string): T | null {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    const parsed: CachedData<T> = JSON.parse(cached);
    const isExpired = Date.now() - parsed.timestamp > CACHE_TTL;
    if (isExpired) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function setCachedData<T>(key: string, data: T): void {
  try {
    const cacheEntry: CachedData<T> = { data, timestamp: Date.now() };
    localStorage.setItem(key, JSON.stringify(cacheEntry));
  } catch {
    // Silent fail - cache errors shouldn't break the app
  }
}

export async function fetchArtistMaster(forceRefresh = false): Promise<Artist[]> {
  const cacheKey = getCacheKey(`${API_URL}?action=artist-master`);

  if (!forceRefresh) {
    const cached = getCachedData<Artist[]>(cacheKey);
    if (cached) {
      fetch(`${API_URL}?action=artist-master`, { redirect: 'follow' })
        .then(res => res.json())
        .then(data => setCachedData(cacheKey, data as Artist[]))
        .catch(() => {});
      return cached;
    }
  } else {
    localStorage.removeItem(cacheKey);
  }

  try {
    const response = await fetch(`${API_URL}?action=artist-master`, {
      redirect: 'follow',
    });
    const data = await response.json();
    setCachedData(cacheKey, data as Artist[]);
    return data as Artist[];
  } catch (error) {
    console.error("Error fetching artist master:", error);
    throw error;
  }
}

export async function updateArtistStatus(row: number, status: string): Promise<void> {
  if (typeof row !== 'number' || isNaN(row) || row < 1) {
    throw new Error(`Invalid row number: ${row}`);
  }

  const formData = new URLSearchParams();
  formData.append('action', 'update-artist-status');
  formData.append('row', String(row));
  formData.append('status', status);

  const response = await fetch(API_URL, {
    method: 'POST',
    redirect: 'follow',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
}

export async function assignArtistManager(row: number, manager: string): Promise<void> {
  const formData = new URLSearchParams();
  formData.append('action', 'assign-artist-manager');
  formData.append('row', String(row));
  formData.append('manager', manager);

  await fetch(API_URL, {
    method: 'POST',
    redirect: 'follow',
    body: formData,
  });
}

export async function fetchArtistManagers(): Promise<string[]> {
  try {
    const response = await fetch(`${API_URL}?action=getArtistManagers`, {
      redirect: 'follow',
    });
    const data = await response.json();
    return data.managers || [];
  } catch (error) {
    console.log("Failed to fetch artist managers from API:", error);
    return [];
  }
}
