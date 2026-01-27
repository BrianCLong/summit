export interface VoiceSpec {
  persona_embedding?: string;
  vocal_range?: string;
  accent?: string;
  timbre?: string;
  age_proxy?: string;
  style_presets?: string[];
  description?: string; // Natural language fallback
  reference_audio_url?: string; // For cloning
}

export interface PerformanceSpec {
  pace_curve?: number[]; // simplified
  emphasis_targets?: Array<{ word_index: number; strength: number }>;
  sentiment_arc?: string[];
  breath_budget?: number;
  disfluency_controls?: {
    uh_rate: number;
    hmm_rate: number;
  };
  whisper_shout_bounds?: [number, number];
}

export interface SpeechJob {
  text: string[];
  language?: string[];
  voice_ref?: string; // ID of existing voice
  voice_description?: string; // Prompt
  voice_spec?: VoiceSpec;
  performance_spec?: PerformanceSpec;
  preset_voice?: string;
  streaming?: boolean;
  max_new_tokens?: number;
  safety_context?: Record<string, any>;
  tenant_id: string;
}

export interface VoiceProvenance {
  manifest_id: string;
  model_id: string;
  model_hash: string;
  prompt_hash: string;
  reference_audio_hash?: string;
  timestamp: string;
  policy_decisions: {
    allowed: boolean;
    policy_id: string;
    reason?: string;
  }[];
  watermark_detected?: boolean;
  signature: string;
}

export interface StreamCallbacks {
  onAudio: (chunk: Buffer, provenance: VoiceProvenance) => void;
  onError: (error: Error) => void;
  onComplete: () => void;
}

export interface VoiceProvider {
  id: string;
  generateVoiceDesign(spec: VoiceSpec, text: string): Promise<{ audio: Buffer; provenance: VoiceProvenance }>;
  generateVoiceClone(referenceAudio: Buffer, text: string): Promise<{ audio: Buffer; provenance: VoiceProvenance }>;
  generateCustomVoice(voiceId: string, text: string): Promise<{ audio: Buffer; provenance: VoiceProvenance }>;
  streamSpeak(job: SpeechJob, callbacks: StreamCallbacks): Promise<void>;
}
