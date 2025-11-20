# @summit/briefing-generation

Intelligence briefing and slide deck generation for creating professional PowerPoint-style presentations.

## Features

- Slide deck generation
- Multiple slide layouts
- Chart and visualization integration
- Timeline and network diagrams
- Classification marking
- Speaker notes
- Export to PPTX

## Installation

```bash
pnpm add @summit/briefing-generation
```

## Usage

```typescript
import { BriefingGenerator } from '@summit/briefing-generation';

const briefing = new BriefingGenerator();

briefing.createBriefing({
  title: 'Threat Intelligence Briefing',
  subtitle: 'Q1 2025 Threat Landscape',
  author: 'Intelligence Team',
  date: new Date(),
  classification: 'SECRET//NOFORN',
  theme: 'professional',
  includeAgenda: true
});

// Add content slides
briefing.addContentSlide('Key Findings', 'Summary of key findings', [
  'Increased APT activity',
  'New malware variants detected',
  'Targeting critical infrastructure'
]);

// Add charts
briefing.addChartSlide('Threat Trends', chartData);

// Add timeline
briefing.addTimelineSlide('Attack Timeline', events);

const slides = briefing.getSlides();
```
