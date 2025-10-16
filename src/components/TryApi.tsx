import React, { useEffect, useRef } from 'react';

export default function TryApi({
  specUrl,
  proxy,
}: {
  specUrl: string;
  proxy?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    (async () => {
      const SwaggerUI = (await import('swagger-ui-dist')).default;
      SwaggerUI({
        domNode: ref.current!,
        url: specUrl,
        tryItOutEnabled: true,
        requestInterceptor: (req: any) => {
          if (proxy) req.url = req.url.replace(/^https?:\/\/.+?\//, proxy);
          return req;
        },
      });
    })();
  }, [specUrl, proxy]);
  return <div ref={ref} />;
}
