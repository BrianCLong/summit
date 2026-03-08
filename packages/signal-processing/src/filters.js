"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IIRFilter = void 0;
exports.designButterworthLowpass = designButterworthLowpass;
exports.designChebyshevLowpass = designChebyshevLowpass;
// @ts-nocheck
const complex_js_1 = require("./complex.js");
function butterworthPoles(order) {
    const poles = [];
    for (let k = 0; k < order; k += 1) {
        const theta = Math.PI * (2 * k + 1) / (2 * order);
        poles.push(new complex_js_1.Complex(-Math.sin(theta), Math.cos(theta)));
    }
    return poles;
}
function chebyshevPoles(order, rippleDb) {
    const epsilon = Math.sqrt(Math.pow(10, rippleDb / 10) - 1);
    const mu = (1 / order) * Math.asinh(1 / epsilon);
    const poles = [];
    for (let k = 0; k < order; k += 1) {
        const theta = Math.PI * (2 * k + 1) / (2 * order);
        const sigma = -Math.sin(theta) * Math.sinh(mu);
        const omega = Math.cos(theta) * Math.cosh(mu);
        poles.push(new complex_js_1.Complex(sigma, omega));
    }
    return poles;
}
function bilinearTransform(poles, sampleRate, cutoffHz) {
    const fs2 = 2 * sampleRate;
    const warped = Math.tan(Math.PI * cutoffHz / sampleRate);
    return poles.map((pole) => {
        const scaled = pole.mul(warped);
        const numerator = new complex_js_1.Complex(fs2 + scaled.re, scaled.im);
        const denominator = new complex_js_1.Complex(fs2 - scaled.re, -scaled.im);
        return numerator.div(denominator);
    });
}
function buildDigitalFilter(poles, order) {
    const zeros = Array.from({ length: order }, () => new complex_js_1.Complex(-1, 0));
    const aPoly = (0, complex_js_1.polyFromRoots)(poles);
    const bPoly = (0, complex_js_1.polyFromRoots)(zeros);
    const dcGain = (0, complex_js_1.evaluatePoly)(bPoly, new complex_js_1.Complex(1, 0)).div((0, complex_js_1.evaluatePoly)(aPoly, new complex_js_1.Complex(1, 0)));
    const numerator = bPoly.map((c) => c.div(dcGain).re);
    const denominator = aPoly.map((c) => c.re);
    const a0 = denominator[0];
    return {
        numerator: numerator.map((n) => n / a0),
        denominator: denominator.map((d) => d / a0),
    };
}
function designButterworthLowpass(order, cutoffHz, sampleRate) {
    if (order < 1) {
        throw new Error('Order must be at least 1');
    }
    const poles = butterworthPoles(order);
    const digitalPoles = bilinearTransform(poles, sampleRate, cutoffHz);
    return buildDigitalFilter(digitalPoles, order);
}
function designChebyshevLowpass(order, cutoffHz, sampleRate, rippleDb = 0.5) {
    if (order < 1) {
        throw new Error('Order must be at least 1');
    }
    const poles = chebyshevPoles(order, rippleDb);
    const digitalPoles = bilinearTransform(poles, sampleRate, cutoffHz);
    return buildDigitalFilter(digitalPoles, order);
}
class IIRFilter {
    b;
    a;
    xHist;
    yHist;
    constructor(design) {
        if (design.denominator[0] === 0) {
            throw new Error('Invalid denominator: a0 must be non-zero');
        }
        this.b = design.numerator;
        this.a = design.denominator;
        this.xHist = Array(this.b.length).fill(0);
        this.yHist = Array(this.a.length - 1).fill(0);
    }
    processSample(x) {
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
    processBuffer(buffer) {
        const output = new Float64Array(buffer.length);
        for (let i = 0; i < buffer.length; i += 1) {
            output[i] = this.processSample(buffer[i]);
        }
        return output;
    }
}
exports.IIRFilter = IIRFilter;
