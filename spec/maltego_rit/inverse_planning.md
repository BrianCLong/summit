# Inverse Planning

RIT performs inverse planning over transform dependencies to identify minimal subplans.

## Approach

- Build dependency graph of transforms.
- Search backward from target entities to candidate inputs.
- Optimize for fewest transforms and smallest input set.
