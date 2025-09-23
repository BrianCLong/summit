import React, { useEffect } from "react";
import { Provider, useSelector } from "react-redux";
import { store } from "./store"; // Import the Redux store
import { fetchGraphData } from "./store/slices/graphSlice"; // Import fetchGraphData thunk
import GraphVisualization from "./features/graph/GraphVisualization"; // Import the GraphVisualization component
import AnalyticsDashboard from "./components/dashboard/AnalyticsDashboard"; // Import the analytics dashboard
import {
  ApolloClient,
  InMemoryCache,
  ApolloProvider,
  HttpLink,
} from "@apollo/client";
import useMediaQuery from "@mui/material/useMediaQuery";

// Initialize Apollo Client
const httpLink = new HttpLink({
  uri: "http://localhost:4000/graphql", // Assuming your GraphQL server runs on port 4000
});

const client = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
});

function TestApp() {
  useEffect(() => {
    store.dispatch(fetchGraphData());
  }, []);

  const isMobile = useMediaQuery("(max-width:768px)");

  // Persist relevant graph state to localStorage
  const graphState = useSelector((state) => state.graph);
  useEffect(() => {
    localStorage.setItem("graphLayout", graphState.layout);
    localStorage.setItem(
      "graphLayoutOptions",
      JSON.stringify(graphState.layoutOptions),
    );
    localStorage.setItem(
      "graphFeatureToggles",
      JSON.stringify(graphState.featureToggles),
    );
    localStorage.setItem(
      "graphNodeTypeColors",
      JSON.stringify(graphState.nodeTypeColors),
    );
  }, [
    graphState.layout,
    graphState.layoutOptions,
    graphState.featureToggles,
    graphState.nodeTypeColors,
  ]);

  return (
    <ApolloProvider client={client}>
      <Provider store={store}>
        <div
          style={{
            height: "100vh",
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
          }}
        >
          <div style={{ flex: 1 }}>
            <GraphVisualization />
          </div>
          <div
            style={{
              width: isMobile ? "100%" : "300px",
              padding: "10px",
              overflowY: "auto",
              borderLeft: isMobile ? "none" : "1px solid #eee",
            }}
          >
            <AnalyticsDashboard />
          </div>
        </div>
      </Provider>
    </ApolloProvider>
  );
}

export default TestApp;
