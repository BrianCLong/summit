// @ts-nocheck - React 18/19 type compatibility
import React, { useEffect, useState } from "react";
import { ApolloProvider, ApolloClient, NormalizedCacheObject } from "@apollo/client";
import { CircularProgress, Box } from "@mui/material";

export function WithApollo({ children }: { children: React.ReactNode | React.ReactNode[] }) {
  const [client, setClient] = useState<ApolloClient<NormalizedCacheObject> | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    import("./createApolloClient")
      .then(({ createApolloClient }) => createApolloClient())
      .then(setClient)
      .catch(setError);
  }, []);

  if (error) {
    return (
      <Box sx={{ p: 2, textAlign: "center" }}>
        <div>Error initializing Apollo Client: {error.message}</div>
      </Box>
    );
  }

  if (!client) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
