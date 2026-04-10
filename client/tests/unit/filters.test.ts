import { applyFilters } from '../../src/components/filters';
import type { RomInfo } from '../../src/services/romApi';

const mkRom = (overrides: Partial<RomInfo> = {}): RomInfo => ({
  id:          'Test+Game+%281982%29.bin',
  title:       'Test Game',
  year:        1982,
  publisher:   'Activision',
  region:      'NTSC',
  isPrototype: false,
  isHack:      false,
  filename:    'Test Game (1982).bin',
  ...overrides,
});

describe('applyFilters', () => {
  const roms: RomInfo[] = [
    mkRom({ title: 'Pitfall!',          year: 1982, region: 'NTSC', publisher: 'Activision' }),
    mkRom({ title: 'River Raid',        year: 1982, region: 'NTSC', publisher: 'Activision' }),
    mkRom({ title: 'Pac-Man',           year: 1982, region: 'PAL',  publisher: 'Atari'      }),
    mkRom({ title: 'Frogger Prototype', year: 1982, region: 'NTSC', isPrototype: true       }),
    mkRom({ title: 'Frogger Hack',      year: 1983, region: 'NTSC', isHack: true            }),
    mkRom({ title: 'Combat',            year: 1977, region: 'NTSC'                          }),
    mkRom({ title: 'Crystal Castles',   year: 1984, region: 'NTSC'                          }),
  ];

  const baseFilter = {
    query: '', region: '', yearRange: '', hideHacks: false, hideProtos: false,
  };

  test('no filters → returns all roms', () => {
    expect(applyFilters(roms, baseFilter)).toHaveLength(roms.length);
  });

  test('query filters by title (case-insensitive)', () => {
    const result = applyFilters(roms, { ...baseFilter, query: 'pitfall' });
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Pitfall!');
  });

  test('region filter keeps only matching region', () => {
    const result = applyFilters(roms, { ...baseFilter, region: 'PAL' });
    expect(result.every((r) => r.region === 'PAL')).toBe(true);
  });

  test('hideHacks removes hacked roms', () => {
    const result = applyFilters(roms, { ...baseFilter, hideHacks: true });
    expect(result.some((r) => r.isHack)).toBe(false);
  });

  test('hideProtos removes prototypes', () => {
    const result = applyFilters(roms, { ...baseFilter, hideProtos: true });
    expect(result.some((r) => r.isPrototype)).toBe(false);
  });

  test('yearRange "1977-1979" keeps only 1977 roms', () => {
    const result = applyFilters(roms, { ...baseFilter, yearRange: '1977-1979' });
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Combat');
  });

  test('yearRange "1983-1985" keeps 1983 and 1984 roms', () => {
    const result = applyFilters(roms, { ...baseFilter, yearRange: '1983-1985' });
    expect(result.map((r) => r.title)).toEqual(
      expect.arrayContaining(['Frogger Hack', 'Crystal Castles'])
    );
    expect(result).toHaveLength(2);
  });

  test('combined query + region', () => {
    const result = applyFilters(roms, { ...baseFilter, query: 'pac', region: 'PAL' });
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Pac-Man');
  });

  test('rom with null year is excluded by yearRange filter', () => {
    const nullYear = mkRom({ title: 'Unknown Game', year: null });
    const result = applyFilters([...roms, nullYear], { ...baseFilter, yearRange: '1980-1982' });
    expect(result.some((r) => r.title === 'Unknown Game')).toBe(false);
  });
});
