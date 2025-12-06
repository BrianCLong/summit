import { Complex, polyFromRoots, evaluatePoly } from './complex.js';
import { FilterDesign, NumericArray } from './types.js';

function butterworthPoles(order: number): Complex[] {
  const poles: Complex[] = [];
  for (let k = 0; k < order; k += 1) {
    const theta = Math.PI * (2 * k + 1) / (2 * order);
    poles.push(new Complex(-Math.sin(theta), Math.cos(theta)));
  }
  return poles;
}

function chebyshevPoles(order: number, rippleDb: number): Complex[] {
  const epsilon = Math.sqrt(Math.pow(10, rippleDb / 10) - 1);
  const mu = (1 / order) * Math.asinh(1 / epsilon);
  const poles: Complex[] = [];
  for (let k = 0; k < order; k += 1) {
    const theta = Math.PI * (2 * k + 1) / (2 * order);
    const sigma = -Math.sin(theta) * Math.sinh(mu);
    const omega = Math.cos(theta) * Math.cosh(mu);
    poles.push(new Complex(sigma, omega));
  }
  return poles;
}

function bilinearTransform(poles: Complex[], sampleRate: number, cutoffHz: number): Complex[] {
  const fs2 = 2 * sampleRate;
  const warped = Math.tan(Math.PI * cutoffHz / sampleRate);
  return poles.map((pole) => {
    const scaled = pole.mul(warped);
    const numerator = new Complex(fs2 + scaled.re, scaled.im);
    const denominator = new Complex(fs2 - scaled.re, -scaled.im);
    return numerator.div(denominator);
  });
}

function buildDigitalFilter(poles: Complex[], order: number): FilterDesign {
  const zeros = Array.from({ length: order }, () => new Complex(-1, 0));
  const aPoly = polyFromRoots(poles);
  const bPoly = polyFromRoots(zeros);
  const dcGain = evaluatePoly(bPoly, new Complex(1, 0)).div(evaluatePoly(aPoly, new Complex(1, 0)));
  const numerator = bPoly.map((c) => c.div(dcGain).re);
  const denominator = aPoly.map((c) => c.re);
  const a0 = denominator[0];
  return {
    numerator: numerator.map((n) => n / a0),
    denominator: denominator.map((d) => d / a0),
  };
}

export function designButterworthLowpass(order: number, cutoffHz: number, sampleRate: number): FilterDesign {
  if (order < 1) {
    throw new Error('Order must be at least 1');
  }
  const poles = butterworthPoles(order);
  const digitalPoles = bilinearTransform(poles, sampleRate, cutoffHz);
  return buildDigitalFilter(digitalPoles, order);
}

export function designChebyshevLowpass(order: number, cutoffHz: number, sampleRate: number, rippleDb = 0.5): FilterDesign {
  if (order < 1) {
    throw new Error('Order must be at least 1');
  }
  const poles = chebyshevPoles(order, rippleDb);
  const digitalPoles = bilinearTransform(poles, sampleRate, cutoffHz);
  return buildDigitalFilter(digitalPoles, order);
}

export class IIRFilter {
  private readonly b: number[];

  private readonly a: number[];

  private readonly xHist: number[];

  private readonly yHist: number[];

  constructor(design: FilterDesign) {
    if (design.denominator[0] === 0) {
      throw new Error('Invalid denominator: a0 must be non-zero');
    }
    this.b = design.numerator;
    this.a = design.denominator;
    this.xHist = Array(this.b.length).fill(0);
    this.yHist = Array(this.a.length - 1).fill(0);
  }

  processSample(x: number): number {
    this.xHist.pop();
    this.xHist.unshift(x);

    let y = 0;
    for (let i = 0; i < this.b.length; i += 1) {
      y += this.b[i] * this.xHist[i];
    }
    for (let i = 1; i < this.a.length; i += 1) {
      y -= this.a[i] * (this.yHist[i - 1] || 0);
    }

    this.yHist.pop();
    this.yHist.unshift(y);
    return y;
  }

  processBuffer(buffer: NumericArray): Float64Array {
    const output = new Float64Array(buffer.length);
    for (let i = 0; i < buffer.length; i += 1) {
      output[i] = this.processSample(buffer[i]);
    }
    return output;
  }
}
