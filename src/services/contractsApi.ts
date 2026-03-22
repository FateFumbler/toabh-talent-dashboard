const API_URL = 'https://script.google.com/macros/s/AKfycbyrHsfBPmcSb9YeAUKH9cQ0taILerK7VQ8kNjpI_OZvwSYgD2zw6Sh-xSgVKV40_bWIPQ/exec';

export async function fetchContracts(): Promise<any[]> {
  try {
    const response = await fetch(`${API_URL}?action=contracts`);
    const data = await response.json();
    return data.contracts || [];
  } catch (error) {
    console.error('Failed to fetch contracts:', error);
    return [];
  }
}

export async function addContract(contract: {
  fullName: string;
  email: string;
  phone: string;
  driveLink: string;
  talentName: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const formData = new FormData();
    formData.append('action', 'add-contract');
    formData.append('fullName', contract.fullName);
    formData.append('email', contract.email);
    formData.append('phone', contract.phone);
    formData.append('driveLink', contract.driveLink);
    formData.append('talentName', contract.talentName);

    const response = await fetch(API_URL, {
      method: 'POST',
      body: formData,
    });
    return await response.json();
  } catch (error) {
    console.error('Failed to add contract:', error);
    return { success: false, error: 'Network error' };
  }
}
