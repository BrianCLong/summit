import React from 'react';

export default function VerificationReport({ result }: { result: any }) {
  return <pre>{JSON.stringify(result, null, 2)}</pre>;
}
