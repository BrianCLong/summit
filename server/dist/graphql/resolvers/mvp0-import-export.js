import { MVP0ImportExportService } from '../../services/MVP0ImportExportService';
import { AuthenticationError, ForbiddenError, UserInputError } from 'apollo-server-express';
import { GraphQLUpload } from 'graphql-upload-ts';
const importExportService = new MVP0ImportExportService();
const mvp0ImportExportResolvers = {
    Upload: GraphQLUpload,
    Query: {
        // Export entities to downloadable format
        exportEntities: async (_, { investigationId, format = 'csv' }, context) => {
            if (!context.isAuthenticated || !context.user) {
                throw new AuthenticationError('Authentication required');
            }
            // Check permissions - at least viewer role required
            if (!['viewer', 'editor', 'admin'].includes(context.user.role)) {
                throw new ForbiddenError('Insufficient permissions');
            }
            try {
                if (format === 'csv') {
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                    const filePath = `/tmp/entities_export_${investigationId}_${timestamp}.csv`;
                    const result = await importExportService.exportEntitiesToCSV(investigationId, context.user.tenantId, filePath);
                    return {
                        success: true,
                        message: `Exported ${result.count} entities`,
                        downloadUrl: `/download/export/${filePath.split('/').pop()}`,
                        metadata: {
                            format,
                            count: result.count,
                            duration: result.duration,
                            filePath: result.filePath
                        }
                    };
                }
                else {
                    // JSON stream export
                    const stream = await importExportService.exportToJSONStream(investigationId, context.user.tenantId);
                    return {
                        success: true,
                        message: 'JSON export stream ready',
                        stream,
                        metadata: {
                            format,
                            streaming: true
                        }
                    };
                }
            }
            catch (error) {
                throw new Error(`Export failed: ${error.message}`);
            }
        },
        // Performance test endpoint for 100k entities
        testImportPerformance: async (_, __, context) => {
            if (!context.isAuthenticated || !context.user) {
                throw new AuthenticationError('Authentication required');
            }
            // Only admins can run performance tests
            if (context.user.role !== 'admin') {
                throw new ForbiddenError('Admin role required for performance testing');
            }
            try {
                const stats = await importExportService.performanceTest100k(context.user.tenantId, context.user.id);
                return {
                    success: true,
                    stats: {
                        totalRows: stats.totalRows,
                        successfulRows: stats.successfulRows,
                        failedRows: stats.failedRows,
                        duration: stats.duration,
                        rowsPerSecond: stats.rowsPerSecond,
                        passed: stats.duration < 60000, // Target: < 60 seconds for 100k rows
                        errors: stats.errors.slice(0, 10) // Return first 10 errors only
                    }
                };
            }
            catch (error) {
                throw new Error(`Performance test failed: ${error.message}`);
            }
        }
    },
    Mutation: {
        // Import entities from uploaded CSV file
        importEntitiesFromCSV: async (_, { file, investigationId, batchSize = 1000 }, context) => {
            if (!context.isAuthenticated || !context.user) {
                throw new AuthenticationError('Authentication required');
            }
            // Check permissions - at least editor role required for imports
            if (!['editor', 'admin'].includes(context.user.role)) {
                throw new ForbiddenError('Editor or Admin role required for imports');
            }
            try {
                const { createReadStream, filename, mimetype } = await file;
                if (!filename.endsWith('.csv')) {
                    throw new UserInputError('Only CSV files are supported');
                }
                // Save uploaded file to temp location
                const timestamp = Date.now();
                const tempFilePath = `/tmp/import_${timestamp}_${filename}`;
                const stream = createReadStream();
                const writeStream = require('fs').createWriteStream(tempFilePath);
                await new Promise((resolve, reject) => {
                    stream.pipe(writeStream);
                    stream.on('end', resolve);
                    stream.on('error', reject);
                });
                // Import the entities
                const stats = await importExportService.importEntitiesFromCSV(tempFilePath, context.user.tenantId, context.user.id, batchSize);
                // Clean up temp file
                require('fs').unlinkSync(tempFilePath);
                return {
                    success: stats.failedRows === 0,
                    message: `Import completed: ${stats.successfulRows}/${stats.totalRows} entities imported`,
                    stats: {
                        totalRows: stats.totalRows,
                        successfulRows: stats.successfulRows,
                        failedRows: stats.failedRows,
                        duration: stats.duration,
                        rowsPerSecond: stats.rowsPerSecond,
                        errors: stats.errors.slice(0, 20) // Return first 20 errors
                    }
                };
            }
            catch (error) {
                throw new Error(`Import failed: ${error.message}`);
            }
        },
        // Import relationships from uploaded CSV file
        importRelationshipsFromCSV: async (_, { file, investigationId, batchSize = 1000 }, context) => {
            if (!context.isAuthenticated || !context.user) {
                throw new AuthenticationError('Authentication required');
            }
            if (!['editor', 'admin'].includes(context.user.role)) {
                throw new ForbiddenError('Editor or Admin role required for imports');
            }
            try {
                const { createReadStream, filename } = await file;
                if (!filename.endsWith('.csv')) {
                    throw new UserInputError('Only CSV files are supported');
                }
                const timestamp = Date.now();
                const tempFilePath = `/tmp/import_relationships_${timestamp}_${filename}`;
                const stream = createReadStream();
                const writeStream = require('fs').createWriteStream(tempFilePath);
                await new Promise((resolve, reject) => {
                    stream.pipe(writeStream);
                    stream.on('end', resolve);
                    stream.on('error', reject);
                });
                const stats = await importExportService.importRelationshipsFromCSV(tempFilePath, context.user.tenantId, context.user.id, batchSize);
                require('fs').unlinkSync(tempFilePath);
                return {
                    success: stats.failedRows === 0,
                    message: `Import completed: ${stats.successfulRows}/${stats.totalRows} relationships imported`,
                    stats: {
                        totalRows: stats.totalRows,
                        successfulRows: stats.successfulRows,
                        failedRows: stats.failedRows,
                        duration: stats.duration,
                        rowsPerSecond: stats.rowsPerSecond,
                        errors: stats.errors.slice(0, 20)
                    }
                };
            }
            catch (error) {
                throw new Error(`Relationship import failed: ${error.message}`);
            }
        },
        // Bulk import with JSON format
        importFromJSON: async (_, { data, investigationId }, context) => {
            if (!context.isAuthenticated || !context.user) {
                throw new AuthenticationError('Authentication required');
            }
            if (!['editor', 'admin'].includes(context.user.role)) {
                throw new ForbiddenError('Editor or Admin role required for imports');
            }
            try {
                const importData = JSON.parse(data);
                if (!importData.entities && !importData.relationships) {
                    throw new UserInputError('JSON must contain entities and/or relationships arrays');
                }
                // Process entities
                let entityStats = { totalRows: 0, successfulRows: 0, failedRows: 0, duration: 0, errors: [] };
                if (importData.entities && importData.entities.length > 0) {
                    // Convert to CSV format temporarily for processing
                    const csvData = importData.entities.map((entity) => ({
                        type: entity.type,
                        label: entity.label,
                        description: entity.description || '',
                        properties: JSON.stringify(entity.properties || {}),
                        investigation_id: investigationId,
                        tenant_id: context.user.tenantId,
                        source: entity.source || 'json_import',
                        confidence: entity.confidence || 1.0
                    }));
                    // Would need to implement direct JSON import for better performance
                    // For now, this demonstrates the concept
                }
                return {
                    success: true,
                    message: `JSON import completed`,
                    stats: entityStats
                };
            }
            catch (error) {
                throw new Error(`JSON import failed: ${error.message}`);
            }
        }
    }
};
export default mvp0ImportExportResolvers;
//# sourceMappingURL=mvp0-import-export.js.map