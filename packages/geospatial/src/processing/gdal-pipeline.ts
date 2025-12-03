/**
 * GDAL Processing Pipeline for Satellite Imagery
 * Supports raster operations, reprojection, and tile generation
 * Designed for air-gapped environments with local processing
 */

import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as crypto from 'crypto';
import {
  GDALProcessingOptions,
  RasterTile,
  TileStatistics,
  SatelliteScene,
  SpectralBand,
  ProcessingLevel,
  BoundingBox,
} from '../types/satellite.js';

export interface PipelineEvents {
  progress: [number, string];
  tile: [RasterTile];
  error: [Error];
  complete: [PipelineResult];
}

export interface PipelineResult {
  success: boolean;
  outputPath: string;
  tileCount: number;
  processingTimeMs: number;
  statistics: TileStatistics;
  checksum: string;
  metadata: Record<string, unknown>;
}

interface GDALCommand {
  command: string;
  args: string[];
  description: string;
}

/**
 * GDAL Processing Pipeline
 * Handles raster operations using GDAL command-line tools
 */
export class GDALPipeline extends EventEmitter {
  private workDir: string;
  private gdalPath: string;
  private processes: Map<string, ChildProcess> = new Map();
  private cancelled = false;

  // Default GDAL configuration for performance
  private static readonly GDAL_ENV = {
    GDAL_CACHEMAX: '1024', // 1GB cache
    GDAL_NUM_THREADS: 'ALL_CPUS',
    CPL_VSIL_CURL_CACHE_SIZE: '67108864', // 64MB for HTTP reads
    GDAL_HTTP_MULTIRANGE: 'YES',
    GDAL_HTTP_MERGE_CONSECUTIVE_RANGES: 'YES',
    VSI_CACHE: 'TRUE',
    VSI_CACHE_SIZE: '67108864',
  };

  constructor(workDir: string, gdalPath = '/usr/bin') {
    super();
    this.workDir = workDir;
    this.gdalPath = gdalPath;
  }

  /**
   * Initialize pipeline and verify GDAL installation
   */
  async initialize(): Promise<{ version: string; drivers: string[] }> {
    await fs.mkdir(this.workDir, { recursive: true });

    const versionResult = await this.runGDALCommand({
      command: 'gdalinfo',
      args: ['--version'],
      description: 'Check GDAL version',
    });

    const driversResult = await this.runGDALCommand({
      command: 'gdalinfo',
      args: ['--formats'],
      description: 'List GDAL drivers',
    });

    const version = versionResult.stdout.trim();
    const drivers = driversResult.stdout
      .split('\n')
      .filter((line) => line.includes('('))
      .map((line) => line.trim().split(' ')[0]);

    return { version, drivers };
  }

  /**
   * Convert input raster to Cloud-Optimized GeoTIFF
   */
  async convertToCOG(
    inputPath: string,
    outputPath: string,
    options: GDALProcessingOptions = {}
  ): Promise<PipelineResult> {
    const startTime = Date.now();
    this.emit('progress', 0, 'Starting COG conversion');

    const args = [
      '-of',
      'COG',
      '-co',
      `COMPRESS=${options.compression || 'DEFLATE'}`,
      '-co',
      'TILING_SCHEME=GoogleMapsCompatible',
      '-co',
      'BLOCKSIZE=512',
      '-co',
      'BIGTIFF=IF_SAFER',
      '-co',
      'RESAMPLING=' + (options.resampleMethod || 'cubic'),
      '-co',
      'OVERVIEWS=AUTO',
    ];

    if (options.outputSRS) {
      args.push('-t_srs', options.outputSRS);
    }

    if (options.noDataValue !== undefined) {
      args.push('-a_nodata', String(options.noDataValue));
    }

    args.push(inputPath, outputPath);

    this.emit('progress', 10, 'Running GDAL translation');

    await this.runGDALCommand({
      command: 'gdal_translate',
      args,
      description: 'Convert to COG',
    });

    this.emit('progress', 90, 'Calculating statistics');

    const stats = await this.calculateStatistics(outputPath);
    const checksum = await this.calculateChecksum(outputPath);

    this.emit('progress', 100, 'COG conversion complete');

    const result: PipelineResult = {
      success: true,
      outputPath,
      tileCount: 1,
      processingTimeMs: Date.now() - startTime,
      statistics: stats,
      checksum,
      metadata: { format: 'COG', compression: options.compression || 'DEFLATE' },
    };

    this.emit('complete', result);
    return result;
  }

  /**
   * Reproject raster to target SRS
   */
  async reproject(
    inputPath: string,
    outputPath: string,
    targetSRS: string,
    options: GDALProcessingOptions = {}
  ): Promise<PipelineResult> {
    const startTime = Date.now();
    this.emit('progress', 0, 'Starting reprojection');

    const args = [
      '-t_srs',
      targetSRS,
      '-r',
      options.resampleMethod || 'bilinear',
      '-of',
      options.outputFormat || 'GTiff',
      '-co',
      `COMPRESS=${options.compression || 'DEFLATE'}`,
      '-co',
      'TILED=YES',
      '-co',
      'BLOCKXSIZE=512',
      '-co',
      'BLOCKYSIZE=512',
    ];

    if (options.inputSRS) {
      args.push('-s_srs', options.inputSRS);
    }

    if (options.noDataValue !== undefined) {
      args.push('-dstnodata', String(options.noDataValue));
    }

    args.push(inputPath, outputPath);

    await this.runGDALCommand({
      command: 'gdalwarp',
      args,
      description: 'Reproject raster',
    });

    this.emit('progress', 90, 'Calculating statistics');

    const stats = await this.calculateStatistics(outputPath);
    const checksum = await this.calculateChecksum(outputPath);

    this.emit('progress', 100, 'Reprojection complete');

    const result: PipelineResult = {
      success: true,
      outputPath,
      tileCount: 1,
      processingTimeMs: Date.now() - startTime,
      statistics: stats,
      checksum,
      metadata: { targetSRS, resampleMethod: options.resampleMethod || 'bilinear' },
    };

    this.emit('complete', result);
    return result;
  }

  /**
   * Generate XYZ tiles from raster
   */
  async generateTiles(
    inputPath: string,
    outputDir: string,
    options: {
      minZoom?: number;
      maxZoom?: number;
      tileSize?: number;
      format?: 'png' | 'jpeg' | 'webp';
      resampling?: string;
    } = {}
  ): Promise<PipelineResult> {
    const startTime = Date.now();
    this.emit('progress', 0, 'Starting tile generation');

    const minZoom = options.minZoom ?? 0;
    const maxZoom = options.maxZoom ?? 18;
    const tileSize = options.tileSize ?? 256;
    const format = options.format ?? 'png';

    const args = [
      '-z',
      `${minZoom}-${maxZoom}`,
      '-w',
      'none',
      '--tilesize',
      String(tileSize),
      '-r',
      options.resampling || 'average',
    ];

    if (format === 'png') {
      args.push('--tiledriver', 'PNG');
    } else if (format === 'jpeg') {
      args.push('--tiledriver', 'JPEG', '-q', '85');
    } else if (format === 'webp') {
      args.push('--tiledriver', 'WEBP', '-q', '80');
    }

    args.push(inputPath, outputDir);

    await this.runGDALCommand({
      command: 'gdal2tiles.py',
      args,
      description: 'Generate XYZ tiles',
    });

    // Count generated tiles
    const tileCount = await this.countTiles(outputDir);

    this.emit('progress', 100, 'Tile generation complete');

    const result: PipelineResult = {
      success: true,
      outputPath: outputDir,
      tileCount,
      processingTimeMs: Date.now() - startTime,
      statistics: { min: 0, max: 255, mean: 127, stdDev: 50, validPixelCount: tileCount * tileSize * tileSize },
      checksum: '',
      metadata: { minZoom, maxZoom, tileSize, format },
    };

    this.emit('complete', result);
    return result;
  }

  /**
   * Clip raster to bounding box or geometry
   */
  async clip(
    inputPath: string,
    outputPath: string,
    clipBbox: BoundingBox,
    options: GDALProcessingOptions = {}
  ): Promise<PipelineResult> {
    const startTime = Date.now();
    this.emit('progress', 0, 'Starting clip operation');

    const args = [
      '-te',
      String(clipBbox.minLon),
      String(clipBbox.minLat),
      String(clipBbox.maxLon),
      String(clipBbox.maxLat),
      '-of',
      options.outputFormat || 'GTiff',
      '-co',
      `COMPRESS=${options.compression || 'DEFLATE'}`,
      '-co',
      'TILED=YES',
    ];

    args.push(inputPath, outputPath);

    await this.runGDALCommand({
      command: 'gdalwarp',
      args,
      description: 'Clip raster',
    });

    const stats = await this.calculateStatistics(outputPath);
    const checksum = await this.calculateChecksum(outputPath);

    this.emit('progress', 100, 'Clip complete');

    const result: PipelineResult = {
      success: true,
      outputPath,
      tileCount: 1,
      processingTimeMs: Date.now() - startTime,
      statistics: stats,
      checksum,
      metadata: { clipBbox },
    };

    this.emit('complete', result);
    return result;
  }

  /**
   * Calculate band indices (NDVI, NDWI, etc.)
   */
  async calculateBandIndex(
    inputPath: string,
    outputPath: string,
    indexType: 'ndvi' | 'ndwi' | 'ndbi' | 'evi' | 'custom',
    bandMapping: { red?: number; nir?: number; green?: number; blue?: number; swir?: number },
    customFormula?: string
  ): Promise<PipelineResult> {
    const startTime = Date.now();
    this.emit('progress', 0, `Calculating ${indexType.toUpperCase()}`);

    let formula: string;

    switch (indexType) {
      case 'ndvi':
        // (NIR - Red) / (NIR + Red)
        formula = `(B${bandMapping.nir}-B${bandMapping.red})/(B${bandMapping.nir}+B${bandMapping.red}+0.00001)`;
        break;
      case 'ndwi':
        // (Green - NIR) / (Green + NIR)
        formula = `(B${bandMapping.green}-B${bandMapping.nir})/(B${bandMapping.green}+B${bandMapping.nir}+0.00001)`;
        break;
      case 'ndbi':
        // (SWIR - NIR) / (SWIR + NIR)
        formula = `(B${bandMapping.swir}-B${bandMapping.nir})/(B${bandMapping.swir}+B${bandMapping.nir}+0.00001)`;
        break;
      case 'evi':
        // Enhanced Vegetation Index
        formula = `2.5*(B${bandMapping.nir}-B${bandMapping.red})/(B${bandMapping.nir}+6*B${bandMapping.red}-7.5*B${bandMapping.blue}+1)`;
        break;
      case 'custom':
        if (!customFormula) throw new Error('Custom formula required for custom index');
        formula = customFormula;
        break;
      default:
        throw new Error(`Unknown index type: ${indexType}`);
    }

    const args = [
      '-A',
      inputPath,
      '--outfile',
      outputPath,
      '--calc',
      formula,
      '--type',
      'Float32',
      '--NoDataValue',
      '-9999',
      '--co',
      'COMPRESS=DEFLATE',
      '--co',
      'TILED=YES',
    ];

    await this.runGDALCommand({
      command: 'gdal_calc.py',
      args,
      description: `Calculate ${indexType.toUpperCase()}`,
    });

    const stats = await this.calculateStatistics(outputPath);
    const checksum = await this.calculateChecksum(outputPath);

    this.emit('progress', 100, 'Index calculation complete');

    const result: PipelineResult = {
      success: true,
      outputPath,
      tileCount: 1,
      processingTimeMs: Date.now() - startTime,
      statistics: stats,
      checksum,
      metadata: { indexType, formula },
    };

    this.emit('complete', result);
    return result;
  }

  /**
   * Merge multiple rasters into mosaic
   */
  async mosaic(
    inputPaths: string[],
    outputPath: string,
    options: GDALProcessingOptions = {}
  ): Promise<PipelineResult> {
    const startTime = Date.now();
    this.emit('progress', 0, 'Starting mosaic operation');

    // First create VRT
    const vrtPath = path.join(this.workDir, `mosaic_${Date.now()}.vrt`);

    const vrtArgs = ['-input_file_list', '-'];
    const inputList = inputPaths.join('\n');

    await this.runGDALCommand(
      {
        command: 'gdalbuildvrt',
        args: [...vrtArgs, vrtPath],
        description: 'Build VRT',
      },
      inputList
    );

    this.emit('progress', 50, 'VRT created, converting to output');

    // Convert VRT to final output
    const translateArgs = [
      '-of',
      options.outputFormat || 'GTiff',
      '-co',
      `COMPRESS=${options.compression || 'DEFLATE'}`,
      '-co',
      'TILED=YES',
      '-co',
      'BIGTIFF=IF_SAFER',
      vrtPath,
      outputPath,
    ];

    await this.runGDALCommand({
      command: 'gdal_translate',
      args: translateArgs,
      description: 'Convert VRT to output',
    });

    // Cleanup VRT
    await fs.unlink(vrtPath).catch(() => {});

    const stats = await this.calculateStatistics(outputPath);
    const checksum = await this.calculateChecksum(outputPath);

    this.emit('progress', 100, 'Mosaic complete');

    const result: PipelineResult = {
      success: true,
      outputPath,
      tileCount: inputPaths.length,
      processingTimeMs: Date.now() - startTime,
      statistics: stats,
      checksum,
      metadata: { inputCount: inputPaths.length },
    };

    this.emit('complete', result);
    return result;
  }

  /**
   * Get raster metadata/info
   */
  async getInfo(inputPath: string): Promise<{
    size: { width: number; height: number };
    bands: number;
    projection: string;
    geoTransform: number[];
    bbox: BoundingBox;
    noDataValue?: number;
    dataType: string;
    metadata: Record<string, string>;
  }> {
    const result = await this.runGDALCommand({
      command: 'gdalinfo',
      args: ['-json', inputPath],
      description: 'Get raster info',
    });

    const info = JSON.parse(result.stdout);

    const corners = info.cornerCoordinates;
    const bbox: BoundingBox = {
      minLon: Math.min(corners.lowerLeft[0], corners.upperLeft[0]),
      maxLon: Math.max(corners.lowerRight[0], corners.upperRight[0]),
      minLat: Math.min(corners.lowerLeft[1], corners.lowerRight[1]),
      maxLat: Math.max(corners.upperLeft[1], corners.upperRight[1]),
    };

    return {
      size: { width: info.size[0], height: info.size[1] },
      bands: info.bands?.length || 0,
      projection: info.coordinateSystem?.wkt || '',
      geoTransform: info.geoTransform || [],
      bbox,
      noDataValue: info.bands?.[0]?.noDataValue,
      dataType: info.bands?.[0]?.type || 'unknown',
      metadata: info.metadata || {},
    };
  }

  /**
   * Calculate raster statistics
   */
  async calculateStatistics(inputPath: string): Promise<TileStatistics> {
    const result = await this.runGDALCommand({
      command: 'gdalinfo',
      args: ['-json', '-stats', inputPath],
      description: 'Calculate statistics',
    });

    const info = JSON.parse(result.stdout);
    const band = info.bands?.[0];

    if (!band) {
      return {
        min: 0,
        max: 0,
        mean: 0,
        stdDev: 0,
        validPixelCount: 0,
      };
    }

    return {
      min: band.minimum ?? band.computedMin ?? 0,
      max: band.maximum ?? band.computedMax ?? 0,
      mean: band.mean ?? 0,
      stdDev: band.stdDev ?? 0,
      validPixelCount: (info.size?.[0] ?? 0) * (info.size?.[1] ?? 0),
    };
  }

  /**
   * Run GDAL command with proper error handling
   */
  private async runGDALCommand(
    cmd: GDALCommand,
    stdin?: string
  ): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      if (this.cancelled) {
        reject(new Error('Pipeline cancelled'));
        return;
      }

      const commandPath = path.join(this.gdalPath, cmd.command);

      const env = {
        ...process.env,
        ...GDALPipeline.GDAL_ENV,
      };

      const proc = spawn(commandPath, cmd.args, { env });

      this.processes.set(cmd.command, proc);

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      if (stdin) {
        proc.stdin.write(stdin);
        proc.stdin.end();
      }

      proc.on('error', (error) => {
        this.processes.delete(cmd.command);
        reject(new Error(`Failed to execute ${cmd.command}: ${error.message}`));
      });

      proc.on('close', (code) => {
        this.processes.delete(cmd.command);

        if (code !== 0) {
          const error = new Error(`${cmd.command} exited with code ${code}: ${stderr}`);
          this.emit('error', error);
          reject(error);
        } else {
          resolve({ stdout, stderr });
        }
      });
    });
  }

  /**
   * Calculate file checksum
   */
  private async calculateChecksum(filePath: string): Promise<string> {
    const fileBuffer = await fs.readFile(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  }

  /**
   * Count tiles in directory
   */
  private async countTiles(tileDir: string): Promise<number> {
    let count = 0;

    const countRecursive = async (dir: string): Promise<void> => {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          await countRecursive(fullPath);
        } else if (entry.isFile() && /\.(png|jpg|jpeg|webp)$/i.test(entry.name)) {
          count++;
        }
      }
    };

    await countRecursive(tileDir);
    return count;
  }

  /**
   * Cancel all running processes
   */
  cancel(): void {
    this.cancelled = true;

    for (const [name, proc] of this.processes) {
      proc.kill('SIGTERM');
      this.processes.delete(name);
    }
  }

  /**
   * Cleanup work directory
   */
  async cleanup(): Promise<void> {
    await fs.rm(this.workDir, { recursive: true, force: true });
  }
}

/**
 * Factory for creating GDAL pipelines
 */
export function createGDALPipeline(workDir: string, gdalPath?: string): GDALPipeline {
  return new GDALPipeline(workDir, gdalPath);
}
