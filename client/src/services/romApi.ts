export interface RomInfo {
  id: string;
  title: string;
  year: number | null;
  publisher: string;
  region: 'NTSC' | 'PAL' | 'SECAM';
  isPrototype: boolean;
  isHack: boolean;
  filename: string;
}

export async function fetchCatalogue(): Promise<RomInfo[]> {
  const res = await fetch('/api/roms');
  if (!res.ok) throw new Error(`Failed to fetch catalogue: ${res.status}`);
  const data = await res.json();
  return data.roms as RomInfo[];
}

export function getRomUrl(id: string): string {
  return `/api/roms/${encodeURIComponent(id)}`;
}
