import os

filepath = "apps/web/src/App.tsx"
with open(filepath) as f:
    content = f.read()

# Add Lazy Import
import_marker = "const ConsistencyDashboard = React.lazy(() => import('@/pages/admin/ConsistencyDashboard'))"
if import_marker not in content:
    # If not found, try to find another lazy import to anchor
    import_marker = "const AdminPage = React.lazy(() => import('@/pages/AdminPage'))"

new_import = "\nconst RagHealthDashboard = React.lazy(() => import('@/pages/admin/RagHealthDashboard'))"

if import_marker in content:
    content = content.replace(import_marker, import_marker + new_import)
else:
    # Fallback: add after imports
    content = content.replace("import App from './App'", "import App from './App'" + new_import) # unlikely to work as App is export default

    # Try to find end of imports
    if "const " in content:
         # Rough guess, insert before the first const that looks like a component import
         pass

# Since I can't easily parse where imports end, let's look for a specific one I know exists
known_lazy = "const FeatureFlagsPage = React.lazy(() => import('@/pages/admin/FeatureFlags'))"
if known_lazy in content:
     content = content.replace(known_lazy, known_lazy + new_import)
else:
     # Just add it before function App
     content = content.replace("function App() {", new_import + "\n\nfunction App() {")


# Add Route
route_marker = """<Route
                          path="admin/feature-flags"
                          element={
                            <MutationErrorBoundary operationName="feature flag update">
                              <FeatureFlagsPage />
                            </MutationErrorBoundary>
                          }
                        />"""

new_route = """
                        <Route
                          path="admin/rag-health"
                          element={
                            <DataFetchErrorBoundary dataSourceName="RAG Health">
                              <RagHealthDashboard />
                            </DataFetchErrorBoundary>
                          }
                        />"""

if route_marker in content:
    content = content.replace(route_marker, route_marker + new_route)
    print("Added route to App.tsx")
else:
    print("Could not find route marker")

with open(filepath, "w") as f:
    f.write(content)
