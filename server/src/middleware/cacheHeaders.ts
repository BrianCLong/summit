import * as crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

export function withETag(ttl=60, swr=300){
  return (req: Request, res: Response, next: NextFunction)=>{
    res.setHeader('Cache-Control', `public, max-age=${ttl}, stale-while-revalidate=${swr}`);

    const _send = res.send.bind(res);

    // @ts-ignore - overriding send
    res.send = (body: any) => {
      // Calculate ETag
      const content = typeof body === 'string' ? body : JSON.stringify(body);
      const etag = 'W/"'+crypto.createHash('sha1').update(content).digest('hex')+'"';
      res.setHeader('ETag', etag);

      if (req.headers['if-none-match'] === etag) {
        res.status(304).end();
        return res as any;
      }
      return _send(body);
    };

    next();
  }
}
