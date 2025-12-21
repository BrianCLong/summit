import { describe, expect, it } from 'vitest';
import { buildMetadata } from '../../src/lib/seo';

describe('SEO utilities', () => {
  describe('buildMetadata', () => {
    it('builds metadata with correct title for non-root paths', () => {
      const metadata = buildMetadata({
        title: 'Summit',
        description: 'Test description',
        path: '/summit',
      });

      expect(metadata.title).toBe('Summit | Topicality');
    });

    it('uses title directly for root path', () => {
      const metadata = buildMetadata({
        title: 'Topicality',
        description: 'Test description',
        path: '/',
      });

      expect(metadata.title).toBe('Topicality');
    });

    it('includes description in metadata', () => {
      const metadata = buildMetadata({
        title: 'Test',
        description: 'This is a test description',
        path: '/test',
      });

      expect(metadata.description).toBe('This is a test description');
    });

    it('sets noindex when requested', () => {
      const metadata = buildMetadata({
        title: 'Test',
        description: 'Test',
        path: '/test',
        noIndex: true,
      });

      expect(metadata.robots).toEqual({ index: false, follow: false });
    });

    it('allows indexing by default', () => {
      const metadata = buildMetadata({
        title: 'Test',
        description: 'Test',
        path: '/test',
      });

      expect(metadata.robots).toEqual({ index: true, follow: true });
    });
  });
});
