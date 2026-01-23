// Mock for isomorphic-dompurify
const DOMPurify = {
  sanitize: (dirty: string, _config?: any): string => {
    // Basic sanitization mock - strips HTML tags
    return dirty.replace(/<[^>]*>/g, '');
  },
  setConfig: (_config: any): void => {},
  clearConfig: (): void => {},
  isSupported: true,
  addHook: (_entryPoint: string, _hookFunction: any): void => {},
  removeHook: (_entryPoint: string): void => {},
  removeHooks: (_entryPoint: string): void => {},
  removeAllHooks: (): void => {},
};

export default DOMPurify;
export { DOMPurify };
