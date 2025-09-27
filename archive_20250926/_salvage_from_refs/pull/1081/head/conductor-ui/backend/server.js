const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json());

// Helper function to run shell commands
const runShellCommand = (command, callback) => {
    const child = spawn(command, { shell: true });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => { stdout += data.toString(); });
    child.stderr.on('data', (data) => { stderr += data.toString(); });

    child.on('close', (code) => {
        callback(code, stdout, stderr);
    });
};

// Endpoint to get status from tools/status_json.py
app.get('/api/status', (req, res) => {
    const scriptPath = path.join(__dirname, '../../tools/status_json.py');
    const python = spawn('python3', [scriptPath]);

    let dataToSend = '';
    python.stdout.on('data', (data) => {
        dataToSend += data.toString();
    });

    python.stderr.on('data', (data) => {
        console.error(`stderr from status_json.py: ${data}`);
    });

    python.on('close', (code) => {
        if (code === 0) {
            const statusFilePath = path.join(__dirname, '../../dashboard/status.json');
            fs.readFile(statusFilePath, 'utf8', (err, data) => {
                if (err) {
                    res.status(500).json({ error: 'Failed to read status.json', details: err.message });
                } else {
                    try {
                        const status = JSON.parse(data);
                        res.json(status);
                    } catch (parseError) {
                        res.status(500).json({ error: 'Failed to parse status.json', details: parseError.message });
                    }
                }
            });
        } else {
            res.status(500).json({ error: 'Failed to run status_json.py', details: dataToSend });
        }
    });
});

// Endpoint to run just commands
app.post('/api/run-just-command', (req, res) => {
    const { justfile, target, args } = req.body;
    if (!justfile || !target) {
        return res.status(400).json({ error: 'justfile and target are required' });
    }

    const command = `just --justfile ${path.join(__dirname, '../../', justfile)} ${target} ${args || ''}`;
    console.log(`Executing command: ${command}`);

    runShellCommand(command, (code, stdout, stderr) => {
        if (code === 0) {
            res.json({ success: true, stdout, stderr });
        } else {
            res.status(500).json({ success: false, stdout, stderr, code });
        }
    });
});

// New endpoint to get conductor process status
app.get('/api/conductor-status', (req, res) => {
    const scriptPath = path.join(__dirname, '../../start-conductor.sh');
    runShellCommand(`${scriptPath} status`, (code, stdout, stderr) => {
        if (code === 0) {
            const statusLines = stdout.trim().split('\n');
            const backendStatus = statusLines.find(line => line.includes('Backend:')) || 'Backend: UNKNOWN';
            const frontendStatus = statusLines.find(line => line.includes('Frontend:')) || 'Frontend: UNKNOWN';
            res.json({
                backend: backendStatus.replace('Backend: ', '').trim(),
                frontend: frontendStatus.replace('Frontend: ', '').trim()
            });
        } else {
            res.status(500).json({ error: 'Failed to get conductor status', details: stderr });
        }
    });
});

// New endpoint to stop conductor processes
app.post('/api/conductor-stop', (req, res) => {
    const scriptPath = path.join(__dirname, '../../start-conductor.sh');
    runShellCommand(`${scriptPath} stop`, (code, stdout, stderr) => {
        if (code === 0) {
            res.json({ success: true, stdout, stderr });
        } else {
            res.status(500).json({ success: false, stdout, stderr, code });
        }
    });
});

app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});