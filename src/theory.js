// Teoría musical: notas, tipos de acorde, lectura de cifrados, voicings y digitación.
// No toca el DOM ni el audio, así que se puede probar con `node --test`.

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const SOLFEGE = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si'];
const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];
const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];

const ACCIDENTAL_GLYPH = { '-2': '♭♭', '-1': '♭', 0: '', 1: '♯', 2: '♯♯' };

// Tipos de acorde. `tones` usa grados de la escala mayor (b3 = tercera menor, etc.)
// para poder deletrear cada nota correctamente (Si♭, no La♯, en Sol menor).
export const QUALITIES = {
  maj:   { symbol: '',     name: 'mayor',               tones: ['1', '3', '5'],             family: 'major', group: 'triad' },
  m:     { symbol: 'm',    name: 'menor',               tones: ['1', 'b3', '5'],            family: 'minor', group: 'triad' },
  dim:   { symbol: 'dim',  name: 'disminuido',          tones: ['1', 'b3', 'b5'],           family: 'minor', group: 'triad' },
  aug:   { symbol: 'aug',  name: 'aumentado',           tones: ['1', '3', '#5'],            family: 'major', group: 'triad' },
  sus2:  { symbol: 'sus2', name: 'suspendido 2',        tones: ['1', '2', '5'],             family: 'major', group: 'triad' },
  sus4:  { symbol: 'sus4', name: 'suspendido 4',        tones: ['1', '4', '5'],             family: 'major', group: 'triad' },
  7:     { symbol: '7',    name: 'séptima',             tones: ['1', '3', '5', 'b7'],       family: 'major', group: 'seventh' },
  maj7:  { symbol: 'maj7', name: 'séptima mayor',       tones: ['1', '3', '5', '7'],        family: 'major', group: 'seventh' },
  m7:    { symbol: 'm7',   name: 'menor séptima',       tones: ['1', 'b3', '5', 'b7'],      family: 'minor', group: 'seventh' },
  m7b5:  { symbol: 'm7♭5', name: 'semidisminuido',      tones: ['1', 'b3', 'b5', 'b7'],     family: 'minor', group: 'seventh' },
  dim7:  { symbol: 'dim7', name: 'disminuido séptima',  tones: ['1', 'b3', 'b5', 'bb7'],    family: 'minor', group: 'seventh' },
  6:     { symbol: '6',    name: 'sexta',               tones: ['1', '3', '5', '6'],        family: 'major', group: 'seventh' },
  m6:    { symbol: 'm6',   name: 'menor sexta',         tones: ['1', 'b3', '5', '6'],       family: 'minor', group: 'seventh' },
  add9:  { symbol: 'add9', name: 'con novena añadida',  tones: ['1', '3', '5', '9'],        family: 'major', group: 'seventh' },
  9:     { symbol: '9',    name: 'novena',              tones: ['1', '3', '5', 'b7', '9'],  family: 'major', group: 'seventh' },
};

// Orden en el que se muestran y se prueban al reconocer un acorde (de más común a menos).
export const QUALITY_ORDER = ['maj', 'm', '7', 'maj7', 'm7', 'sus4', 'sus2', 'dim', 'aug', '6', 'm6', 'add9', '9', 'm7b5', 'dim7'];

const INTERVAL_NAMES = {
  '1': 'fundamental', '2': '2ª mayor', 'b3': '3ª menor', '3': '3ª mayor', '4': '4ª justa',
  'b5': '5ª disminuida', '5': '5ª justa', '#5': '5ª aumentada', '6': '6ª mayor',
  'bb7': '7ª disminuida', 'b7': '7ª menor', '7': '7ª mayor', '9': '9ª mayor',
};

// Variantes de escritura que aparecen en cancioneros. Se prueba primero con
// mayúsculas/minúsculas exactas (M7 ≠ m7) y luego en minúsculas.
const SUFFIXES = {
  '': 'maj', 'M': 'maj', 'maj': 'maj',
  'm': 'm', 'min': 'm', '-': 'm',
  '7': '7', 'dom7': '7',
  'maj7': 'maj7', 'M7': 'maj7', '7M': 'maj7', 'Δ': 'maj7', 'Δ7': 'maj7', 'ma7': 'maj7',
  'm7': 'm7', 'min7': 'm7', '-7': 'm7',
  'dim': 'dim', '°': 'dim', 'º': 'dim', 'o': 'dim',
  'dim7': 'dim7', '°7': 'dim7', 'º7': 'dim7', 'o7': 'dim7',
  'm7b5': 'm7b5', 'm7♭5': 'm7b5', 'ø': 'm7b5', 'ø7': 'm7b5', '-7b5': 'm7b5',
  'aug': 'aug', '+': 'aug', '#5': 'aug', '+5': 'aug',
  'sus2': 'sus2', '2': 'sus2',
  'sus4': 'sus4', 'sus': 'sus4', '4': 'sus4',
  '6': '6', 'm6': 'm6', 'min6': 'm6',
  'add9': 'add9', 'add2': 'add9',
  '9': '9',
};
const SUFFIXES_LOWER = Object.fromEntries(
  Object.entries(SUFFIXES).filter(([k]) => !/M/.test(k)).map(([k, v]) => [k.toLowerCase(), v]),
);

// Ortografía preferida para cada altura según el "color" del acorde:
// Si♭ mayor y Mi♭ mayor, pero Do♯ menor y Sol♯ menor.
const PREFERRED = {
  major: ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'],
  minor: ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'],
};

const mod = (n, m) => ((n % m) + m) % m;

// ---------- Notas ----------

/** Una nota "deletreada": letra (0 = C … 6 = B) + alteración (-2 … 2). */
export function note(letter, accidental = 0) {
  return { letter, accidental };
}

export function pitchClass(n) {
  return mod(LETTER_PC[n.letter] + n.accidental, 12);
}

export function noteName(n, notation = 'en') {
  const base = notation === 'es' ? SOLFEGE[n.letter] : LETTERS[n.letter];
  return base + ACCIDENTAL_GLYPH[n.accidental];
}

/** Nombre simple para una tecla (sin contexto armónico): sostenidos y bemoles. */
export function keyName(pc, notation = 'en') {
  const sharp = noteFromText(PREFERRED.minor[pc]);
  return noteName(sharp, notation);
}

/** Notas como Mi♯ o Do♭ se aclaran con su equivalente en el teclado. */
export function enharmonicHint(n, notation = 'en') {
  const odd = Math.abs(n.accidental) === 2
    || (n.accidental === 1 && (n.letter === 2 || n.letter === 6))
    || (n.accidental === -1 && (n.letter === 0 || n.letter === 3));
  return odd ? keyName(pitchClass(n), notation) : null;
}

function noteFromText(text) {
  const parsed = parseNote(text);
  return parsed && parsed.rest === '' ? parsed.note : null;
}

/** Lee una nota al inicio del texto. Acepta C D E… y Do Re Mi…, con #, b, ♯, ♭. */
function parseNote(text) {
  const m = /^(Do|Re|Mi|Fa|Sol|La|Si|DO|RE|MI|FA|SOL|LA|SI|[A-Ga-g])(##|bb|[#♯b♭]|)/.exec(text);
  if (!m) return null;
  const head = m[1];
  const letter = head.length === 1
    ? LETTERS.indexOf(head.toUpperCase())
    : SOLFEGE.findIndex((s) => s.toLowerCase() === head.toLowerCase());
  const acc = { '': 0, '#': 1, '♯': 1, '##': 2, 'b': -1, '♭': -1, 'bb': -2 }[m[2]];
  return { note: note(letter, acc), rest: text.slice(m[0].length) };
}

// ---------- Acordes ----------

function toneInfo(token) {
  const m = /^(bb|b|#)?(\d+)$/.exec(token);
  const acc = { undefined: 0, b: -1, bb: -2, '#': 1 }[m[1]];
  const degree = Number(m[2]);
  const semitones = MAJOR_SCALE[(degree - 1) % 7] + 12 * Math.floor((degree - 1) / 7) + acc;
  return { degree, semitones, letterOffset: (degree - 1) % 7 };
}

/** Rol de cada grado para colorear: fundamental, tercera, quinta o color (7ª, 6ª, 9ª). */
export function toneRole(token) {
  const { degree } = toneInfo(token);
  if (degree === 1) return 'root';
  if (degree === 3 || degree === 2 || degree === 4) return 'third';
  if (degree === 5) return 'fifth';
  return 'color';
}

export function makeChord(root, quality = 'maj', bass = null) {
  if (!QUALITIES[quality]) throw new Error(`Tipo de acorde desconocido: ${quality}`);
  if (bass && pitchClass(bass) === pitchClass(root)) bass = null;
  return { root, quality, bass };
}

/** Lee un cifrado: "Am", "F#m7", "Bb", "C/E", "Solm", "Sib7", "Re/Fa#"… Devuelve null si no lo entiende. */
export function parseChord(text) {
  const clean = text.trim().replace(/[()]/g, '');
  if (!clean) return null;
  const [main, bassText, ...extra] = clean.split('/');
  if (extra.length) return null;

  const head = parseNote(main);
  if (!head) return null;
  const quality = SUFFIXES[head.rest] ?? SUFFIXES_LOWER[head.rest.toLowerCase()];
  if (!quality) return null;

  let bass = null;
  if (bassText !== undefined) {
    bass = noteFromText(bassText);
    if (!bass) return null;
  }
  return makeChord(head.note, quality, bass);
}

/** Notas del acorde, deletreadas y con su intervalo desde la fundamental. */
export function chordTones(chord) {
  return QUALITIES[chord.quality].tones.map((token) => {
    const { semitones, letterOffset } = toneInfo(token);
    const letter = mod(chord.root.letter + letterOffset, 7);
    const pc = mod(pitchClass(chord.root) + semitones, 12);
    const accidental = mod(pc - LETTER_PC[letter] + 6, 12) - 6;
    return {
      token,
      semitones,
      note: note(letter, accidental),
      pc,
      role: toneRole(token),
      interval: INTERVAL_NAMES[token],
    };
  });
}

export function chordSymbol(chord, notation = 'en') {
  const base = noteName(chord.root, notation) + QUALITIES[chord.quality].symbol;
  return chord.bass ? `${base}/${noteName(chord.bass, notation)}` : base;
}

/** "La menor", "Sol séptima", "Do mayor con bajo en Mi". Siempre en español. */
export function chordLongName(chord) {
  const name = `${noteName(chord.root, 'es')} ${QUALITIES[chord.quality].name}`;
  return chord.bass ? `${name} con bajo en ${noteName(chord.bass, 'es')}` : name;
}

/** Escribe una altura con la ortografía habitual para un acorde de esa familia. */
export function spellRoot(pc, quality = 'maj') {
  return noteFromText(PREFERRED[QUALITIES[quality].family][mod(pc, 12)]);
}

export function transposeChord(chord, semitones) {
  if (mod(semitones, 12) === 0) return chord;
  const root = spellRoot(pitchClass(chord.root) + semitones, chord.quality);
  let bass = null;
  if (chord.bass) {
    // Mantiene la distancia de letras con la fundamental: C/E → D/F♯, no D/G♭.
    const offset = mod(chord.bass.letter - chord.root.letter, 7);
    const letter = mod(root.letter + offset, 7);
    const pc = mod(pitchClass(chord.bass) + semitones, 12);
    bass = note(letter, mod(pc - LETTER_PC[letter] + 6, 12) - 6);
  }
  return makeChord(root, chord.quality, bass);
}

// ---------- Tonalidades ----------

const DIATONIC = {
  major: { qualities: ['maj', 'm', 'm', 'maj', 'maj', 'm', 'dim'], numerals: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'] },
  minor: { qualities: ['m', 'dim', 'maj', 'm', 'm', 'maj', 'maj'], numerals: ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'] },
};
const MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10];

/** Los siete acordes de la tonalidad mayor (o menor natural) que empieza en `tonic`. */
export function diatonicChords(tonic, mode = 'major') {
  const scale = mode === 'major' ? MAJOR_SCALE : MINOR_SCALE;
  const { qualities, numerals } = DIATONIC[mode];
  return scale.map((step, i) => {
    const letter = mod(tonic.letter + i, 7);
    const pc = mod(pitchClass(tonic) + step, 12);
    const root = note(letter, mod(pc - LETTER_PC[letter] + 6, 12) - 6);
    return { numeral: numerals[i], chord: makeChord(root, qualities[i]) };
  });
}

// ---------- Teclado: voicings, digitación y reconocimiento ----------

export const MIDDLE_C = 60;
const RH_LOW = 60; // la mano derecha empieza en Do central o más arriba
const RH_HIGH = 86;
const BASS_OCTAVE = 48; // la mano izquierda toca el bajo en la octava de Do3

/** Notas MIDI para la mano derecha en la inversión pedida, con la nota más grave entre Do4 y Si4. */
export function voiceChord(chord, inversion = 0) {
  const tones = chordTones(chord);
  const k = mod(inversion, tones.length);
  const rel = tones.map((t, i) => t.semitones + (i < k ? 12 : 0));
  const order = tones.map((_, i) => i).sort((a, b) => rel[a] - rel[b]);
  let base = MIDDLE_C + pitchClass(chord.root);
  while (base + rel[order[0]] > RH_LOW + 11) base -= 12;
  while (base + rel[order[0]] < RH_LOW) base += 12;
  return order.map((i) => ({ midi: base + rel[i], tone: tones[i] }));
}

function voicingCost(a, b) {
  const near = (x, set) => Math.min(...set.map((y) => Math.abs(x - y)));
  return a.reduce((s, x) => s + near(x, b), 0) + b.reduce((s, y) => s + near(y, a), 0);
}

/** Elige la inversión que menos mueve la mano respecto al acorde anterior. */
export function smoothInversion(chord, previousMidis) {
  if (!previousMidis || previousMidis.length === 0) return 0;
  const count = QUALITIES[chord.quality].tones.length;
  let best = { cost: Infinity, inversion: 0 };
  for (let k = 0; k < count; k++) {
    const notes = voiceChord(chord, k).map((v) => v.midi);
    if (notes[notes.length - 1] > RH_HIGH) continue;
    const cost = voicingCost(notes, previousMidis) + k * 0.01; // a igual costo, preferir la posición fundamental
    if (cost < best.cost) best = { cost, inversion: k };
  }
  return best.inversion;
}

export function bassNote(chord) {
  return BASS_OCTAVE + pitchClass(chord.bass ?? chord.root);
}

/** Digitación habitual de mano derecha (1 = pulgar, 5 = meñique). */
export function fingering(midis) {
  if (midis.length === 3) {
    const upper = midis[2] - midis[1];
    if (upper >= 5) return [1, 2, 5];
    if (upper <= 2) return [1, 4, 5];
    return [1, 3, 5];
  }
  if (midis.length === 4) return [1, 2, 3, 5];
  return [1, 2, 3, 4, 5].slice(0, midis.length);
}

/** Reconoce el acorde formado por un conjunto de notas MIDI (por ejemplo, desde un teclado conectado). */
export function identifyChord(midis) {
  if (midis.length < 3) return null;
  const sorted = [...midis].sort((a, b) => a - b);
  const pcs = new Set(sorted.map((m) => mod(m, 12)));
  const bassPc = mod(sorted[0], 12);
  const sameSet = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));

  const candidates = [];
  for (const rootPc of pcs) {
    for (const quality of QUALITY_ORDER) {
      const chordPcs = new Set(QUALITIES[quality].tones.map((t) => mod(rootPc + toneInfo(t).semitones, 12)));
      if (sameSet(chordPcs, pcs)) {
        candidates.push({ rootPc, quality, score: (rootPc === bassPc ? 0 : 100) + QUALITY_ORDER.indexOf(quality) });
      }
    }
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => a.score - b.score);
  const { rootPc, quality } = candidates[0];
  const root = spellRoot(rootPc, quality);
  const chord = makeChord(root, quality);
  if (rootPc !== bassPc) {
    const bassTone = chordTones(chord).find((t) => t.pc === bassPc);
    return makeChord(root, quality, bassTone.note);
  }
  return chord;
}

/** ¿Las notas tocadas forman este acorde? El bajo es opcional; las notas de más no se aceptan. */
export function playsChord(midis, chord) {
  const played = new Set(midis.map((m) => mod(m, 12)));
  const target = chordTones(chord).map((t) => t.pc);
  const allowed = new Set(chord.bass ? [...target, pitchClass(chord.bass)] : target);
  return target.every((pc) => played.has(pc)) && [...played].every((pc) => allowed.has(pc));
}
