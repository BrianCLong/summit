# PR Template for Test Lane Changes

## What & Why
<!-- Brief description of the change and why it's needed -->

## Files Changed
<!-- List of files modified/created with brief descriptions -->
- `file/path.ts`: description of change

## How to Validate
<!-- Commands or steps to verify the change -->
```bash
# Example validation command
npm run test:integration -- --runInBand --bail=1 --silent
```

## CI Notes
<!-- Any special CI considerations -->
- Integration lane: runs serially, label-gated, nightly
- Fast lane: remains only required check

## Risk/Rollback
<!-- Risk assessment and rollback plan -->
- Test-only changes; production code untouched
- If issues arise: remove label or revert PR