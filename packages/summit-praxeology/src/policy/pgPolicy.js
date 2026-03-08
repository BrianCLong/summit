"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_PG_CONTENT_SAFETY = void 0;
exports.DEFAULT_PG_CONTENT_SAFETY = {
    forbidPrescriptiveContent: true,
    forbidRecommendedActionsInOutputs: true,
    prescriptiveLanguageHeuristics: {
        forbiddenPhrases: [
            'you should',
            'do this',
            'next step',
            'optimal',
            'to achieve',
            'how to',
            'instructions',
            'execute',
            'deploy',
            'weaponize',
            'exploit',
            'bypass'
        ]
    }
};
