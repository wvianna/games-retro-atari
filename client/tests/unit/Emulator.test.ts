import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { launchEmulator, teardownEmulator } from '../../src/components/Emulator';
import type { RomInfo } from '../../src/services/romApi';

const mockRom: RomInfo = {
  id:          'Pitfall+%281982%29.bin',
  title:       'Pitfall!',
  year:        1982,
  publisher:   'Activision',
  region:      'NTSC',
  isPrototype: false,
  isHack:      false,
  filename:    'Pitfall! (1982) (Activision).bin',
};

describe('launchEmulator', () => {
  let container: HTMLDivElement;
  let scriptSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    // Prevent real script loading
    scriptSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
  });

  afterEach(() => {
    scriptSpy.mockRestore();
    document.body.removeChild(container);
    teardownEmulator(container);
  });

  test('sets EJS_width to 800 and EJS_height to 600', () => {
    launchEmulator(mockRom, container);
    expect(window.EJS_width).toBe(800);
    expect(window.EJS_height).toBe(600);
  });

  test('sets EJS_volume from volume param (default 80 → 0.8)', () => {
    launchEmulator(mockRom, container, 80);
    expect(window.EJS_volume).toBeCloseTo(0.8);
  });

  test('sets EJS_volume to 0 when muted=true regardless of volume', () => {
    launchEmulator(mockRom, container, 75, true);
    expect(window.EJS_volume).toBe(0);
    expect(window.EJS_muted).toBe(true);
  });

  test('sets EJS_muted to false when not muted', () => {
    launchEmulator(mockRom, container, 80, false);
    expect(window.EJS_muted).toBe(false);
  });

  test('sets EJS_core to atari2600', () => {
    launchEmulator(mockRom, container);
    expect(window.EJS_core).toBe('atari2600');
  });
});

describe('teardownEmulator', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
    launchEmulator(mockRom, container);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (container.parentNode) document.body.removeChild(container);
  });

  test('deletes EJS_volume global', () => {
    teardownEmulator(container);
    expect(window.EJS_volume).toBeUndefined();
  });

  test('deletes EJS_width and EJS_height globals', () => {
    teardownEmulator(container);
    expect(window.EJS_width).toBeUndefined();
    expect(window.EJS_height).toBeUndefined();
  });

  test('deletes EJS_muted global', () => {
    teardownEmulator(container);
    expect(window.EJS_muted).toBeUndefined();
  });

  test('clears container innerHTML', () => {
    teardownEmulator(container);
    expect(container.innerHTML).toBe('');
  });
});
