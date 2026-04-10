import type { RomInfo } from '../services/romApi.js';

export interface FilterState {
  query: string;
  region: string;
  yearRange: string;
  hideHacks: boolean;
  hideProtos: boolean;
}

export function applyFilters(roms: RomInfo[], f: FilterState): RomInfo[] {
  const q = f.query.toLowerCase().trim();
  return roms.filter((rom) => {
    if (q && !rom.title.toLowerCase().includes(q)) return false;
    if (f.region && rom.region !== f.region) return false;
    if (f.hideHacks && rom.isHack) return false;
    if (f.hideProtos && rom.isPrototype) return false;
    if (f.yearRange) {
      const [from, to] = f.yearRange.split('-').map(Number);
      if (rom.year === null || rom.year < from || rom.year > to) return false;
    }
    return true;
  });
}
