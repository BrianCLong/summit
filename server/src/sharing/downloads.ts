import { Response } from 'express';
import { ShareLink } from './types.js';
import { hasPermission } from './permissions.js';

export const applyDownloadHeaders = (res: Response, link: ShareLink) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Disposition', `attachment; filename="${link.resourceId}.bin"`);
  res.setHeader('Accept-Ranges', 'none');
};

export const ensureDownloadAllowed = (link: ShareLink) => {
  if (!hasPermission(link, 'download')) {
    const error = new Error('download_not_permitted');
    (error as any).statusCode = 403;
    throw error;
  }
};
