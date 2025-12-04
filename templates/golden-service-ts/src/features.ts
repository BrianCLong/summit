export const features = {
  check(flag: string): boolean {
    // Simple env-based toggle: FEATURE_FLAG_NAME=true
    const envKey = `FEATURE_${flag.toUpperCase()}`;
    return process.env[envKey] === 'true';
  },
};
