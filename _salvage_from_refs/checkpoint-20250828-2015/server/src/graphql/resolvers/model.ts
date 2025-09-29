export default {
  Query: {
    activeModel: async (_:any, __:any, ctx:any) => ({
      name: process.env.MODEL_NAME || 'graphsage_linkpred',
      version: process.env.MODEL_VERSION || 'dev',
      auc: Number(process.env.MODEL_AUC || 0),
      createdAt: new Date(Number(process.env.MODEL_BUILT_AT || Date.now())).toISOString()
    })
  }
};
