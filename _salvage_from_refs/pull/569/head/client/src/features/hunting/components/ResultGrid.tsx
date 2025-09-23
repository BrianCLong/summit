import React from 'react';

export default function ResultGrid({ rows = [] }: { rows?: any[] }) {
  return (
    <table>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            <td>{JSON.stringify(r)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
