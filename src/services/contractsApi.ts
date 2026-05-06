import type { Contract } from '../types/contract';

const API_URL = 'https://script.google.com/macros/s/AKfycbzXNUhXgVRvOLKmwV1xOMSAjaiugYNSwnWWaJvuWDpRzzYYrQA-SSquN33M8ASwcYgZPw/exec';

interface ResendContractResponse {
  success: boolean;
  message?: string;
  error?: string;
  rowNumber?: number;
  requestId?: string;
  version?: string;
}

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

export async function resendContract(email: string): Promise<ResendContractResponse> {
  try {
    const response = await fetch(`${API_URL}?action=resend-contract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();
    return data as ResendContractResponse;
  } catch (error) {
    console.error('Failed to resend contract:', error);
    return { success: false, error: 'Network error' };
  }
}
