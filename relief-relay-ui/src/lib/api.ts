import type { IntakeResponse, CasesResponse, Case } from "./types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function submitIntake(
  image?: File,
  voiceText?: string,
  manualText?: string,
): Promise<IntakeResponse> {
  const form = new FormData();
  if (image) form.append("image", image);
  if (voiceText) form.append("voice_text", voiceText);
  if (manualText) form.append("manual_text", manualText);

  const res = await fetch(`${API}/intake`, { method: "POST", body: form });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchCases(limit = 50): Promise<CasesResponse> {
  const res = await fetch(`${API}/cases?limit=${limit}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchCase(caseId: string): Promise<Case> {
  const res = await fetch(`${API}/cases/${caseId}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function getPdfUrl(caseId: string) {
  return `${API}/export/${caseId}/pdf`;
}
