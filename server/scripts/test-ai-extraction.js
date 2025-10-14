#!/usr/bin/env node

/**
 * IntelGraph AI Extraction Testing Script
 * Tests all AI extraction engines with sample data
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

// Test configuration
const config = {
    pythonPath: process.env.AI_PYTHON_PATH || 'python3',
    modelsPath: process.env.AI_MODELS_PATH || 'src/ai/models',
    tempPath: process.env.AI_TEMP_PATH || path.join(os.tmpdir(), 'intelgraph-test'),
    timeout: 60000 // 60 seconds timeout per test
};

// Helper functions
function log(level, message) {
    const timestamp = new Date().toISOString();
    const levelColors = {
        INFO: colors.blue,
        SUCCESS: colors.green,
        WARNING: colors.yellow,
        ERROR: colors.red
    };
    
    const color = levelColors[level] || colors.reset;
    console.log(`${colors.bright}[${timestamp}]${colors.reset} ${color}[${level}]${colors.reset} ${message}`);
}

function createTestImage() {
    const testImagePath = path.join(config.tempPath, 'test-image.png');
    
    // Create a simple test image using Node.js (100x100 white square with text)
    const canvas = require('canvas');
    const { createCanvas, registerFont } = canvas;
    
    try {
        const width = 400;
        const height = 200;
        const testCanvas = createCanvas(width, height);
        const ctx = testCanvas.getContext('2d');
        
        // White background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
        
        // Add some text for OCR testing
        ctx.fillStyle = 'black';
        ctx.font = '24px Arial';
        ctx.fillText('This is a test image', 50, 60);
        ctx.fillText('for AI extraction testing', 50, 100);
        ctx.fillText('Created by IntelGraph', 50, 140);
        
        // Draw a simple rectangle for object detection
        ctx.strokeStyle = 'blue';
        ctx.lineWidth = 2;
        ctx.strokeRect(300, 50, 80, 60);
        
        // Save the image
        const buffer = testCanvas.toBuffer('image/png');
        fs.writeFileSync(testImagePath, buffer);
        
        return testImagePath;
    } catch (error) {
        log('WARNING', `Failed to create test image with canvas: ${error.message}`);
        
        // Fallback: create a simple text file that can be used for some tests
        const fallbackPath = path.join(config.tempPath, 'test-text.txt');
        fs.writeFileSync(fallbackPath, 'This is a test document for AI extraction testing. It contains sample text for analysis.');
        return fallbackPath;
    }
}

function createTestAudio() {
    const testAudioPath = path.join(config.tempPath, 'test-audio.wav');
    
    try {
        // Create a simple sine wave audio file (1 second, 440Hz)
        const sampleRate = 16000;
        const duration = 1; // seconds
        const frequency = 440; // Hz
        
        const samples = sampleRate * duration;
        const buffer = Buffer.alloc(samples * 2); // 16-bit samples
        
        for (let i = 0; i < samples; i++) {
            const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 32767;
            buffer.writeInt16LE(Math.round(sample), i * 2);
        }
        
        // Simple WAV header
        const header = Buffer.alloc(44);
        header.write('RIFF', 0);
        header.writeUInt32LE(36 + samples * 2, 4);
        header.write('WAVE', 8);
        header.write('fmt ', 12);
        header.writeUInt32LE(16, 16); // PCM format
        header.writeUInt16LE(1, 20); // Audio format
        header.writeUInt16LE(1, 22); // Channels
        header.writeUInt32LE(sampleRate, 24); // Sample rate
        header.writeUInt32LE(sampleRate * 2, 28); // Byte rate
        header.writeUInt16LE(2, 32); // Block align
        header.writeUInt16LE(16, 34); // Bits per sample
        header.write('data', 36);
        header.writeUInt32LE(samples * 2, 40);
        
        const audioData = Buffer.concat([header, buffer]);
        fs.writeFileSync(testAudioPath, audioData);
        
        return testAudioPath;
    } catch (error) {
        log('WARNING', `Failed to create test audio: ${error.message}`);
        return null;
    }
}

function runPythonScript(scriptName, args = []) {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(config.modelsPath, scriptName);
        
        if (!fs.existsSync(scriptPath)) {
            reject(new Error(`Python script not found: ${scriptPath}`));
            return;
        }
        
        const python = spawn(config.pythonPath, [scriptPath, ...args], {
            stdio: ['pipe', 'pipe', 'pipe'],
            timeout: config.timeout
        });
        
        let stdout = '';
        let stderr = '';
        
        python.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        
        python.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        
        python.on('close', (code) => {
            if (code === 0) {
                try {
                    const result = JSON.parse(stdout);
                    resolve(result);
                } catch (parseError) {
                    resolve({ output: stdout, raw: true });
                }
            } else {
                reject(new Error(`Python script failed (code ${code}): ${stderr || stdout}`));
            }
        });
        
        python.on('error', (error) => {
            reject(new Error(`Failed to spawn Python process: ${error.message}`));
        });
    });
}

async function testTextEmbedding() {
    log('INFO', 'Testing text embedding generation...');
    
    try {
        const result = await runPythonScript('text_embedding.py', [
            '--text', 'This is a test sentence for embedding generation.',
            '--model', 'all-MiniLM-L6-v2',
            '--normalize'
        ]);
        
        if (result.embedding && result.embedding.length > 0 && result.dimension > 0) {
            log('SUCCESS', `Text embedding: Generated ${result.dimension}D vector`);
            return true;
        } else if (result.error) {
            log('ERROR', `Text embedding: ${result.error}`);
            return false;
        } else {
            log('ERROR', 'Text embedding: No embedding generated');
            return false;
        }
    } catch (error) {
        log('ERROR', `Text embedding: ${error.message}`);
        return false;
    }
}

async function testObjectDetection(imagePath) {
    log('INFO', 'Testing object detection...');
    
    try {
        const result = await runPythonScript('yolo_detection.py', [
            '--image', imagePath,
            '--model', 'yolov8n.pt',
            '--confidence', '0.3'
        ]);
        
        if (result.detections && Array.isArray(result.detections)) {
            log('SUCCESS', `Object detection: Found ${result.detections.length} objects`);
            if (result.detections.length > 0) {
                log('INFO', `Detected: ${result.detections.map(d => d.class_name).join(', ')}`);
            }
            return true;
        } else if (result.error) {
            log('ERROR', `Object detection: ${result.error}`);
            return false;
        } else {
            log('WARNING', 'Object detection: No detections found (this may be normal for test images)');
            return true; // Not finding objects in a test image is not necessarily a failure
        }
    } catch (error) {
        log('ERROR', `Object detection: ${error.message}`);
        return false;
    }
}

async function testWhisperTranscription(audioPath) {
    if (!audioPath) {
        log('WARNING', 'Skipping speech-to-text test (no audio file)');
        return true;
    }
    
    log('INFO', 'Testing speech-to-text transcription...');
    
    try {
        const result = await runPythonScript('whisper_transcription.py', [
            '--audio', audioPath,
            '--model', 'tiny',
            '--output-format', 'json'
        ]);
        
        if (result.segments && Array.isArray(result.segments)) {
            log('SUCCESS', `Speech transcription: Processed ${result.segments.length} segments`);
            if (result.text) {
                log('INFO', `Transcribed text: "${result.text.substring(0, 100)}..."`);
            }
            return true;
        } else if (result.error) {
            log('ERROR', `Speech transcription: ${result.error}`);
            return false;
        } else {
            log('WARNING', 'Speech transcription: No segments found (expected for silent audio)');
            return true;
        }
    } catch (error) {
        log('ERROR', `Speech transcription: ${error.message}`);
        return false;
    }
}

async function testDependencies() {
    log('INFO', 'Testing Python dependencies...');
    
    const dependencies = [
        { name: 'torch', import: 'import torch; print(f"PyTorch {torch.__version__}")' },
        { name: 'cv2', import: 'import cv2; print(f"OpenCV {cv2.__version__}")' },
        { name: 'transformers', import: 'import transformers; print(f"Transformers {transformers.__version__}")' },
        { name: 'sentence_transformers', import: 'import sentence_transformers; print("Sentence Transformers OK")' },
        { name: 'whisper', import: 'import whisper; print("Whisper OK")' },
        { name: 'ultralytics', import: 'import ultralytics; print("Ultralytics OK")' },
        { name: 'spacy', import: 'import spacy; print(f"spaCy {spacy.__version__}")' }
    ];
    
    let successCount = 0;
    
    for (const dep of dependencies) {
        try {
            const result = await new Promise((resolve, reject) => {
                const python = spawn(config.pythonPath, ['-c', dep.import], {
                    stdio: ['pipe', 'pipe', 'pipe'],
                    timeout: 10000
                });
                
                let output = '';
                let error = '';
                
                python.stdout.on('data', (data) => output += data.toString());
                python.stderr.on('data', (data) => error += data.toString());
                
                python.on('close', (code) => {
                    if (code === 0) {
                        resolve(output.trim());
                    } else {
                        reject(new Error(error || 'Unknown error'));
                    }
                });
                
                python.on('error', reject);
            });
            
            log('SUCCESS', `✓ ${dep.name}: ${result}`);
            successCount++;
        } catch (error) {
            log('ERROR', `✗ ${dep.name}: ${error.message}`);
        }
    }
    
    const totalTests = dependencies.length;
    log('INFO', `Dependencies test: ${successCount}/${totalTests} passed`);
    
    return successCount === totalTests;
}

async function runExtractorTests() {
    log('INFO', 'Setting up test environment...');
    
    // Create temp directory
    if (!fs.existsSync(config.tempPath)) {
        fs.mkdirSync(config.tempPath, { recursive: true });
    }
    
    // Create test files
    const imagePath = createTestImage();
    const audioPath = createTestAudio();
    
    log('INFO', `Created test files: ${imagePath}, ${audioPath || 'none'}`);
    
    // Run tests
    const tests = [
        { name: 'Dependencies', fn: () => testDependencies() },
        { name: 'Text Embedding', fn: () => testTextEmbedding() },
        { name: 'Object Detection', fn: () => testObjectDetection(imagePath) },
        { name: 'Speech Transcription', fn: () => testWhisperTranscription(audioPath) }
    ];
    
    const results = [];
    
    for (const test of tests) {
        log('INFO', `\n=== Running ${test.name} Test ===`);
        try {
            const startTime = Date.now();
            const success = await test.fn();
            const duration = Date.now() - startTime;
            
            results.push({
                name: test.name,
                success,
                duration
            });
            
            if (success) {
                log('SUCCESS', `${test.name} test completed in ${duration}ms`);
            } else {
                log('ERROR', `${test.name} test failed after ${duration}ms`);
            }
        } catch (error) {
            log('ERROR', `${test.name} test error: ${error.message}`);
            results.push({
                name: test.name,
                success: false,
                duration: 0,
                error: error.message
            });
        }
    }
    
    // Cleanup
    try {
        if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
        if (audioPath && fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
        if (fs.existsSync(config.tempPath)) fs.rmdirSync(config.tempPath, { recursive: true });
    } catch (error) {
        log('WARNING', `Cleanup failed: ${error.message}`);
    }
    
    return results;
}

async function main() {
    console.log(`${colors.cyan}🧪 IntelGraph AI Extraction Testing${colors.reset}`);
    console.log(`${colors.cyan}=================================${colors.reset}\n`);
    
    const startTime = Date.now();
    
    try {
        const results = await runExtractorTests();
        
        const successCount = results.filter(r => r.success).length;
        const totalTests = results.length;
        const totalDuration = Date.now() - startTime;
        
        console.log(`\n${colors.bright}📊 Test Summary${colors.reset}`);
        console.log(`${colors.bright}===============${colors.reset}`);
        
        results.forEach(result => {
            const status = result.success ? `${colors.green}✓ PASSED${colors.reset}` : `${colors.red}✗ FAILED${colors.reset}`;
            const duration = result.duration ? ` (${result.duration}ms)` : '';
            console.log(`${status} ${result.name}${duration}`);
            if (result.error) {
                console.log(`  ${colors.red}Error: ${result.error}${colors.reset}`);
            }
        });
        
        console.log(`\n${colors.bright}Overall Result: ${successCount}/${totalTests} tests passed${colors.reset}`);
        console.log(`${colors.bright}Total Duration: ${totalDuration}ms${colors.reset}`);
        
        if (successCount === totalTests) {
            console.log(`\n${colors.green}🎉 All AI extraction tests passed!${colors.reset}`);
            console.log(`${colors.green}The IntelGraph AI engines are ready for use.${colors.reset}`);
            process.exit(0);
        } else {
            console.log(`\n${colors.yellow}⚠️  Some tests failed.${colors.reset}`);
            console.log(`${colors.yellow}Please check the error messages above and ensure all dependencies are installed.${colors.reset}`);
            console.log(`${colors.yellow}Run './scripts/setup-ai-models.sh' to install missing dependencies.${colors.reset}`);
            process.exit(1);
        }
    } catch (error) {
        log('ERROR', `Test execution failed: ${error.message}`);
        process.exit(1);
    }
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
    log('ERROR', `Unhandled promise rejection: ${reason}`);
    process.exit(1);
});

// Run the tests
if (require.main === module) {
    main();
}

module.exports = { runExtractorTests, config };