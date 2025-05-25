declare module '@ricky0123/vad-react' {
  export interface VADOptions {
    onSpeechStart?: () => void;
    onSpeechEnd?: () => void;
    onVADMisfire?: () => void;
    onError?: (error: Error) => void;
    timeoutMs?: number;
    minSpeechMs?: number;
    positiveSpeechThreshold?: number;
    negativeSpeechThreshold?: number;
    preSpeechPadding?: number;
    redemptionFrames?: number;
    frameSamples?: number;
    maxConsecutiveSilent?: number;
    maxConsecutiveSpeech?: number;
    sequential?: boolean;
  }

  export interface VADControl {
    start: () => Promise<void> | void;
    pause: () => void;
    destroy: () => void;
    resume?: () => void;
    active?: boolean;
  }

  export function useVAD(options: VADOptions): VADControl;
}