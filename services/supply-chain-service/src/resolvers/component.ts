/**
 * Component and BOM Resolvers
 */

export const componentResolvers = {
  Query: {
    async component(_: any, { id }: { id: string }, context: any) {
      return {
        id,
        partNumber: 'PN-12345',
        description: 'Electronic Component',
        type: 'COMPONENT',
        manufacturer: {
          supplierId: 'supplier-1',
          name: 'Component Mfg',
          country: 'US',
        },
        lifecycleStatus: 'ACTIVE',
        leadTimeDays: 30,
      };
    },

    async billOfMaterials(_: any, { id }: { id: string }, context: any) {
      return {
        id,
        productId: 'product-1',
        productName: 'Product A',
        version: '1.0',
        items: [],
        status: 'RELEASED',
      };
    },

    async componentSourcing(_: any, { componentId }: { componentId: string }, context: any) {
      return {
        componentId,
        partNumber: 'PN-12345',
        sources: [],
        marketAvailability: 'NORMAL',
        singleSourceRisk: false,
      };
    },
  },

  Mutation: {
    async createBillOfMaterials(_: any, { input }: any, context: any) {
      const { productId, productName, version, items } = input;
      return {
        id: `bom-${Date.now()}`,
        productId,
        productName,
        version,
        items: items || [],
        status: 'DRAFT',
      };
    },

    async updateComponentSourcing(_: any, { componentId, input }: any, context: any) {
      return {
        componentId,
        partNumber: 'PN-12345',
        sources: input.sources || [],
        marketAvailability: 'NORMAL',
        singleSourceRisk: false,
      };
    },
  },
};
