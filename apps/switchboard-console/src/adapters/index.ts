import { ClaudeAdapter } from './ClaudeAdapter';
import { CodexAdapter } from './CodexAdapter';
import { FakeAdapter } from './FakeAdapter';
import { GeminiAdapter } from './GeminiAdapter';
import { ProviderAdapter, ProviderId } from '../types';

export const defaultAdapters = (): ProviderAdapter[] => [
  new CodexAdapter(),
  new ClaudeAdapter(),
  new GeminiAdapter(),
];

export const adapterById = (
  adapters: ProviderAdapter[],
  id: ProviderId,
): ProviderAdapter | undefined => adapters.find((adapter) => adapter.id === id);

export const testAdapters = (): ProviderAdapter[] => [new FakeAdapter()];
