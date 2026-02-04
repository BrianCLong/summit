import crypto from 'crypto';
export function withETag(ttl=60, swr=300){
  return (req,res,next)=>{
    res.setHeader('Cache-Control', `public, max-age=${ttl}, stale-while-revalidate=${swr}`);
    const _send = res.send.bind(res);
    res.send = ((body: any) => {
      const etag = 'W/"' + crypto.createHash('sha1').update(body).digest('hex') + '"';
      res.setHeader('ETag', etag);
      if (req.headers['if-none-match'] === etag) {
        res.status(304).end();
        return res as any;
      }
      return _send(body);
    }) as any;
    next();
  }
}