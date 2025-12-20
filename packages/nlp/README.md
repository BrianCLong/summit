# @intelgraph/nlp

Core NLP utilities and text preprocessing pipeline for the IntelGraph platform.

## Features

- **Language Detection**: Detect 100+ languages with confidence scores
- **Tokenization**: Word and sentence tokenization with position tracking
- **Normalization**: Unicode normalization, case folding, accent removal
- **Spell Checking**: Automatic spell checking and correction
- **Text Cleaning**: HTML/XML stripping, URL removal, noise removal
- **Preprocessing Pipelines**: Composable preprocessing workflows

## Installation

```bash
pnpm add @intelgraph/nlp
```

## Quick Start

```typescript
import { TextPreprocessor, Tokenizer, LanguageDetector } from '@intelgraph/nlp';

// Language detection
const detector = new LanguageDetector();
const language = detector.detect('Hello world');

// Text preprocessing
const preprocessor = new TextPreprocessor({
  lowercase: true,
  removeStopwords: true,
  lemmatize: true,
});

const cleaned = preprocessor.preprocess('Your text here');

// Tokenization
const tokenizer = new Tokenizer();
const tokens = tokenizer.tokenize('Natural language processing');
```

## Documentation

See [NLP Guide](../../docs/nlp/GUIDE.md) for comprehensive documentation.
