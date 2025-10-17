import { getClient } from './client-registry';
import type { UserContext } from './types';

export function setUserContext(user: UserContext): void {
  getClient().setUser(user);
}

export function clearUserContext(): void {
  getClient().setUser(null);
}

export function withScope(tags: Record<string, string>, callback: () => void): void {
  getClient().configureScope(scope => {
    const typedScope = scope as { setTag: (key: string, value: string) => void };
    for (const [key, value] of Object.entries(tags)) {
      typedScope.setTag(key, value);
    }
    callback();
  });
}
