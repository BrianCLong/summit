import React, { useEffect, useMemo, useState } from 'react';
import { gql, useQuery, useMutation } from '@apollo/client';
import { Button, TextField } from '@mui/material';
import VirtualizedListTable from '../components/common/VirtualizedListTable';
import { useFeatureFlag } from '../hooks/useFeatureFlag';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { PerfMarkOverlay, usePerfMarkers } from '../hooks/usePerfMarkers';

const CASES_Q = gql`
  query ($status: String) {
    cases(status: $status) {
      id
      name
      status
      priority
      summary
      createdAt
    }
  }
`;
const CREATE_M = gql`
  mutation ($input: CaseInput!) {
    createCase(input: $input) {
      id
      name
      status
    }
  }
`;

export default function Cases() {
  const { data, refetch } = useQuery(CASES_Q);
  const [createCase] = useMutation(CREATE_M);
  const [name, setName] = useState('');
  const [priority, setPriority] = useState('');
  const [summary, setSummary] = useState('');
  const [search, setSearch] = useState('');
  const virtualized =
    useFeatureFlag('ui.virtualLists') || useFeatureFlag('ui.virtualLists.cases');
  const debouncedSearch = useDebouncedValue(search, 200);
  const { mark, overlayState } = usePerfMarkers('cases-table', virtualized);

  const onCreate = async () => {
    if (!name) return;
    await createCase({ variables: { input: { name, priority, summary } } });
    setName('');
    setPriority('');
    setSummary('');
    refetch();
  };

  const cases = data?.cases || [];
  const filteredCases = useMemo(() => {
    if (!debouncedSearch) return cases;
    const term = debouncedSearch.toLowerCase();
    return cases.filter(
      (c: any) =>
        c.name?.toLowerCase().includes(term) ||
        c.summary?.toLowerCase().includes(term) ||
        c.status?.toLowerCase().includes(term) ||
        c.priority?.toLowerCase().includes(term),
    );
  }, [cases, debouncedSearch]);

  const columns = useMemo(
    () => [
      {
        key: 'name',
        label: 'Name',
        width: '1.5fr',
        render: (c: any) => c.name,
      },
      {
        key: 'status',
        label: 'Status',
        width: '1fr',
        render: (c: any) => c.status,
      },
      {
        key: 'priority',
        label: 'Priority',
        width: '1fr',
        render: (c: any) => c.priority || '',
      },
      {
        key: 'createdAt',
        label: 'Created',
        width: '1.2fr',
        render: (c: any) =>
          c.createdAt ? new Date(c.createdAt).toLocaleString() : '',
      },
    ],
    [],
  );

  const rowHeight = 48;

  useEffect(() => {
    const done = mark('rows');
    return done;
  }, [filteredCases, mark]);

  return (
    <div className="p-4">
      <h2>Cases</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <TextField
          size="small"
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <TextField
          size="small"
          label="Priority"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        />
        <TextField
          size="small"
          label="Summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
        />
        <TextField
          size="small"
          label="Filter"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter cases..."
        />
        <Button variant="contained" onClick={onCreate}>
          Create
        </Button>
      </div>
      <VirtualizedListTable
        ariaLabel="Cases table"
        items={filteredCases}
        columns={columns}
        height={Math.min(520, Math.max(220, filteredCases.length * rowHeight))}
        rowHeight={rowHeight}
        virtualizationEnabled={virtualized}
        getRowId={(c: any) => c.id}
        emptyMessage="No cases found"
      />
      <PerfMarkOverlay
        label="Cases"
        state={overlayState}
        show={import.meta.env.DEV && virtualized}
      />
    </div>
  );
}
