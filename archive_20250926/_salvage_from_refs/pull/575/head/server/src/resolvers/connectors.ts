import { enableConnector, disableConnector, listConnectors } from '../connectors/registry';

export const connectorsResolvers = {
  Query: {
    connectors: () => listConnectors(),
  },
  Mutation: {
    enableConnector: (
      _: any,
      { name, acceptLicense }: { name: string; acceptLicense: boolean },
      ctx: any,
    ) => {
      enableConnector(name, ctx.tenantId || 'tenant', acceptLicense);
      return { success: true, message: 'enabled' };
    },
    disableConnector: (_: any, { name }: { name: string }) => {
      disableConnector(name);
      return { success: true, message: 'disabled' };
    },
  },
};
