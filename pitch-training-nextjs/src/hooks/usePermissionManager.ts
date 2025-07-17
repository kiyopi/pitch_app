import { useState, useCallback, useRef } from 'react';

// Type definitions
type PermissionState = 'unknown' | 'checking' | 'granted' | 'denied' | 'error';
type InitializationMode = 'preload' | 'ondemand';

interface PermissionManagerConfig {
  enablePreloadMode?: boolean;
  retryAttempts?: number;
  timeout?: number;
}

interface PermissionManagerHook {
  permissionState: PermissionState;
  initializationMode: InitializationMode;
  requestPermission: () => Promise<boolean>;
  resetPermission: () => void;
  setInitializationMode: (mode: InitializationMode) => void;
}

// Default configuration
const defaultConfig: Required<PermissionManagerConfig> = {
  enablePreloadMode: true,
  retryAttempts: 3,
  timeout: 10000,
};

export const usePermissionManager = (
  config: PermissionManagerConfig = {}
): PermissionManagerHook => {
  const finalConfig = { ...defaultConfig, ...config };
  
  const [permissionState, setPermissionState] = useState<PermissionState>('unknown');
  const [initializationMode, setInitializationMode] = useState<InitializationMode>('ondemand');
  const retryCountRef = useRef(0);

  // Permissions API support check
  const isPermissionsAPISupported = useCallback((): boolean => {
    return 'permissions' in navigator && 'query' in navigator.permissions;
  }, []);

  // Check current permission status using Permissions API
  const checkPermissionStatus = useCallback(async (): Promise<PermissionState> => {
    if (!isPermissionsAPISupported()) {
      console.warn('Permissions API not supported');
      return 'unknown';
    }

    try {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      
      switch (result.state) {
        case 'granted':
          return 'granted';
        case 'denied':
          return 'denied';
        case 'prompt':
          return 'unknown';
        default:
          return 'unknown';
      }
    } catch (error) {
      console.error('Permission check failed:', error);
      return 'error';
    }
  }, [isPermissionsAPISupported]);

  // Request microphone permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    setPermissionState('checking');
    retryCountRef.current = 0;

    const attemptRequest = async (): Promise<boolean> => {
      try {
        // First check if permission is already granted
        if (isPermissionsAPISupported()) {
          const currentStatus = await checkPermissionStatus();
          if (currentStatus === 'granted') {
            setPermissionState('granted');
            return true;
          }
          if (currentStatus === 'denied') {
            setPermissionState('denied');
            return false;
          }
        }

        // Request media access to trigger permission dialog
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 44100,
          },
        });

        // Permission granted - clean up the stream
        stream.getTracks().forEach(track => track.stop());
        setPermissionState('granted');
        return true;

      } catch (error) {
        console.error('Permission request failed:', error);
        
        if (error instanceof Error) {
          if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            setPermissionState('denied');
            return false;
          }
          
          if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            console.error('No microphone device found');
            setPermissionState('error');
            return false;
          }
        }

        // Retry for other errors
        if (retryCountRef.current < finalConfig.retryAttempts) {
          retryCountRef.current++;
          console.log(`Retrying permission request (${retryCountRef.current}/${finalConfig.retryAttempts})`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          return attemptRequest();
        }

        setPermissionState('error');
        return false;
      }
    };

    return attemptRequest();
  }, [checkPermissionStatus, finalConfig.retryAttempts, isPermissionsAPISupported]);

  // Reset permission state
  const resetPermission = useCallback(() => {
    setPermissionState('unknown');
    retryCountRef.current = 0;
  }, []);

  return {
    permissionState,
    initializationMode,
    requestPermission,
    resetPermission,
    setInitializationMode,
  };
};