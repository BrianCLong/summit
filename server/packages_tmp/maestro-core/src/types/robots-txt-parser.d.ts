declare module 'robots-txt-parser' {
  interface RobotsResult {
    isAllowed(url: string, userAgent?: string): boolean;
    isDisallowed(url: string, userAgent?: string): boolean;
    getCrawlDelay(userAgent?: string): number | undefined;
    getSitemaps(): string[];
  }

  export function parse(content: string): RobotsResult;

  interface RobotsParser {
    setUrl(url: string): Promise<void>;
    canCrawl(url: string, userAgent?: string): Promise<boolean>;
    getCrawlDelay(userAgent?: string): number | undefined;
    getSitemaps(): string[];
  }

  function robotsParser(options?: { userAgent?: string }): RobotsParser;
  export default robotsParser;
}
