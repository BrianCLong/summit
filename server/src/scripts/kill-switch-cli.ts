import { KillSwitchService } from '../services/KillSwitchService.js';

async function main() {
  const [,, command, module] = process.argv;

  if (!command || !module) {
    console.error('Usage: kill-switch-cli <activate|deactivate|status> <module>');
    process.exit(1);
  }

  const service = KillSwitchService.getInstance();

  try {
    switch (command) {
      case 'activate':
        await service.activate(module);
        console.log(`Kill switch ACTIVATED for module: ${module}`);
        break;
      case 'deactivate':
        await service.deactivate(module);
        console.log(`Kill switch DEACTIVATED for module: ${module}`);
        break;
      case 'status':
        const active = await service.isActive(module);
        console.log(`Kill switch status for ${module}: ${active ? 'ACTIVE' : 'INACTIVE'}`);
        break;
      default:
        console.error('Unknown command');
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
