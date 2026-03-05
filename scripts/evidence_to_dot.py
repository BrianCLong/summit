#!/usr/bin/env python3
# MIT License — tiny converter: evidence.json -> evidence.dot (and .svg if dot present)
import json
import sys

from graphviz import Digraph


def node_id(x:str)->str:
    return str(x).replace(' ','_').replace(':','_').replace('/','_')

def main(infile, outdot):
    with open(infile) as f:
        j = json.load(f)

    g = Digraph('evidence', format='svg')
    g.attr(rankdir='LR', fontname='Helvetica')

    # Artifact node
    art = j.get('artifact_sha', j.get('artifact', 'artifact'))
    g.node(node_id(art), label=f"Artifact\n{art}", shape='box', style='filled', fillcolor='#f6f8fa')

    # Common facets (sbom/slsa/cosign/test report)
    for k, title in (
        ('sbom_uri','SBOM'),
        ('slsa_uri','SLSA'),
        ('cosign_bundle_uri','Cosign Bundle'),
        ('test_report_uri','Test Report'),
    ):
        if j.get(k):
            nid = node_id(j[k])
            g.node(nid, label=f"{title}\n{j[k]}", shape='note')
            g.edge(node_id(art), nid, label='has', fontsize='10')

    # Attestations & gates
    atts = j.get('attestations', {}) or {}
    for name, vals in atts.items():
        status = (vals or {}).get('status','unknown')
        color = 'green' if status in ('pass','verified', True, 'rekor_verified') else \
                'red'   if status in ('fail', False, 'blocked') else 'grey'
        nid = node_id(name)
        g.node(nid, label=f"{name}\n{status}", shape='ellipse', style='filled', fillcolor=color)
        # direction: attestation -> artifact
        g.edge(nid, node_id(art), label='attests', fontsize='10')

        # optional provenance / who verified
        who = (vals or {}).get('verified_by') or (vals or {}).get('producer')
        if who:
            wid = node_id(f"verifier:{who}")
            g.node(wid, label=f"verified by\n{who}", shape='component')
            g.edge(wid, nid, label='verifies', fontsize='10')

    # Gates summary (optional)
    gates = j.get('gates', {}) or {}
    for gname, gvals in gates.items():
        st = (gvals or {}).get('status','unknown')
        color = 'green' if st in ('pass','open') else 'red' if st in ('fail','closed','blocked') else 'grey'
        nid = node_id(f"gate:{gname}")
        g.node(nid, label=f"Gate: {gname}\n{st}", shape='diamond', style='filled', fillcolor=color)
        g.edge(nid, node_id(art), label='gate result', fontsize='10')

    # Write DOT
    with open(outdot, 'w') as f:
        f.write(g.source)

    # Try render to SVG if graphviz installed
    try:
        g.render(filename=outdot.rsplit('.dot',1)[0], cleanup=True)
    except Exception as e:
        print('render skipped (dot missing?):', e, file=sys.stderr)

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print('usage: evidence_to_dot.py evidence.json out.dot')
        sys.exit(2)
    main(sys.argv[1], sys.argv[2])
