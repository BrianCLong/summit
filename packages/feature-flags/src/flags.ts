import { OpenFeature } from ' @openfeature/server-sdk';
export const ff = OpenFeature.getClient('symphony');

export async function enabled(flag: string, defaultValue = false) {
  try {
    return await ff.getBooleanValue(flag, defaultValue);
  } catch {
    return defaultValue;
  }
}
