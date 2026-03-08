# 1.7 INTEROP & STANDARDS

### Import
| source       | format               |
| ------------ | -------------------- |
| bulk RNA     | TSV                  |
| proteomics   | matrix               |
| metabolomics | metabolite abundance |

### Export
graph nodes: CellType
graph edges: PRESENT_IN_SAMPLE

Neo4j example:
`(:Sample)-[:HAS_CELLTYPE {abundance:0.31}]->(:T_cell)`
