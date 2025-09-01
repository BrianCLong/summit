import { enableConnector, disableConnector, listConnectors } from '../connectors/registry';
export const connectorsResolvers = {
    Query: {
        connectors: () => listConnectors(),
    },
    Mutation: {
        enableConnector: (_, { name, acceptLicense }, ctx) => {
            enableConnector(name, ctx.tenantId || 'tenant', acceptLicense);
            return { success: true, message: 'enabled' };
        },
        disableConnector: (_, { name }) => {
            disableConnector(name);
            return { success: true, message: 'disabled' };
        },
    },
};
//# sourceMappingURL=connectors.js.map