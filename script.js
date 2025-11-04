// Piano chord learning application

// Note mapping
const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

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

// DOM elements
const keys = document.querySelectorAll('.key');
const chordButtons = document.querySelectorAll('.chord-btn');
const clearBtn = document.getElementById('clearBtn');
const chordInfo = document.getElementById('chordInfo');

let currentActiveButton = null;

// Initialize event listeners
function init() {
    chordButtons.forEach(btn => {
        btn.addEventListener('click', () => handleChordClick(btn));
    });

    clearBtn.addEventListener('click', clearAll);

    // Add click effect to piano keys
    keys.forEach(key => {
        key.addEventListener('click', () => {
            key.classList.add('active');
            setTimeout(() => {
                // Only remove active if it's not part of current chord
                if (!currentActiveButton) {
                    key.classList.remove('active');
                }
            }, 200);
        });
    });
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

    // Show the chord on piano
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

    switch(chordType) {
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

    chordInfo.innerHTML = '👆 Haz clic en un acorde para ver las notas en el piano';
}

// Initialize the app
init();
clearAll();
