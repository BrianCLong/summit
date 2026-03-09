import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface BookmarkResult {
  id: string;
  url: string;
}

export function useExplanationBookmark() {
  const { toast } = useToast();

  const bookmarkExplanation = useCallback(async (explanation: any) => {
    try {
      const response = await fetch('/api/explain/bookmarks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ explanation }),
      });

      if (!response.ok) {
        throw new Error('Failed to save bookmark');
      }

      const result: BookmarkResult = await response.json();

      // Create a shareable URL (assuming current domain)
      const shareableUrl = `${window.location.origin}/investigate?explanation=${result.id}`;

      // Copy to clipboard
      await navigator.clipboard.writeText(shareableUrl);

      toast({
        title: "Explanation Bookmarked",
        description: "Link copied to clipboard.",
      });

      return result;
    } catch (error) {
      console.error('Bookmark error:', error);
      toast({
        title: "Bookmark Failed",
        description: "Could not save explanation.",
        variant: "destructive",
      });
      return null;
    }
  }, [toast]);

  return { bookmarkExplanation };
}
