import React, {useEffect, useRef} from 'react';
import {createRoot} from 'react-dom/client';
import NeoVis from 'neovis.js';
import { Timeline } from 'vis-timeline/standalone';
import { DataSet } from 'vis-data';
import L from 'leaflet';
import 'vis-timeline/styles/vis-timeline-graph2d.min.css';
import 'leaflet/dist/leaflet.css';

function clamp01(n){
  const x = Number.isFinite(Number(n)) ? Number(n) : 0;
  return Math.max(0, Math.min(1, x));
}

/**
 * uncertainty -> rgba
 * 0.0 = more confident: blue-ish, more opaque
 * 1.0 = less certain: red-ish, semi-transparent
 */
function uncertaintyToRGBA(uncertainty, base='node'){
  const u = clamp01(uncertainty);
  const r = Math.round(40 + (215 * u));
  const g = Math.round(120 - (70 * u));
  const b = Math.round(220 - (170 * u));
  const a = Math.max(0.35, 0.95 - (u * 0.35));
  if(base === 'edge') return `rgba(${r}, ${g}, ${b}, ${Math.max(0.25, a - 0.2)})`;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function anomalyToBorder(anomalyScore){
  const a = clamp01(anomalyScore);
  if(a >= 0.8) return '#c62828';
  if(a >= 0.5) return '#ef6c00';
  return '#2e7d32';
}

function applyVisualEncoding(nodes = [], edges = []){
  return {
    nodes: nodes.map((n) => {
      const u = clamp01(n.uncertainty);
      return {
        ...n,
        color: {
          background: uncertaintyToRGBA(u, 'node'),
          border: anomalyToBorder(n.anomalyScore || 0),
          highlight: {
            background: uncertaintyToRGBA(Math.max(0, u - 0.1), 'node'),
            border: anomalyToBorder(n.anomalyScore || 0)
          }
        },
        font: { color: '#111' }
      };
    }),
    edges: edges.map((e) => {
      const u = clamp01(e.uncertainty);
      return {
        ...e,
        color: {
          color: uncertaintyToRGBA(u, 'edge'),
          highlight: anomalyToBorder(e.anomalyScore || 0),
          inherit: false,
          opacity: Math.max(0.25, 1 - u * 0.5)
        },
        smooth: { type: 'dynamic' }
      };
    })
  };
}

function GraphTimelineDemo(){
  const timelineRef = useRef(null);
  const mapRef = useRef(null);
  const vizRef = useRef(null);
  const itemsRef = useRef(null);

  useEffect(()=>{
    // 1) Neo4j graph bootstrap (initial read-only seed)
    const config = {
      container_id: 'graph',
      server_url: process.env.NEO4J_DEMO_URI || 'bolt://localhost:7687',
      server_user: process.env.NEO4J_USER || 'neo4j',
      server_password: process.env.NEO4J_PASS || 'demo',
      initial_cypher: 'MATCH (n)-[r]->(m) RETURN n,r,m LIMIT 150'
    };
    const viz = new NeoVis(config);
    viz.render();
    vizRef.current = viz;

    // 2) Timeline
    const container = document.getElementById('timeline');
    const items = new DataSet([]);
    itemsRef.current = items;
    const timeline = new Timeline(container, items, {});
    timelineRef.current = timeline;

    async function refreshGraphForWindow(start, end){
      const badge = document.getElementById('graph-mode-badge');
      const qs = new URLSearchParams({
        start: typeof start === 'string' ? start : new Date(start).toISOString(),
        end: typeof end === 'string' ? end : new Date(end).toISOString(),
        maxNodes: '500'
      });

      const resp = await fetch(`http://localhost:${process.env.DEMO_API_PORT || 8082}/api/demo/graph?${qs}`);
      if(!resp.ok) throw new Error(`graph fetch failed: ${resp.status}`);
      const payload = await resp.json();
      const styled = applyVisualEncoding(payload.nodes || [], payload.edges || []);

      // Direct vis-network update via neovis internal network
      if (vizRef.current?.network) {
        vizRef.current.clearNetwork();
        vizRef.current.network.setData({
          nodes: new DataSet(styled.nodes),
          edges: new DataSet(styled.edges)
        });
        vizRef.current.network.fit({
          animation: { duration: 400, easingFunction: 'easeInOutQuad' }
        });
      }

      if (badge) {
        badge.textContent =
          `mode: ${payload.mode} · nodes: ${payload.meta?.nodeCount ?? styled.nodes.length} · edges: ${payload.meta?.relCount ?? styled.edges.length}`;
      }
    }

    timeline.on('select', async function(props){
      const sel = props.items.length ? props.items.map(id=> items.get(id)) : [];
      if(sel.length){
        const item = sel[0];
        const start = item.start;
        const end = item.end || item.start;
        await refreshGraphForWindow(start, end);
      }
    });

    // 3) Timeline data from Express proxy -> Cypher
    fetch(`http://localhost:${process.env.DEMO_API_PORT || 8082}/api/demo/timeline`)
    .then(r=>r.json()).then(data=>{
      data.forEach(d=>{
        d.className = d.anomalyScore>0.7 ? 'anomaly' : (d.anomalyScore>0.4 ? 'suspicious':'normal');
        items.add(d);
      });

      // auto-focus on first recent item
      const all = items.get();
      if (all.length) {
        const first = all[0];
        timeline.setSelection([first.id]);
        refreshGraphForWindow(first.start, first.end || first.start).catch(console.error);
      }
    }).catch(()=> {
      // Fallback sample
      items.add([
        {id: 1, content: 'normal', start: '2025-01-01', anomalyScore: 0.1, uncertainty: 0.2, className:'normal'},
        {id: 2, content: 'suspicious', start: '2025-02-15', anomalyScore: 0.5, uncertainty: 0.5, className:'suspicious'},
        {id: 3, content: 'anomaly', start: '2025-03-10', anomalyScore: 0.8, uncertainty: 0.9, className:'anomaly'}
      ]);
    });

    // 4) Leaflet map (optional geo)
    const map = L.map('map').setView([20,0],2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    return ()=>{
      timeline.destroy();
      viz.clearNetwork();
      map.remove();
    }
  },[]);

  return null;
}

createRoot(document.getElementById('root')).render(React.createElement(GraphTimelineDemo));
