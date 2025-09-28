import type { Request, Response, NextFunction } from 'express';

export function slowQueryLogger(req: Request, res: Response, next: NextFunction){
  const threshold = Number(process.env.SLOW_QUERY_MS || '0');
  if(!threshold){ return next(); }
  const start = Date.now();
  res.on('finish', ()=>{
    const ms = Date.now() - start;
    if(ms >= threshold && req.path.startsWith('/graphql')){
      console.warn(JSON.stringify({ level:'warn', type:'slow_query', ms, path:req.path, status: res.statusCode }));
    }
  });
  next();
}

