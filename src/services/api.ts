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

export async function updateStatus(row: number, status: string): Promise<{ result: string }> {
  try {
    const response = await fetch(`${API_URL}?action=update-status`, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ row, status }),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error updating status:", error);
    throw error;
  }
}

export async function assignManager(row: number, manager: string): Promise<{ result: string }> {
  try {
    const response = await fetch(`${API_URL}?action=assign-manager`, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ row, manager }),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error assigning manager:", error);
    throw error;
  }
}
