import React from 'react';

export default function AddToCaseButton({ onAdd }: { onAdd: () => void }) {
  return <button onClick={onAdd}>Add to Case</button>;
}
