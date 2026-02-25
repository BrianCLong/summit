export const getQueryParam = (param: unknown): string => Array.isArray(param) ? (param[0] as string) : (param as string) || '';
