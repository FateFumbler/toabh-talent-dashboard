import type { Talent, TalentProfile } from "../types/talent";

const API_URL = "https://script.google.com/macros/s/AKfycbyrHsfBPmcSb9YeAUKH9cQ0taILerK7VQ8kNjpI_OZvwSYgD2zw6Sh-xSgVKV40_bWIPQ/exec";

export async function fetchTalentMaster(): Promise<Talent[]> {
  try {
    const response = await fetch(`${API_URL}?action=talent-master`, {
      redirect: 'follow',
    });
    const data = await response.json();
    return data as Talent[];
  } catch (error) {
    console.error("Error fetching talent master:", error);
    throw error;
  }
}

export async function fetchTalentProfile(name: string): Promise<TalentProfile> {
  try {
    const response = await fetch(`${API_URL}?action=talent-profile&name=${encodeURIComponent(name)}`, {
      redirect: 'follow',
    });
    const data = await response.json();
    return data as TalentProfile;
  } catch (error) {
    console.error("Error fetching talent profile:", error);
    throw error;
  }
}

export async function updateStatus(row: number, status: string): Promise<void> {
  // Use mode: 'no-cors' because Apps Script Web Apps don't return proper CORS headers
  // for POST requests from cross-origin frontends (vercel.app → google.com).
  // With no-cors, we can't read the response, so we send data as URL params instead of body
  // and wait a fixed timeout to "assume" success.
  await fetch(`${API_URL}?action=update-status&row=${encodeURIComponent(row)}&status=${encodeURIComponent(status)}`, {
    method: 'POST',
    mode: 'no-cors',
  });
  // Wait 3 seconds for Apps Script to process (no-cors = opaque response)
  await new Promise((resolve) => setTimeout(resolve, 3000));
}

export async function assignManager(row: number, manager: string): Promise<void> {
  // Use mode: 'no-cors' because Apps Script Web Apps don't return proper CORS headers
  // for POST requests from cross-origin frontends (vercel.app → google.com).
  // With no-cors, we can't read the response, so we send data as URL params instead of body
  // and wait a fixed timeout to "assume" success.
  await fetch(`${API_URL}?action=assign-manager&row=${encodeURIComponent(row)}&manager=${encodeURIComponent(manager)}`, {
    method: 'POST',
    mode: 'no-cors',
  });
  // Wait 3 seconds for Apps Script to process (no-cors = opaque response)
  await new Promise((resolve) => setTimeout(resolve, 3000));
}
