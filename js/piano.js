// piano.js — replace your existing file with this
document.addEventListener("DOMContentLoaded", () => {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const audioCtx = new AudioContext();

  const pianoKeysContainer = document.getElementById("pianoKeys");
  const volumeControl = document.getElementById("volumeControl");
  const volumeValue = document.getElementById("volumeValue");
  const waveSelect = document.getElementById("waveSelect");
  const octaveSelect = document.getElementById("octaveSelect");

  // master gain
  const masterGain = audioCtx.createGain();
  masterGain.gain.value = (volumeControl && volumeControl.value) ? volumeControl.value / 100 : 0.5;
  masterGain.connect(audioCtx.destination);

  if (volumeControl) {
    volumeValue.textContent = `${volumeControl.value}%`;
    volumeControl.addEventListener("input", () => {
      masterGain.gain.value = volumeControl.value / 100;
      volumeValue.textContent = `${volumeControl.value}%`;
    });
  }

  // MIDI / note helpers
  const NOTE_NAMES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  function midiToFreq(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  // Build the 2-octave note list: starting from base octave's C up to B (24 notes)
  // We'll generate notes relative to the selected base octave (so octaveSelect still works)
  function buildNoteList(baseOctave) {
    // midi for C of baseOctave: (baseOctave + 1)*12
    const startMidi = (baseOctave + 1) * 12; // C
    const notes = [];
    for (let i = 0; i < 24; i++) {
      const midi = startMidi + i;
      const name = NOTE_NAMES[midi % 12];
      notes.push({ midi, name, isSharp: name.includes("#") });
    }
    return notes;
  }

function renderKeys() {
  pianoKeysContainer.innerHTML = "";

  const baseOctave = parseInt(octaveSelect ? octaveSelect.value : 4, 10);
  const notes = buildNoteList(baseOctave);

  // First pass: create white keys
  const whiteEls = [];
  notes.forEach(n => {
    if (!n.isSharp) {
      const w = document.createElement("div");
      w.className = "key white-key";
      w.dataset.midi = n.midi;
      w.dataset.name = n.name;
      const lbl = document.createElement("div");
      lbl.className = "key-label";
      lbl.textContent = n.name + (Math.floor(n.midi / 12) - 1);
      w.appendChild(lbl);
      pianoKeysContainer.appendChild(w);
      whiteEls.push(w);
    }
  });

  const whiteWidth = whiteEls[0].offsetWidth || 60;
  const blackWidth = whiteWidth * 0.6;

  // Position white keys
  whiteEls.forEach((el, i) => {
    el.style.position = "absolute";
    el.style.left = `${i * whiteWidth}px`;
    attachPointerHandlers(el);
  });

  // Correct spacing map — which white keys each sharp belongs between
  const blackMap = {
    "C#": 0,
    "D#": 1,
    "F#": 3,
    "G#": 4,
    "A#": 5
  };

  // Track where we are in the 12-note cycle to repeat correctly across octaves
  let octaveOffset = 0;

  notes.forEach(n => {
    if (!n.isSharp) return;

    const name = n.name.replace(/[0-9]/g, "");
    let posIndex = blackMap[name];
    if (posIndex === undefined) {
      // move to next octave mapping
      octaveOffset += 7;
      return;
    }

    // find how many complete octaves passed to shift black key position
    const octaveNumber = Math.floor((n.midi - notes[0].midi) / 12);
    const left =
      (posIndex + octaveOffset + octaveNumber * 7 + 1) * whiteWidth -
      blackWidth / 2;

    const b = document.createElement("div");
    b.className = "key black-key";
    b.dataset.midi = n.midi;
    b.dataset.name = n.name;
    const lbl = document.createElement("div");
    lbl.className = "key-label";
    lbl.textContent = n.name + (Math.floor(n.midi / 12) - 1);
    b.appendChild(lbl);
    b.style.position = "absolute";
    b.style.left = `${left}px`;

    pianoKeysContainer.appendChild(b);
    attachPointerHandlers(b);
  });

  // Set container width to fit all white keys
  pianoKeysContainer.style.position = "relative";
  pianoKeysContainer.style.width = `${whiteEls.length * whiteWidth}px`;
}


  // Simple ADSR-ish envelope parameters for a nicer "piano-like" attack/release
  const ADSR = {
    attack: 0.01,
    decay: 0.12,
    sustain: 0.75,
    release: 0.25
  };

  // Active voices map: midi -> { osc, gainNode, keyEl }
  const activeVoices = new Map();

  function startNoteForElement(keyEl) {
    if (!keyEl || !keyEl.dataset.midi) return;
    if (audioCtx.state === "suspended") audioCtx.resume();

    const midi = parseInt(keyEl.dataset.midi, 10);
    // allow polyphony: multiple voices with same midi should be prevented — so skip if already active for this element
    if (activeVoices.has(keyEl)) return;

    const freq = midiToFreq(midi);
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    oscillatorsAttach(osc, gain);

    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    osc.type = (waveSelect && waveSelect.value) ? waveSelect.value : "triangle";

    // ADSR start
    const now = audioCtx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(1.0, now + ADSR.attack);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, ADSR.sustain), now + ADSR.attack + ADSR.decay);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);

    activeVoices.set(keyEl, { osc, gain });
    keyEl.classList.add("active");
  }

  function stopNoteForElement(keyEl) {
    if (!keyEl) return;
    const voice = activeVoices.get(keyEl);
    if (!voice) {
      keyEl.classList.remove("active");
      return;
    }
    const { gain, osc } = voice;
    const now = audioCtx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + ADSR.release);
    try {
      osc.stop(now + ADSR.release + 0.02);
    } catch (e) { /* ignore if already stopped */ }
    setTimeout(() => {
      try { osc.disconnect(); gain.disconnect(); } catch (e) {}
    }, (ADSR.release + 0.1) * 1000);
    activeVoices.delete(keyEl);
    keyEl.classList.remove("active");
  }

  // Helper to attach pointer handlers to a key element
  function attachPointerHandlers(el) {
    // Use pointer events so touch + mouse work. Track active pointer IDs if needed.
    el.addEventListener("pointerdown", (ev) => {
      ev.preventDefault();
      // resume audio context on first interaction
      if (audioCtx.state === "suspended") audioCtx.resume();
      // capture pointer to keep receiving events even if finger/mouse leaves
      try { el.setPointerCapture(ev.pointerId); } catch (e) {}
      startNoteForElement(el);
    });
    el.addEventListener("pointerup", (ev) => {
      ev.preventDefault();
      try { el.releasePointerCapture(ev.pointerId); } catch (e) {}
      stopNoteForElement(el);
    });
    el.addEventListener("pointercancel", (ev) => {
      ev.preventDefault();
      stopNoteForElement(el);
    });
    // also stop if pointer leaves while not pressed (safety)
    el.addEventListener("pointerleave", (ev) => {
      // If pointer is not down (buttons===0) stop; some browsers send leave while pressed — keep it conservative
      if (ev.pressure === 0 || ev.buttons === 0) stopNoteForElement(el);
    });
  }

  function oscillatorsAttach(osc, gain) {
    // nothing fancy here but kept as separate function for future extension (filters, reverb, etc.)
    // we could insert a subtle filter for more realistic tone if desired.
    // e.g. const filter = audioCtx.createBiquadFilter(); filter.type = 'lowpass'; ...
  }

  // regenerate keys when octaveSelect changes
  if (octaveSelect) {
    octaveSelect.addEventListener("change", renderKeys);
  }

  // initial render
  renderKeys();

  // Ensure audio context is resumed on a first user gesture anywhere on page (fallback)
  window.addEventListener("pointerdown", function onceResume() {
    if (audioCtx.state === "suspended") audioCtx.resume();
    window.removeEventListener("pointerdown", onceResume);
  }, { once: true });
});
