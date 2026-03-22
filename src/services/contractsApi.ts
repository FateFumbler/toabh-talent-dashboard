import type { Contract } from '../types/contract';

const API_URL = 'https://script.google.com/macros/s/AKfycbx6WHG6jE3ZqQoa-1V4PoeWcwsDnv22ZXlEnIWB4F84ujg4lojZUretZ0gOYsdJGDF5EA/exec';

export async function fetchContracts(): Promise<Contract[]> {
  try {
    const response = await fetch(`${API_URL}?action=contracts`);
    const data = await response.json();
    // Mark sheet contracts with source: 'sheet'
    const contracts: Contract[] = (data.contracts || []).map((c: Contract) => ({
      ...c,
      source: 'sheet' as const,
    }));
    return contracts;
  } catch (error) {
    console.error('Failed to fetch contracts:', error);
    return [];
  }
}
