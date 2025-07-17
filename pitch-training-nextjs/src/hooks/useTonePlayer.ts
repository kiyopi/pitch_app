import { useState, useCallback, useRef, useEffect } from 'react';
import * as Tone from 'tone';

// Type definitions
interface BaseTone {
  note: string;
  octave: number;
  frequency: number;
}

interface TonePlayerConfig {
  volume: number;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

interface TonePlayerState {
  isLoaded: boolean;
  isPlaying: boolean;
  currentTone: BaseTone | null;
  error: string | null;
}

interface TonePlayerHook {
  playerState: TonePlayerState;
  playTone: (tone: BaseTone, duration?: number) => Promise<void>;
  stopTone: () => void;
  generateRandomBaseTone: () => BaseTone;
  setVolume: (volume: number) => void;
  initialize: () => Promise<boolean>;
  cleanup: () => void;
}

// Base tone candidates (10 appropriate frequency ranges)
const BASE_TONE_CANDIDATES: BaseTone[] = [
  { note: 'C', octave: 3, frequency: 130.81 },   // C3
  { note: 'D', octave: 3, frequency: 146.83 },   // D3
  { note: 'E', octave: 3, frequency: 164.81 },   // E3
  { note: 'F', octave: 3, frequency: 174.61 },   // F3
  { note: 'G', octave: 3, frequency: 196.00 },   // G3
  { note: 'A', octave: 3, frequency: 220.00 },   // A3
  { note: 'C', octave: 4, frequency: 261.63 },   // C4 (Middle C)
  { note: 'E', octave: 4, frequency: 329.63 },   // E4
  { note: 'G', octave: 4, frequency: 392.00 },   // G4
  { note: 'A', octave: 4, frequency: 440.00 },   // A4 (Concert pitch)
];

// Default configuration
const defaultConfig: TonePlayerConfig = {
  volume: -12, // dB
  attack: 0.1,
  decay: 0.2,
  sustain: 0.7,
  release: 0.3,
};

export const useTonePlayer = (
  config: Partial<TonePlayerConfig> = {}
): TonePlayerHook => {
  const finalConfig = { ...defaultConfig, ...config };
  
  const [playerState, setPlayerState] = useState<TonePlayerState>({
    isLoaded: false,
    isPlaying: false,
    currentTone: null,
    error: null,
  });

  // Refs for Tone.js components
  const synthRef = useRef<Tone.Sampler | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Tone.js and load samples
  const initialize = useCallback(async (): Promise<boolean> => {
    try {
      setPlayerState(prev => ({ ...prev, error: null }));

      // Start Tone.js audio context
      if (Tone.context.state !== 'running') {
        await Tone.start();
      }

      // Create Sampler with Salamander Grand Piano samples
      const sampler = new Tone.Sampler({
        urls: {
          A0: "A0.mp3",
          C1: "C1.mp3",
          "D#1": "Ds1.mp3",
          "F#1": "Fs1.mp3",
          A1: "A1.mp3",
          C2: "C2.mp3",
          "D#2": "Ds2.mp3",
          "F#2": "Fs2.mp3",
          A2: "A2.mp3",
          C3: "C3.mp3",
          "D#3": "Ds3.mp3",
          "F#3": "Fs3.mp3",
          A3: "A3.mp3",
          C4: "C4.mp3",
          "D#4": "Ds4.mp3",
          "F#4": "Fs4.mp3",
          A4: "A4.mp3",
          C5: "C5.mp3",
          "D#5": "Ds5.mp3",
          "F#5": "Fs5.mp3",
          A5: "A5.mp3",
          C6: "C6.mp3",
          "D#6": "Ds6.mp3",
          "F#6": "Fs6.mp3",
          A6: "A6.mp3",
          C7: "C7.mp3",
          "D#7": "Ds7.mp3",
          "F#7": "Fs7.mp3",
          A7: "A7.mp3",
          C8: "C8.mp3"
        },
        baseUrl: "https://tonejs.github.io/audio/salamander/",
        attack: finalConfig.attack,
        decay: finalConfig.decay,
        sustain: finalConfig.sustain,
        release: finalConfig.release,
      }).toDestination();

      // Set volume
      sampler.volume.value = finalConfig.volume;

      synthRef.current = sampler;

      // Wait for samples to load
      await new Promise<void>((resolve) => {
        const checkLoaded = () => {
          if (sampler.loaded) {
            resolve();
          } else {
            setTimeout(checkLoaded, 100);
          }
        };
        checkLoaded();
      });

      setPlayerState(prev => ({
        ...prev,
        isLoaded: true,
      }));

      return true;
    } catch (error) {
      console.error('Failed to initialize tone player:', error);
      setPlayerState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to initialize tone player',
      }));
      return false;
    }
  }, [finalConfig.volume, finalConfig.attack, finalConfig.decay, finalConfig.sustain, finalConfig.release]);

  // Play a tone
  const playTone = useCallback(async (tone: BaseTone, duration: number = 2): Promise<void> => {
    try {
      if (!synthRef.current) {
        throw new Error('Tone player not initialized');
      }

      // Ensure audio context is running
      if (Tone.context.state !== 'running') {
        await Tone.start();
      }

      // Stop any currently playing tone
      if (playerState.isPlaying) {
        stopTone();
      }

      setPlayerState(prev => ({
        ...prev,
        isPlaying: true,
        currentTone: tone,
      }));

      // Play the tone
      const noteString = `${tone.note}${tone.octave}`;
      synthRef.current.triggerAttack(noteString);

      // Stop after duration
      timeoutRef.current = setTimeout(() => {
        if (synthRef.current) {
          synthRef.current.triggerRelease(noteString);
        }
        setPlayerState(prev => ({
          ...prev,
          isPlaying: false,
          currentTone: null,
        }));
      }, duration * 1000);

    } catch (error) {
      console.error('Failed to play tone:', error);
      setPlayerState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to play tone',
        isPlaying: false,
      }));
    }
  }, [playerState.isPlaying]);

  // Stop currently playing tone
  const stopTone = useCallback(() => {
    try {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (synthRef.current && playerState.currentTone) {
        const noteString = `${playerState.currentTone.note}${playerState.currentTone.octave}`;
        
        // Check if triggerRelease is available and call it safely
        if (typeof synthRef.current.triggerRelease === 'function') {
          synthRef.current.triggerRelease(noteString);
        } else if ('releaseAll' in synthRef.current && typeof synthRef.current.releaseAll === 'function') {
          (synthRef.current as any).releaseAll();
        }
      }

      setPlayerState(prev => ({
        ...prev,
        isPlaying: false,
        currentTone: null,
      }));
    } catch (error) {
      console.error('Failed to stop tone:', error);
    }
  }, [playerState.currentTone]);

  // Generate random base tone
  const generateRandomBaseTone = useCallback((): BaseTone => {
    const randomIndex = Math.floor(Math.random() * BASE_TONE_CANDIDATES.length);
    return { ...BASE_TONE_CANDIDATES[randomIndex] };
  }, []);

  // Set volume
  const setVolume = useCallback((volume: number) => {
    try {
      if (synthRef.current) {
        synthRef.current.volume.value = volume;
      }
    } catch (error) {
      console.error('Failed to set volume:', error);
    }
  }, []);

  // Cleanup function
  const cleanup = useCallback(() => {
    try {
      stopTone();
      
      if (synthRef.current) {
        synthRef.current.dispose();
        synthRef.current = null;
      }

      setPlayerState({
        isLoaded: false,
        isPlaying: false,
        currentTone: null,
        error: null,
      });
    } catch (error) {
      console.error('Failed to cleanup tone player:', error);
    }
  }, [stopTone]);

  // Initialize on mount
  useEffect(() => {
    if (!playerState.isLoaded && !playerState.error) {
      initialize();
    }
  }, [initialize, playerState.isLoaded, playerState.error]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    playerState,
    playTone,
    stopTone,
    generateRandomBaseTone,
    setVolume,
    initialize,
    cleanup,
  };
};