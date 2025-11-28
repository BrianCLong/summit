import React from 'react';
import { evaluateContrastBudget } from '../utils/contrast';

type PaletteItem = {
  name: string;
  foreground: string;
  background: string;
};

type Props = {
  palette: PaletteItem[];
  minimumRatio: number;
};

export function ContrastBudgeter({ palette, minimumRatio }: Props) {
  const results = evaluateContrastBudget(palette, minimumRatio);

  return (
    <table className="table" role="grid" aria-label="contrast budget">
      <thead>
        <tr>
          <th scope="col">Token</th>
          <th scope="col">Ratio</th>
          <th scope="col">Status</th>
        </tr>
      </thead>
      <tbody>
        {results.map((entry) => (
          <tr key={entry.name}>
            <td>{entry.name}</td>
            <td>{entry.ratio.toFixed(2)}:1</td>
            <td aria-label={entry.pass ? 'passes contrast budget' : 'fails contrast budget'}>
              {entry.pass ? 'Passes AA' : 'Needs adjustment'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
