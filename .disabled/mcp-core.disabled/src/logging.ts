export const createLogger = (name: string) => ({
  info(message: string) {
    process.stderr.write(`[${name}] INFO ${message}\n`);
  },
  error(message: string) {
    process.stderr.write(`[${name}] ERROR ${message}\n`);
  }
});
