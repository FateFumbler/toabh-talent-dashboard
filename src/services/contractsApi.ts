import type { Contract } from '../types/contract';

const API_URL = 'https://script.google.com/macros/s/AKfycbx6WHG6jE3ZqQoa-1V4PoeWcwsDnv22ZXlEnIWB4F84ujg4lojZUretZ0gOYsdJGDF5EA/exec';

export async function fetchContracts(): Promise<Contract[]> {
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
  name: string;
  email: string;
  phone: string;
  contractLink: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const formData = new FormData();
    formData.append('action', 'add-contract');
    formData.append('name', contract.name);
    formData.append('email', contract.email);
    formData.append('phone', contract.phone);
    formData.append('contractLink', contract.contractLink);

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
