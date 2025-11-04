// Piano chord learning application

// Note mapping
const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Chord formulas (in semitones from root)
const chordFormulas = {
    mayor: [0, 4, 7],      // Root, Major 3rd, Perfect 5th
    menor: [0, 3, 7],      // Root, Minor 3rd, Perfect 5th
    disminuido: [0, 3, 6], // Root, Minor 3rd, Diminished 5th
    aumentado: [0, 4, 8]   // Root, Major 3rd, Augmented 5th
};

// Chord names in Spanish
const chordNames = {
    mayor: 'Mayor',
    menor: 'Menor',
    disminuido: 'Disminuido',
    aumentado: 'Aumentado'
};

// State
let selectedRoot = null;
let selectedChordType = null;

// DOM elements
const keys = document.querySelectorAll('.key');
const noteButtons = document.querySelectorAll('.note-btn');
const chordButtons = document.querySelectorAll('.chord-btn');
const clearBtn = document.getElementById('clearBtn');
const chordInfo = document.getElementById('chordInfo');

// Initialize event listeners
function init() {
    noteButtons.forEach(btn => {
        btn.addEventListener('click', () => handleNoteClick(btn));
    });

    chordButtons.forEach(btn => {
        btn.addEventListener('click', () => handleChordClick(btn));
    });

    clearBtn.addEventListener('click', clearAll);

    // Add click sound to piano keys
    keys.forEach(key => {
        key.addEventListener('click', () => {
            key.classList.add('active');
            setTimeout(() => key.classList.remove('active'), 300);
        });
    });
}

// Handle note button click
function handleNoteClick(btn) {
    // Remove previous selection
    noteButtons.forEach(b => b.classList.remove('selected'));

    // Select new note
    btn.classList.add('selected');
    selectedRoot = btn.getAttribute('data-root');

    // If chord type is selected, show the chord
    if (selectedChordType) {
        showChord(selectedRoot, selectedChordType);
    }
}

// Handle chord button click
function handleChordClick(btn) {
    selectedChordType = btn.getAttribute('data-type');

    // If root note is selected, show the chord
    if (selectedRoot) {
        showChord(selectedRoot, selectedChordType);
    } else {
        chordInfo.innerHTML = '⚠️ Por favor, selecciona primero una nota base';
    }
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

    // Update info display
    displayChordInfo(root, chordType, chordNotes);
}

// Calculate chord notes based on root and type
function getChordNotes(root, chordType) {
    // Normalize root note (remove octave number if present)
    const normalizedRoot = root.replace(/\d+$/, '');

    // Find root index
    let rootIndex = notes.indexOf(normalizedRoot);
    if (rootIndex === -1) return [];

    // Get chord formula
    const formula = chordFormulas[chordType];
    if (!formula) return [];

    // Calculate chord notes
    const chordNotes = formula.map(interval => {
        const noteIndex = (rootIndex + interval) % 12;
        let note = notes[noteIndex];

        // Handle octave wrap (if we need the second octave)
        if (rootIndex + interval >= 12) {
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
    switch(chordType) {
        case 'mayor':
            intervalDescription = '(Fundamental + 3ª Mayor + 5ª Justa)';
            break;
        case 'menor':
            intervalDescription = '(Fundamental + 3ª Menor + 5ª Justa)';
            break;
        case 'disminuido':
            intervalDescription = '(Fundamental + 3ª Menor + 5ª Disminuida)';
            break;
        case 'aumentado':
            intervalDescription = '(Fundamental + 3ª Mayor + 5ª Aumentada)';
            break;
    }

    chordInfo.innerHTML = `
        <div>
            <strong>🎵 ${chordName}</strong><br>
            <span style="font-size: 16px;">Notas: ${notesDisplay}</span><br>
            <span style="font-size: 14px; color: #666;">${intervalDescription}</span>
        </div>
    `;
}

// Clear all selections
function clearAll() {
    keys.forEach(key => key.classList.remove('active'));
    noteButtons.forEach(btn => btn.classList.remove('selected'));
    selectedRoot = null;
    selectedChordType = null;
    chordInfo.innerHTML = '👆 Selecciona una nota base y un tipo de acorde para empezar';
}

// Initialize the app
init();
clearAll();
