import type { Talent, TalentProfile, TalentDetails } from "../types/talent";

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

export async function fetchTalentDetails(): Promise<TalentDetails[]> {
  try {
    const response = await fetch(`${API_URL}?action=talent-details`, {
      redirect: 'follow',
    });
    const text = await response.text();
    return JSON.parse(text) as TalentDetails[];
  } catch (error) {
    console.error("Error fetching talent details:", error);
    throw error;
  }
}

export async function updateStatus(row: number, status: string): Promise<void> {
  const formData = new URLSearchParams();
  formData.append('action', 'update-status');
  formData.append('row', String(row));
  formData.append('status', status);

  await fetch(API_URL, {
    method: 'POST',
    redirect: 'follow',
    body: formData,
  });
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
