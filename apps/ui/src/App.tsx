import React from "react";
import { CssBaseline, Button, TextField } from "@mui/material";
import CytoscapeComponent from "react-cytoscapejs";
import $ from "jquery";

export default function App() {
  const cyRef = React.useRef<any>(null);
  React.useEffect(() => {
    if (cyRef.current) {
      $(cyRef.current).on("mousedown", () => {
        /* enhance drag */
      });
    }
  }, []);
  return (
    <>
      <CssBaseline />
      <TextField aria-label="search" placeholder="Search cases" />
      <Button>Open Case</Button>
      <div style={{ height: 400 }}>
        <CytoscapeComponent
          cy={(cy) => {
            cyRef.current = cy;
          }}
          elements={[
            { data: { id: "a" } },
            { data: { id: "b" } },
            { data: { id: "ab", source: "a", target: "b" } },
          ]}
        />
      </div>
      <div id="timeline">
        <div className="brush" />
      </div>
      <Button>Save View</Button>
    </>
  );
}
