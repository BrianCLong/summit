/**
 * Generate a plugin template
 */
export function generatePluginTemplate(config: {
  id: string;
  name: string;
  category: string;
  author: string;
}): string {
  return `import { createPlugin, PluginPermission } from '@summit/plugin-sdk';

export default createPlugin()
  .withMetadata({
    id: '${config.id}',
    name: '${config.name}',
    version: '1.0.0',
    description: 'Description of your plugin',
    author: {
      name: '${config.author}',
    },
    license: 'MIT',
    category: '${config.category}',
  })
  .requiresEngine('>=1.0.0')
  .withMain('./dist/index.js')
  .requestPermissions(
    PluginPermission.READ_DATA,
    PluginPermission.WRITE_DATA
  )
  .onInitialize(async (context) => {
    context.logger.info('Plugin initializing...');

    // Initialize your plugin here
    // Access config: context.config
    // Access storage: await context.storage.get('key')
  })
  .onStart(async () => {
    console.log('Plugin started!');
  })
  .onStop(async () => {
    console.log('Plugin stopping...');
  })
  .onDestroy(async () => {
    console.log('Plugin destroyed');
  })
  .withHealthCheck(async () => {
    return {
      healthy: true,
      message: 'Plugin is running',
    };
  })
  .build();
`;
}
