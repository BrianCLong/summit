export class InteractionFeatures {
  generate(data: number[][]): number[][] {
    return data.map(row => {
      const result: number[] = [...row];
      for (let i = 0; i < row.length; i++) {
        for (let j = i + 1; j < row.length; j++) {
          result.push(row[i] * row[j]);
        }
      }
      return result;
    });
  }
}
