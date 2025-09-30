import { Button } from '@mui/material';
import Settings from '@mui/icons-material/Settings';
import { useNavigate } from 'react-router-dom';

export default function TopbarSetupButton({ sx }) {
  const navigate = useNavigate();
  return (
    <Button
      variant="outlined"
      size="small"
      startIcon={<Settings />}
      onClick={() => navigate('/provisioning-wizard')}
      sx={sx}
    >
      Setup
    </Button>
  );
}
