import { useState, useCallback, useRef, useEffect } from 'react';
import { PitchDetector } from 'pitchy';

// Type definitions
interface PitchData {
  frequency: number;
  note: string;
  octave: number;
  cents: number;
  clarity: number;
  isValid: boolean;
}

interface PitchDetectionConfig {
  sampleRate: number;
  bufferSize: number;
  clarityThreshold: number;
  frequencyRange: {
    min: number;
    max: number;
  };
}

interface PitchDetectionHook {
  currentPitch: PitchData | null;
  isDetecting: boolean;
  startDetection: (getAudioData: () => Float32Array | null) => void;
  stopDetection: () => void;
  resetDetection: () => void;
}

// Note names for conversion
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Default configuration
const defaultConfig: PitchDetectionConfig = {
  sampleRate: 44100,
  bufferSize: 4096,
  clarityThreshold: 0.85,
  frequencyRange: {
    min: 80,   // Lowest note around E2
    max: 2000, // Highest note around B6
  },
};

export const usePitchDetection = (
  config: Partial<PitchDetectionConfig> = {}
): PitchDetectionHook => {
  const finalConfig = { ...defaultConfig, ...config };
  
  const [currentPitch, setCurrentPitch] = useState<PitchData | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);

  // Refs for pitch detection
  const detectorRef = useRef<PitchDetector<Float32Array> | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const getAudioDataRef = useRef<(() => Float32Array | null) | null>(null);

  // Initialize pitch detector
  const initializeDetector = useCallback(() => {
    try {
      const detector = PitchDetector.forFloat32Array(finalConfig.bufferSize);
      detectorRef.current = detector;
      return true;
    } catch (error) {
      console.error('Failed to initialize pitch detector:', error);
      return false;
    }
  }, [finalConfig.bufferSize]);

  // Convert frequency to note information
  const frequencyToNote = useCallback((frequency: number): { note: string; octave: number; cents: number } => {
    const A4 = 440; // A4 frequency
    const semitonesFromA4 = 12 * Math.log2(frequency / A4);
    const roundedSemitones = Math.round(semitonesFromA4);
    const cents = Math.round((semitonesFromA4 - roundedSemitones) * 100);
    
    // Calculate note and octave
    const noteIndex = (9 + roundedSemitones) % 12; // A is index 9
    const note = NOTE_NAMES[noteIndex < 0 ? noteIndex + 12 : noteIndex];
    const octave = Math.floor((9 + roundedSemitones) / 12) + 4;
    
    return { note, octave, cents };
  }, []);

  // Validate frequency
  const isValidFrequency = useCallback((frequency: number): boolean => {
    return (
      frequency >= finalConfig.frequencyRange.min &&
      frequency <= finalConfig.frequencyRange.max &&
      !isNaN(frequency) &&
      isFinite(frequency)
    );
  }, [finalConfig.frequencyRange]);

  // Process audio data for pitch detection
  const processAudioData = useCallback(() => {
    if (!detectorRef.current || !getAudioDataRef.current) return;

    try {
      const audioData = getAudioDataRef.current();
      if (!audioData || audioData.length === 0) return;

      // Detect pitch using Pitchy (McLeod Pitch Method)
      const [frequency, clarity] = detectorRef.current.findPitch(
        audioData,
        finalConfig.sampleRate
      );

      // Validate detection results
      if (
        clarity >= finalConfig.clarityThreshold &&
        isValidFrequency(frequency)
      ) {
        const { note, octave, cents } = frequencyToNote(frequency);

        const pitchData: PitchData = {
          frequency: Math.round(frequency * 100) / 100,
          note,
          octave,
          cents,
          clarity: Math.round(clarity * 100) / 100,
          isValid: true,
        };

        setCurrentPitch(pitchData);
      } else {
        // Invalid detection - keep previous valid pitch but mark as invalid
        setCurrentPitch(prev => prev ? { ...prev, isValid: false } : null);
      }

      // Continue detection
      if (isDetecting) {
        animationFrameRef.current = requestAnimationFrame(processAudioData);
      }
    } catch (error) {
      console.error('Pitch detection processing failed:', error);
    }
  }, [
    finalConfig.sampleRate,
    finalConfig.clarityThreshold,
    isValidFrequency,
    frequencyToNote,
    isDetecting,
  ]);

  // Start pitch detection
  const startDetection = useCallback((getAudioData: () => Float32Array | null) => {
    try {
      if (!detectorRef.current) {
        const success = initializeDetector();
        if (!success) {
          console.error('Failed to initialize pitch detector');
          return;
        }
      }

      getAudioDataRef.current = getAudioData;
      setIsDetecting(true);
      setCurrentPitch(null);

      // Start processing
      processAudioData();
    } catch (error) {
      console.error('Failed to start pitch detection:', error);
    }
  }, [initializeDetector, processAudioData]);

  // Stop pitch detection
  const stopDetection = useCallback(() => {
    try {
      setIsDetecting(false);
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      getAudioDataRef.current = null;
    } catch (error) {
      console.error('Failed to stop pitch detection:', error);
    }
  }, []);

  // Reset detection state
  const resetDetection = useCallback(() => {
    stopDetection();
    setCurrentPitch(null);
  }, [stopDetection]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return {
    currentPitch,
    isDetecting,
    startDetection,
    stopDetection,
    resetDetection,
  };
};