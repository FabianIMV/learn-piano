// Piano chord learning application with audio, keyboard support, and song mode

// Note mapping
const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Note frequencies (Hz) for 4th octave
const noteFrequencies = {
    'C': 261.63, 'C#': 277.18, 'D': 293.66, 'D#': 311.13,
    'E': 329.63, 'F': 349.23, 'F#': 369.99, 'G': 392.00,
    'G#': 415.30, 'A': 440.00, 'A#': 466.16, 'B': 493.88,
    'C2': 523.25, 'C#2': 554.37, 'D2': 587.33, 'D#2': 622.25,
    'E2': 659.25, 'F2': 698.46, 'F#2': 739.99, 'G2': 783.99
};

// Chord formulas (in semitones from root)
const chordFormulas = {
    mayor: [0, 4, 7],      // Root, Major 3rd, Perfect 5th
    menor: [0, 3, 7],      // Root, Minor 3rd, Perfect 5th
};

// Chord names in Spanish
const chordNames = {
    mayor: 'Mayor',
    menor: 'Menor',
};

// Audio context for sound generation
let audioCtx = null;

// DOM elements
const keys = document.querySelectorAll('.key');
const chordButtons = document.querySelectorAll('.chord-btn');
const clearBtn = document.getElementById('clearBtn');
const chordInfo = document.getElementById('chordInfo');
const modeButtons = document.querySelectorAll('.mode-btn');

// Song mode elements
const songInput = document.getElementById('songInput');
const loadSongBtn = document.getElementById('loadSongBtn');
const songPlayer = document.getElementById('songPlayer');
const songChords = document.getElementById('songChords');
const prevChordBtn = document.getElementById('prevChordBtn');
const nextChordBtn = document.getElementById('nextChordBtn');

let currentActiveButton = null;
let currentMode = 'mayor'; // Default mode for keyboard
let keyboardSource = 'song'; // 'song' uses song chords, 'default' uses Major/Minor

// Song mode state
let songChordsList = [];
let currentSongIndex = -1;

// Keyboard source selector elements
const sourceSongBtn = document.getElementById('sourceSongBtn');
const sourceDefaultBtn = document.getElementById('sourceDefaultBtn');

// Keyboard mapping (physical key to chord root)
const keyboardMap = {
    'KeyC': 'C', 'KeyD': 'D', 'KeyE': 'E', 'KeyF': 'F',
    'KeyG': 'G', 'KeyA': 'A', 'KeyB': 'B'
};

// Initialize audio context
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

// Play a single note using Web Audio API with realistic piano sound
function playNote(noteName, duration = 2.5) {
    initAudio();

    const frequency = noteFrequencies[noteName];
    if (!frequency) return;

    const now = audioCtx.currentTime;

    // Master gain for this note
    const masterGain = audioCtx.createGain();
    masterGain.connect(audioCtx.destination);

    // Create convolver for reverb effect
    const convolver = createReverb();
    const reverbGain = audioCtx.createGain();
    reverbGain.gain.value = 0.15;
    convolver.connect(reverbGain);
    reverbGain.connect(audioCtx.destination);

    // Piano has multiple harmonics - create them
    const harmonics = [
        { ratio: 1, gain: 0.6, type: 'sine' },        // Fundamental
        { ratio: 2, gain: 0.25, type: 'sine' },       // 2nd harmonic
        { ratio: 3, gain: 0.12, type: 'sine' },       // 3rd harmonic
        { ratio: 4, gain: 0.08, type: 'sine' },       // 4th harmonic
        { ratio: 5, gain: 0.04, type: 'sine' },       // 5th harmonic
        { ratio: 6, gain: 0.02, type: 'sine' },       // 6th harmonic
    ];

    harmonics.forEach(harmonic => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = harmonic.type;
        osc.frequency.setValueAtTime(frequency * harmonic.ratio, now);

        // Slight detuning for warmth (piano strings are slightly out of tune)
        const detune = (Math.random() - 0.5) * 4;
        osc.detune.setValueAtTime(detune, now);

        // Piano ADSR envelope - quick attack, natural decay
        const peakGain = harmonic.gain * 0.4;

        // Attack (hammer strike) - very fast
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(peakGain, now + 0.005);

        // Initial decay (hammer release)
        gain.gain.exponentialRampToValueAtTime(peakGain * 0.7, now + 0.05);

        // Sustain decay (string vibration dying)
        gain.gain.exponentialRampToValueAtTime(peakGain * 0.3, now + 0.3);

        // Long release (natural string decay)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc.connect(gain);
        gain.connect(masterGain);
        gain.connect(convolver);

        osc.start(now);
        osc.stop(now + duration + 0.1);
    });

    // Add hammer noise for attack realism
    const noiseBuffer = createNoiseBuffer(0.03);
    const noise = audioCtx.createBufferSource();
    noise.buffer = noiseBuffer;

    const noiseGain = audioCtx.createGain();
    const noiseFilter = audioCtx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = frequency * 2;
    noiseFilter.Q.value = 1;

    noiseGain.gain.setValueAtTime(0.08, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(masterGain);

    noise.start(now);
}

// Create a simple reverb impulse response
function createReverb() {
    const convolver = audioCtx.createConvolver();
    const rate = audioCtx.sampleRate;
    const length = rate * 1.5;
    const impulse = audioCtx.createBuffer(2, length, rate);

    for (let channel = 0; channel < 2; channel++) {
        const channelData = impulse.getChannelData(channel);
        for (let i = 0; i < length; i++) {
            channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5);
        }
    }

    convolver.buffer = impulse;
    return convolver;
}

// Create noise buffer for hammer attack
function createNoiseBuffer(duration) {
    const sampleRate = audioCtx.sampleRate;
    const bufferSize = sampleRate * duration;
    const buffer = audioCtx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
    }

    return buffer;
}

// Play a chord (multiple notes with slight arpeggio)
function playChord(chordNotes, arpeggiate = true) {
    const delay = arpeggiate ? 0.05 : 0; // 50ms between notes for arpeggio effect

    chordNotes.forEach((note, index) => {
        setTimeout(() => {
            playNote(note);
        }, index * delay * 1000);
    });
}

// Parse chord string (e.g., "C", "Cm", "C#", "C#m", "Em", "Am")
function parseChordString(chordStr) {
    chordStr = chordStr.trim();
    if (!chordStr) return null;

    let root = '';
    let type = 'mayor';

    // Handle minor chords (ends with 'm' but not '#m' case handled separately)
    const lowerStr = chordStr.toLowerCase();

    if (lowerStr.endsWith('#m')) {
        // Sharp minor: C#m, F#m, etc.
        type = 'menor';
        root = chordStr.slice(0, -1).toUpperCase(); // Remove 'm', keep '#'
    } else if (lowerStr.endsWith('m') && chordStr.length > 1) {
        // Regular minor: Cm, Em, Am, etc.
        type = 'menor';
        root = chordStr.slice(0, -1).toUpperCase(); // Remove 'm'
    } else {
        // Major chord
        root = chordStr.toUpperCase();
    }

    // Validate root note exists in our notes array
    if (!notes.includes(root)) {
        // Try matching just the base note letter
        const baseNote = root.charAt(0);
        if (!['C', 'D', 'E', 'F', 'G', 'A', 'B'].includes(baseNote)) {
            return null;
        }
    }

    return { root, type };
}

// Load song from input
function loadSong() {
    const input = songInput.value;
    if (!input.trim()) return;

    const chordStrings = input.split(',').map(s => s.trim()).filter(s => s);
    songChordsList = chordStrings.map(parseChordString).filter(c => c !== null);

    if (songChordsList.length === 0) {
        alert('No se encontraron acordes válidos. Usa formato: C, D, Em, Bm, G#');
        return;
    }

    currentSongIndex = 0;
    renderSongChords();
    songPlayer.classList.remove('hidden');
    playSongChord(0);
}

// Render song chord buttons
function renderSongChords() {
    songChords.innerHTML = '';

    songChordsList.forEach((chord, index) => {
        const btn = document.createElement('button');
        const displayName = chord.root + (chord.type === 'menor' ? 'm' : '');
        btn.textContent = displayName;
        btn.className = `song-chord-btn ${chord.type === 'menor' ? 'minor' : 'major'}`;
        btn.dataset.index = index;

        if (index === currentSongIndex) {
            btn.classList.add('active');
        }

        btn.addEventListener('click', () => {
            playSongChord(index);
        });

        songChords.appendChild(btn);
    });
}

// Play chord at given index in song
function playSongChord(index) {
    if (index < 0 || index >= songChordsList.length) return;

    currentSongIndex = index;
    const chord = songChordsList[index];

    // Update visual selection
    document.querySelectorAll('.song-chord-btn').forEach((btn, i) => {
        btn.classList.toggle('active', i === index);
    });

    // Find corresponding chord button and trigger it
    const selector = `.chord-btn[data-root="${chord.root}"][data-type="${chord.type}"]`;
    const chordBtn = document.querySelector(selector);

    if (chordBtn) {
        handleChordClick(chordBtn);
    } else {
        // Direct play if button not found
        showChord(chord.root, chord.type);
    }
}

// Navigate to previous chord
function prevSongChord() {
    if (songChordsList.length === 0) return;
    const newIndex = currentSongIndex > 0 ? currentSongIndex - 1 : songChordsList.length - 1;
    playSongChord(newIndex);
}

// Navigate to next chord
function nextSongChord() {
    if (songChordsList.length === 0) return;
    const newIndex = currentSongIndex < songChordsList.length - 1 ? currentSongIndex + 1 : 0;
    playSongChord(newIndex);
}

// Initialize event listeners
function init() {
    chordButtons.forEach(btn => {
        btn.addEventListener('click', () => handleChordClick(btn));
    });

    clearBtn.addEventListener('click', clearAll);

    // Mode selector buttons
    modeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            modeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentMode = btn.getAttribute('data-mode');
        });
    });

    // Add click effect to piano keys
    keys.forEach(key => {
        key.addEventListener('click', () => {
            const note = key.getAttribute('data-note');
            key.classList.add('active');
            playNote(note);
            setTimeout(() => {
                // Only remove active if it's not part of current chord
                if (!currentActiveButton) {
                    key.classList.remove('active');
                }
            }, 200);
        });
    });

    // Song mode event listeners
    loadSongBtn.addEventListener('click', loadSong);
    songInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') loadSong();
    });
    prevChordBtn.addEventListener('click', prevSongChord);
    nextChordBtn.addEventListener('click', nextSongChord);

    // Keyboard source selector
    sourceSongBtn.addEventListener('click', () => {
        keyboardSource = 'song';
        sourceSongBtn.classList.add('active');
        sourceDefaultBtn.classList.remove('active');
    });
    sourceDefaultBtn.addEventListener('click', () => {
        keyboardSource = 'default';
        sourceDefaultBtn.classList.add('active');
        sourceSongBtn.classList.remove('active');
    });

    // Keyboard event listeners
    document.addEventListener('keydown', handleKeyDown);
}

// Handle physical keyboard input
function handleKeyDown(event) {
    // Ignore if user is typing in an input field
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;

    // Arrow keys for song navigation
    if (event.key === 'ArrowLeft') {
        event.preventDefault();
        prevSongChord();
        return;
    }
    if (event.key === 'ArrowRight') {
        event.preventDefault();
        nextSongChord();
        return;
    }

    const root = keyboardMap[event.code];
    if (!root) return;

    event.preventDefault();

    // Check which keyboard source mode is selected
    if (keyboardSource === 'song' && songChordsList.length > 0) {
        // Song mode: find chord in song that matches the key's root note
        // E key → finds Em or E in the song, A key → finds Am or A, etc.
        const matchingIndex = songChordsList.findIndex(chord => chord.root === root);

        if (matchingIndex !== -1) {
            playSongChord(matchingIndex);
            return;
        }
    }

    // Default behavior: use Major/Minor mode selector
    const selector = `.chord-btn[data-root="${root}"][data-type="${currentMode}"]`;
    const chordBtn = document.querySelector(selector);

    if (chordBtn) {
        handleChordClick(chordBtn);
    }
}

// Handle chord button click
function handleChordClick(btn) {
    const root = btn.getAttribute('data-root');
    const chordType = btn.getAttribute('data-type');

    // Remove previous button selection
    if (currentActiveButton) {
        currentActiveButton.classList.remove('active');
    }

    // Select new button
    btn.classList.add('active');
    currentActiveButton = btn;

    // Show the chord on piano and play sound
    showChord(root, chordType);
}

// Show chord on piano
function showChord(root, chordType) {
    // Clear previous highlights
    keys.forEach(key => key.classList.remove('active'));

    // Get chord notes
    const chordNotes = getChordNotes(root, chordType);

    // Highlight the keys
    chordNotes.forEach(note => {
        const key = document.querySelector(`.key[data-note="${note}"]`);
        if (key) {
            key.classList.add('active');
        }
    });

    // Play the chord sound
    playChord(chordNotes);

    // Update info display
    displayChordInfo(root, chordType, chordNotes);
}

// Calculate chord notes based on root and type
function getChordNotes(root, chordType) {
    // Normalize root note (remove octave number if present)
    const normalizedRoot = root.replace(/\d+$/, '');

    // Find root index
    let rootIndex = notes.indexOf(normalizedRoot);
    if (rootIndex === -1) {
        console.error('Invalid root note:', root);
        return [];
    }

    // Get chord formula
    const formula = chordFormulas[chordType];
    if (!formula) {
        console.error('Invalid chord type:', chordType);
        return [];
    }

    // Calculate chord notes
    const chordNotes = formula.map(interval => {
        const noteIndex = (rootIndex + interval) % 12;
        let note = notes[noteIndex];

        // Handle octave wrap (if we need the second octave)
        // Check if the resulting note would be "lower" than the root on piano
        const actualNoteIndex = rootIndex + interval;
        if (actualNoteIndex >= 12) {
            note = note + '2';
        }

        return note;
    });

    return chordNotes;
}

// Display chord information
function displayChordInfo(root, chordType, chordNotes) {
    const chordName = `${root} ${chordNames[chordType]}`;
    const notesDisplay = chordNotes.map(note => note.replace('2', '')).join(' - ');

    let intervalDescription = '';
    let emoji = '';

    switch (chordType) {
        case 'mayor':
            intervalDescription = 'Fundamental + 3ª Mayor + 5ª Justa';
            emoji = '😊';
            break;
        case 'menor':
            intervalDescription = 'Fundamental + 3ª Menor + 5ª Justa';
            emoji = '😔';
            break;
    }

    chordInfo.innerHTML = `
        <div>
            <strong style="font-size: 24px;">${emoji} ${chordName}</strong><br>
            <span style="font-size: 18px; color: #555;">Notas: ${notesDisplay}</span><br>
            <span style="font-size: 14px; color: #666; font-style: italic;">${intervalDescription}</span>
        </div>
    `;
}

// Clear all selections
function clearAll() {
    keys.forEach(key => key.classList.remove('active'));

    if (currentActiveButton) {
        currentActiveButton.classList.remove('active');
        currentActiveButton = null;
    }

    chordInfo.innerHTML = '👆 Haz clic en un acorde o presiona una tecla (C, D, E, F, G, A, B) para ver y escuchar el acorde';
}

// Initialize the app
init();
clearAll();
