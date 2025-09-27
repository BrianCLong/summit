import { FormEvent, useEffect, useState } from 'react';
import type { SuppressionInput } from '../types';

interface Props {
  targets: string[];
  defaultTarget?: string;
  loading?: boolean;
  onSubmit: (input: SuppressionInput) => Promise<void> | void;
}

function defaultWindow() {
  const start = new Date();
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return {
    start: start.toISOString().slice(0, 16),
    end: end.toISOString().slice(0, 16)
  };
}

export default function SuppressionForm({ targets, defaultTarget, loading, onSubmit }: Props) {
  const window = defaultWindow();
  const [target, setTarget] = useState(defaultTarget ?? targets[0] ?? '');
  const [entity, setEntity] = useState('');
  const [start, setStart] = useState(window.start);
  const [end, setEnd] = useState(window.end);
  const [reason, setReason] = useState('Noise suppression');

  useEffect(() => {
    if (defaultTarget) {
      setTarget(defaultTarget);
    }
  }, [defaultTarget]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!target) {
      return;
    }
    const payload: SuppressionInput = {
      target,
      entity: entity.trim() || undefined,
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
      reason: reason.trim() || 'Noise suppression'
    };
    await onSubmit(payload);
    setReason('Noise suppression');
  };

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <label>
        Target
        <select value={target} onChange={(event) => setTarget(event.target.value)} required>
          <option value="" disabled>
            Select a target
          </option>
          {targets.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
      <label>
        Entity (optional)
        <input value={entity} onChange={(event) => setEntity(event.target.value)} placeholder="service-1" />
      </label>
      <label>
        Start
        <input type="datetime-local" value={start} onChange={(event) => setStart(event.target.value)} required />
      </label>
      <label>
        End
        <input type="datetime-local" value={end} onChange={(event) => setEnd(event.target.value)} required />
      </label>
      <label>
        Reason
        <input value={reason} onChange={(event) => setReason(event.target.value)} required />
      </label>
      <button type="submit" disabled={loading || !target}>
        {loading ? 'Saving…' : 'Create suppression'}
      </button>
    </form>
  );
}

