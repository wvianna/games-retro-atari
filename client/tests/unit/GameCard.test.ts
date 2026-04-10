import { createGameCard } from '../../src/components/GameCard';
import type { RomInfo } from '../../src/services/romApi';

const mockRom: RomInfo = {
  id:            'River+Raid+%281982%29.bin',
  title:         'River Raid',
  year:          1982,
  publisher:     'Activision',
  region:        'NTSC',
  isPrototype:   false,
  isHack:        false,
  filename:      'River Raid (1982) (Activision).bin',
};

describe('createGameCard', () => {
  test('renders the game title', () => {
    const card = createGameCard({ rom: mockRom, onPlay: () => {} });
    expect(card.querySelector('.card-title')?.textContent).toBe('River Raid');
  });

  test('renders year badge', () => {
    const card = createGameCard({ rom: mockRom, onPlay: () => {} });
    const badges = Array.from(card.querySelectorAll('.badge'));
    expect(badges.some((b) => b.textContent === '1982')).toBe(true);
  });

  test('renders publisher badge', () => {
    const card = createGameCard({ rom: mockRom, onPlay: () => {} });
    const badges = Array.from(card.querySelectorAll('.badge'));
    expect(badges.some((b) => b.textContent === 'Activision')).toBe(true);
  });

  test('does NOT show PAL badge for NTSC rom', () => {
    const card = createGameCard({ rom: mockRom, onPlay: () => {} });
    const badges = Array.from(card.querySelectorAll('.badge'));
    expect(badges.some((b) => b.textContent === 'NTSC')).toBe(false);
  });

  test('shows PAL badge for PAL rom', () => {
    const card = createGameCard({
      rom: { ...mockRom, region: 'PAL' },
      onPlay: () => {},
    });
    const badges = Array.from(card.querySelectorAll('.badge'));
    expect(badges.some((b) => b.textContent === 'PAL')).toBe(true);
  });

  test('shows PROTO badge for prototype', () => {
    const card = createGameCard({
      rom: { ...mockRom, isPrototype: true },
      onPlay: () => {},
    });
    expect(card.querySelector('.badge-proto')?.textContent).toBe('PROTO');
  });

  test('shows HACK badge for hack', () => {
    const card = createGameCard({
      rom: { ...mockRom, isHack: true },
      onPlay: () => {},
    });
    expect(card.querySelector('.badge-hack')?.textContent).toBe('HACK');
  });

  test('calls onPlay when PLAY button is clicked', () => {
    const onPlay = vi.fn();
    const card = createGameCard({ rom: mockRom, onPlay });
    (card.querySelector('.card-play-btn') as HTMLButtonElement).click();
    expect(onPlay).toHaveBeenCalledWith(mockRom);
  });

  test('calls onPlay when card itself is clicked', () => {
    const onPlay = vi.fn();
    const card = createGameCard({ rom: mockRom, onPlay });
    card.click();
    expect(onPlay).toHaveBeenCalledOnce();
  });

  test('has accessible role=button and aria-label', () => {
    const card = createGameCard({ rom: mockRom, onPlay: () => {} });
    expect(card.getAttribute('role')).toBe('button');
    expect(card.getAttribute('aria-label')).toContain('River Raid');
  });

  test('list mode adds game-card--list class', () => {
    const card = createGameCard({ rom: mockRom, onPlay: () => {}, viewMode: 'list' });
    expect(card.classList.contains('game-card--list')).toBe(true);
  });

  test('grid mode does not add game-card--list class', () => {
    const card = createGameCard({ rom: mockRom, onPlay: () => {}, viewMode: 'grid' });
    expect(card.classList.contains('game-card--list')).toBe(false);
  });

  test('default viewMode does not add game-card--list class', () => {
    const card = createGameCard({ rom: mockRom, onPlay: () => {} });
    expect(card.classList.contains('game-card--list')).toBe(false);
  });
});
