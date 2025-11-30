/**
 * Type definitions for SOCMINT
 */

export interface SocialProfile {
  platform: string;
  username: string;
  userId?: string;
  displayName?: string;
  bio?: string;
  location?: string;
  website?: string;
  email?: string;
  phone?: string;
  profileImage?: string;
  coverImage?: string;
  verified?: boolean;
  createdAt?: Date;
  followers?: number;
  following?: number;
  posts?: number;
  engagement?: {
    averageLikes: number;
    averageComments: number;
    averageShares: number;
    engagementRate: number;
  };
  metadata?: Record<string, any>;
}

export interface SocialPost {
  id: string;
  platform: string;
  author: string;
  content: string;
  timestamp: Date;
  likes: number;
  comments: number;
  shares: number;
  url: string;
  media?: MediaItem[];
  hashtags?: string[];
  mentions?: string[];
  location?: Location;
  sentiment?: SentimentScore;
  entities?: Entity[];
}

export interface MediaItem {
  type: 'image' | 'video' | 'audio';
  url: string;
  thumbnail?: string;
  metadata?: ImageMetadata | VideoMetadata;
}

export interface ImageMetadata {
  width?: number;
  height?: number;
  format?: string;
  exif?: any;
  faces?: FaceDetection[];
  objects?: ObjectDetection[];
  text?: string;
  location?: Location;
}

export interface VideoMetadata {
  duration?: number;
  width?: number;
  height?: number;
  format?: string;
  thumbnail?: string;
  transcript?: string;
}

export interface FaceDetection {
  boundingBox: { x: number; y: number; width: number; height: number };
  confidence: number;
  age?: number;
  gender?: string;
  emotion?: string;
}

export interface ObjectDetection {
  label: string;
  confidence: number;
  boundingBox: { x: number; y: number; width: number; height: number };
}

export interface Location {
  name?: string;
  latitude?: number;
  longitude?: number;
  country?: string;
  city?: string;
}

export interface SentimentScore {
  polarity: number; // -1 to 1
  subjectivity: number; // 0 to 1
  emotion?: {
    joy?: number;
    anger?: number;
    fear?: number;
    sadness?: number;
    surprise?: number;
  };
  label: 'positive' | 'negative' | 'neutral';
}

export interface Entity {
  type: 'person' | 'organization' | 'location' | 'product' | 'event';
  text: string;
  confidence: number;
}

export interface SocialNetwork {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  communities?: Community[];
  metrics?: NetworkMetrics;
}

export interface NetworkNode {
  id: string;
  username: string;
  platform: string;
  type: 'user' | 'post' | 'hashtag' | 'topic';
  properties?: Record<string, any>;
}

export interface NetworkEdge {
  source: string;
  target: string;
  type: 'follows' | 'mentions' | 'replies' | 'shares' | 'tags';
  weight?: number;
}

export interface Community {
  id: string;
  nodes: string[];
  size: number;
  density: number;
}

export interface NetworkMetrics {
  nodeCount: number;
  edgeCount: number;
  density: number;
  averageDegree: number;
  clustering: number;
  influencers?: Array<{
    nodeId: string;
    score: number;
    rank: number;
  }>;
}

export interface BotScore {
  username: string;
  platform: string;
  score: number; // 0 to 1 (1 = likely bot)
  confidence: number;
  indicators: {
    accountAge?: number;
    postFrequency?: number;
    followRatio?: number;
    profileCompleteness?: number;
    contentDiversity?: number;
    timingPatterns?: number;
    engagement?: number;
  };
  classification: 'human' | 'bot' | 'cyborg' | 'unknown';
}
