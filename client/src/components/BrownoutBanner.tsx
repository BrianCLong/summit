import { Alert } from "@mui/material";
export default function BrownoutBanner({ active }: { active:boolean }) {
  if (!active) return null;
  return <Alert severity="warning" sx={{ borderRadius:0 }}>Reduced capability: Brownout mode</Alert>;
}