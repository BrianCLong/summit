# Inverse Planning

- **Input:** transform registry with input/output signatures and versions; target result set.
- **Search:** explore transform dependency graph with depth and breadth budgets; objective minimizes transforms, inputs, and estimated source calls.
- **Selection:** choose candidate subplan satisfying target coverage under minimality constraints.
