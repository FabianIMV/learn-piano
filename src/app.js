import {
  QUALITIES, QUALITY_ORDER, chordTones, chordSymbol, chordLongName, noteName, enharmonicHint,
  pitchClass, spellRoot, voiceChord, smoothInversion, bassNote, fingering, diatonicChords,
  identifyChord, playsChord, transposeChord, makeChord,
} from './theory.js';
import { parseSong, EXAMPLES } from './song.js';
import { Piano } from './audio.js';
import { createKeyboard } from './keyboard.js';
import { connectMidi, isMidiSupported } from './midi.js';

const $ = (id) => document.getElementById(id);
const STORAGE_KEY = 'acordes:v1';
const ORDINALS = ['Posición fundamental', '1ª inversión', '2ª inversión', '3ª inversión', '4ª inversión'];

const QUALITY_TEXT = {
  maj: 'Estable y luminoso. Es el acorde con el que empiezan y terminan la mayoría de las canciones.',
  m: 'Más oscuro e íntimo. Se diferencia del mayor en una sola nota: la tercera baja un semitono.',
  dim: 'Tenso e inestable: sus notas están separadas por terceras menores. Suele aparecer de paso hacia otro acorde.',
  aug: 'Queda suspendido en el aire, como una pregunta. Es un mayor con la quinta subida un semitono.',
  sus2: 'Ni mayor ni menor: la tercera se cambia por la segunda. Suena abierto y moderno.',
  sus4: 'La tercera se cambia por la cuarta. Crea una tensión que casi siempre resuelve al acorde mayor.',
  7: 'El acorde de dominante. La séptima menor crea una tensión que pide ir al acorde una quinta más abajo, como G7 → C.',
  maj7: 'Suave y soñador. Muy usado en jazz, bossa nova y baladas.',
  m7: 'Un menor más cálido y relajado. Es el primer acorde de la cadencia ii – V – I.',
  m7b5: 'Un disminuido con séptima menor. Es el ii habitual de las tonalidades menores.',
  dim7: 'Cuatro notas a la misma distancia: divide la octava en partes iguales. Muy útil para pasar de un acorde a otro.',
  6: 'Un mayor con la sexta añadida. Sonido clásico del swing y de los finales de canción.',
  m6: 'Un menor con sexta mayor: un color agridulce, frecuente en el tango y la bossa nova.',
  add9: 'Un mayor con la novena encima y sin séptima. Brillante, muy común en el pop.',
  9: 'Un acorde de séptima enriquecido con la novena. Típico del funk y del blues.',
};

const SOUND_STATUS = {
  idle: '', loading: 'Cargando el piano…', ready: 'Piano de cola', synth: 'Piano sintetizado', unsupported: 'Tu navegador no reproduce audio',
};

// ---------- Estado ----------

const state = {
  notation: 'en',
  tab: 'explore',
  withBass: true,
  explore: { rootPc: 0, quality: 'maj', inversion: 0 },
  song: { text: '', items: [], index: -1, transpose: 0, smooth: true, bpm: 80, beatsPerChord: 4, click: false },
  current: null, // { chord, rh, lh, inversion, voicing }
  diatonic: [],
  playing: false,
  midiNotes: new Set(),
};

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    if (saved.notation) state.notation = saved.notation;
    if (typeof saved.withBass === 'boolean') state.withBass = saved.withBass;
    Object.assign(state.explore, saved.explore);
    for (const key of ['text', 'transpose', 'smooth', 'bpm', 'beatsPerChord', 'click']) {
      if (saved.song?.[key] !== undefined) state.song[key] = saved.song[key];
    }
    if (saved.tab) state.tab = saved.tab;
  } catch {
    // Sin almacenamiento (modo privado, etc.): se usan los valores por defecto.
  }
}

function saveSettings() {
  const { text, transpose, smooth, bpm, beatsPerChord, click } = state.song;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      notation: state.notation, withBass: state.withBass, tab: state.tab,
      explore: state.explore, song: { text, transpose, smooth, bpm, beatsPerChord, click },
    }));
  } catch {
    // Ídem.
  }
}

// ---------- Sonido y teclado ----------

const piano = new Piano();
piano.onStatus = (status) => { $('soundStatus').textContent = SOUND_STATUS[status] ?? ''; $('soundStatus').dataset.status = status; };

const keyboard = createKeyboard($('piano'), {
  low: 48,
  high: 88,
  onPress: (midi) => piano.playNote(midi),
});

/** Muestra un acorde en el teclado y, si se pide, lo hace sonar. */
function present(chord, { inversion = 0, sound = true } = {}) {
  const voicing = voiceChord(chord, inversion);
  const rh = voicing.map((v) => v.midi);
  const fingers = fingering(rh);
  const bassPc = pitchClass(chord.bass ?? chord.root);
  const lh = state.withBass ? [bassNote(chord)] : [];
  const bassRole = chordTones(chord).find((t) => t.pc === bassPc)?.role ?? 'bass';

  state.current = { chord, rh, lh, inversion, voicing };

  keyboard.show([
    ...voicing.map((v, i) => ({ midi: v.midi, label: noteName(v.tone.note, state.notation), role: v.tone.role, finger: fingers[i] })),
    ...lh.map((midi) => ({ midi, label: noteName(chord.bass ?? chord.root, state.notation), role: bassRole, finger: 5, hand: 'left' })),
  ]);

  renderReadout(chord, voicing, bassPc);
  updateMidiFeedback();
  if (sound) playCurrent();
}

function playCurrent(options) {
  if (!state.current) return;
  piano.playChord([...state.current.lh, ...state.current.rh], options);
}

function renderReadout(chord, voicing, bassPc) {
  $('symbol').textContent = chordSymbol(chord, state.notation);
  $('longName').textContent = chordLongName(chord);

  const lowest = voicing[0].tone;
  const position = state.current.inversion === 0 ? ORDINALS[0] : `${ORDINALS[state.current.inversion]}: la ${lowest.interval} queda abajo`;
  $('detail').textContent = position;

  const tones = chordTones(chord);
  const items = tones.map((t) => {
    const hint = enharmonicHint(t.note, state.notation);
    return `<li class="tone role-${t.role}">
      <span class="tone__name">${noteName(t.note, state.notation)}${hint ? `<small> = ${hint}</small>` : ''}</span>
      <span class="tone__interval">${t.interval}</span>
    </li>`;
  });
  if (chord.bass && !tones.some((t) => t.pc === bassPc)) {
    items.push(`<li class="tone role-bass"><span class="tone__name">${noteName(chord.bass, state.notation)}</span><span class="tone__interval">bajo</span></li>`);
  }
  $('tones').innerHTML = items.join('');
}

// ---------- Explorar ----------

function exploreChord() {
  const { rootPc, quality } = state.explore;
  return makeChord(spellRoot(rootPc, quality), quality);
}

function showExplore({ sound = true } = {}) {
  const chord = exploreChord();
  const count = QUALITIES[chord.quality].tones.length;
  if (state.explore.inversion >= count) state.explore.inversion = 0;
  present(chord, { inversion: state.explore.inversion, sound });
  renderExploreControls();
  saveSettings();
}

function renderExploreControls() {
  const { rootPc, quality, inversion } = state.explore;
  const chord = exploreChord();

  $('roots').innerHTML = Array.from({ length: 12 }, (_, pc) => {
    const name = noteName(spellRoot(pc, quality), state.notation);
    const black = [1, 3, 6, 8, 10].includes(pc);
    return `<button type="button" class="root ${black ? 'root--black' : ''}" data-pc="${pc}" aria-pressed="${pc === rootPc}">${name}</button>`;
  }).join('');

  const chip = (q) => {
    const symbol = chordSymbol(makeChord(chord.root, q), state.notation);
    return `<button type="button" class="chip" data-quality="${q}" aria-pressed="${q === quality}">
      <span class="chip__symbol">${symbol}</span><span class="chip__name">${QUALITIES[q].name}</span></button>`;
  };
  $('triads').innerHTML = QUALITY_ORDER.filter((q) => QUALITIES[q].group === 'triad').map(chip).join('');
  $('extended').innerHTML = QUALITY_ORDER.filter((q) => QUALITIES[q].group !== 'triad').map(chip).join('');

  const count = QUALITIES[quality].tones.length;
  $('inversions').innerHTML = ORDINALS.slice(0, count).map((label, i) =>
    `<button type="button" role="radio" data-inversion="${i}" aria-checked="${i === inversion}">${i === 0 ? 'Fundamental' : label.replace(' inversión', '')}</button>`).join('');

  $('qualityText').textContent = QUALITY_TEXT[quality];
  const tones = chordTones(chord);
  const steps = tones.slice(1).map((t, i) => t.semitones - tones[i].semitones);
  $('formula').innerHTML = `Fórmula <b>${QUALITIES[quality].tones.map((t) => t.replace('bb', '♭♭').replace('b', '♭').replace('#', '♯')).join(' · ')}</b>
    <span>· ${steps.join(' + ')} semitonos</span>`;

  const mode = QUALITIES[quality].family === 'minor' ? 'minor' : 'major';
  const key = diatonicChords(chord.root, mode);
  $('keyTitle').textContent = `Acordes de la tonalidad de ${noteName(chord.root, 'es')} ${mode === 'major' ? 'mayor' : 'menor'}`;
  $('diatonic').innerHTML = key.map(({ numeral, chord: c }, i) => `
    <button type="button" class="degree" data-degree="${i}">
      <span class="degree__numeral">${numeral}</span>
      <span class="degree__symbol">${chordSymbol(c, state.notation)}</span>
    </button>`).join('');
  state.diatonic = key.map((d) => d.chord);
}

function selectExplore(changes) {
  Object.assign(state.explore, changes);
  showExplore();
}

function playDegree(i) {
  const chord = state.diatonic[i];
  if (!chord) return;
  const inversion = smoothInversion(chord, state.current?.rh);
  present(chord, { inversion });
  document.querySelectorAll('.degree').forEach((el, j) => el.classList.toggle('is-active', j === i));
}

// ---------- Canción ----------

function loadSong(text, { autoplay = true } = {}) {
  stopPlayback();
  const { lines, unknown, skippedLines } = parseSong(text);
  state.song.text = text;
  state.song.items = lines.flatMap((line, lineIndex) => line.map(({ chord }) => ({ chord, lineIndex })));
  state.song.index = -1;

  const messages = [];
  if (!text.trim()) messages.push('');
  else if (!state.song.items.length) messages.push('No encontré acordes. Escríbelos separados por espacios o comas, por ejemplo: C G Am F.');
  else {
    const n = state.song.items.length;
    messages.push(`${n} ${n === 1 ? 'acorde' : 'acordes'} en ${lines.length} ${lines.length === 1 ? 'línea' : 'líneas'}.`);
    if (skippedLines) messages.push(`Ignoré ${skippedLines} ${skippedLines === 1 ? 'línea' : 'líneas'} de letra.`);
    if (unknown.length) messages.push(`No reconocí: ${[...new Set(unknown)].slice(0, 6).join(', ')}.`);
  }
  $('songFeedback').textContent = messages.join(' ');
  $('songFeedback').classList.toggle('is-error', !!text.trim() && !state.song.items.length);

  renderSheet();
  saveSettings();
  if (state.song.items.length && autoplay) goTo(0);
}

function songChord(i) {
  return transposeChord(state.song.items[i].chord, state.song.transpose);
}

function renderSheet() {
  const { items, index } = state.song;
  $('transport').hidden = items.length === 0;
  const lines = [];
  items.forEach((item, i) => {
    (lines[item.lineIndex] ??= []).push(
      `<button type="button" class="bar ${i === index ? 'is-current' : ''}" data-index="${i}">${chordSymbol(songChord(i), state.notation)}</button>`);
  });
  $('sheet').innerHTML = lines.filter(Boolean).map((l) => `<div class="sheet__line">${l.join('')}</div>`).join('');
  $('transposeValue').textContent = state.song.transpose > 0 ? `+${state.song.transpose}` : state.song.transpose;
  renderUpNext();
}

function renderUpNext() {
  const { items, index } = state.song;
  const next = items.length > 1 ? (index + 1) % items.length : -1;
  $('upNext').innerHTML = next >= 0 && index >= 0 ? `Sigue <b>${chordSymbol(songChord(next), state.notation)}</b>` : '';
}

function goTo(i, { sound = true } = {}) {
  const { items } = state.song;
  if (!items.length) return;
  const index = ((i % items.length) + items.length) % items.length;
  state.song.index = index;
  const chord = songChord(index);
  const inversion = state.song.smooth ? smoothInversion(chord, index === 0 ? null : state.current?.rh) : 0;
  present(chord, { inversion, sound });
  document.querySelectorAll('.bar').forEach((el) => el.classList.toggle('is-current', Number(el.dataset.index) === index));
  document.querySelector('.bar.is-current')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  renderUpNext();
}

function jumpToRoot(letter) {
  const { items, index } = state.song;
  for (let step = 1; step <= items.length; step++) {
    const i = (index + step) % items.length;
    if (songChord(i).root.letter === letter) return goTo(i);
  }
}

// Reproducción automática: avanza un acorde cada `beatsPerChord` tiempos.
let timer = null;
let beat = 0;

function startPlayback() {
  if (!state.song.items.length) return;
  piano.unlock();
  state.playing = true;
  beat = 0;
  if (state.song.index < 0) goTo(0);
  else playCurrent();
  tick();
  renderPlayButton();
}

function tick() {
  renderBeats();
  if (state.song.click) piano.click(beat === 0);
  timer = setTimeout(() => {
    beat++;
    if (beat >= state.song.beatsPerChord) {
      beat = 0;
      goTo(state.song.index + 1);
    }
    tick();
  }, 60000 / state.song.bpm);
}

function stopPlayback() {
  clearTimeout(timer);
  state.playing = false;
  beat = 0;
  renderBeats();
  renderPlayButton();
}

function renderPlayButton() {
  $('playBtn').classList.toggle('is-playing', state.playing);
  $('playBtn').setAttribute('aria-label', state.playing ? 'Pausar' : 'Reproducir');
}

function renderBeats() {
  const count = Math.min(state.song.beatsPerChord, 8);
  $('beats').innerHTML = Array.from({ length: count }, (_, i) =>
    `<i class="${state.playing && i === beat ? 'is-on' : ''} ${state.playing && i < beat ? 'is-past' : ''}"></i>`).join('');
}

// ---------- MIDI ----------

function updateMidiFeedback() {
  const notes = [...state.midiNotes];
  const target = state.current?.chord;
  const correct = target && notes.length >= 3 && playsChord(notes, target);
  keyboard.setPressed(state.midiNotes, correct ? 'correct' : '');

  const played = identifyChord(notes);
  const out = $('midiPlayed');
  if (!notes.length) out.textContent = '';
  else if (correct) out.innerHTML = `<b>${chordSymbol(target, state.notation)}</b> ✓ ¡Bien!`;
  else if (played) out.innerHTML = `Estás tocando <b>${chordSymbol(played, state.notation)}</b>`;
  else out.textContent = '';
  out.classList.toggle('is-correct', !!correct);
  return correct;
}

// En modo canción, al acertar se pasa al siguiente acorde. Hay que soltar las teclas antes del próximo acierto.
let waitingForRelease = false;
function onMidiChange(notes) {
  state.midiNotes = notes;
  const correct = updateMidiFeedback();
  if (!notes.size) waitingForRelease = false;
  if (correct && !waitingForRelease && state.tab === 'song' && !state.playing && state.song.items.length) {
    waitingForRelease = true;
    setTimeout(() => goTo(state.song.index + 1, { sound: false }), 350);
  }
}

async function enableMidi() {
  const button = $('midiBtn');
  button.disabled = true;
  try {
    await connectMidi({
      onChange: onMidiChange,
      onDevices: (names) => {
        $('midiText').textContent = names.length
          ? `Conectado: ${names.join(', ')}. Toca el acorde que ves en pantalla.`
          : 'No encuentro ningún teclado. Conéctalo por USB; se detectará solo.';
      },
    });
    button.textContent = 'Teclado MIDI activo';
  } catch {
    button.disabled = false;
    $('midiText').textContent = 'No se pudo acceder al teclado MIDI. Revisa los permisos del navegador.';
  }
}

// ---------- Pestañas y notación ----------

function setTab(tab) {
  state.tab = tab;
  document.querySelectorAll('[role="tab"]').forEach((el) => el.setAttribute('aria-selected', el.dataset.tab === tab));
  $('panel-explore').hidden = tab !== 'explore';
  $('panel-song').hidden = tab !== 'song';
  if (tab === 'explore') {
    stopPlayback();
    showExplore({ sound: false });
  } else if (state.song.items.length) {
    goTo(Math.max(state.song.index, 0), { sound: false });
  }
  saveSettings();
}

function setNotation(notation) {
  state.notation = notation;
  document.querySelectorAll('[data-notation]').forEach((el) => el.setAttribute('aria-checked', el.dataset.notation === notation));
  keyboard.setNotation(notation);
  if (state.current) present(state.current.chord, { inversion: state.current.inversion, sound: false });
  renderExploreControls();
  renderSheet();
  saveSettings();
}

// ---------- Eventos ----------

function on(id, event, handler) {
  $(id).addEventListener(event, handler);
}

function delegate(id, selector, handler) {
  on(id, 'click', (event) => {
    const target = event.target.closest(selector);
    if (target) handler(target);
  });
}

function bindEvents() {
  document.querySelectorAll('[data-notation]').forEach((el) => el.addEventListener('click', () => setNotation(el.dataset.notation)));
  document.querySelectorAll('[role="tab"]').forEach((el) => el.addEventListener('click', () => setTab(el.dataset.tab)));

  on('replayBtn', 'click', () => playCurrent());
  on('arpeggioBtn', 'click', () => playCurrent({ arpeggio: true }));
  on('bassToggle', 'change', (e) => {
    state.withBass = e.target.checked;
    if (state.current) present(state.current.chord, { inversion: state.current.inversion });
    saveSettings();
  });

  delegate('roots', '[data-pc]', (el) => selectExplore({ rootPc: Number(el.dataset.pc) }));
  delegate('triads', '[data-quality]', (el) => selectExplore({ quality: el.dataset.quality }));
  delegate('extended', '[data-quality]', (el) => selectExplore({ quality: el.dataset.quality }));
  delegate('inversions', '[data-inversion]', (el) => selectExplore({ inversion: Number(el.dataset.inversion) }));
  delegate('diatonic', '[data-degree]', (el) => playDegree(Number(el.dataset.degree)));

  on('loadSongBtn', 'click', () => loadSong($('songInput').value));
  on('songInput', 'keydown', (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) loadSong($('songInput').value);
  });
  on('examples', 'change', (e) => {
    const example = EXAMPLES[Number(e.target.value)];
    e.target.value = '';
    if (!example) return;
    $('songInput').value = example.text;
    loadSong(example.text);
    $('songFeedback').textContent = example.note;
  });
  delegate('sheet', '[data-index]', (el) => goTo(Number(el.dataset.index)));
  on('prevBtn', 'click', () => goTo(state.song.index - 1));
  on('nextBtn', 'click', () => goTo(state.song.index + 1));
  on('playBtn', 'click', () => (state.playing ? stopPlayback() : startPlayback()));

  on('tempo', 'input', (e) => {
    state.song.bpm = Number(e.target.value);
    $('tempoValue').textContent = state.song.bpm;
    saveSettings();
  });
  on('beatsPerChord', 'change', (e) => {
    state.song.beatsPerChord = Number(e.target.value);
    beat = 0;
    renderBeats();
    saveSettings();
  });
  const transpose = (delta) => {
    state.song.transpose = Math.max(-11, Math.min(11, state.song.transpose + delta));
    renderSheet();
    if (state.song.index >= 0) goTo(state.song.index);
    saveSettings();
  };
  on('transposeDown', 'click', () => transpose(-1));
  on('transposeUp', 'click', () => transpose(1));
  on('smoothToggle', 'change', (e) => {
    state.song.smooth = e.target.checked;
    if (state.song.index >= 0) goTo(state.song.index);
    saveSettings();
  });
  on('clickToggle', 'change', (e) => {
    state.song.click = e.target.checked;
    saveSettings();
  });
  on('shareBtn', 'click', shareSong);

  if (isMidiSupported()) on('midiBtn', 'click', enableMidi);
  else {
    $('midiBtn').hidden = true;
    $('midiText').textContent = 'Para conectar un piano digital usa Chrome o Edge en un computador.';
  }

  document.addEventListener('keydown', handleShortcut);
  // El primer toque en cualquier parte habilita el audio (requisito de los navegadores).
  document.addEventListener('pointerdown', () => piano.unlock(), { once: true });
}

function handleShortcut(event) {
  if (event.target.closest('input, textarea, select') || event.metaKey || event.ctrlKey || event.altKey) return;
  const inSong = state.tab === 'song' && state.song.items.length > 0;
  const key = event.key;

  if (key === ' ') {
    event.preventDefault();
    if (event.target.closest('button')) event.target.blur();
    if (!inSong) playCurrent();
    else if (state.playing) stopPlayback();
    else startPlayback();
  } else if (key === 'ArrowLeft' || key === 'ArrowRight') {
    event.preventDefault();
    const delta = key === 'ArrowLeft' ? -1 : 1;
    if (inSong) goTo(state.song.index + delta);
    else selectExplore({ rootPc: (state.explore.rootPc + delta + 12) % 12 });
  } else if ((key === 'ArrowUp' || key === 'ArrowDown') && state.tab === 'explore') {
    event.preventDefault();
    const count = QUALITIES[state.explore.quality].tones.length;
    selectExplore({ inversion: (state.explore.inversion + (key === 'ArrowUp' ? 1 : -1) + count) % count });
  } else if (/^[a-g]$/i.test(key)) {
    const letter = 'CDEFGAB'.indexOf(key.toUpperCase());
    if (inSong) jumpToRoot(letter);
    else if (state.tab === 'explore') selectExplore({ rootPc: pitchClass({ letter, accidental: 0 }) });
  } else if (key.toLowerCase() === 'm' && state.tab === 'explore') {
    selectExplore({ quality: QUALITIES[state.explore.quality].family === 'minor' ? 'maj' : 'm' });
  } else if (/^[1-7]$/.test(key) && state.tab === 'explore') {
    playDegree(Number(key) - 1);
  }
}

// ---------- Compartir ----------

function shareSong() {
  const params = new URLSearchParams({ cancion: state.song.text });
  if (state.song.transpose) params.set('tono', state.song.transpose);
  const url = `${location.origin}${location.pathname}#${params}`;
  history.replaceState(null, '', url);
  const button = $('shareBtn');
  navigator.clipboard?.writeText(url).then(
    () => { button.textContent = 'Enlace copiado'; },
    () => { button.textContent = 'Copia la dirección de la barra'; },
  );
  setTimeout(() => { button.textContent = 'Copiar enlace'; }, 2500);
}

function readSharedSong() {
  const params = new URLSearchParams(location.hash.slice(1));
  const text = params.get('cancion');
  if (!text) return false;
  state.song.text = text;
  state.song.transpose = Number(params.get('tono')) || 0;
  state.tab = 'song';
  return true;
}

// ---------- Inicio ----------

function init() {
  loadSettings();
  readSharedSong();

  EXAMPLES.forEach((example, i) => $('examples').add(new Option(example.name, i)));
  $('songInput').value = state.song.text;
  $('tempo').value = state.song.bpm;
  $('tempoValue').textContent = state.song.bpm;
  $('beatsPerChord').value = state.song.beatsPerChord;
  $('smoothToggle').checked = state.song.smooth;
  $('clickToggle').checked = state.song.click;
  $('bassToggle').checked = state.withBass;

  bindEvents();
  piano.load();
  setNotation(state.notation);
  showExplore({ sound: false });
  if (state.song.text) loadSong(state.song.text, { autoplay: false });
  setTab(state.tab);
  renderBeats();
}

init();
