"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ProvisioningWizard;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const steps = [
    'Welcome',
    'Passkey Setup',
    'WireGuard Setup',
    'OIDC Client Registration',
    'Summary & Completion',
];
const getRedirectUri = () => {
    if (typeof window === 'undefined')
        return '/auth/callback';
    return `${window.location.origin}/auth/callback`;
};
function getStepContent(step) {
    switch (step) {
        case 0:
            return (<material_1.Box>
          <material_1.Typography variant="h5" gutterBottom>
            Welcome to the CompanyOS Provisioning Wizard
          </material_1.Typography>
          <material_1.Typography variant="body1" paragraph>
            This wizard will guide you through the initial setup of your
            local-first, zero-trust CompanyOS environment. You will configure
            passkeys for secure authentication, set up WireGuard for encrypted
            communication, and register your client for OpenID Connect (OIDC)
            with your Identity Provider.
          </material_1.Typography>
          <material_1.Alert severity="info">
            Please ensure you have access to your Identity Provider's
            administration console if you plan to use dynamic OIDC registration.
          </material_1.Alert>
        </material_1.Box>);
        case 1:
            return (<material_1.Box>
          <material_1.Typography variant="h5" gutterBottom>
            Step 1: Passkey Setup
          </material_1.Typography>
          <material_1.Typography variant="body1" paragraph>
            Passkeys provide a secure, phishing-resistant way to authenticate.
            We will generate a new passkey for your device. This passkey will be
            stored securely in your operating system's credential manager.
          </material_1.Typography>
          <material_1.Button variant="contained" startIcon={<icons_material_1.Key />} sx={{ mt: 2 }}>
            Generate New Passkey
          </material_1.Button>
          <material_1.Typography variant="caption" display="block" sx={{ mt: 1 }}>
            (This will trigger your OS's passkey creation flow)
          </material_1.Typography>
          <material_1.TextField label="Generated Passkey ID (Read-only)" fullWidth margin="normal" value="[Simulated Passkey ID: pk_xyz123]" InputProps={{ readOnly: true }}/>
          <material_1.Alert severity="warning" sx={{ mt: 2 }}>
            For a real application, the generated passkey would be securely
            stored by the OS and referenced by an ID. This is a placeholder for
            demonstration purposes.
          </material_1.Alert>
        </material_1.Box>);
        case 2:
            return (<material_1.Box>
          <material_1.Typography variant="h5" gutterBottom>
            Step 2: WireGuard Setup
          </material_1.Typography>
          <material_1.Typography variant="body1" paragraph>
            WireGuard provides a fast and modern VPN for secure communication.
            We will generate a key pair and a basic configuration.
          </material_1.Typography>
          <material_1.Button variant="contained" startIcon={<icons_material_1.VpnKey />} sx={{ mt: 2 }}>
            Generate WireGuard Key Pair
          </material_1.Button>
          <material_1.TextField label="Private Key (Keep Secret!)" fullWidth margin="normal" multiline rows={2} value="[Simulated Private Key: P_KEY_ABCDEF123...]" InputProps={{ readOnly: true }}/>
          <material_1.TextField label="Public Key" fullWidth margin="normal" value="[Simulated Public Key: PUB_KEY_GHIJKL456...]" InputProps={{ readOnly: true }}/>
          <material_1.TextField label="WireGuard Configuration (Client Side)" fullWidth margin="normal" multiline rows={6} value={`[Interface]
PrivateKey = [Simulated Private Key: P_KEY_ABCDEF123...]
Address = 10.0.0.2/24
DNS = 10.0.0.1

[Peer]
PublicKey = [Simulated Peer Public Key: PEER_PUB_KEY_MNOPQR789...]
Endpoint = your_vpn_server_ip:51820
AllowedIPs = 0.0.0.0/0, ::/0`} InputProps={{ readOnly: true }}/>
          <material_1.Alert severity="warning" sx={{ mt: 2 }}>
            In a real Tauri/Electron app, this configuration would be used to
            programmatically set up the WireGuard tunnel. For now, please copy
            this configuration and set it up manually if needed.
          </material_1.Alert>
        </material_1.Box>);
        case 3:
            return (<material_1.Box>
          <material_1.Typography variant="h5" gutterBottom>
            Step 3: OIDC Client Registration
          </material_1.Typography>
          <material_1.Typography variant="body1" paragraph>
            Register your CompanyOS client with your OpenID Connect Identity
            Provider (IdP). You can either use dynamic registration or provide
            pre-registered client details.
          </material_1.Typography>
          <material_1.FormControlLabel control={<material_1.Checkbox defaultChecked/>} label="Use Dynamic Client Registration (Recommended if supported by IdP)"/>
          <material_1.TextField label="IdP Issuer URL" fullWidth margin="normal" placeholder="e.g., https://your-idp.com/realms/companyos"/>
          <material_1.TextField label="Redirect URI" fullWidth margin="normal" value={getRedirectUri()} InputProps={{ readOnly: true }}/>
          <material_1.Button variant="contained" startIcon={<icons_material_1.Security />} sx={{ mt: 2 }}>
            Perform Dynamic Registration
          </material_1.Button>
          <material_1.Typography variant="caption" display="block" sx={{ mt: 1 }}>
            (This would make an API call to your IdP's registration endpoint)
          </material_1.Typography>
          <material_1.TextField label="Client ID (Generated/Provided)" fullWidth margin="normal" value="[Simulated Client ID: client_companyos_123]" InputProps={{ readOnly: true }}/>
          <material_1.TextField label="Client Secret (Generated/Provided - Keep Secret!)" fullWidth margin="normal" value="[Simulated Client Secret: SECRET_XYZABC]" InputProps={{ readOnly: true }}/>
          <material_1.Alert severity="warning" sx={{ mt: 2 }}>
            In a real application, client secrets would be handled with extreme
            care and ideally not displayed. This is a placeholder for
            demonstration purposes.
          </material_1.Alert>
        </material_1.Box>);
        case 4:
            return (<material_1.Box>
          <material_1.Typography variant="h5" gutterBottom>
            Summary & Completion
          </material_1.Typography>
          <material_1.Typography variant="body1" paragraph>
            Congratulations! You have completed the initial provisioning for
            your CompanyOS client. Your environment is now set up for secure
            authentication, encrypted communication, and identity management.
          </material_1.Typography>
          <material_1.Alert severity="success" icon={<icons_material_1.CheckCircle />} sx={{ mt: 2 }}>
            Provisioning complete! You can now proceed to use the CompanyOS
            client.
          </material_1.Alert>
          <material_1.Typography variant="body2" sx={{ mt: 2 }}>
            For more details on advanced configurations, please refer to the{' '}
            <material_1.Link href="#" onClick={(e) => e.preventDefault()}>
              CompanyOS documentation
            </material_1.Link>
            .
          </material_1.Typography>
        </material_1.Box>);
        default:
            return 'Unknown step';
    }
}
function ProvisioningWizard() {
    const [activeStep, setActiveStep] = (0, react_1.useState)(0);
    const handleNext = () => {
        setActiveStep((prevActiveStep) => prevActiveStep + 1);
    };
    const handleBack = () => {
        setActiveStep((prevActiveStep) => prevActiveStep - 1);
    };
    const handleReset = () => {
        setActiveStep(0);
    };
    return (<material_1.Card sx={{ maxWidth: 800, margin: 'auto', mt: 5, p: 3 }}>
      <material_1.CardContent>
        <material_1.Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
          {steps.map((label) => (<material_1.Step key={label}>
              <material_1.StepLabel>{label}</material_1.StepLabel>
            </material_1.Step>))}
        </material_1.Stepper>
        <material_1.Box>
          {activeStep === steps.length ? (<material_1.Box>
              <material_1.Typography sx={{ mt: 2, mb: 1 }}>
                All steps completed - you&apos;re finished
              </material_1.Typography>
              <material_1.Button onClick={handleReset}>Reset</material_1.Button>
            </material_1.Box>) : (<material_1.Box>
              {getStepContent(activeStep)}
              <material_1.Box sx={{ display: 'flex', flexDirection: 'row', pt: 2 }}>
                <material_1.Button color="inherit" disabled={activeStep === 0} onClick={handleBack} sx={{ mr: 1 }}>
                  Back
                </material_1.Button>
                <material_1.Box sx={{ flex: '1 1 auto' }}/>
                <material_1.Button onClick={handleNext} variant="contained">
                  {activeStep === steps.length - 1 ? 'Finish' : 'Next'}
                </material_1.Button>
              </material_1.Box>
            </material_1.Box>)}
        </material_1.Box>
      </material_1.CardContent>
    </material_1.Card>);
}
