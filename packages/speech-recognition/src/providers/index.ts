/**
 * STT Provider implementations
 */

export { BaseSTTProvider, STTProviderFactory } from './base.js';
export { WhisperProvider } from './whisper.js';
export { GoogleSTTProvider } from './google.js';
export { AWSTranscribeProvider } from './aws.js';
export { AzureSTTProvider } from './azure.js';

// Auto-register providers
import { STTProviderFactory } from './base.js';
import { WhisperProvider } from './whisper.js';
import { GoogleSTTProvider } from './google.js';
import { AWSTranscribeProvider } from './aws.js';
import { AzureSTTProvider } from './azure.js';
import { STTProvider } from '../types.js';

STTProviderFactory.register(STTProvider.WHISPER, () => new WhisperProvider());
STTProviderFactory.register(STTProvider.GOOGLE, () => new GoogleSTTProvider());
STTProviderFactory.register(STTProvider.AWS, () => new AWSTranscribeProvider());
STTProviderFactory.register(STTProvider.AZURE, () => new AzureSTTProvider());
