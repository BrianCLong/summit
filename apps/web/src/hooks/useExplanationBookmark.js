"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useExplanationBookmark = useExplanationBookmark;
const react_1 = require("react");
const use_toast_1 = require("@/hooks/use-toast");
function useExplanationBookmark() {
    const { toast } = (0, use_toast_1.useToast)();
    const bookmarkExplanation = (0, react_1.useCallback)(async (explanation) => {
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
            const result = await response.json();
            // Create a shareable URL (assuming current domain)
            const shareableUrl = `${window.location.origin}/investigate?explanation=${result.id}`;
            // Copy to clipboard
            await navigator.clipboard.writeText(shareableUrl);
            toast({
                title: "Explanation Bookmarked",
                description: "Link copied to clipboard.",
            });
            return result;
        }
        catch (error) {
            console.error('Bookmark error:', error);
            toast({
                title: "Bookmark Failed",
                description: "Could not save explanation.",
            });
            return null;
        }
    }, [toast]);
    return { bookmarkExplanation };
}
