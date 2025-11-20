/**
 * @intelgraph/telephony
 *
 * Telephony and communications integration including:
 * - Call recording integration
 * - PBX system integration
 * - SIP protocol support
 * - WebRTC audio streams
 * - Call quality metrics
 */

import { z } from 'zod';
import type { AudioBuffer, AudioCodec } from '@intelgraph/audio-processing';

export enum CallDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound'
}

export enum CallStatus {
  INITIATED = 'initiated',
  RINGING = 'ringing',
  CONNECTED = 'connected',
  ON_HOLD = 'on_hold',
  TRANSFERRED = 'transferred',
  ENDED = 'ended',
  FAILED = 'failed'
}

export const CallMetadataSchema = z.object({
  callId: z.string(),
  direction: z.nativeEnum(CallDirection),
  callerNumber: z.string(),
  calleeNumber: z.string(),
  startTime: z.date(),
  endTime: z.date().optional(),
  duration: z.number().optional(),
  status: z.nativeEnum(CallStatus),
  codec: z.string(),
  recordingUrl: z.string().optional()
});

export type CallMetadata = z.infer<typeof CallMetadataSchema>;

export const CallQualityMetricsSchema = z.object({
  mos: z.number().min(1).max(5).describe('Mean Opinion Score'),
  rFactor: z.number(),
  jitter: z.number().describe('Jitter in ms'),
  packetLoss: z.number().min(0).max(100).describe('Packet loss percentage'),
  latency: z.number().describe('Latency in ms'),
  bitrate: z.number(),
  audioClarity: z.number().min(0).max(1)
});

export type CallQualityMetrics = z.infer<typeof CallQualityMetricsSchema>;

export const DTMFEventSchema = z.object({
  digit: z.string().regex(/^[0-9*#ABCD]$/),
  timestamp: z.number(),
  duration: z.number()
});

export type DTMFEvent = z.infer<typeof DTMFEventSchema>;

export interface ICallRecorder {
  startRecording(callId: string): Promise<void>;
  stopRecording(callId: string): Promise<AudioBuffer>;
  getRecording(callId: string): Promise<AudioBuffer>;
  deleteRecording(callId: string): Promise<void>;
}

export interface IPBXIntegration {
  connect(config: PBXConfig): Promise<void>;
  disconnect(): Promise<void>;
  getActiveCalls(): Promise<CallMetadata[]>;
  getCallHistory(filter?: CallFilter): Promise<CallMetadata[]>;
}

export interface PBXConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  protocol: 'sip' | 'h323' | 'proprietary';
}

export interface CallFilter {
  startDate?: Date;
  endDate?: Date;
  direction?: CallDirection;
  phoneNumber?: string;
  minDuration?: number;
}

export interface ISIPClient {
  register(sipUri: string, credentials: { username: string; password: string }): Promise<void>;
  makeCall(destination: string): Promise<string>;
  answerCall(callId: string): Promise<void>;
  hangup(callId: string): Promise<void>;
  sendDTMF(callId: string, digit: string): Promise<void>;
}

export interface IWebRTCAudioStream {
  getStream(streamId: string): MediaStream | null;
  addTrack(streamId: string, track: MediaStreamTrack): void;
  removeTrack(streamId: string, trackId: string): void;
  captureAudio(streamId: string): Promise<AudioBuffer>;
}

export interface ICallQualityAnalyzer {
  analyze(audio: AudioBuffer, metadata: CallMetadata): Promise<CallQualityMetrics>;
  monitorRealtime(callId: string): AsyncIterable<CallQualityMetrics>;
}

export interface IDTMFDetector {
  detect(audio: AudioBuffer): Promise<DTMFEvent[]>;
  detectRealtime(audioStream: ReadableStream): AsyncIterable<DTMFEvent>;
}

export interface ICodecNegotiator {
  negotiateCodec(offeredCodecs: string[], preferredCodecs: string[]): string | null;
  transcode(audio: AudioBuffer, targetCodec: AudioCodec): Promise<AudioBuffer>;
}
