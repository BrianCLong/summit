"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AWSTranscribeProvider = void 0;
const base_js_1 = require("./base.js");
const types_js_1 = require("../types.js");
/**
 * AWS Transcribe Provider
 * Requires: @aws-sdk/client-transcribe package
 */
class AWSTranscribeProvider extends base_js_1.BaseSTTProvider {
    client;
    s3Client;
    bucketName;
    constructor(config = {}) {
        super(config);
        this.bucketName = config.bucketName || process.env.AWS_TRANSCRIBE_BUCKET || '';
        // Lazy load AWS SDK
        // this.initializeClient(config);
    }
    getName() {
        return 'AWS Transcribe';
    }
    async transcribe(audio, config) {
        this.validateConfig(config);
        const mergedConfig = this.mergeConfig(config);
        try {
            // For AWS Transcribe, we need to upload to S3 first
            const jobName = `transcribe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const s3Key = `audio/${jobName}.${audio.metadata.format}`;
            // Upload to S3
            // await this.uploadToS3(s3Key, audio.data);
            // Start transcription job
            const transcriptionJob = {
                TranscriptionJobName: jobName,
                LanguageCode: this.mapLanguageCode(mergedConfig.language),
                MediaFormat: audio.metadata.format,
                Media: {
                    MediaFileUri: `s3://${this.bucketName}/${s3Key}`
                },
                Settings: {
                    ShowSpeakerLabels: mergedConfig.enableSpeakerDiarization,
                    MaxSpeakerLabels: mergedConfig.maxSpeakers,
                    ChannelIdentification: audio.metadata.channels > 1,
                    ShowAlternatives: true,
                    MaxAlternatives: 3
                }
            };
            // Add custom vocabulary if provided
            if (mergedConfig.vocabularyFilterName) {
                transcriptionJob.Settings.VocabularyFilterName = mergedConfig.vocabularyFilterName;
            }
            // Start job
            // await this.client.startTranscriptionJob(transcriptionJob);
            // Poll for completion
            // const result = await this.pollForCompletion(jobName);
            // For now, return placeholder
            return this.transformAWSResponse({}, mergedConfig, audio);
        }
        catch (error) {
            throw new Error(`AWS Transcribe failed: ${error}`);
        }
    }
    getProviderLanguages() {
        // AWS Transcribe supports 100+ languages
        return Array.from(types_js_1.SUPPORTED_LANGUAGES);
    }
    getMaxDuration() {
        // AWS Transcribe supports up to 4 hours for batch
        return 14400;
    }
    mapLanguageCode(languageCode) {
        // AWS uses different format for some languages
        const mapping = {
            'en-US': 'en-US',
            'en-GB': 'en-GB',
            'es-ES': 'es-ES',
            'es-MX': 'es-US',
            'fr-FR': 'fr-FR',
            'de-DE': 'de-DE'
            // Add more mappings as needed
        };
        return mapping[languageCode] || languageCode;
    }
    async pollForCompletion(jobName, maxAttempts = 60) {
        for (let i = 0; i < maxAttempts; i++) {
            // const { TranscriptionJob } = await this.client.getTranscriptionJob({
            //   TranscriptionJobName: jobName
            // });
            // if (TranscriptionJob.TranscriptionJobStatus === 'COMPLETED') {
            //   return TranscriptionJob;
            // }
            // if (TranscriptionJob.TranscriptionJobStatus === 'FAILED') {
            //   throw new Error(`Transcription job failed: ${TranscriptionJob.FailureReason}`);
            // }
            // Wait 5 seconds before next poll
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
        throw new Error('Transcription job timeout');
    }
    transformAWSResponse(response, config, audio) {
        // Transform AWS Transcribe response to our format
        const transcript = response.Transcript || { results: [] };
        const segments = transcript.results
            ?.filter((result) => !result.isPartial)
            .map((result) => {
            const alternative = result.alternatives[0];
            return {
                text: alternative.transcript,
                startTime: parseFloat(result.start_time || '0'),
                endTime: parseFloat(result.end_time || audio.metadata.duration.toString()),
                confidence: parseFloat(alternative.confidence || '1.0'),
                words: result.items?.map((item) => ({
                    word: item.content,
                    startTime: parseFloat(item.start_time || '0'),
                    endTime: parseFloat(item.end_time || '0'),
                    confidence: parseFloat(item.confidence || '1.0')
                }))
            };
        }) || [];
        const fullText = segments.map((seg) => seg.text).join(' ');
        return {
            text: fullText,
            segments,
            language: config.language,
            languageConfidence: 1.0,
            duration: audio.metadata.duration,
            provider: types_js_1.STTProvider.AWS,
            model: 'transcribe',
            metadata: {
                jobName: response.TranscriptionJobName
            }
        };
    }
}
exports.AWSTranscribeProvider = AWSTranscribeProvider;
