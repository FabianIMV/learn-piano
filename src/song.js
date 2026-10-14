// Convierte texto pegado (una lista de acordes o una canción completa con letra)
// en líneas de acordes que se pueden practicar.

import { parseChord } from './theory.js';

// Una línea se considera de acordes si al menos este porcentaje de sus palabras son acordes.
const CHORD_LINE_RATIO = 0.75;

const SEPARATORS = /[\s,|]+/;
const NOISE = /^(-+|–|—|\/|\.+|:|x?\d+x?|\(x?\d+x?\)|\[.*\]|.*:)$/i;
const REPEAT = '%';

/**
 * @returns {{ lines: Array<Array<{ chord, text }>>, unknown: string[], skippedLines: number }}
 */
export function parseSong(text) {
  const lines = [];
  const unknown = [];
  let skippedLines = 0;

  for (const rawLine of text.split(/\r?\n/)) {
    const tokens = rawLine.split(SEPARATORS).filter((t) => t && !NOISE.test(t));
    if (tokens.length === 0) continue;

    const parsed = tokens.map((t) => ({ text: t, chord: t === REPEAT ? REPEAT : parseChord(t) }));
    const hits = parsed.filter((p) => p.chord).length;
    if (hits / tokens.length < CHORD_LINE_RATIO) {
      skippedLines++;
      continue;
    }

    const line = [];
    for (const p of parsed) {
      if (!p.chord) unknown.push(p.text);
      else if (p.chord === REPEAT) {
        const previous = line.at(-1) ?? lines.at(-1)?.at(-1);
        if (previous) line.push(previous);
      } else line.push({ chord: p.chord, text: p.text });
    }
    if (line.length) lines.push(line);
  }

  return { lines, unknown, skippedLines };
}

export const EXAMPLES = [
  {
    name: 'Pop: I – V – vi – IV',
    text: 'C G Am F\nC G Am F',
    note: 'La progresión de cientos de canciones pop. Cuatro acordes y ya puedes acompañar.',
  },
  {
    name: 'Balada: vi – IV – I – V',
    text: 'Am F C G\nAm F C G',
    note: 'Los mismos acordes que la anterior, empezando por el menor: suena más melancólica.',
  },
  {
    name: 'Canon de Pachelbel',
    text: 'D A Bm F#m\nG D G A',
    note: 'Ocho acordes que bajan por grados. Ideal para practicar el enlace suave.',
  },
  {
    name: 'Blues en Do (12 compases)',
    text: 'C7 C7 C7 C7\nF7 F7 C7 C7\nG7 F7 C7 G7',
    note: 'La forma clásica del blues: tres acordes con séptima.',
  },
  {
    name: 'Jazz: ii – V – I',
    text: 'Dm7 G7 Cmaj7 Cmaj7\nEm7b5 A7 Dm7 G7',
    note: 'La cadencia más importante del jazz, con acordes de cuatro notas.',
  },
  {
    name: 'Canción con letra (ejemplo)',
    text: [
      '[Estrofa]',
      'C              G',
      'Pega aquí la canción tal cual',
      'Am             F',
      'y la letra se ignora sola',
      '',
      '[Coro]',
      'F      G      C   C/E',
      'solo quedan los acordes',
    ].join('\n'),
    note: 'Puedes pegar canciones de cancioneros: las líneas de letra se descartan.',
  },
];
