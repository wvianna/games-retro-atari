import { parseRomName, slugify } from '../src/romParser.js';

describe('parseRomName', () => {
  test('parses a standard NTSC rom with year and publisher', () => {
    const result = parseRomName('River Raid (1982) (Activision, Carol Shaw) (AX-020) ~.bin');
    expect(result.title).toBe('River Raid');
    expect(result.year).toBe(1982);
    expect(result.publisher).toBe('Activision');
    expect(result.region).toBe('NTSC');
    expect(result.isPrototype).toBe(false);
    expect(result.isHack).toBe(false);
  });

  test('parses a PAL rom', () => {
    const { region } = parseRomName('Pac-Man (1982) (Atari, Tod Frye) (CX2646) (PAL).bin');
    expect(region).toBe('PAL');
  });

  test('detects Prototype flag', () => {
    const { isPrototype } = parseRomName(
      'Sinistar (02-13-1984) (Atari, Lou Harp) (CX26122) (Prototype) ~.bin'
    );
    expect(isPrototype).toBe(true);
  });

  test('detects Hack flag', () => {
    const { isHack } = parseRomName(
      'Chopper Command (Hack) (2600 Screen Search Console).bin'
    );
    expect(isHack).toBe(true);
  });

  test('handles rom without year gracefully', () => {
    const { year } = parseRomName('Unknown Game.bin');
    expect(year).toBeNull();
  });

  test('strips .bin extension from stored filename', () => {
    const { filename } = parseRomName('Pitfall! (1982) (Activision).bin');
    expect(filename).toMatch(/\.bin$/);
  });

  test('parses a rom with SECAM region', () => {
    const { region } = parseRomName(
      'MegaMania (1982) (Activision, Steve Cartwright) (EAX-017) (SECAM).bin'
    );
    expect(region).toBe('SECAM');
  });

  test('parses year from dated prototypes like 02-13-1984', () => {
    const { year } = parseRomName(
      'Sinistar (02-13-1984) (Atari) (Prototype) ~.bin'
    );
    expect(year).toBe(1984);
  });
});

describe('slugify', () => {
  test('converts title to lowercase hyphenated slug', () => {
    expect(slugify('River Raid')).toBe('river-raid');
  });

  test('removes special characters', () => {
    expect(slugify("Yars' Revenge")).toBe('yars-revenge');
  });

  test('collapses multiple spaces', () => {
    expect(slugify('A  Game')).toBe('a-game');
  });
});
