import type { Contract } from '../types/contract';

const API_URL = 'https://script.google.com/macros/s/AKfycbxZlFw4rsk8ZYPIcKTMJq4U0Amls-lzpG07LxafUPsyvATKYT8jfIhlC0JgInHby6yRNg/exec';

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
