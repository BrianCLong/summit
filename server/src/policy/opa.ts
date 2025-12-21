import { appLogger } from '../logging/structuredLogger.js';

export const opa = {
  enforce: (policy: string, data: any) => {
    appLogger.info({ policy, data }, 'OPA policy enforcement');
    return true;
  },
};
