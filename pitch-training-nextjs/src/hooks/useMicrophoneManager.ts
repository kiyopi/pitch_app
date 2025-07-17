import { useState, useCallback, useRef, useEffect } from 'react';

// Type definitions
interface AudioConfig {
  sampleRate: number;
  bufferSize: number;
  lowFrequencyCutoff: number;
  fftSize: number;
}

interface MicrophoneState {
  isRecording: boolean;
  isInitialized: boolean;
  error: string | null;
  audioLevel: number;
}

interface MicrophoneManagerHook {
  microphoneState: MicrophoneState;
  startRecording: () => Promise<boolean>;
  stopRecording: () => void;
  getAudioData: () => Float32Array | null;
  cleanup: () => void;
}

// Default audio configuration
const defaultAudioConfig: AudioConfig = {
  sampleRate: 44100,
  bufferSize: 4096,
  lowFrequencyCutoff: 25, // 23-25Hz low frequency noise filtering
  fftSize: 4096,
};

export const useMicrophoneManager = (
  audioConfig: Partial<AudioConfig> = {}
): MicrophoneManagerHook => {
  const finalConfig = { ...defaultAudioConfig, ...audioConfig };
  
  const [microphoneState, setMicrophoneState] = useState<MicrophoneState>({
    isRecording: false,
    isInitialized: false,
    error: null,
    audioLevel: 0,
  });

  // Refs for audio processing
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);
  const dataArrayRef = useRef<Float32Array | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Create noise filter (23-25Hz low frequency filtering)
  const createNoiseFilter = useCallback((audioContext: AudioContext): BiquadFilterNode => {
    const highPassFilter = audioContext.createBiquadFilter();
    highPassFilter.type = 'highpass';
    highPassFilter.frequency.setValueAtTime(finalConfig.lowFrequencyCutoff, audioContext.currentTime);
    highPassFilter.Q.setValueAtTime(0.7, audioContext.currentTime);
    return highPassFilter;
  }, [finalConfig.lowFrequencyCutoff]);

  // Initialize audio context and processing chain
  const initializeAudio = useCallback(async (stream: MediaStream): Promise<boolean> => {
    try {
      // Create audio context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: finalConfig.sampleRate,
      });

      // Create analyser node
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = finalConfig.fftSize;
      analyser.smoothingTimeConstant = 0.3;

      // Create microphone source
      const microphone = audioContext.createMediaStreamSource(stream);

      // Create noise filter
      const filter = createNoiseFilter(audioContext);

      // Connect audio processing chain
      microphone.connect(filter);
      filter.connect(analyser);

      // Initialize data array for frequency analysis
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Float32Array(bufferLength);

      // Store references
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      microphoneRef.current = microphone;
      filterRef.current = filter;
      dataArrayRef.current = dataArray;

      setMicrophoneState(prev => ({
        ...prev,
        isInitialized: true,
        error: null,
      }));

      return true;
    } catch (error) {
      console.error('Audio initialization failed:', error);
      setMicrophoneState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Audio initialization failed',
      }));
      return false;
    }
  }, [finalConfig.sampleRate, finalConfig.fftSize, createNoiseFilter]);

  // Audio level monitoring
  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current || !dataArrayRef.current) return;

    try {
      analyserRef.current.getFloatTimeDomainData(dataArrayRef.current);
      
      // Calculate RMS level
      let sum = 0;
      for (let i = 0; i < dataArrayRef.current.length; i++) {
        sum += dataArrayRef.current[i] * dataArrayRef.current[i];
      }
      const rms = Math.sqrt(sum / dataArrayRef.current.length);
      const audioLevel = Math.min(Math.max(rms * 100, 0), 100);

      setMicrophoneState(prev => ({
        ...prev,
        audioLevel,
      }));

      if (microphoneState.isRecording) {
        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      }
    } catch (error) {
      console.error('Audio level update failed:', error);
    }
  }, [microphoneState.isRecording]);

  // Start recording
  const startRecording = useCallback(async (): Promise<boolean> => {
    try {
      setMicrophoneState(prev => ({ ...prev, error: null }));

      // Get media stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: finalConfig.sampleRate,
        },
      });

      streamRef.current = stream;

      // Initialize audio processing
      const success = await initializeAudio(stream);
      if (!success) {
        stream.getTracks().forEach(track => track.stop());
        return false;
      }

      setMicrophoneState(prev => ({
        ...prev,
        isRecording: true,
      }));

      // Start audio level monitoring
      updateAudioLevel();

      return true;
    } catch (error) {
      console.error('Failed to start recording:', error);
      setMicrophoneState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to start recording',
      }));
      return false;
    }
  }, [finalConfig.sampleRate, initializeAudio, updateAudioLevel]);

  // Stop recording
  const stopRecording = useCallback(() => {
    try {
      // Cancel animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      // Stop media stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      // Close audio context
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }

      // Clear references
      audioContextRef.current = null;
      analyserRef.current = null;
      microphoneRef.current = null;
      filterRef.current = null;
      dataArrayRef.current = null;

      setMicrophoneState(prev => ({
        ...prev,
        isRecording: false,
        isInitialized: false,
        audioLevel: 0,
      }));
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  }, []);

  // Get current audio data for pitch detection
  const getAudioData = useCallback((): Float32Array | null => {
    if (!analyserRef.current || !dataArrayRef.current || !microphoneState.isRecording) {
      return null;
    }

    try {
      analyserRef.current.getFloatTimeDomainData(dataArrayRef.current);
      return new Float32Array(dataArrayRef.current);
    } catch (error) {
      console.error('Failed to get audio data:', error);
      return null;
    }
  }, [microphoneState.isRecording]);

  // Cleanup function
  const cleanup = useCallback(() => {
    stopRecording();
  }, [stopRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    microphoneState,
    startRecording,
    stopRecording,
    getAudioData,
    cleanup,
  };
};