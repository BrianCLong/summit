/**
 * Build-time API Documentation Validator
 * Fails the build if any routes are undocumented in OpenAPI spec
 *
 * Usage: npm run validate:api-docs
 */

import { createApp } from '../src/index.js';
import { validateRouteDocumentation } from '../src/openapi/middleware.js';
import { generateOpenAPIDocument } from '../src/openapi/spec.js';

async function validateApiDocumentation() {
  console.log('🔍 Validating API documentation...\n');

  try {
    // Create app instance
    const app = await createApp();

    // Validate routes
    const validation = validateRouteDocumentation(app);

    // Generate OpenAPI spec
    const spec = generateOpenAPIDocument();

    console.log('📊 Validation Results:');
    console.log(`   Total OpenAPI paths: ${Object.keys(spec.paths || {}).length}`);
    console.log(`   Documented routes: ${validation.documented.length}`);
    console.log(`   Undocumented routes: ${validation.undocumented.length}\n`);

    if (validation.undocumented.length > 0) {
      console.error('❌ Undocumented routes found:\n');
      validation.undocumented.forEach((route) => {
        console.error(`   - ${route}`);
      });
      console.error(
        '\n💡 Add OpenAPI documentation for these routes in src/openapi/routes/\n',
      );
      process.exit(1);
    }

    console.log('✅ All routes are properly documented!\n');

    // Validate OpenAPI spec structure
    console.log('🔍 Validating OpenAPI spec structure...');

    if (!spec.openapi || spec.openapi !== '3.0.0') {
      console.error('❌ Invalid OpenAPI version');
      process.exit(1);
    }

    if (!spec.info || !spec.info.title || !spec.info.version) {
      console.error('❌ Missing required info fields');
      process.exit(1);
    }

    if (!spec.paths || Object.keys(spec.paths).length === 0) {
      console.error('❌ No paths defined in OpenAPI spec');
      process.exit(1);
    }

    console.log('✅ OpenAPI spec structure is valid\n');

    // Check for proper tagging
    const untaggedPaths: string[] = [];
    Object.entries(spec.paths || {}).forEach(([path, methods]: [string, any]) => {
      Object.values(methods).forEach((operation: any) => {
        if (!operation.tags || operation.tags.length === 0) {
          untaggedPaths.push(path);
        }
      });
    });

    if (untaggedPaths.length > 0) {
      console.warn('⚠️  Some paths are not tagged:');
      untaggedPaths.forEach((path) => console.warn(`   - ${path}`));
      console.warn('   Consider adding tags for better organization\n');
    }

    // Summary
    console.log('📝 Summary:');
    console.log(`   ✅ ${validation.documented.length} routes documented`);
    console.log(`   ✅ ${Object.keys(spec.paths || {}).length} OpenAPI paths defined`);
    console.log(`   ✅ ${spec.tags?.length || 0} API tags defined`);
    console.log(`   ✅ ${Object.keys(spec.components?.schemas || {}).length} schemas defined\n`);

    console.log('🎉 API documentation validation passed!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during validation:', error);
    process.exit(1);
  }
}

// Run validation
validateApiDocumentation().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
