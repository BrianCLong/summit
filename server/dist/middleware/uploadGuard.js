import { precheckAndRoute } from '../services/MediaPrecheckService';
export async function uploadGuard(req, res, next) {
    const filePath = req.filePath;
    const mime = req.mime || 'application/octet-stream';
    if (!filePath)
        return next();
    const result = await precheckAndRoute(filePath, mime);
    req.detector = result.detector;
    if (result.quarantined) {
        res.status(202).json({ message: 'quarantined', flags: result.flags });
        return;
    }
    next();
}
//# sourceMappingURL=uploadGuard.js.map