/**
 * STT Provider implementations
 */

export { BaseSTTProvider, STTProviderFactory, ProviderConfig } from './base.js';
export { WhisperProvider, WhisperConfig } from './whisper.js';
export { GoogleSTTProvider, GoogleConfig } from './google.js';
export { AWSTranscribeProvider, AWSConfig } from './aws.js';
export { AzureSTTProvider, AzureConfig } from './azure.js';

// Auto-register providers
import { STTProviderFactory } from './base.js';
import { WhisperProvider } from './whisper.js';
import { GoogleSTTProvider } from './google.js';
import { AWSTranscribeProvider } from './aws.js';
import { AzureSTTProvider } from './azure.js';
import { STTProvider } from '../types.js';

STTProviderFactory.register(STTProvider.WHISPER, (config) => new WhisperProvider(config));
STTProviderFactory.register(STTProvider.GOOGLE, (config) => new GoogleSTTProvider(config));
STTProviderFactory.register(STTProvider.AWS, (config) => new AWSTranscribeProvider(config));
STTProviderFactory.register(STTProvider.AZURE, (config) => new AzureSTTProvider(config));
