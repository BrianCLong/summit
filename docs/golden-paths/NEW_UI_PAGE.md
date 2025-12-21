# Golden Path: New UI Page

## Checklist

- [ ] **File Location**: Created in `apps/web/src/pages/<PageName>.tsx`.
- [ ] **Route**: Added to `apps/web/src/App.tsx` (or router config).
- [ ] **Layout**: Uses standard Layout/Main wrapper.
- [ ] **Auth**: Uses `useAuth` to verify user session.
- [ ] **Loading State**: Displays `Skeleton` or loading spinner while fetching data.
- [ ] **Error State**: Handles API errors gracefully (e.g., toast notifications).
- [ ] **Title**: Updates document title (e.g., via `Helmet` or `useEffect`).
- [ ] **Components**: Uses shared UI components from `@/components/ui/`.
