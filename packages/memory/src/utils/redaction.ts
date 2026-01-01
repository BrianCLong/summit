const PRIVATE_TAG_REGEX = /<private>[\s\S]*?<\/private>/gi;

export const redactPrivateContent = (text: string): string => text.replace(PRIVATE_TAG_REGEX, '[redacted]');
