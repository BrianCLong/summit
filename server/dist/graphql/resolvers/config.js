import { ConfigService } from '../../services/ConfigService.js';
export const configResolvers = {
    Query: {
        safetyConfig: () => ({ ombudsUrl: ConfigService.ombudsUrl() }),
    },
};
export default configResolvers;
//# sourceMappingURL=config.js.map