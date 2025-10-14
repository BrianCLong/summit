import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';

const QUARANTINE_DIR = process.env.QUARANTINE_DIR || path.join(process.cwd(), 'quarantine');
const KPW_MEDIA_URL = process.env.KPW_MEDIA_URL || 'http://localhost:7102';
const LAC_URL = process.env.LAC_URL || 'http://localhost:7103'; // Assuming LAC has an API

// Ensure quarantine directory exists
fs.mkdir(QUARANTINE_DIR, { recursive: true }).catch(console.error);

export const dropResolvers = {
  Mutation: {
    submitDrop: async (_: any, { input }: { input: { payload: string; metadata?: string } }) => {
      const dropId = uuidv4();
      const quarantinePath = path.join(QUARANTINE_DIR, `${dropId}.drop`);

      try {
        // 1. Store raw payload in quarantine
        await fs.writeFile(quarantinePath, Buffer.from(input.payload, 'base64'));

        let status = 'QUARANTINED';
        let reason = 'Stored in quarantine, awaiting verification.';

        // 2. Simulate KPW-Media verification
        // In a real scenario, the payload would be processed to generate step commits
        // and then sent to KPW-Media for wallet building/verification.
        // For MVP, we simulate a verification call.
        const kpwVerifyResult = await axios.post(`${KPW_MEDIA_URL}/kpw/verify`, { bundle: {} }) // Placeholder bundle
          .then(res => res.data.ok)
          .catch(() => false);

        if (!kpwVerifyResult) {
          reason = 'KPW-Media verification failed or not applicable.';
        }

        // 3. Simulate LAC evaluation
        // This would involve compiling a policy and evaluating it against the drop's context.
        const lacEvalResult = await axios.post(`${LAC_URL}/lac/evaluate`, { context: {}, policy: {} }) // Placeholder context/policy
          .then(res => res.data.allow)
          .catch(() => false);

        if (!lacEvalResult) {
          reason = (reason === 'Stored in quarantine, awaiting verification.') ? 'LAC policy denied.' : reason + ' LAC policy denied.';
        }

        if (kpwVerifyResult && lacEvalResult) {
          status = 'VERIFIED';
          reason = 'KPW-Media verified and LAC policy allowed.';
        } else if (!kpwVerifyResult || !lacEvalResult) {
          status = 'DENIED';
          // Reason already set based on failures
        }

        return { id: dropId, status, reason };

      } catch (error: any) {
        console.error(`Error submitting drop ${dropId}:`, error);
        return { id: dropId, status: 'QUARANTINED', reason: `Processing error: ${error.message}` };
      }
    },
  },
};
