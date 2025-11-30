/**
 * Help Overlay Types
 * Type definitions for contextual help components
 */

export interface HelpArticle {
  id: string;
  slug: string;
  title: string;
  contentType: string;
  classification: string;
  currentVersion: {
    content: string;
    contentHtml: string;
    summary?: string;
  } | null;
  tags?: Array<{ name: string; slug: string }>;
}

export interface HelpAnchor {
  id: string;
  anchorKey: string;
  uiRoute: string;
  description?: string;
  priority: number;
  articleIds: string[];
}

export interface ContextualHelpResponse {
  articles: HelpArticle[];
  relatedPlaybooks: HelpArticle[];
  suggestedSearches: string[];
}

export interface HelpProviderConfig {
  baseUrl: string;
  defaultRole?: string;
  cacheTimeout?: number;
}

export interface HelpContextValue {
  isOpen: boolean;
  openHelp: () => void;
  closeHelp: () => void;
  toggleHelp: () => void;
  currentArticle: HelpArticle | null;
  setCurrentArticle: (article: HelpArticle | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: HelpArticle[];
  isSearching: boolean;
  search: (query: string) => Promise<void>;
  fetchContextualHelp: (route: string, anchorKey?: string) => Promise<ContextualHelpResponse | null>;
  config: HelpProviderConfig;
}

export interface HelpButtonProps {
  anchorKey?: string;
  className?: string;
  children?: React.ReactNode;
}

export interface HelpSidebarProps {
  className?: string;
  onClose?: () => void;
}

export interface HelpTooltipProps {
  anchorKey: string;
  children: React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

export interface HelpArticleViewProps {
  article: HelpArticle;
  onBack?: () => void;
}

export interface HelpSearchProps {
  placeholder?: string;
  className?: string;
  onResultSelect?: (article: HelpArticle) => void;
}
