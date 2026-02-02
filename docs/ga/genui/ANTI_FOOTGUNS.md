# Summit GenUI Anti-Footguns

This file lists the enforced mitigations for common failure modes. Each item is enforced at lint,
policy filter, or render time. Exceptions are governed exceptions and require explicit approval.

## Enforced Mitigations

1. **No Uncited Facts**
   - Any panel with factual claims requires citations.

2. **No Destructive Actions Without Confirmation**
   - Actions marked `requiresConfirmation` must render a confirmation component.

3. **No External Calls Without Policy**
   - `networkPolicy` defaults to `no-external`.

4. **No Unregistered Components**
   - Plans referencing unregistered components fail linting.

5. **No Hidden Provenance**
   - Citation lists are rendered for every plan.

## Governed Exceptions

Governed exceptions require explicit policy documentation and evidence bundle annotation.
