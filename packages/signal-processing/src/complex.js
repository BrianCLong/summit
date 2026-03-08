"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Complex = void 0;
exports.polyFromRoots = polyFromRoots;
exports.evaluatePoly = evaluatePoly;
// @ts-nocheck
class Complex {
    re;
    im;
    constructor(re, im = 0) {
        this.re = re;
        this.im = im;
    }
    add(other) {
        return new Complex(this.re + other.re, this.im + other.im);
    }
    sub(other) {
        return new Complex(this.re - other.re, this.im - other.im);
    }
    mul(other) {
        if (typeof other === 'number') {
            return new Complex(this.re * other, this.im * other);
        }
        return new Complex(this.re * other.re - this.im * other.im, this.re * other.im + this.im * other.re);
    }
    div(other) {
        if (typeof other === 'number') {
            return new Complex(this.re / other, this.im / other);
        }
        const denom = other.re * other.re + other.im * other.im;
        return new Complex((this.re * other.re + this.im * other.im) / denom, (this.im * other.re - this.re * other.im) / denom);
    }
    conj() {
        return new Complex(this.re, -this.im);
    }
    abs() {
        return Math.sqrt(this.re * this.re + this.im * this.im);
    }
    static fromPolar(r, theta) {
        return new Complex(r * Math.cos(theta), r * Math.sin(theta));
    }
}
exports.Complex = Complex;
function polyFromRoots(roots) {
    let coeffs = [new Complex(1, 0)];
    roots.forEach((root) => {
        const next = Array.from({ length: coeffs.length + 1 }, () => new Complex(0, 0));
        coeffs.forEach((coeff, idx) => {
            next[idx] = next[idx].sub(coeff.mul(root));
            next[idx + 1] = next[idx + 1].add(coeff);
        });
        coeffs = next;
    });
    return coeffs;
}
function evaluatePoly(coeffs, z) {
    let sum = new Complex(0, 0);
    let zPower = new Complex(1, 0);
    coeffs.forEach((coeff, idx) => {
        if (idx > 0) {
            zPower = zPower.mul(z);
        }
        sum = sum.add(coeff.mul(zPower));
    });
    return sum;
}
