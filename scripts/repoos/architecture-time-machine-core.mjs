import path from 'path';

export function normalizeTopLevel(filePath) {
  const parts = filePath.split('/');
  if (parts.length === 1) {
    return parts[0];
  }
  const [head, second] = parts;
  if (['apps', 'packages', 'services'].includes(head) && second) {
    return `${head}/${second}`;
  }
  return head;
}

export function buildSnapshotMetrics({ commit, date, files, packageMeta }) {
  const modules = new Set(files.map((file) => normalizeTopLevel(file)));
  const subsystemCounts = {};
  for (const moduleName of modules) {
    const subsystem = moduleName.includes('/') ? moduleName.split('/')[0] : moduleName;
    subsystemCounts[subsystem] = (subsystemCounts[subsystem] ?? 0) + 1;
  }

  const packageByName = new Map();
  for (const pkg of packageMeta) {
    if (pkg?.name) {
      packageByName.set(pkg.name, pkg.module);
    }
  }

  const dependencies = [];
  for (const pkg of packageMeta) {
    if (!pkg?.name) continue;
    for (const dep of pkg.dependencies) {
      const target = packageByName.get(dep);
      if (!target) continue;
      dependencies.push({
        from: pkg.module,
        to: target,
        fromPackage: pkg.name,
        toPackage: dep
      });
    }
  }

  const coupling = modules.size > 0 ? dependencies.length / modules.size : 0;
  const fanIn = computeFanIn(dependencies);
  const cycles = detectCycles(dependencies);

  return {
    commit,
    date,
    moduleCount: modules.size,
    modules: [...modules].sort(),
    subsystemCounts,
    dependencies,
    dependencyCount: dependencies.length,
    coupling,
    fanIn,
    cycles,
    complexity: modules.size + dependencies.length + cycles.length * 2
  };
}

export function computeFanIn(edges) {
  const counts = {};
  for (const edge of edges) {
    counts[edge.to] = (counts[edge.to] ?? 0) + 1;
  }
  return counts;
}

export function detectCycles(edges) {
  const adjacency = new Map();
  const nodes = new Set();
  for (const { from, to } of edges) {
    nodes.add(from);
    nodes.add(to);
    if (!adjacency.has(from)) adjacency.set(from, []);
    adjacency.get(from).push(to);
  }

  const indexByNode = new Map();
  const lowByNode = new Map();
  const stack = [];
  const onStack = new Set();
  const scc = [];
  let index = 0;

  function strongConnect(node) {
    indexByNode.set(node, index);
    lowByNode.set(node, index);
    index += 1;
    stack.push(node);
    onStack.add(node);

    for (const neighbor of adjacency.get(node) ?? []) {
      if (!indexByNode.has(neighbor)) {
        strongConnect(neighbor);
        lowByNode.set(node, Math.min(lowByNode.get(node), lowByNode.get(neighbor)));
      } else if (onStack.has(neighbor)) {
        lowByNode.set(node, Math.min(lowByNode.get(node), indexByNode.get(neighbor)));
      }
    }

    if (lowByNode.get(node) === indexByNode.get(node)) {
      const component = [];
      let current = null;
      do {
        current = stack.pop();
        onStack.delete(current);
        component.push(current);
      } while (current !== node);
      if (component.length > 1) {
        scc.push(component.sort());
      }
    }
  }

  for (const node of [...nodes].sort()) {
    if (!indexByNode.has(node)) {
      strongConnect(node);
    }
  }

  return scc.sort((a, b) => a.join(':').localeCompare(b.join(':')));
}

export function computeEvolution(snapshots) {
  const evolution = [];
  for (let i = 1; i < snapshots.length; i += 1) {
    const prev = snapshots[i - 1];
    const curr = snapshots[i];

    const prevEdges = new Set(prev.dependencies.map((edge) => `${edge.from}->${edge.to}`));
    const currEdges = new Set(curr.dependencies.map((edge) => `${edge.from}->${edge.to}`));

    const introducedDependencies = [...currEdges].filter((edge) => !prevEdges.has(edge)).sort();
    const removedDependencies = [...prevEdges].filter((edge) => !currEdges.has(edge)).sort();

    const fanInDelta = {};
    const modules = new Set([...Object.keys(prev.fanIn), ...Object.keys(curr.fanIn)]);
    for (const moduleName of [...modules].sort()) {
      const delta = (curr.fanIn[moduleName] ?? 0) - (prev.fanIn[moduleName] ?? 0);
      if (delta !== 0) fanInDelta[moduleName] = delta;
    }

    const newCycles = curr.cycles.filter(
      (cycle) => !prev.cycles.some((older) => older.join('|') === cycle.join('|'))
    );

    evolution.push({
      commit: curr.commit,
      date: curr.date,
      introducedDependencies,
      removedDependencies,
      fanInDelta,
      newCycles
    });
  }

  return evolution;
}

export function computeDriftTimeline(snapshots) {
  if (!snapshots.length) return [];
  const baseline = snapshots[0];
  return snapshots.map((snapshot) => {
    const boundaryViolations = snapshot.dependencies.filter((edge) => {
      const left = edge.from.split('/')[0];
      const right = edge.to.split('/')[0];
      return left !== right;
    }).length;

    return {
      commit: snapshot.commit,
      date: snapshot.date,
      couplingGrowth: round(snapshot.coupling - baseline.coupling),
      complexityGrowth: snapshot.complexity - baseline.complexity,
      boundaryViolations,
      driftScore: round(
        (snapshot.coupling - baseline.coupling) * 8 +
          (snapshot.complexity - baseline.complexity) / 30 +
          boundaryViolations / 10
      )
    };
  });
}

export function detectStructuralEvents(snapshots, evolution, driftTimeline) {
  const events = [];
  for (let i = 0; i < snapshots.length; i += 1) {
    const snapshot = snapshots[i];
    const drift = driftTimeline[i];
    const evo = evolution.find((candidate) => candidate.commit === snapshot.commit);

    if (evo && evo.newCycles.length > 0) {
      events.push({
        commit: snapshot.commit,
        date: snapshot.date,
        type: 'circular-dependency-introduced',
        severity: 'high',
        details: { cycles: evo.newCycles }
      });
    }

    if (drift && drift.couplingGrowth >= 0.75) {
      events.push({
        commit: snapshot.commit,
        date: snapshot.date,
        type: 'coupling-spike',
        severity: 'medium',
        details: { couplingGrowth: drift.couplingGrowth }
      });
    }

    if (evo && Object.values(evo.fanInDelta).some((delta) => delta >= 3)) {
      events.push({
        commit: snapshot.commit,
        date: snapshot.date,
        type: 'fan-in-spike',
        severity: 'medium',
        details: { fanInDelta: evo.fanInDelta }
      });
    }

    if (i > 0) {
      const previous = snapshots[i - 1];
      const subsystemDrop = Object.keys(previous.subsystemCounts).length - Object.keys(snapshot.subsystemCounts).length;
      if (subsystemDrop >= 2) {
        events.push({
          commit: snapshot.commit,
          date: snapshot.date,
          type: 'subsystem-merge',
          severity: 'medium',
          details: { subsystemDrop }
        });
      }
    }
  }

  return events;
}

export function buildPrRootCause(events, commitToPrMap) {
  return events.map((event) => ({
    ...event,
    pr: commitToPrMap[event.commit] ?? null
  }));
}

export function buildTimelineHtml({ driftTimeline, dependencyEvolution, events }) {
  const payload = { driftTimeline, dependencyEvolution, events };
  const encoded = JSON.stringify(payload);
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Architecture Time Machine</title>
  <style>
    body { font-family: sans-serif; margin: 24px; }
    .grid { display: grid; grid-template-columns: 1fr; gap: 18px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 6px; font-size: 12px; }
    th { background: #f5f5f5; text-align: left; }
  </style>
</head>
<body>
  <h1>Architecture Time Machine</h1>
  <div id="app" class="grid"></div>
  <script>
    const data = ${encoded};
    const app = document.getElementById('app');
    const sections = [
      ['Drift Timeline', data.driftTimeline],
      ['Dependency Evolution', data.dependencyEvolution],
      ['Structural Events', data.events],
    ];

    for (const [title, rows] of sections) {
      const section = document.createElement('section');
      const heading = document.createElement('h2');
      heading.textContent = title;
      section.appendChild(heading);
      const table = document.createElement('table');
      if (!rows.length) {
        section.appendChild(document.createTextNode('No records.'));
      } else {
        const headers = Object.keys(rows[0]);
        const thead = document.createElement('thead');
        const hr = document.createElement('tr');
        headers.forEach((h) => {
          const th = document.createElement('th');
          th.textContent = h;
          hr.appendChild(th);
        });
        thead.appendChild(hr);
        table.appendChild(thead);
        const tbody = document.createElement('tbody');
        rows.forEach((row) => {
          const tr = document.createElement('tr');
          headers.forEach((h) => {
            const td = document.createElement('td');
            const value = row[h];
            td.textContent = typeof value === 'object' ? JSON.stringify(value) : String(value);
            tr.appendChild(td);
          });
          tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        section.appendChild(table);
      }
      app.appendChild(section);
    }
  </script>
</body>
</html>`;
}

function round(value) {
  return Math.round(value * 1000) / 1000;
}

export function toPosixPath(filePath) {
  return filePath.split(path.sep).join('/');
}
