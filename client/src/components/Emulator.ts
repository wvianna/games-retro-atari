import type { RomInfo } from '../services/romApi.js';
import { getRomUrl } from '../services/romApi.js';

// EmulatorJS is loaded via CDN (script injected at runtime)
const EJS_CDN = 'https://cdn.emulatorjs.org/stable/data/';

declare global {
  interface Window {
    EJS_player?: string;
    EJS_core?: string;
    EJS_gameUrl?: string;
    EJS_pathtodata?: string;
    EJS_startOnLoaded?: boolean;
    EJS_language?: string;
    EJS_Buttons?: Record<string, boolean>;
    EJS_volume?: number;
    EJS_muted?: boolean;
    EJS_width?: number;
    EJS_height?: number;
  }
}

let ejsLoaderScript: HTMLScriptElement | null = null;

export function launchEmulator(rom: RomInfo, container: HTMLElement, volume = 80, muted = false): void {
  // Clear previous instance
  container.innerHTML = '<div id="game"></div>';

  // Configure EmulatorJS globals BEFORE loading the script
  window.EJS_player      = '#game';
  window.EJS_core        = 'atari2600';
  window.EJS_gameUrl     = getRomUrl(rom.id);
  window.EJS_pathtodata  = EJS_CDN;
  window.EJS_startOnLoaded = true;
  window.EJS_language    = 'en-US';
  window.EJS_volume      = muted ? 0 : volume / 100;
  window.EJS_muted       = muted;
  window.EJS_width       = 1600;
  window.EJS_height      = 1200;
  // Hide the built-in save/load buttons (we handle them ourselves via the overlay)
  window.EJS_Buttons = { saveState: false, loadState: false };

  // Load (or reload) EmulatorJS
  if (ejsLoaderScript) ejsLoaderScript.remove();
  ejsLoaderScript = document.createElement('script');
  ejsLoaderScript.src = `${EJS_CDN}loader.js`;
  document.body.appendChild(ejsLoaderScript);
}

export function teardownEmulator(container: HTMLElement): void {
  // Stop audio immediately before removing anything
  const ejs = (window as any).EJS_emulator;
  if (ejs) {
    try { ejs.gameManager?.setVolume?.(0); } catch (_) {}
    try { ejs.pause?.(); } catch (_) {}
    try { ejs.stop?.(); } catch (_) {}
    // Close Web Audio context if accessible
    try { ejs.gameManager?.audioContext?.close?.(); } catch (_) {}
    try { (ejs as any).Module?.SDL2?.audioContext?.close?.(); } catch (_) {}
  }

  // Suspend any lingering AudioContext attached to the container
  container.querySelectorAll('audio, video').forEach((el) => {
    const media = el as HTMLMediaElement;
    media.pause();
    media.src = '';
  });

  container.innerHTML = '';
  if (ejsLoaderScript) { ejsLoaderScript.remove(); ejsLoaderScript = null; }

  // Clean up globals
  delete (window as any).EJS_emulator;
  delete window.EJS_player;
  delete window.EJS_core;
  delete window.EJS_gameUrl;
  delete window.EJS_pathtodata;
  delete window.EJS_volume;
  delete window.EJS_muted;
  delete window.EJS_width;
  delete window.EJS_height;
}
