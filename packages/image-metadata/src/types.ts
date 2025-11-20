import { z } from 'zod';
import { ExtractionResult } from '@intelgraph/metadata-extractor';

/**
 * Image-specific metadata schemas
 */

// EXIF metadata schema
export const EXIFMetadataSchema = z.object({
  // Camera information
  make: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  lensModel: z.string().optional(),
  lensSerialNumber: z.string().optional(),

  // Capture settings
  exposureTime: z.number().optional(), // seconds
  fNumber: z.number().optional(),
  iso: z.number().optional(),
  focalLength: z.number().optional(), // mm
  focalLengthIn35mm: z.number().optional(),
  flash: z.boolean().optional(),
  whiteBalance: z.string().optional(),
  meteringMode: z.string().optional(),
  exposureProgram: z.string().optional(),
  exposureBias: z.number().optional(),

  // Image properties
  width: z.number().optional(),
  height: z.number().optional(),
  orientation: z.number().optional(),
  xResolution: z.number().optional(),
  yResolution: z.number().optional(),
  resolutionUnit: z.string().optional(),
  colorSpace: z.string().optional(),
  bitsPerSample: z.number().optional(),

  // Software and processing
  software: z.string().optional(),
  processingMethod: z.string().optional(),
  editingSoftware: z.string().optional(),

  // Timestamps
  dateTimeOriginal: z.date().optional(),
  dateTimeDigitized: z.date().optional(),
  modifyDate: z.date().optional(),
  offsetTime: z.string().optional(),
  offsetTimeOriginal: z.string().optional(),

  // GPS data
  gpsLatitude: z.number().optional(),
  gpsLongitude: z.number().optional(),
  gpsAltitude: z.number().optional(),
  gpsSpeed: z.number().optional(),
  gpsImgDirection: z.number().optional(),
  gpsDateStamp: z.string().optional(),
  gpsTimeStamp: z.string().optional(),

  // Additional metadata
  copyright: z.string().optional(),
  artist: z.string().optional(),
  imageDescription: z.string().optional(),
  userComment: z.string().optional(),
  thumbnail: z.boolean().optional(),
});

export type EXIFMetadata = z.infer<typeof EXIFMetadataSchema>;

// Image analysis metadata
export const ImageAnalysisSchema = z.object({
  format: z.string(),
  mimeType: z.string(),
  width: z.number(),
  height: z.number(),
  channels: z.number().optional(),
  hasAlpha: z.boolean().optional(),
  isAnimated: z.boolean().optional(),
  frameCount: z.number().optional(),

  // Quality indicators
  quality: z.number().optional(), // 0-100
  compression: z.string().optional(),
  isProgressive: z.boolean().optional(),

  // Statistical analysis
  meanBrightness: z.number().optional(),
  histogram: z.array(z.number()).optional(),
  dominantColors: z.array(z.string()).optional(),

  // Manipulation detection
  hasBeenEdited: z.boolean().optional(),
  editingSoftwareDetected: z.string().optional(),
  jpegQualityEstimate: z.number().optional(),
  errorLevelAnalysis: z.number().optional(), // ELA score

  // Steganography detection
  steganographySuspicion: z.number().min(0).max(1).optional(), // 0-1 confidence
  lsbAnomalies: z.boolean().optional(),
  statisticalAnomalies: z.array(z.string()).optional(),

  // Thumbnails and previews
  hasThumbnail: z.boolean().optional(),
  thumbnailSize: z.object({
    width: z.number(),
    height: z.number(),
  }).optional(),
});

export type ImageAnalysis = z.infer<typeof ImageAnalysisSchema>;

// Image extraction result
export type ImageExtractionResult = ExtractionResult & {
  image?: {
    exif?: EXIFMetadata;
    analysis?: ImageAnalysis;
  };
};
