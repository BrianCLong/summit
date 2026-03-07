import React, { useMemo, useState } from "react";
import { Box, Card, CardActionArea, CardContent, Chip, Stack, Typography } from "@mui/material";
import Grid from "@mui/material/Grid";

type Workspace = {
  id: string;
  name: string;
  description: string;
  badge?: string;
};

export default function Workspaces() {
  const workspaces = useMemo<Workspace[]>(
    () => [
      {
        id: "ops",
        name: "Operations",
        description: "Live missions, tasking, and joint coordination.",
        badge: "Primary",
      },
      {
        id: "fraud",
        name: "Financial Crimes",
        description: "Fraud, AML, and sanctions investigations.",
      },
      {
        id: "cyber",
        name: "Cyber Defense",
        description: "Detections, investigations, and incident response.",
      },
    ],
    []
  );

  const [active, setActive] = useState("ops");

  return (
    <Box sx={{ py: 2 }}>
      <Typography variant="h4" gutterBottom>
        Workspaces
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
        Switch context without leaving your current page. Commands preserve the browser history so
        back navigation continues to work.
      </Typography>
      <Grid container spacing={2}>
        {workspaces.map((workspace) => (
          <Grid xs={12} md={4} key={workspace.id}>
            <Card
              variant={active === workspace.id ? "outlined" : undefined}
              sx={{
                borderColor: active === workspace.id ? "primary.main" : "divider",
              }}
            >
              <CardActionArea onClick={() => setActive(workspace.id)}>
                <CardContent>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="h6">{workspace.name}</Typography>
                    {workspace.badge && (
                      <Chip size="small" color="primary" label={workspace.badge} />
                    )}
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {workspace.description}
                  </Typography>
                  {active === workspace.id && (
                    <Typography variant="caption" color="primary" sx={{ display: "block", mt: 1 }}>
                      Active workspace
                    </Typography>
                  )}
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
