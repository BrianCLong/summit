import { PluginManager } from '../src/plugins/PluginManager.js';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

// Mock dependencies
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  console.log('--- Plugin System Verification ---');

  const manager = new PluginManager(pool);
  const pluginId = 'com.summit.echo';
  const tenantId = 'test-tenant-' + Date.now();
  const principal = {
    id: 'admin-user',
    tenantId,
    roles: ['admin', 'ADMIN'], // Ensure admin capability
    kind: 'user',
    scopes: []
  };

  try {
    // 1. Load Sample Code
    const codePath = path.join(process.cwd(), 'server/src/plugins/samples/echo-plugin.js');
    console.log('Reading code from:', codePath);
    const code = fs.readFileSync(codePath, 'utf8');

    const manifest = {
      id: pluginId,
      name: 'Echo Plugin',
      version: '1.0.0',
      description: 'A simple echo plugin',
      author: 'Summit Team',
      category: 'custom',
      capabilities: [],
    };

    // 2. Install (Register)
    console.log(`Installing plugin: ${pluginId}...`);
    // Need to handle potential cleanup from previous runs
    try {
        await manager.uninstallPlugin(pluginId, principal);
    } catch (e) { /* ignore */ }

    const installResult = await manager.installPlugin(manifest, code, principal);
    if (!installResult.data.success) {
      throw new Error(`Installation failed: ${JSON.stringify(installResult)}`);
    }
    console.log('✅ Installed');

    // 3. Enable
    console.log(`Enabling plugin for tenant: ${tenantId}...`);
    const enableResult = await manager.enablePlugin(pluginId, tenantId, {}, principal);
    if (!enableResult.data.success) {
      throw new Error(`Enablement failed: ${JSON.stringify(enableResult)}`);
    }
    console.log('✅ Enabled');

    // 4. Execute
    console.log(`Executing action 'echo'...`);
    const execResult = await manager.executeAction(pluginId, 'echo', { message: 'Hello World' }, principal);

    if (!execResult.data.success) {
      throw new Error(`Execution failed: ${execResult.data.error}`);
    }

    if (execResult.data.data.message !== 'Hello World') {
        throw new Error(`Unexpected result: ${JSON.stringify(execResult.data)}`);
    }
    console.log('✅ Executed: ', execResult.data.data);

    // 5. Verify Audit Log
    console.log('Verifying audit log...');
    const auditRes = await pool.query(
        'SELECT * FROM plugin_audit_log WHERE plugin_id = $1 AND action = $2 ORDER BY timestamp DESC LIMIT 1',
        [pluginId, 'echo']
    );

    if (auditRes.rows.length === 0) {
        throw new Error('Audit log entry not found!');
    }
    console.log('✅ Audit Log Entry Found');

    // 6. Cleanup
    console.log('Uninstalling...');
    await manager.uninstallPlugin(pluginId, principal);
    console.log('✅ Uninstalled');

    console.log('\nSUCCESS: All verification steps passed.');
    process.exit(0);

  } catch (error) {
    console.error('\nFAILED:', error);
    process.exit(1);
  } finally {
      await pool.end();
  }
}

main();
