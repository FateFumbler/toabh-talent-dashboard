import type { Contract } from '../types/contract';

const LOCAL_CONTRACTS_KEY = 'toabh_local_contracts';

export function getLocalContracts(): Contract[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(LOCAL_CONTRACTS_KEY);
  return data ? JSON.parse(data) : [];
}

export function addLocalContract(contract: Omit<Contract, 'id' | 'source' | 'createdAt'>): Contract {
  const contracts = getLocalContracts();
  const newContract: Contract = {
    ...contract,
    id: crypto.randomUUID(),
    source: 'local',
    createdAt: new Date().toISOString(),
  };
  contracts.push(newContract);
  localStorage.setItem(LOCAL_CONTRACTS_KEY, JSON.stringify(contracts));
  return newContract;
}

export function deleteLocalContract(id: string): void {
  const contracts = getLocalContracts();
  const filtered = contracts.filter(c => c.id !== id);
  localStorage.setItem(LOCAL_CONTRACTS_KEY, JSON.stringify(filtered));
}

export function editContract(id: string, updates: Partial<Contract>): Contract[] {
  const contracts = getLocalContracts();
  const updated = contracts.map(c => c.id === id ? { ...c, ...updates } : c);
  localStorage.setItem(LOCAL_CONTRACTS_KEY, JSON.stringify(updated));
  return updated;
}

export function clearLocalContracts(): void {
  localStorage.removeItem(LOCAL_CONTRACTS_KEY);
}
