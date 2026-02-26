
import { Request } from 'express';

export function getStringFromQuery(param: any): string | undefined {
  if (typeof param === 'string') {
    return param;
  }
  if (Array.isArray(param) && param.length > 0 && typeof param[0] === 'string') {
    return param[0];
  }
  return undefined;
}
