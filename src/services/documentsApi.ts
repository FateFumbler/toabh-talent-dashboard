const DOCS_API = 'https://script.google.com/macros/s/AKfycbzXNUhXgVRvOLKmwV1xOMSAjaiugYNSwnWWaJvuWDpRzzYYrQA-SSquN33M8ASwcYgZPw/exec';

export interface TalentDocuments {
  aadhaar: string[];
  pan: string[];
  passport: string[];
}

export interface DocumentUser {
  name: string;       // "Full Name" in UI
  email?: string;     // "Email" in UI
  aadhaar?: string[];
  pan?: string[];
  passport?: string[];
}

interface DocumentsAllResponse {
  documents?: DocumentUser[];
  error?: string;
}

export async function fetchAllDocuments(): Promise<DocumentUser[]> {
  const res = await fetch(`${DOCS_API}?action=documents_all`, { redirect: 'follow' });
  const text = await res.text();
  const data: DocumentsAllResponse = JSON.parse(text);
  if (data.error) throw new Error(data.error);
  return data.documents ?? [];
}
