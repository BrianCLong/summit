import type { Request } from 'express';

export function trackEvent(
  req: Request,
  name: string,
  props: Record<string, unknown> = {}
): void {
  req.log?.info?.(
    {
      event_type: name,
      user_id: req.subject?.id ?? req.user?.id ?? null,
      tenant_id: req.subject?.tenant_id ?? null,
      ...props,
    },
    'product_event'
  );
}
