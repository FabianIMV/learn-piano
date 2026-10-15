// Entrada desde un teclado MIDI (piano digital por USB o Bluetooth).

export function isMidiSupported() {
  return typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator;
}

/** Escucha todas las entradas MIDI. `onChange` recibe el conjunto de teclas presionadas cada vez que cambia. */
export async function connectMidi({ onChange, onDevices }) {
  const access = await navigator.requestMIDIAccess();
  const held = new Set();

  const handle = ({ data }) => {
    const [status, noteNumber, velocity] = data;
    const type = status & 0xf0;
    if (type === 0x90 && velocity > 0) held.add(noteNumber);
    else if (type === 0x80 || type === 0x90) held.delete(noteNumber);
    else return;
    onChange(new Set(held));
  };

  const attach = () => {
    const names = [];
    for (const input of access.inputs.values()) {
      input.onmidimessage = handle;
      names.push(input.name);
    }
    onDevices(names);
  };

  access.onstatechange = attach;
  attach();
}
