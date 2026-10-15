import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSong, EXAMPLES } from '../src/song.js';
import { chordSymbol } from '../src/theory.js';

const symbols = (text) => parseSong(text).lines.map((line) => line.map((c) => chordSymbol(c.chord)).join(' '));

test('lista simple separada por comas, espacios o barras', () => {
  assert.deepEqual(symbols('C, G, Am, F'), ['C G Am F']);
  assert.deepEqual(symbols('| C | G | Am | F |'), ['C G Am F']);
  assert.deepEqual(symbols('C G\nAm F'), ['C G', 'Am F']);
});

test('descarta letra, títulos de sección y marcas de repetición', () => {
  const result = parseSong('[Intro]\nIntro: C G x2\nC        G\nAquí va la letra de la canción\nCoro:\nAm   F   %');
  assert.deepEqual(result.lines.map((l) => l.map((c) => chordSymbol(c.chord)).join(' ')), ['C G', 'C G', 'Am F F']);
  assert.equal(result.skippedLines, 1);
});

test('informa palabras desconocidas en líneas de acordes', () => {
  const result = parseSong('C G Am Xyz F');
  assert.deepEqual(result.unknown, ['Xyz']);
  assert.equal(result.lines[0].length, 4);
});

test('todos los ejemplos se leen sin errores', () => {
  for (const example of EXAMPLES) {
    const result = parseSong(example.text);
    assert.ok(result.lines.length > 0, example.name);
    assert.deepEqual(result.unknown, [], example.name);
  }
});
