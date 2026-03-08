"use strict";
// @ts-nocheck
/**
 * GDAL Processing Pipeline for Satellite Imagery
 * Supports raster operations, reprojection, and tile generation
 * Designed for air-gapped environments with local processing
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.GDALPipeline = void 0;
exports.createGDALPipeline = createGDALPipeline;
const events_1 = require("events");
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
const fs = __importStar(require("fs/promises"));
const crypto = __importStar(require("crypto"));
/**
 * GDAL Processing Pipeline
 * Handles raster operations using GDAL command-line tools
 */
class GDALPipeline extends events_1.EventEmitter {
    workDir;
    gdalPath;
    processes = new Map();
    cancelled = false;
    // Default GDAL configuration for performance
    static GDAL_ENV = {
        GDAL_CACHEMAX: '1024', // 1GB cache
        GDAL_NUM_THREADS: 'ALL_CPUS',
        CPL_VSIL_CURL_CACHE_SIZE: '67108864', // 64MB for HTTP reads
        GDAL_HTTP_MULTIRANGE: 'YES',
        GDAL_HTTP_MERGE_CONSECUTIVE_RANGES: 'YES',
        VSI_CACHE: 'TRUE',
        VSI_CACHE_SIZE: '67108864',
    };
    constructor(workDir, gdalPath = '/usr/bin') {
        super();
        this.workDir = workDir;
        this.gdalPath = gdalPath;
    }
    /**
     * Initialize pipeline and verify GDAL installation
     */
    async initialize() {
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
    async convertToCOG(inputPath, outputPath, options = {}) {
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
        const result = {
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
    async reproject(inputPath, outputPath, targetSRS, options = {}) {
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
        const result = {
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
    async generateTiles(inputPath, outputDir, options = {}) {
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
        }
        else if (format === 'jpeg') {
            args.push('--tiledriver', 'JPEG', '-q', '85');
        }
        else if (format === 'webp') {
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
        const result = {
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
    async clip(inputPath, outputPath, clipBbox, options = {}) {
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
        const result = {
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
    async calculateBandIndex(inputPath, outputPath, indexType, bandMapping, customFormula) {
        const startTime = Date.now();
        this.emit('progress', 0, `Calculating ${indexType.toUpperCase()}`);
        let formula;
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
                if (!customFormula)
                    throw new Error('Custom formula required for custom index');
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
        const result = {
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
    async mosaic(inputPaths, outputPath, options = {}) {
        const startTime = Date.now();
        this.emit('progress', 0, 'Starting mosaic operation');
        // First create VRT
        const vrtPath = path.join(this.workDir, `mosaic_${Date.now()}.vrt`);
        const vrtArgs = ['-input_file_list', '-'];
        const inputList = inputPaths.join('\n');
        await this.runGDALCommand({
            command: 'gdalbuildvrt',
            args: [...vrtArgs, vrtPath],
            description: 'Build VRT',
        }, inputList);
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
        await fs.unlink(vrtPath).catch(() => { });
        const stats = await this.calculateStatistics(outputPath);
        const checksum = await this.calculateChecksum(outputPath);
        this.emit('progress', 100, 'Mosaic complete');
        const result = {
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
    async getInfo(inputPath) {
        const result = await this.runGDALCommand({
            command: 'gdalinfo',
            args: ['-json', inputPath],
            description: 'Get raster info',
        });
        const info = JSON.parse(result.stdout);
        const corners = info.cornerCoordinates;
        const bbox = {
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
    async calculateStatistics(inputPath) {
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
    async runGDALCommand(cmd, stdin) {
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
            const proc = (0, child_process_1.spawn)(commandPath, cmd.args, { env });
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
                }
                else {
                    resolve({ stdout, stderr });
                }
            });
        });
    }
    /**
     * Calculate file checksum
     */
    async calculateChecksum(filePath) {
        const fileBuffer = await fs.readFile(filePath);
        return crypto.createHash('sha256').update(fileBuffer).digest('hex');
    }
    /**
     * Count tiles in directory
     */
    async countTiles(tileDir) {
        let count = 0;
        const countRecursive = async (dir) => {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    await countRecursive(fullPath);
                }
                else if (entry.isFile() && /\.(png|jpg|jpeg|webp)$/i.test(entry.name)) {
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
    cancel() {
        this.cancelled = true;
        for (const [name, proc] of this.processes) {
            proc.kill('SIGTERM');
            this.processes.delete(name);
        }
    }
    /**
     * Cleanup work directory
     */
    async cleanup() {
        await fs.rm(this.workDir, { recursive: true, force: true });
    }
}
exports.GDALPipeline = GDALPipeline;
/**
 * Factory for creating GDAL pipelines
 */
function createGDALPipeline(workDir, gdalPath) {
    return new GDALPipeline(workDir, gdalPath);
}
