import { authorize } from '../AuthorizationService';
import { CleanRoomManifest } from './Manifest';

export async function guard(manifest: CleanRoomManifest, queryName: string, ctx: any) {
  if (!manifest.allowedQueries.includes(queryName)) {
    throw new Error('cleanroom_query_not_allowed');
  }
  await authorize('cleanroom.read', { tenantId: ctx.tenantId, residency: ctx.residency }, ctx.auth);
  if (ctx.flags.PII_OFF !== false) {
    ctx.responseMask = 'PII_OFF';
  }
}
