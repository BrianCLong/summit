import { useEffect, useState } from 'react';

interface Props {
  expected: string;
}

export default function SchemaVersionBanner({ expected }: Props) {
  const [version, setVersion] = useState<string>('');
  useEffect(() => {
    fetch('/api/metadata/schema_version')
      .then((r) => r.json())
      .then((d) => setVersion(d.schema_version))
      .catch(() => setVersion('unknown'));
  }, []);
  if (!version) return null;
  const warn = expected && version !== expected;
  return (
    <div style={{ background: warn ? '#ffcccc' : '#e0ffe0', padding: '4px' }}>
      Schema version: {version}
      {warn && ` (expected ${expected})`}
    </div>
  );
}
