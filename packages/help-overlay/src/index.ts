/**
 * Help Overlay Package
 * In-product contextual help components for IntelGraph
 */

// Context and hooks
export { HelpProvider, useHelp, HelpContext } from './HelpContext.js';
export type { HelpProviderProps } from './HelpContext.js';

// Components
export {
  HelpButton,
  HelpSidebar,
  HelpSearch,
  HelpArticleView,
  HelpTooltip,
} from './components/index.js';

// Types
export type {
  HelpArticle,
  HelpAnchor,
  ContextualHelpResponse,
  HelpProviderConfig,
  HelpContextValue,
  HelpButtonProps,
  HelpSidebarProps,
  HelpTooltipProps,
  HelpArticleViewProps,
  HelpSearchProps,
} from './types.js';
