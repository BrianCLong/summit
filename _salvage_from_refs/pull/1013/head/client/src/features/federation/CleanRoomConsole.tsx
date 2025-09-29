import React, { useState } from 'react';
import { apolloClient } from '../../services/apollo';
import operations from '../../generated/operation-lookup.json';

type UploadEvent = React.ChangeEvent<HTMLInputElement>;

export const CleanRoomConsole: React.FC = () => {
  const [manifest, setManifest] = useState<any>();
  const [result, setResult] = useState<string>('');

  const onUpload = (e: UploadEvent) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setManifest(JSON.parse(reader.result as string));
    reader.readAsText(file);
  };

  const runQuery = async (name: string) => {
    const hash = (operations as any)[name];
    const res = await apolloClient.mutate({
      mutation: { kind: 'Document', /* placeholder */ } as any,
      context: { persistedQuery: { sha256Hash: hash } },
      variables: { manifestId: manifest.id, queryName: name }
    });
    setResult(JSON.stringify(res.data));
  };

  return (
    <div>
      <input type="file" accept=".json,.yaml,.yml" onChange={onUpload} />
      {manifest && (
        <div>
          <p>Loaded manifest {manifest.id}</p>
          {manifest.allowedQueries.map((q: string) => (
            <button key={q} onClick={() => runQuery(q)}>{q}</button>
          ))}
        </div>
      )}
      {result && <pre>{result}</pre>}
    </div>
  );
};

export default CleanRoomConsole;
