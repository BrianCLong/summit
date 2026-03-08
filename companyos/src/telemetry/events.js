"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackEvent = trackEvent;
function trackEvent(req, name, props = {}) {
    req.log?.info?.({
        event_type: name,
        user_id: req.subject?.id ?? req.user?.id ?? null,
        tenant_id: req.subject?.tenant_id ?? null,
        ...props,
    }, 'product_event');
}
