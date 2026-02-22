import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', (line) => {
  if (!line.trim()) return;
  try {
    const msg = JSON.parse(line);
    handleMessage(msg);
  } catch (e) {
    // ignore
  }
});

function handleMessage(msg: any) {
  if (msg.method === 'initialize') {
    const response = {
      jsonrpc: '2.0',
      id: msg.id,
      result: {
        protocolVersion: '2025-06-18',
        capabilities: {},
        serverInfo: {
            name: 'echo-server',
            version: '1.0.0'
        }
      }
    };
    console.log(JSON.stringify(response));
  } else if (msg.method === 'tools/list') {
    const response = {
        jsonrpc: '2.0',
        id: msg.id,
        result: {
            tools: [{
                name: 'echo',
                description: 'Echoes back the input',
                inputSchema: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' }
                    }
                }
            }]
        }
    };
    console.log(JSON.stringify(response));
  } else if (msg.method === 'tools/call') {
      if (msg.params.name === 'echo') {
        const response = {
            jsonrpc: '2.0',
            id: msg.id,
            result: {
                content: [{
                    type: 'text',
                    text: msg.params.arguments.message
                }]
            }
        };
        console.log(JSON.stringify(response));
      }
  }
}
