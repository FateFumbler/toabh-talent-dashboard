import type { Talent, TalentProfile, TalentDetails } from "../types/talent";

const API_URL = "https://script.google.com/macros/s/AKfycbxZlFw4rsk8ZYPIcKTMJq4U0Amls-lzpG07LxafUPsyvATKYT8jfIhlC0JgInHby6yRNg/exec";

// Cache config
const CACHE_PREFIX = `toabh_cache_`;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(apiUrl: string): string {
  // Use last 20 chars of URL as key to differentiate dev vs prod
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

// Talent_Details sheet column indices (0-based)
const FIELDS = {
  TIMESTAMP: 0,
  EMAIL: 1,
  FULL_NAME: 2,
  GENDER: 3,
  AGE: 4,
  DOB: 5,
  NATIONALITY: 6,
  HOME_TOWN: 7,
  CITY: 8,
  PHONE: 9,
  ADDITIONAL_PHONE: 10,
  INSTAGRAM: 11,
  YOUTUBE: 12,
  IMDB: 13,
  HEIGHT: 14,
  CHEST: 15,
  WAIST: 16,
  HIPS: 17,
  SHOE_SIZE: 18,
  HAIR_COLOR: 19,
  EYE_COLOR: 20,
  SKIN_TONE: 21,
  TATTOOS: 22,
  PRIOR_EXPERIENCE: 23,
  EXPERIENCE_DETAILS: 24,
  PREVIOUS_AGENCY: 25,
  CURRENT_CONTRACTS: 26,
  ACTING_WORKSHOPS: 27,
  CINTAA_CARD: 28,
  DRIVE_2_WHEELER: 29,
  DRIVE_4_WHEELER: 30,
  SWIM: 31,
  GAMER: 32,
  SCOPE_OF_WORK: 33,
  PLACEMENT_ABROAD: 34,
  PASSPORT: 35,
  LANGUAGES: 36,
  DANCE: 37,
  EXTRA_CURRICULAR: 38,
  COMFORT_LINGERIE: 39,
  COMFORT_BOLD: 40,
  COMFORT_CONDOM: 41,
  COMFORT_ALCOHOL: 42,
  COMFORT_REALITY_TV: 43,
  COMFORT_DAILY_SOAPS: 44,
  COMFORT_PARENT_ROLES: 45,
  COMFORT_HAIRCUT: 46,
  COMFORT_HAIRCOLOR: 47,
  POLAROIDS: 48,
};

// Convert raw array row to object with proper keys
function mapProfileData(row: any[]): Record<string, any> {
  if (!Array.isArray(row)) return {};
  return {
    'Timestamp': row[FIELDS.TIMESTAMP],
    'Email Address': row[FIELDS.EMAIL],
    'Full Name': row[FIELDS.FULL_NAME],
    'Gender': row[FIELDS.GENDER],
    'Age': row[FIELDS.AGE],
    'Date of Birth': row[FIELDS.DOB],
    'Nationality': row[FIELDS.NATIONALITY],
    'Home Town': row[FIELDS.HOME_TOWN],
    'City & State': row[FIELDS.CITY],
    'Phone Number': row[FIELDS.PHONE],
    'Additional Phone': row[FIELDS.ADDITIONAL_PHONE],
    'Instagram Link': row[FIELDS.INSTAGRAM],
    'YouTube Channel': row[FIELDS.YOUTUBE],
    'IMDb': row[FIELDS.IMDB],
    'Height (in feet & inches)': row[FIELDS.HEIGHT],
    'Chest/Bust (in inches)': row[FIELDS.CHEST],
    'Waist (in inches)': row[FIELDS.WAIST],
    'Hips (in inches)': row[FIELDS.HIPS],
    'Shoe Size (UK)': row[FIELDS.SHOE_SIZE],
    'Hair Color': row[FIELDS.HAIR_COLOR],
    'Eye Color': row[FIELDS.EYE_COLOR],
    'Skin Tone': row[FIELDS.SKIN_TONE],
    'Any Tattoos?': row[FIELDS.TATTOOS],
    'Prior modelling/acting experience': row[FIELDS.PRIOR_EXPERIENCE],
    'Experience Details': row[FIELDS.EXPERIENCE_DETAILS],
    'Previous Agency': row[FIELDS.PREVIOUS_AGENCY],
    'Current Contracts': row[FIELDS.CURRENT_CONTRACTS],
    'Acting Workshop Attended': row[FIELDS.ACTING_WORKSHOPS],
    'CINTAA/Union Card': row[FIELDS.CINTAA_CARD],
    'Can drive 2-wheeler': row[FIELDS.DRIVE_2_WHEELER],
    'Can drive 4-wheeler': row[FIELDS.DRIVE_4_WHEELER],
    'Can Swim': row[FIELDS.SWIM],
    'Gamer': row[FIELDS.GAMER],
    'Scope of Work Interested In': row[FIELDS.SCOPE_OF_WORK],
    'Open for placement abroad': row[FIELDS.PLACEMENT_ABROAD],
    'Valid Passport': row[FIELDS.PASSPORT],
    'Languages Known': row[FIELDS.LANGUAGES],
    'Dance Forms': row[FIELDS.DANCE],
    'Extra-Curricular': row[FIELDS.EXTRA_CURRICULAR],
    'Lingerie/bikini shoots': row[FIELDS.COMFORT_LINGERIE],
    'Bold content for web/films': row[FIELDS.COMFORT_BOLD],
    'Condom brand promotions': row[FIELDS.COMFORT_CONDOM],
    'Alcohol brand shoots': row[FIELDS.COMFORT_ALCOHOL],
    'Reality TV shows': row[FIELDS.COMFORT_REALITY_TV],
    'Daily soaps': row[FIELDS.COMFORT_DAILY_SOAPS],
    'Mother/father roles': row[FIELDS.COMFORT_PARENT_ROLES],
    'Haircut': row[FIELDS.COMFORT_HAIRCUT],
    'Hair color changes': row[FIELDS.COMFORT_HAIRCOLOR],
    'Upload Polaroids (Required)': row[FIELDS.POLAROIDS],
  };
}

export async function fetchTalentMaster(): Promise<Talent[]> {
  const cacheKey = getCacheKey(`${API_URL}?action=talent-master`);

  // Check cache first
  const cached = getCachedData<Talent[]>(cacheKey);
  if (cached) {
    // Return cached data immediately, but refresh in background
    fetch(`${API_URL}?action=talent-master`, { redirect: 'follow' })
      .then(res => res.json())
      .then(data => setCachedData(cacheKey, data as Talent[]))
      .catch(() => {}); // Silent fail
    return cached;
  }

  // No cache - fetch fresh
  try {
    const response = await fetch(`${API_URL}?action=talent-master`, {
      redirect: 'follow',
    });
    const data = await response.json();
    setCachedData(cacheKey, data as Talent[]);
    return data as Talent[];
  } catch (error) {
    console.error("Error fetching talent master:", error);
    throw error;
  }
}

export async function fetchTalentProfile(name: string): Promise<TalentProfile> {
  const cacheKey = getCacheKey(`${API_URL}?action=talent-profile&name=${name}`);

  // Check cache first
  const cached = getCachedData<TalentProfile>(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(`${API_URL}?action=talent-profile&name=${encodeURIComponent(name)}`, {
      redirect: 'follow',
    });
    const data = await response.json();
    setCachedData(cacheKey, data as TalentProfile);
    return data as TalentProfile;
  } catch (error) {
    console.error("Error fetching talent profile:", error);
    throw error;
  }
}

export async function fetchTalentDetails(): Promise<TalentDetails[]> {
  const cacheKey = getCacheKey(`${API_URL}?action=talent-details`);

  // Check cache first
  const cached = getCachedData<TalentDetails[]>(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(`${API_URL}?action=talent-details`, {
      redirect: 'follow',
    });
    const text = await response.text();
    const rawData = JSON.parse(text);

    // The API returns a flat array of values per row, not key-value objects
    // We need to check if data is already mapped (has "Email Address" key) or needs mapping
    let result: TalentDetails[] = rawData;
    if (Array.isArray(rawData) && rawData.length > 0) {
      // Check if first row is an array of values (needs mapping) or array of objects (already mapped)
      if (Array.isArray(rawData[0])) {
        // rawData is [[val1, val2, ...], [val1, val2, ...], ...]
        // Map each row array to an object with proper keys
        result = rawData.map(row => mapProfileData(row)) as TalentDetails[];
      } else if (typeof rawData[0] === 'object' && rawData[0] !== null) {
        // Already mapped as array of objects
        result = rawData as TalentDetails[];
      }
    }

    setCachedData(cacheKey, result);
    return result;
  } catch (error) {
    console.error("Error fetching talent details:", error);
    throw error;
  }
}

export async function updateStatus(row: number, status: string): Promise<void> {
  if (typeof row !== 'number' || isNaN(row) || row < 1) {
    throw new Error(`Invalid row number: ${row}`);
  }
  
  const formData = new URLSearchParams();
  formData.append('action', 'update-status');
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

export async function assignManager(row: number, manager: string): Promise<void> {
  const formData = new URLSearchParams();
  formData.append('action', 'assign-manager');
  formData.append('row', String(row));
  formData.append('manager', manager);

  await fetch(API_URL, {
    method: 'POST',
    redirect: 'follow',
    body: formData,
  });
}
