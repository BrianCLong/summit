"use strict";
// @ts-nocheck - React router type compatibility issue with @types/react version mismatch
/**
 * Labeling UI - Main Application
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.App = App;
const react_router_dom_1 = require("react-router-dom");
const react_query_1 = require("@tanstack/react-query");
const Layout_1 = require("./components/common/Layout");
const DashboardPage_1 = require("./pages/DashboardPage");
const LabelingPage_1 = require("./pages/LabelingPage");
const ReviewPage_1 = require("./pages/ReviewPage");
const DatasetsPage_1 = require("./pages/DatasetsPage");
const QualityPage_1 = require("./pages/QualityPage");
require("./index.css");
const queryClient = new react_query_1.QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60, // 1 minute
            retry: 2,
        },
    },
});
function App() {
    return (<react_query_1.QueryClientProvider client={queryClient}>
      <react_router_dom_1.BrowserRouter>
        <react_router_dom_1.Routes>
          <react_router_dom_1.Route path="/" element={<Layout_1.Layout />}>
            <react_router_dom_1.Route index element={<react_router_dom_1.Navigate to="/dashboard" replace/>}/>
            <react_router_dom_1.Route path="dashboard" element={<DashboardPage_1.DashboardPage />}/>
            <react_router_dom_1.Route path="labeling" element={<LabelingPage_1.LabelingPage />}/>
            <react_router_dom_1.Route path="labeling/:jobId" element={<LabelingPage_1.LabelingPage />}/>
            <react_router_dom_1.Route path="review" element={<ReviewPage_1.ReviewPage />}/>
            <react_router_dom_1.Route path="review/:datasetId" element={<ReviewPage_1.ReviewPage />}/>
            <react_router_dom_1.Route path="datasets" element={<DatasetsPage_1.DatasetsPage />}/>
            <react_router_dom_1.Route path="datasets/:datasetId" element={<DatasetsPage_1.DatasetsPage />}/>
            <react_router_dom_1.Route path="quality" element={<QualityPage_1.QualityPage />}/>
            <react_router_dom_1.Route path="quality/:datasetId" element={<QualityPage_1.QualityPage />}/>
          </react_router_dom_1.Route>
        </react_router_dom_1.Routes>
      </react_router_dom_1.BrowserRouter>
    </react_query_1.QueryClientProvider>);
}
exports.default = App;
