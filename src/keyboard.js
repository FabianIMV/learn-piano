// Dibuja el teclado y marca las notas de un acorde, con su rol y digitación.

import { keyName } from './theory.js';

const BLACK = new Set([1, 3, 6, 8, 10]);
// Las teclas negras no están centradas entre dos blancas: se corren un poco hacia afuera del grupo.
const BLACK_OFFSET = { 1: -0.12, 3: 0.12, 6: -0.15, 8: 0, 10: 0.15 };

export function createKeyboard(container, { low = 48, high = 88, onPress } = {}) {
  const keys = new Map();
  const whiteCount = range(low, high).filter((m) => !BLACK.has(m % 12)).length;
  const whiteWidth = 100 / whiteCount;
  let whiteIndex = 0;

  container.style.setProperty('--white-count', whiteCount);

  for (const midi of range(low, high)) {
    const pc = midi % 12;
    const isBlack = BLACK.has(pc);
    const el = document.createElement('button');
    el.type = 'button';
    el.className = `key ${isBlack ? 'key--black' : 'key--white'}`;
    el.dataset.midi = midi;
    el.innerHTML = '<span class="key__finger"></span><span class="key__marker"></span><span class="key__landmark"></span>';

    if (isBlack) {
      const width = whiteWidth * 0.6;
      el.style.left = `${(whiteIndex + BLACK_OFFSET[pc]) * whiteWidth - width / 2}%`;
      el.style.width = `${width}%`;
    } else {
      el.style.left = `${whiteIndex * whiteWidth}%`;
      el.style.width = `${whiteWidth}%`;
      whiteIndex++;
    }
    if (midi === 60) el.classList.add('key--middle-c');

    el.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      onPress?.(midi);
      flash(el);
    });
    keys.set(midi, el);
    container.append(el);
  }

  // Nombres accesibles y la referencia escrita en cada Do, según la notación elegida.
  function setNotation(notation) {
    for (const [midi, el] of keys) {
      const octave = Math.floor(midi / 12) - 1;
      const name = `${keyName(midi % 12, notation)} ${octave}`;
      el.setAttribute('aria-label', midi === 60 ? `${name} (central)` : name);
      if (midi % 12 === 0) el.querySelector('.key__landmark').textContent = `${keyName(0, notation)}${octave}`;
    }
  }

  /**
   * @param {Array<{ midi, label, role, finger, hand }>} marks
   */
  function show(marks) {
    for (const el of keys.values()) {
      el.classList.remove('is-marked', 'role-root', 'role-third', 'role-fifth', 'role-color', 'role-bass', 'is-bass');
      el.querySelector('.key__marker').textContent = '';
      el.querySelector('.key__finger').textContent = '';
    }
    for (const mark of marks) {
      const el = keys.get(mark.midi);
      if (!el) continue;
      el.classList.add('is-marked', `role-${mark.role}`);
      if (mark.hand === 'left') el.classList.add('is-bass');
      el.querySelector('.key__marker').textContent = mark.label;
      el.querySelector('.key__finger').textContent = mark.finger ?? '';
    }
    const first = marks.length && keys.get(Math.min(...marks.map((m) => m.midi)));
    if (first) scrollIntoViewIfNeeded(container, first, marks);
  }

  /** Notas que se están tocando en un teclado MIDI conectado. */
  function setPressed(midis, state = '') {
    for (const [midi, el] of keys) {
      el.classList.toggle('is-pressed', midis.has(midi));
      el.classList.toggle('is-correct', midis.has(midi) && state === 'correct');
    }
  }

  function scrollIntoViewIfNeeded(scroller, firstKey, marks) {
    const viewport = scroller.parentElement;
    if (viewport.scrollWidth <= viewport.clientWidth) return;
    const last = keys.get(Math.max(...marks.map((m) => m.midi)));
    const left = firstKey.offsetLeft;
    const right = last.offsetLeft + last.offsetWidth;
    const target = (left + right) / 2 - viewport.clientWidth / 2;
    viewport.scrollTo({ left: target, behavior: 'smooth' });
  }

  return { show, setPressed, setNotation, element: container };
}

function flash(el) {
  el.classList.remove('is-struck');
  void el.offsetWidth; // reinicia la animación
  el.classList.add('is-struck');
}

function range(a, b) {
  return Array.from({ length: b - a + 1 }, (_, i) => a + i);
}
