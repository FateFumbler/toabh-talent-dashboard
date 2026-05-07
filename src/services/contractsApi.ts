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
    const raw = Array.isArray(data.contracts) ? data.contracts : [];

    const contracts: Contract[] = raw.map((c: Contract, index: number) => ({
      ...c,
      source: 'sheet' as const,
      rowNumber: c.rowNumber ?? index + 1,
    }));

    return contracts.sort((a, b) => (b.rowNumber ?? 0) - (a.rowNumber ?? 0));
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
