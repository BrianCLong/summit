import React, { useEffect, useRef, useState } from 'react';
import { Button, TextField, Tooltip, Drawer, Chip, List, ListItem, ListItemText } from '@mui/material';
import cytoscape from 'cytoscape';
import { getSocket } from '../services/socket';
import { gql, useLazyQuery, useQuery, useMutation } from '@apollo/client';
import $ from 'jquery';
import AddCaseModal from '../components/cases/AddCaseModal'; // New import

const OSINT_SEARCH = gql`
  query OsintSearch($search:String,$limit:Int){
    osintItems(search:$search, limit:$limit){ hash title url publishedAt }
  }
`;

const CASES_Q = gql`
  query GetCases {
    cases {
      id
      name
    }
  }
`;

const ADD_ITEM_M = gql`
  mutation AddCaseItem($caseId: ID!, $kind: String!, $refId: String!, $tags: [String!]) {
    addCaseItem(caseId: $caseId, kind: $kind, refId: $refId, tags: $tags) {
      id
    }
  }
`;

const CREATE_CASE_MUTATION = gql`
  mutation CreateCase($name: String!, $summary: String) {
    createCase(name: $name, summary: $summary) {
      id
      name
    }
  }
`;

export default function OsintStudio() {
  const cyRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any|null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [addCaseModalOpen, setAddCaseModalOpen] = useState(false); // New state for modal
  const { data: cases } = useQuery(CASES_Q); // This will now query the actual cases
  const [addItem] = useMutation(ADD_ITEM_M); // This will now use the actual addCaseItem mutation

  useEffect(() => {
    if (!containerRef.current) return;
    cyRef.current = cytoscape({
      container: containerRef.current,
      elements: [],
      layout: { name: 'cose' },
      style: [
        { selector: 'node', style: { label: 'data(label)', 'background-color': '#1976d2', color: '#fff', 'font-size': 10 } },
      ],
    });

    const socket = getSocket();
    if (socket) {
      socket.on('OSINT_EVT', (evt: any) => {
        // eslint-disable-next-line no-console
        console.log('OSINT_EVT', evt);
        const id = evt.itemId || `${Date.now()}`;
        cyRef.current.add({ data: { id, label: evt.message || evt.kind }, classes: 'doc' });
        cyRef.current.layout({ name: 'cose' }).run();
      });
    }

    cyRef.current.on('tap', 'node', (e:any)=>{
      const d = e.target.data();
      setSelected(d);
      setDrawerOpen(true);
    });
    const onResize = () => cyRef.current?.resize();
    window.addEventListener('resize', onResize);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'A') {
        event.preventDefault();
        if (selected) { // Only open if a node is selected
          setAddCaseModalOpen(true);
        } else {
          $(document).trigger('intelgraph:toast', ['Please select an OSINT item first.']);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', handleKeyDown);
      socket?.off('OSINT_EVT');
    };
  }, [selected]); // Add selected to dependency array

  const [runSearch, { data }] = useLazyQuery(OSINT_SEARCH);

  function onSearch() {
    $(document).trigger('intelgraph:toast', [`Searching OSINT: ${search}`]);
    runSearch({ variables: { search, limit: 50 } });
  }

  useEffect(()=>{
    if(!data?.osintItems) return;
    const nodes = data.osintItems.map((d:any)=>({ data: { id: d.hash, label: d.title || d.url || d.hash, entities: d.entities, claims: d.claims, license: d.license } }));
    cyRef.current.add(nodes);
    cyRef.current.layout({ name:'cose' }).run();
  },[data]);

  return (
    <>
      <div className="p-4 space-y-3">
        <div className="flex gap-2">
          <Tooltip title="Search canonicalized OSINT documents">
            <TextField size="small" label="Search OSINT" value={search} onChange={(e) => setSearch(e.target.value)} />
          </Tooltip>
          <Button variant="contained" onClick={onSearch} title="Run OSINT search (GraphQL)">Search</Button>
        </div>
        <div ref={containerRef} style={{ height: 600, borderRadius: 16, boxShadow: '0 0 12px rgba(0,0,0,0.08)' }} />
      </div>
      <Drawer anchor="right" open={drawerOpen} onClose={()=>setDrawerOpen(false)}>
        <div style={{ width: 340, padding: 16 }}>
          <h3 style={{ marginTop: 0 }}>OSINT Item</h3>
          {selected?.license && selected.license.allowExport === false && (
            <div style={{ background: '#fff3cd', color: '#664d03', padding: 8, borderRadius: 6, marginBottom: 8 }}>
              Export disabled by license
            </div>
          )}
          <div style={{ marginBottom: 8 }}>
            <strong>Entities</strong>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              {(selected?.entities||[]).slice(0,20).map((e:any)=> (
                <Chip key={e.id} label={e.name || e.id} size="small" />
              ))}
            </div>
          </div>
          <div>
            <strong>Claims</strong>
            <List dense>
              {(selected?.claims||[]).slice(0,20).map((c:any, i:number)=> (
                <ListItem key={i}>
                  <ListItemText primary={c.text} secondary={typeof c.confidence==='number' ? `confidence ${c.confidence}`: undefined} />
                </ListItem>
              ))}
            </List>
          </div>
          <div style={{ display:'flex', gap: 8, marginTop: 12 }}>
            <Button variant="outlined" onClick={()=>setDrawerOpen(false)}>Close</Button>
            <Button variant="contained" disabled={selected?.license && selected.license.allowExport===false} onClick={()=>{
              if (!selected) return;
              $(document).trigger('intelgraph:toast', ['Preparing export…']);
              // Export single selected for MVP; multi-select can follow
              fetch('/graphql', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: 'mutation($ids:[ID!]!, $fmt:ExportFormat!){ exportOsintBundle(ids:$ids, format:$fmt){ url } }', variables: { ids:[selected.id], fmt:'JSON' } })
              }).then(r=>r.json()).then((res:any)=>{
                const url = res?.data?.exportOsintBundle?.url;
                if (url) window.open(url, '_blank');
              });
            }}>Export</Button>
            <Button variant="outlined" onClick={()=> setAddCaseModalOpen(true)}>Add to Case</Button> {/* Open modal */}
          </div>
        </div>
      </Drawer>
      {selected && (
        <AddCaseModal
          open={addCaseModalOpen}
          handleClose={() => setAddCaseModalOpen(false)}
          itemKind="OSINT_DOC"
          itemRefId={selected.id}
        />
      )}
    </>
  );
}
