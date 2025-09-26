import { spawn } from 'child_process';
import path from 'path';
import { once } from 'events';
import ImageDetectionRepo, { StoredDetection } from '../repos/ImageDetectionRepo.js';

export interface ImageProcessingConfig {
  pythonPath?: string;
  scriptPath?: string;
  minArea?: number;
  dilationIterations?: number;
}

export interface DetectionPayload {
  id: string;
  className: string;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
    area: number;
    confidence: number;
  };
}

interface PythonDetectionResponse {
  image_path: string;
  detections: Array<{
    object_id: string;
    class_name: string;
    confidence: number;
    bounding_box: {
      x: number;
      y: number;
      width: number;
      height: number;
      area: number;
      confidence: number;
    };
  }>;
}

export class ImageProcessingService {
  private config: Required<ImageProcessingConfig>;
  private repo: ImageDetectionRepo;

  constructor(config: ImageProcessingConfig = {}, repo: ImageDetectionRepo = new ImageDetectionRepo()) {
    const scriptPath = config.scriptPath || path.join(process.cwd(), 'server', 'python', 'vision', 'image_processing.py');
    this.config = {
      pythonPath: config.pythonPath || process.env.AI_PYTHON_PATH || 'python3',
      scriptPath,
      minArea: config.minArea ?? 500,
      dilationIterations: config.dilationIterations ?? 1,
    };
    this.repo = repo;
  }

  async runDetection(imagePath: string): Promise<DetectionPayload[]> {
    const args = [
      this.config.scriptPath,
      '--image',
      imagePath,
      '--min-area',
      String(this.config.minArea),
      '--dilation-iterations',
      String(this.config.dilationIterations),
    ];

    const child = spawn(this.config.pythonPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });

    let stdout = '';
    const stderrChunks: Buffer[] = [];

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => stderrChunks.push(Buffer.from(chunk)));

    const [code] = await once(child, 'close');
    if (code !== 0) {
      throw new Error(`Image detection script failed: ${Buffer.concat(stderrChunks).toString()}`);
    }

    const response = this.parsePythonResponse(stdout);
    return response.detections.map((det, index) => ({
      id: `${path.basename(imagePath)}#${index}`,
      className: det.class_name,
      confidence: det.confidence,
      boundingBox: det.bounding_box,
    }));
  }

  async processAndStore(
    mediaSourceId: string,
    imagePath: string,
    tenantId?: string,
  ): Promise<StoredDetection[]> {
    const detections = await this.runDetection(imagePath);
    const processedAt = new Date().toISOString();
    const storedDetections: StoredDetection[] = detections.map((det) => ({
      id: `${mediaSourceId}:${det.id}`,
      mediaSourceId,
      className: det.className,
      confidence: det.confidence,
      boundingBox: det.boundingBox,
      tenantId,
      processedAt,
    }));

    await this.repo.storeDetections(mediaSourceId, storedDetections, tenantId);
    return storedDetections;
  }

  async getDetections(mediaSourceId: string, tenantId?: string): Promise<StoredDetection[]> {
    return this.repo.getDetections(mediaSourceId, tenantId);
  }

  private parsePythonResponse(payload: string): PythonDetectionResponse {
    let parsed: PythonDetectionResponse;
    try {
      parsed = JSON.parse(payload);
    } catch (error) {
      throw new Error(`Failed to parse detection response: ${(error as Error).message}`);
    }

    if (!parsed.detections) {
      throw new Error('Python response missing detections');
    }

    return parsed;
  }
}

export default ImageProcessingService;
