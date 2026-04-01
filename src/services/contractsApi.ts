import type { Contract } from '../types/contract';

const API_URL = 'https://script.google.com/macros/s/AKfycbzXNUhXgVRvOLKmwV1xOMSAjaiugYNSwnWWaJvuWDpRzzYYrQA-SSquN33M8ASwcYgZPw/exec';

export async function fetchContracts(): Promise<Contract[]> {
  try {
    const response = await fetch(`${API_URL}?action=contracts`);
    const data = await response.json();
    // Mark sheet contracts with source: 'sheet' and implicit rowIndex
    // Reverse so last row from data source appears first (Ainesh's requirement)
    const raw = data.contracts || [];
    const contracts: Contract[] = raw.reverse().map((c: Contract, i: number) => ({
      ...c,
      source: 'sheet' as const,
      rowIndex: i + 1,
    }));
    return contracts;
  } catch (error) {
    console.error('Failed to fetch contracts:', error);
    return [];
  }
}
