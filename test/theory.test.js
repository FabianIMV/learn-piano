import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseChord, chordSymbol, chordLongName, chordTones, noteName, transposeChord,
  voiceChord, smoothInversion, fingering, identifyChord, playsChord, diatonicChords, spellRoot, bassNote,
} from '../src/theory.js';

const symbol = (text, notation) => chordSymbol(parseChord(text), notation);
const notes = (text) => chordTones(parseChord(text)).map((t) => noteName(t.note)).join(' ');

test('lee cifrados americanos con distintas escrituras', () => {
  assert.equal(symbol('C'), 'C');
  assert.equal(symbol('am'), 'Am');
  assert.equal(symbol('F#m'), 'F♯m');
  assert.equal(symbol('Bb7'), 'B♭7');
  assert.equal(symbol('CM7'), 'Cmaj7');
  assert.equal(symbol('Cm7'), 'Cm7');
  assert.equal(symbol('C7M'), 'Cmaj7');
  assert.equal(symbol('Bø'), 'Bm7♭5');
  assert.equal(symbol('Esus'), 'Esus4');
  assert.equal(symbol('G+'), 'Gaug');
  assert.equal(symbol('C/E'), 'C/E');
  assert.equal(symbol('(Dm)'), 'Dm');
});

test('lee cifrados latinos', () => {
  assert.equal(symbol('Do'), 'C');
  assert.equal(symbol('Rem'), 'Dm');
  assert.equal(symbol('Sib'), 'B♭');
  assert.equal(symbol('Fa#m7'), 'F♯m7');
  assert.equal(symbol('Sol/Si'), 'G/B');
  assert.equal(symbol('Lam', 'es'), 'Lam');
});

test('rechaza lo que no es un acorde', () => {
  for (const text of ['', 'hola', 'la', 'H', 'Cxyz', 'C/E/G', 'C/Q']) {
    assert.equal(parseChord(text), null, text);
  }
});

test('deletrea las notas según la teoría', () => {
  assert.equal(notes('C'), 'C E G');
  assert.equal(notes('Gm'), 'G B♭ D');
  assert.equal(notes('F'), 'F A C');
  assert.equal(notes('Eb'), 'E♭ G B♭');
  assert.equal(notes('C#m'), 'C♯ E G♯');
  assert.equal(notes('Bdim'), 'B D F');
  assert.equal(notes('G7'), 'G B D F');
  assert.equal(notes('Cdim7'), 'C E♭ G♭ B♭♭');
  assert.equal(notes('Caug'), 'C E G♯');
  assert.equal(notes('Dsus4'), 'D G A');
  assert.equal(notes('C9'), 'C E G B♭ D');
});

test('nombres largos en español', () => {
  assert.equal(chordLongName(parseChord('Am')), 'La menor');
  assert.equal(chordLongName(parseChord('G7')), 'Sol séptima');
  assert.equal(chordLongName(parseChord('C/E')), 'Do mayor con bajo en Mi');
  assert.equal(chordLongName(parseChord('Bb')), 'Si♭ mayor');
});

test('transporta respetando la ortografía', () => {
  assert.equal(chordSymbol(transposeChord(parseChord('C'), 2)), 'D');
  assert.equal(chordSymbol(transposeChord(parseChord('C'), 3)), 'E♭');
  assert.equal(chordSymbol(transposeChord(parseChord('Am'), 4)), 'C♯m');
  assert.equal(chordSymbol(transposeChord(parseChord('C/E'), 2)), 'D/F♯');
  assert.equal(chordSymbol(transposeChord(parseChord('G7'), -12)), 'G7');
});

test('voicings: inversiones dentro del registro de la mano derecha', () => {
  const midis = (text, inv) => voiceChord(parseChord(text), inv).map((v) => v.midi);
  assert.deepEqual(midis('C', 0), [60, 64, 67]);
  assert.deepEqual(midis('C', 1), [64, 67, 72]);
  assert.deepEqual(midis('C', 2), [67, 72, 76]);
  assert.deepEqual(midis('Am', 0), [69, 72, 76]);
  assert.deepEqual(midis('G7', 3), [65, 67, 71, 74]);
  for (const text of ['B9', 'Bmaj7', 'A#m7']) {
    for (let inv = 0; inv < 5; inv++) {
      const m = midis(text, inv);
      assert.ok(m[0] >= 60 && m[0] <= 71 && m.at(-1) <= 88, `${text} inv ${inv}: ${m}`);
    }
  }
  assert.equal(bassNote(parseChord('C/E')), 52);
});

test('el enlace suave elige la inversión más cercana', () => {
  const c = voiceChord(parseChord('C'), 0).map((v) => v.midi);
  assert.equal(smoothInversion(parseChord('F'), c), 2); // C F A
  assert.equal(smoothInversion(parseChord('Am'), c), 1); // C E A
  assert.equal(smoothInversion(parseChord('C'), c), 0);
});

test('digitación de mano derecha', () => {
  assert.deepEqual(fingering([60, 64, 67]), [1, 3, 5]);
  assert.deepEqual(fingering([64, 67, 72]), [1, 2, 5]);
  assert.deepEqual(fingering([67, 72, 76]), [1, 3, 5]);
  assert.deepEqual(fingering([60, 65, 67]), [1, 4, 5]);
  assert.deepEqual(fingering([60, 64, 67, 70]), [1, 2, 3, 5]);
});

test('reconoce acordes tocados', () => {
  const id = (midis) => chordSymbol(identifyChord(midis));
  assert.equal(id([60, 64, 67]), 'C');
  assert.equal(id([57, 60, 64]), 'Am');
  assert.equal(id([52, 60, 67]), 'C/E');
  assert.equal(id([43, 59, 62, 65]), 'G7');
  assert.equal(identifyChord([60, 61, 62]), null);
  assert.equal(identifyChord([60, 64]), null);
});

test('comprueba si se tocó el acorde pedido', () => {
  assert.ok(playsChord([60, 64, 67], parseChord('C')));
  assert.ok(playsChord([48, 64, 67, 72], parseChord('C')));
  assert.ok(playsChord([52, 60, 64, 67], parseChord('C/E')));
  assert.ok(!playsChord([60, 63, 67], parseChord('C')));
  assert.ok(!playsChord([60, 64, 67, 69], parseChord('C')));
});

test('acordes de la tonalidad', () => {
  const names = (root, mode) => diatonicChords(spellRoot(root), mode).map((d) => chordSymbol(d.chord)).join(' ');
  assert.equal(names(0, 'major'), 'C Dm Em F G Am Bdim');
  assert.equal(names(7, 'major'), 'G Am Bm C D Em F♯dim');
  assert.equal(names(9, 'minor'), 'Am Bdim C Dm Em F G');
});
