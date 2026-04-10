/**
 * Parses an Atari 2600 ROM filename into structured metadata.
 *
 * Filename convention (ROM Hunter collection V18):
 *   "Game Name (Year) (Publisher, Dev) (Model) [flags].bin"
 *
 * Examples:
 *   "River Raid (1982) (Activision, Carol Shaw) (AX-020) ~.bin"
 *   "Pac-Man (1982) (Atari, Tod Frye - Sears) (CX2646) (PAL).bin"
 */

/** @param {string} raw - base filename (may include the `.bin` extension) */
export function parseRomName(raw) {
  const filename = raw.replace(/\.bin$/i, '').trim();

  // Extract all parenthetical tokens in order
  const parenthetical = [];
  let rest = filename.replace(/\(([^)]*)\)/g, (_, inner) => {
    parenthetical.push(inner.trim());
    return '\x00'; // placeholder
  });

  // The game title is everything before the first placeholder / bracket / tilde
  const title = rest
    .split('\x00')[0]
    .replace(/[~[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Year: first 4-digit token, also handles MM-DD-YYYY format
  const yearToken = parenthetical.find((t) => /^\d{4}(-\d{2}-\d{2})?$/.test(t) || /^\d{2}-\d{2}-(\d{4})$/.test(t));
  const mdyMatch = yearToken ? yearToken.match(/^\d{2}-\d{2}-(\d{4})$/) : null;
  const year = yearToken ? parseInt(mdyMatch ? mdyMatch[1] : yearToken.slice(0, 4), 10) : null;

  // PAL / NTSC / SECAM flag
  const regionTokens = parenthetical.filter((t) => /^(PAL|NTSC|SECAM)$/i.test(t));
  const region = regionTokens.length > 0 ? regionTokens[0].toUpperCase() : 'NTSC';

  // Prototype flag
  const isPrototype = parenthetical.some((t) => /prototype/i.test(t));

  // Hack flag — "(Hack)" in parenthetical or "[..." bracket style
  const isHack = /\(hack\)/i.test(filename) || /\[hack\]/i.test(filename);

  // Publisher: first parenthetical that is NOT a year, region, model number, or "Prototype"
  const modelPattern = /^[A-Z]{1,3}\d/i;
  const publisherToken = parenthetical.find(
    (t) =>
      t !== yearToken &&
      !/^(PAL|NTSC|SECAM|prototype)$/i.test(t) &&
      !modelPattern.test(t) &&
      t.length > 1
  );
  // The publisher token may contain "PublisherName, Developer" or "Pub1 - Pub2"
  const publisher = publisherToken ? publisherToken.split(/,|-/)[0].trim() : 'Unknown';

  return { title, year, publisher, region, isPrototype, isHack, filename: `${filename}.bin` };
}

/**
 * Build a slug suitable for URLs from a title string.
 * @param {string} title
 */
export function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
