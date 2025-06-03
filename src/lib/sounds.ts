"use client";

import * as Tone from 'tone';

let synth: Tone.Synth | null = null;
let isToneStarted = false;

export async function initTone() {
  if (isToneStarted) return;
  try {
    await Tone.start();
    synth = new Tone.Synth().toDestination();
    isToneStarted = true;
    console.log("AudioContext started");
  } catch (e) {
    console.error("Could not start Tone.js AudioContext:", e);
  }
}

export function playSendSound() {
  if (!isToneStarted || !synth) {
    console.warn("Tone.js not initialized or synth not available. Call initTone() on user interaction.");
    // Attempt to initialize if not already, good for subsequent calls
    initTone().then(() => {
      if(synth) {
         synth.triggerAttackRelease("C5", "8n", Tone.now());
      }
    });
    return;
  }
  try {
    synth.triggerAttackRelease("C5", "8n", Tone.now());
  } catch (e) {
    console.error("Error playing sound:", e)
  }
}

// It's good practice to have a general interaction listener to start Tone.
// This can be called in a top-level client component's useEffect.
export function addToneStartListener() {
  const startAudio = async () => {
    await initTone();
    document.removeEventListener('click', startAudio);
    document.removeEventListener('keydown', startAudio);
  };
  document.addEventListener('click', startAudio);
  document.addEventListener('keydown', startAudio);
  
  return () => {
    document.removeEventListener('click', startAudio);
    document.removeEventListener('keydown', startAudio);
  };
}
