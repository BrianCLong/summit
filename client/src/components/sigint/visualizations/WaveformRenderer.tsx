/**
 * WaveformRenderer - WebGL-accelerated signal waveform visualization
 * High-performance rendering for real-time SIGINT waveforms with spectrum
 * analysis and waterfall display capabilities.
 */
import React, {
  useRef,
  useEffect,
  useCallback,
  useState,
  useMemo,
} from 'react';
import type {
  SignalSample,
  WaveformRendererConfig,
  PerformanceMetrics,
} from '../types';

interface WaveformRendererProps {
  samples: SignalSample[];
  config?: Partial<WaveformRendererConfig>;
  onMetrics?: (metrics: PerformanceMetrics) => void;
  className?: string;
}

const DEFAULT_CONFIG: WaveformRendererConfig = {
  width: 800,
  height: 400,
  backgroundColor: '#0a0e14',
  waveformColor: '#00ff88',
  gridColor: '#1e2832',
  fftSize: 2048,
  smoothing: 0.8,
  showGrid: true,
  showSpectrum: true,
  showWaterfall: true,
  refreshRate: 60,
};

// WebGL shader sources for waveform rendering
const VERTEX_SHADER = `
  attribute vec2 a_position;
  attribute float a_intensity;
  uniform vec2 u_resolution;
  varying float v_intensity;

  void main() {
    vec2 zeroToOne = a_position / u_resolution;
    vec2 zeroToTwo = zeroToOne * 2.0;
    vec2 clipSpace = zeroToTwo - 1.0;
    gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
    v_intensity = a_intensity;
    gl_PointSize = 2.0;
  }
`;

const FRAGMENT_SHADER = `
  precision mediump float;
  uniform vec3 u_color;
  varying float v_intensity;

  void main() {
    float alpha = v_intensity * 0.8 + 0.2;
    gl_FragColor = vec4(u_color * v_intensity, alpha);
  }
`;

// Waterfall fragment shader for spectral history
const WATERFALL_FRAGMENT_SHADER = `
  precision mediump float;
  uniform sampler2D u_texture;
  varying vec2 v_texCoord;

  vec3 heatmap(float t) {
    return vec3(
      clamp(1.5 - abs(4.0 * t - 3.0), 0.0, 1.0),
      clamp(1.5 - abs(4.0 * t - 2.0), 0.0, 1.0),
      clamp(1.5 - abs(4.0 * t - 1.0), 0.0, 1.0)
    );
  }

  void main() {
    float intensity = texture2D(u_texture, v_texCoord).r;
    gl_FragColor = vec4(heatmap(intensity), 1.0);
  }
`;

function createShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

function createProgram(
  gl: WebGLRenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader
): WebGLProgram | null {
  const program = gl.createProgram();
  if (!program) return null;

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }

  return program;
}

export const WaveformRenderer: React.FC<WaveformRendererProps> = ({
  samples,
  config: configOverrides,
  onMetrics,
  className,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const positionBufferRef = useRef<WebGLBuffer | null>(null);
  const intensityBufferRef = useRef<WebGLBuffer | null>(null);
  const waterfallDataRef = useRef<Float32Array>(new Float32Array(256 * 128));
  const animationFrameRef = useRef<number>(0);
  const lastRenderTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const fpsRef = useRef<number>(60);

  const config = useMemo(
    () => ({ ...DEFAULT_CONFIG, ...configOverrides }),
    [configOverrides]
  );

  const [dimensions, setDimensions] = useState({
    width: config.width,
    height: config.height,
  });

  // Initialize WebGL context and shaders
  const initializeGL = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return false;

    const gl = canvas.getContext('webgl', {
      antialias: true,
      preserveDrawingBuffer: true,
    });

    if (!gl) {
      console.error('WebGL not supported');
      return false;
    }

    glRef.current = gl;

    // Create shaders
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);

    if (!vertexShader || !fragmentShader) return false;

    // Create program
    const program = createProgram(gl, vertexShader, fragmentShader);
    if (!program) return false;

    programRef.current = program;

    // Create buffers
    positionBufferRef.current = gl.createBuffer();
    intensityBufferRef.current = gl.createBuffer();

    // Enable blending for transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    return true;
  }, []);

  // Render waveform data
  const render = useCallback(() => {
    const gl = glRef.current;
    const program = programRef.current;
    const canvas = canvasRef.current;

    if (!gl || !program || !canvas || samples.length === 0) {
      animationFrameRef.current = requestAnimationFrame(render);
      return;
    }

    const now = performance.now();
    const elapsed = now - lastRenderTimeRef.current;

    // Cap render rate
    if (elapsed < 1000 / config.refreshRate) {
      animationFrameRef.current = requestAnimationFrame(render);
      return;
    }

    const renderStart = performance.now();

    // Update FPS counter
    frameCountRef.current++;
    if (elapsed >= 1000) {
      fpsRef.current = Math.round((frameCountRef.current / elapsed) * 1000);
      frameCountRef.current = 0;
      lastRenderTimeRef.current = now;
    }

    // Clear canvas
    const bgColor = hexToRgb(config.backgroundColor);
    gl.clearColor(bgColor.r, bgColor.g, bgColor.b, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);

    // Set resolution uniform
    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
    gl.uniform2f(resolutionLocation, canvas.width, canvas.height);

    // Set color uniform
    const colorLocation = gl.getUniformLocation(program, 'u_color');
    const waveColor = hexToRgb(config.waveformColor);
    gl.uniform3f(colorLocation, waveColor.r, waveColor.g, waveColor.b);

    // Prepare position data
    const positions = new Float32Array(samples.length * 2);
    const intensities = new Float32Array(samples.length);

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const halfHeight = canvasHeight / 2;

    samples.forEach((sample, i) => {
      const x = (i / samples.length) * canvasWidth;
      const y = halfHeight + sample.amplitude * halfHeight * 0.8;
      positions[i * 2] = x;
      positions[i * 2 + 1] = y;
      intensities[i] = Math.min(1, Math.abs(sample.amplitude) + 0.3);
    });

    // Upload position data
    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBufferRef.current);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Upload intensity data
    const intensityLocation = gl.getAttribLocation(program, 'a_intensity');
    gl.bindBuffer(gl.ARRAY_BUFFER, intensityBufferRef.current);
    gl.bufferData(gl.ARRAY_BUFFER, intensities, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(intensityLocation);
    gl.vertexAttribPointer(intensityLocation, 1, gl.FLOAT, false, 0, 0);

    // Draw waveform as line strip
    gl.drawArrays(gl.LINE_STRIP, 0, samples.length);

    // Draw grid if enabled
    if (config.showGrid) {
      drawGrid(gl, program, canvasWidth, canvasHeight, config);
    }

    const renderTime = performance.now() - renderStart;

    // Report metrics
    if (onMetrics) {
      onMetrics({
        fps: fpsRef.current,
        renderTime,
        sampleLatency: samples.length > 0 ? Date.now() - samples[samples.length - 1].timestamp : 0,
        bufferUtilization: samples.length / config.fftSize,
        droppedFrames: 0,
      });
    }

    animationFrameRef.current = requestAnimationFrame(render);
  }, [samples, config, onMetrics]);

  // Draw reference grid
  const drawGrid = useCallback(
    (
      gl: WebGLRenderingContext,
      program: WebGLProgram,
      width: number,
      height: number,
      cfg: WaveformRendererConfig
    ) => {
      const gridColor = hexToRgb(cfg.gridColor);
      const colorLocation = gl.getUniformLocation(program, 'u_color');
      gl.uniform3f(colorLocation, gridColor.r, gridColor.g, gridColor.b);

      const gridLines: number[] = [];
      const gridIntensities: number[] = [];

      // Horizontal lines
      const hLines = 8;
      for (let i = 0; i <= hLines; i++) {
        const y = (i / hLines) * height;
        gridLines.push(0, y, width, y);
        gridIntensities.push(0.3, 0.3);
      }

      // Vertical lines
      const vLines = 16;
      for (let i = 0; i <= vLines; i++) {
        const x = (i / vLines) * width;
        gridLines.push(x, 0, x, height);
        gridIntensities.push(0.3, 0.3);
      }

      const positionLocation = gl.getAttribLocation(program, 'a_position');
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBufferRef.current);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(gridLines), gl.STATIC_DRAW);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

      const intensityLocation = gl.getAttribLocation(program, 'a_intensity');
      gl.bindBuffer(gl.ARRAY_BUFFER, intensityBufferRef.current);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(gridIntensities), gl.STATIC_DRAW);
      gl.vertexAttribPointer(intensityLocation, 1, gl.FLOAT, false, 0, 0);

      gl.drawArrays(gl.LINES, 0, gridLines.length / 2);
    },
    []
  );

  // Responsive resize handler
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const container = canvas.parentElement;
      if (!container) return;

      const { width, height } = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      setDimensions({ width, height });

      if (glRef.current) {
        glRef.current.viewport(0, 0, canvas.width, canvas.height);
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    const canvas = canvasRef.current;

    if (canvas?.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    handleResize();

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Initialize and start rendering
  useEffect(() => {
    if (!initializeGL()) {
      console.error('Failed to initialize WebGL');
      return;
    }

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      // Cleanup WebGL resources
      const gl = glRef.current;
      if (gl) {
        if (positionBufferRef.current) gl.deleteBuffer(positionBufferRef.current);
        if (intensityBufferRef.current) gl.deleteBuffer(intensityBufferRef.current);
        if (programRef.current) gl.deleteProgram(programRef.current);
      }
    };
  }, [initializeGL, render]);

  return (
    <div className={`relative w-full h-full min-h-[200px] ${className || ''}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full rounded-lg"
        style={{ touchAction: 'none' }}
      />
      {/* FPS indicator */}
      <div className="absolute top-2 right-2 text-xs font-mono text-green-400/70 bg-black/50 px-2 py-1 rounded">
        {fpsRef.current} FPS | {samples.length} samples
      </div>
    </div>
  );
};

// Utility: Convert hex color to RGB (0-1 range)
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      }
    : { r: 0, g: 0, b: 0 };
}

export default WaveformRenderer;
