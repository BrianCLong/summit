  /**
   * Run face detection using FaceDetectionEngine
   */
  private async runFaceDetection(filePath: string, options: any): Promise<ExtractedEntity[]> {
    try {
      const faceOptions = {
        minFaceSize: options.minFaceSize || 20,
        confidenceThreshold: options.confidenceThreshold || 0.7,
        enableLandmarks: options.enableLandmarks !== false,
        enableAgeGender: options.enableAgeGender || false,
        enableEmotion: options.enableEmotion || false
      };

      const results = await this.faceDetectionEngine.detectFaces(filePath, faceOptions);
      const entities: ExtractedEntity[] = [];

      for (const face of results) {
        entities.push({
          entityType: 'face',
          boundingBox: {
            x: face.boundingBox.x,
            y: face.boundingBox.y,
            width: face.boundingBox.width,
            height: face.boundingBox.height,
            confidence: face.confidence
          },
          confidence: face.confidence,
          extractionMethod: 'face_detection',
          extractionVersion: '2.0.0',
          metadata: {
            landmarks: face.landmarks,
            age: face.demographics?.age,
            gender: face.demographics?.gender,
            emotion: face.demographics?.emotion,
            model: face.model,
            features: face.features
          }
        });
      }

      return entities;
    } catch (error) {
      logger.error('Face detection failed:', error);
      throw new Error(`Face detection failed: ${error.message}`);
    }
  }

  /**
   * Run speech-to-text using SpeechToTextEngine
   */
  private async runSpeechToText(filePath: string, options: any): Promise<ExtractedEntity[]> {
    try {
      const speechOptions = {
        model: options.model || 'whisper-base',
        language: options.language || 'auto',
        enableWordTimestamps: options.enableWordTimestamps !== false,
        enableSpeakerDiarization: options.enableSpeakerDiarization || false,
        enhanceAudio: options.enhanceAudio !== false
      };

      const results = await this.speechToTextEngine.transcribeAudio(filePath, speechOptions);
      const entities: ExtractedEntity[] = [];

      for (const segment of results.segments) {
        entities.push({
          entityType: 'speech_segment',
          extractedText: segment.text,
          temporalRange: {
            startTime: segment.startTime,
            endTime: segment.endTime,
            confidence: segment.confidence
          },
          confidence: segment.confidence,
          extractionMethod: 'speech_to_text',
          extractionVersion: '2.0.0',
          metadata: {
            language: segment.language,
            speaker: segment.speaker,
            model: results.model,
            words: segment.words
          }
        });
      }

      return entities;
    } catch (error) {
      logger.error('Speech-to-text failed:', error);
      throw new Error(`Speech-to-text failed: ${error.message}`);
    }
  }

  /**
   * Run text analysis using TextAnalysisEngine
   */
  private async runTextAnalysis(text: string, options: any): Promise<ExtractedEntity[]> {
    try {
      const analysisOptions = {
        extractEntities: options.extractEntities !== false,
        performSentiment: options.performSentiment !== false,
        extractTopics: options.extractTopics || false,
        detectLanguage: options.detectLanguage !== false,
        extractKeyPhrases: options.extractKeyPhrases !== false,
        generateSummary: options.generateSummary || false
      };

      const results = await this.textAnalysisEngine.analyzeText(text, analysisOptions);
      const entities: ExtractedEntity[] = [];

      // Add named entities
      for (const entity of results.entities) {
        entities.push({
          entityType: entity.label,
          extractedText: entity.text,
          confidence: entity.confidence,
          extractionMethod: 'text_analysis',
          extractionVersion: '2.0.0',
          metadata: {
            startPosition: entity.start,
            endPosition: entity.end,
            description: entity.description,
            canonicalForm: entity.canonicalForm,
            entityId: entity.entityId
          }
        });
      }

      // Add sentiment as entity
      if (results.sentiment) {
        entities.push({
          entityType: 'sentiment',
          extractedText: text,
          confidence: results.sentiment.confidence,
          extractionMethod: 'text_analysis',
          extractionVersion: '2.0.0',
          metadata: {
            sentiment: results.sentiment.label,
            score: results.sentiment.score,
            aspects: results.sentiment.aspects
          }
        });
      }

      // Add key phrases as entities
      for (const phrase of results.keyPhrases) {
        entities.push({
          entityType: 'key_phrase',
          extractedText: phrase.phrase,
          confidence: phrase.relevance,
          extractionMethod: 'text_analysis',
          extractionVersion: '2.0.0',
          metadata: {
            frequency: phrase.frequency,
            positions: phrase.positions
          }
        });
      }

      return entities;
    } catch (error) {
      logger.error('Text analysis failed:', error);
      throw new Error(`Text analysis failed: ${error.message}`);
    }
  }

  /**
   * Run embedding generation using EmbeddingService
   */
  private async runEmbeddingGeneration(mediaSource: any, options: any): Promise<ExtractedEntity[]> {
    try {
      const entities: ExtractedEntity[] = [];
      let embedding: number[] = [];
      let embeddingType = 'unknown';

      // Generate appropriate embedding based on media type
      if (mediaSource.media_type === 'TEXT' || mediaSource.extracted_text) {
        const text = mediaSource.extracted_text || mediaSource.content;
        embedding = await this.embeddingService.generateTextEmbedding(text, options);
        embeddingType = 'text';
      } else if (mediaSource.media_type === 'IMAGE') {
        embedding = await this.embeddingService.generateImageEmbedding(mediaSource.file_path, options);
        embeddingType = 'image';
      } else if (mediaSource.media_type === 'AUDIO') {
        embedding = await this.embeddingService.generateAudioEmbedding(mediaSource.file_path, options);
        embeddingType = 'audio';
      } else {
        // Generate multimodal embedding
        const inputs = {
          text: mediaSource.extracted_text,
          imagePath: mediaSource.media_type === 'IMAGE' ? mediaSource.file_path : undefined,
          audioPath: mediaSource.media_type === 'AUDIO' ? mediaSource.file_path : undefined
        };
        embedding = await this.embeddingService.generateMultimodalEmbedding(inputs, options.weights);
        embeddingType = 'multimodal';
      }

      // Store embedding in vector database
      await this.embeddingService.storeEmbedding(
        mediaSource.id,
        embedding,
        {
          investigationId: mediaSource.investigation_id,
          mediaType: mediaSource.media_type,
          fileName: mediaSource.file_name,
          extractedAt: new Date().toISOString()
        },
        embeddingType as any,
        mediaSource.file_path
      );

      entities.push({
        entityType: 'embedding',
        confidence: 1.0,
        extractionMethod: 'embedding_generation',
        extractionVersion: '2.0.0',
        metadata: {
          embeddingType,
          dimension: embedding.length,
          model: options.model || 'default',
          stored: true
        }
      });

      return entities;
    } catch (error) {
      logger.error('Embedding generation failed:', error);
      throw new Error(`Embedding generation failed: ${error.message}`);
    }
  }