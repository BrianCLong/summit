export class PolynomialFeatures {
  generate(data: number[][], degree: number): number[][] {
    return data.map(row => {
      const result: number[] = [...row];
      for (let d = 2; d <= degree; d++) {
        for (const val of row) {
          result.push(Math.pow(val, d));
        }
      }
      return result;
    });
  }
}
