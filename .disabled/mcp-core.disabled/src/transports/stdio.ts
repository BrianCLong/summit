import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio';

export const stdioServerTransport = (): StdioServerTransport =>
  new StdioServerTransport();
