export class Complex {
  constructor(public readonly re: number, public readonly im: number = 0) {}

  add(other: Complex): Complex {
    return new Complex(this.re + other.re, this.im + other.im);
  }

  sub(other: Complex): Complex {
    return new Complex(this.re - other.re, this.im - other.im);
  }

  mul(other: Complex | number): Complex {
    if (typeof other === 'number') {
      return new Complex(this.re * other, this.im * other);
    }
    return new Complex(this.re * other.re - this.im * other.im, this.re * other.im + this.im * other.re);
  }

  div(other: Complex | number): Complex {
    if (typeof other === 'number') {
      return new Complex(this.re / other, this.im / other);
    }
    const denom = other.re * other.re + other.im * other.im;
    return new Complex((this.re * other.re + this.im * other.im) / denom, (this.im * other.re - this.re * other.im) / denom);
  }

  conj(): Complex {
    return new Complex(this.re, -this.im);
  }

  abs(): number {
    return Math.sqrt(this.re * this.re + this.im * this.im);
  }

  static fromPolar(r: number, theta: number): Complex {
    return new Complex(r * Math.cos(theta), r * Math.sin(theta));
  }
}

export function polyFromRoots(roots: Complex[]): Complex[] {
  let coeffs: Complex[] = [new Complex(1, 0)];
  roots.forEach((root) => {
    const next: Complex[] = Array.from({ length: coeffs.length + 1 }, () => new Complex(0, 0));
    coeffs.forEach((coeff, idx) => {
      next[idx] = next[idx].sub(coeff.mul(root));
      next[idx + 1] = next[idx + 1].add(coeff);
    });
    coeffs = next;
  });
  return coeffs;
}

export function evaluatePoly(coeffs: Complex[], z: Complex): Complex {
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
