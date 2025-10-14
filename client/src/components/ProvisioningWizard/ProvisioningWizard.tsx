import React, { useState } from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  Card,
  CardContent,
  TextField,
  FormControlLabel,
  Checkbox,
  Alert,
  Link,
} from '@mui/material';
import {
  Key as KeyIcon,
  VpnKey as VpnKeyIcon,
  Security as SecurityIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

const steps = [
  'Welcome',
  'Passkey Setup',
  'WireGuard Setup',
  'OIDC Client Registration',
  'Summary & Completion',
];

function getStepContent(step: number) {
  switch (step) {
    case 0:
      return (
        <Box>
          <Typography variant="h5" gutterBottom>Welcome to the CompanyOS Provisioning Wizard</Typography>
          <Typography variant="body1" paragraph>
            This wizard will guide you through the initial setup of your local-first, zero-trust CompanyOS environment.
            You will configure passkeys for secure authentication, set up WireGuard for encrypted communication,
            and register your client for OpenID Connect (OIDC) with your Identity Provider.
          </Typography>
          <Alert severity="info">
            Please ensure you have access to your Identity Provider's administration console if you plan to use dynamic OIDC registration.
          </Alert>
        </Box>
      );
    case 1:
      return (
        <Box>
          <Typography variant="h5" gutterBottom>Step 1: Passkey Setup</Typography>
          <Typography variant="body1" paragraph>
            Passkeys provide a secure, phishing-resistant way to authenticate. We will generate a new passkey for your device.
            This passkey will be stored securely in your operating system's credential manager.
          </Typography>
          <Button variant="contained" startIcon={<KeyIcon />} sx={{ mt: 2 }}>
            Generate New Passkey
          </Button>
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            (This will trigger your OS's passkey creation flow)
          </Typography>
          <TextField
            label="Generated Passkey ID (Read-only)"
            fullWidth
            margin="normal"
            value="[Simulated Passkey ID: pk_xyz123]"
            InputProps={{ readOnly: true }}
          />
          <Alert severity="warning" sx={{ mt: 2 }}>
            For a real application, the generated passkey would be securely stored by the OS and referenced by an ID.
            This is a placeholder for demonstration purposes.
          </Alert>
        </Box>
      );
    case 2:
      return (
        <Box>
          <Typography variant="h5" gutterBottom>Step 2: WireGuard Setup</Typography>
          <Typography variant="body1" paragraph>
            WireGuard provides a fast and modern VPN for secure communication. We will generate a key pair and a basic configuration.
          </Typography>
          <Button variant="contained" startIcon={<VpnKeyIcon />} sx={{ mt: 2 }}>
            Generate WireGuard Key Pair
          </Button>
          <TextField
            label="Private Key (Keep Secret!)"
            fullWidth
            margin="normal"
            multiline
            rows={2}
            value="[Simulated Private Key: P_KEY_ABCDEF123...]"
            InputProps={{ readOnly: true }}
          />
          <TextField
            label="Public Key"
            fullWidth
            margin="normal"
            value="[Simulated Public Key: PUB_KEY_GHIJKL456...]"
            InputProps={{ readOnly: true }}
          />
          <TextField
            label="WireGuard Configuration (Client Side)"
            fullWidth
            margin="normal"
            multiline
            rows={6}
            value={
`[Interface]
PrivateKey = [Simulated Private Key: P_KEY_ABCDEF123...]
Address = 10.0.0.2/24
DNS = 10.0.0.1

[Peer]
PublicKey = [Simulated Peer Public Key: PEER_PUB_KEY_MNOPQR789...]
Endpoint = your_vpn_server_ip:51820
AllowedIPs = 0.0.0.0/0, ::/0`
            }
            InputProps={{ readOnly: true }}
          />
          <Alert severity="warning" sx={{ mt: 2 }}>
            In a real Tauri/Electron app, this configuration would be used to programmatically set up the WireGuard tunnel.
            For now, please copy this configuration and set it up manually if needed.
          </Alert>
        </Box>
      );
    case 3:
      return (
        <Box>
          <Typography variant="h5" gutterBottom>Step 3: OIDC Client Registration</Typography>
          <Typography variant="body1" paragraph>
            Register your CompanyOS client with your OpenID Connect Identity Provider (IdP).
            You can either use dynamic registration or provide pre-registered client details.
          </Typography>
          <FormControlLabel
            control={<Checkbox defaultChecked />}
            label="Use Dynamic Client Registration (Recommended if supported by IdP)"
          />
          <TextField
            label="IdP Issuer URL"
            fullWidth
            margin="normal"
            placeholder="e.g., https://your-idp.com/realms/companyos"
          />
          <TextField
            label="Redirect URI"
            fullWidth
            margin="normal"
            value="http://localhost:3000/auth/callback" // Default for local dev
            InputProps={{ readOnly: true }}
          />
          <Button variant="contained" startIcon={<SecurityIcon />} sx={{ mt: 2 }}>
            Perform Dynamic Registration
          </Button>
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            (This would make an API call to your IdP's registration endpoint)
          </Typography>
          <TextField
            label="Client ID (Generated/Provided)"
            fullWidth
            margin="normal"
            value="[Simulated Client ID: client_companyos_123]"
            InputProps={{ readOnly: true }}
          />
          <TextField
            label="Client Secret (Generated/Provided - Keep Secret!)"
            fullWidth
            margin="normal"
            value="[Simulated Client Secret: SECRET_XYZABC]"
            InputProps={{ readOnly: true }}
          />
          <Alert severity="warning" sx={{ mt: 2 }}>
            In a real application, client secrets would be handled with extreme care and ideally not displayed.
            This is a placeholder for demonstration purposes.
          </Alert>
        </Box>
      );
    case 4:
      return (
        <Box>
          <Typography variant="h5" gutterBottom>Summary & Completion</Typography>
          <Typography variant="body1" paragraph>
            Congratulations! You have completed the initial provisioning for your CompanyOS client.
            Your environment is now set up for secure authentication, encrypted communication, and identity management.
          </Typography>
          <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mt: 2 }}>
            Provisioning complete! You can now proceed to use the CompanyOS client.
          </Alert>
          <Typography variant="body2" sx={{ mt: 2 }}>
            For more details on advanced configurations, please refer to the <Link href="#" onClick={(e) => e.preventDefault()}>CompanyOS documentation</Link>.
          </Typography>
        </Box>
      );
    default:
      return 'Unknown step';
  }
}

export default function ProvisioningWizard() {
  const [activeStep, setActiveStep] = useState(0);

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleReset = () => {
    setActiveStep(0);
  };

  return (
    <Card sx={{ maxWidth: 800, margin: 'auto', mt: 5, p: 3 }}>
      <CardContent>
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        <Box>
          {activeStep === steps.length ? (
            <Box>
              <Typography sx={{ mt: 2, mb: 1 }}>All steps completed - you&apos;re finished</Typography>
              <Button onClick={handleReset}>Reset</Button>
            </Box>
          ) : (
            <Box>
              {getStepContent(activeStep)}
              <Box sx={{ display: 'flex', flexDirection: 'row', pt: 2 }}>
                <Button
                  color="inherit"
                  disabled={activeStep === 0}
                  onClick={handleBack}
                  sx={{ mr: 1 }}
                >
                  Back
                </Button>
                <Box sx={{ flex: '1 1 auto' }} />
                <Button onClick={handleNext} variant="contained">
                  {activeStep === steps.length - 1 ? 'Finish' : 'Next'}
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
