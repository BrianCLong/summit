/**
 * Type augmentation for React 19 compatibility with third-party libraries
 *
 * React 19 changed the ReactNode type to include bigint, which causes
 * type incompatibilities with libraries compiled against React 18 types.
 *
 * This file augments the React namespace to ensure third-party components
 * (like lucide-react, recharts, @apollo/client, react-router-dom) are
 * compatible with React 19's JSX types.
 */

import type * as React from 'react';

declare module 'react' {
  // Augment the JSX namespace to accept components with React 18-style types
  namespace JSX {
    interface IntrinsicAttributes {
      key?: React.Key | null | undefined;
    }
  }

  // Make ForwardRefExoticComponent compatible with React 19 JSX
  interface ForwardRefExoticComponent<P> {
    (props: P, deprecatedLegacyContext?: any): ReactNode;
  }

  // Ensure component types are compatible
  interface FunctionComponent<P = {}> {
    (props: P, deprecatedLegacyContext?: any): ReactNode;
  }

  interface ComponentClass<P = {}, S = any> {
    new (props: P, deprecatedLegacyContext?: any): Component<P, S>;
  }
}

// Augment lucide-react types
declare module 'lucide-react' {
  import type { ComponentType, SVGProps } from 'react';

  export interface LucideProps extends Partial<Omit<SVGProps<SVGSVGElement>, 'ref'>> {
    size?: string | number;
    absoluteStrokeWidth?: boolean;
  }

  // Make all lucide icons compatible with React 19
  export type LucideIcon = ComponentType<LucideProps>;

  // Export all common icons as ComponentType
  export const Activity: LucideIcon;
  export const AlertCircle: LucideIcon;
  export const AlertTriangle: LucideIcon;
  export const Archive: LucideIcon;
  export const ArrowDown: LucideIcon;
  export const ArrowLeft: LucideIcon;
  export const ArrowRight: LucideIcon;
  export const ArrowUp: LucideIcon;
  export const Bug: LucideIcon;
  export const Calendar: LucideIcon;
  export const Check: LucideIcon;
  export const CheckCircle: LucideIcon;
  export const ChevronDown: LucideIcon;
  export const ChevronLeft: LucideIcon;
  export const ChevronRight: LucideIcon;
  export const ChevronUp: LucideIcon;
  export const Circle: LucideIcon;
  export const Clock: LucideIcon;
  export const Copy: LucideIcon;
  export const DollarSign: LucideIcon;
  export const Download: LucideIcon;
  export const Edit: LucideIcon;
  export const Edit2: LucideIcon;
  export const Edit3: LucideIcon;
  export const ExternalLink: LucideIcon;
  export const Eye: LucideIcon;
  export const EyeOff: LucideIcon;
  export const File: LucideIcon;
  export const FileText: LucideIcon;
  export const Filter: LucideIcon;
  export const Folder: LucideIcon;
  export const GitBranch: LucideIcon;
  export const Github: LucideIcon;
  export const Globe: LucideIcon;
  export const Grid: LucideIcon;
  export const HelpCircle: LucideIcon;
  export const Home: LucideIcon;
  export const Icon: LucideIcon;
  export const Image: LucideIcon;
  export const Info: LucideIcon;
  export const Link: LucideIcon;
  export const Link2: LucideIcon;
  export const Loader: LucideIcon;
  export const Lock: LucideIcon;
  export const LogIn: LucideIcon;
  export const LogOut: LucideIcon;
  export const Mail: LucideIcon;
  export const MapPin: LucideIcon;
  export const Menu: LucideIcon;
  export const MessageCircle: LucideIcon;
  export const MessageSquare: LucideIcon;
  export const Minus: LucideIcon;
  export const MoreHorizontal: LucideIcon;
  export const MoreVertical: LucideIcon;
  export const Network: LucideIcon;
  export const Package: LucideIcon;
  export const Pause: LucideIcon;
  export const Play: LucideIcon;
  export const Plus: LucideIcon;
  export const RefreshCw: LucideIcon;
  export const Save: LucideIcon;
  export const Search: LucideIcon;
  export const Settings: LucideIcon;
  export const Share: LucideIcon;
  export const Shield: LucideIcon;
  export const Star: LucideIcon;
  export const Trash: LucideIcon;
  export const Trash2: LucideIcon;
  export const TrendingDown: LucideIcon;
  export const TrendingUp: LucideIcon;
  export const Triangle: LucideIcon;
  export const Upload: LucideIcon;
  export const User: LucideIcon;
  export const Users: LucideIcon;
  export const X: LucideIcon;
  export const XCircle: LucideIcon;
  export const Zap: LucideIcon;
  export const ChevronsLeft: LucideIcon;
  export const ChevronsRight: LucideIcon;
  export const Database: LucideIcon;
  export const Gauge: LucideIcon;
  export const Layers: LucideIcon;
  export const Lightbulb: LucideIcon;
  export const Map: LucideIcon;
  export const Mic: LucideIcon;
  export const Tag: LucideIcon;
}

// Augment recharts types
declare module 'recharts' {
  import type { ComponentType, CSSProperties } from 'react';

  export interface ResponsiveContainerProps {
    aspect?: number;
    width?: string | number;
    height?: string | number;
    minWidth?: string | number;
    minHeight?: string | number;
    maxHeight?: number;
    debounce?: number;
    children?: React.ReactNode;
    className?: string;
    id?: string;
  }

  export const ResponsiveContainer: ComponentType<ResponsiveContainerProps>;
  export const BarChart: ComponentType<any>;
  export const LineChart: ComponentType<any>;
  export const AreaChart: ComponentType<any>;
  export const PieChart: ComponentType<any>;
  export const RadarChart: ComponentType<any>;
  export const ScatterChart: ComponentType<any>;
  export const XAxis: ComponentType<any>;
  export const YAxis: ComponentType<any>;
  export const ZAxis: ComponentType<any>;
  export const Tooltip: ComponentType<any>;
  export const Legend: ComponentType<any>;
  export const Bar: ComponentType<any>;
  export const Line: ComponentType<any>;
  export const Area: ComponentType<any>;
  export const Pie: ComponentType<any>;
  export const Radar: ComponentType<any>;
  export const Scatter: ComponentType<any>;
  export const Cell: ComponentType<any>;
  export const CartesianGrid: ComponentType<any>;
  export const ReferenceLine: ComponentType<any>;
  export const ReferenceDot: ComponentType<any>;
  export const ReferenceArea: ComponentType<any>;
  export const Brush: ComponentType<any>;
}

// Augment @apollo/client types
declare module '@apollo/client' {
  import type { ComponentType } from 'react';

  export * from '@apollo/client';

  export interface ApolloProviderProps<TCache = any> {
    client: any;
    children?: React.ReactNode;
  }

  export const ApolloProvider: ComponentType<ApolloProviderProps>;
}

declare module '@apollo/client/react/components' {
  import type { ComponentType } from 'react';
  export const Query: ComponentType<any>;
  export const Mutation: ComponentType<any>;
  export const Subscription: ComponentType<any>;
}

// Augment react-router-dom types
declare module 'react-router-dom' {
  import type { ComponentType } from 'react';

  export * from 'react-router-dom';

  export const Link: ComponentType<any>;
  export const NavLink: ComponentType<any>;
  export const Navigate: ComponentType<any>;
  export const Outlet: ComponentType<any>;
  export const Route: ComponentType<any>;
  export const Routes: ComponentType<any>;
}

// Augment @heroicons/react types
declare module '@heroicons/react/24/outline' {
  import type { ComponentType, SVGProps } from 'react';

  export type HeroIconComponent = ComponentType<SVGProps<SVGSVGElement> & { title?: string; titleId?: string }>;

  export const ChatBubbleLeftRightIcon: HeroIconComponent;
  export const SparklesIcon: HeroIconComponent;
  export const XMarkIcon: HeroIconComponent;
  export const XCircleIcon: HeroIconComponent;
  export const ClipboardDocumentIcon: HeroIconComponent;
  export const DocumentArrowDownIcon: HeroIconComponent;
  export const PaperAirplaneIcon: HeroIconComponent;
  export const ExclamationTriangleIcon: HeroIconComponent;
  export const ChartBarIcon: HeroIconComponent;
  export const CheckCircleIcon: HeroIconComponent;
  export const PauseIcon: HeroIconComponent;
  export const PlayIcon: HeroIconComponent;
  export const StopIcon: HeroIconComponent;
  export const ArrowPathIcon: HeroIconComponent;
  export const InformationCircleIcon: HeroIconComponent;
  export const ShieldCheckIcon: HeroIconComponent;
  export const BellIcon: HeroIconComponent;
  export const Cog6ToothIcon: HeroIconComponent;
  export const UserCircleIcon: HeroIconComponent;
  export const MagnifyingGlassIcon: HeroIconComponent;
  export const DocumentTextIcon: HeroIconComponent;
  export const FolderIcon: HeroIconComponent;
  export const HomeIcon: HeroIconComponent;
  export const ChartPieIcon: HeroIconComponent;
  export const CpuChipIcon: HeroIconComponent;
  export const ServerIcon: HeroIconComponent;
  export const ClockIcon: HeroIconComponent;
  export const TrophyIcon: HeroIconComponent;
  export const BoltIcon: HeroIconComponent;
  export const LightBulbIcon: HeroIconComponent;
  export const CodeBracketIcon: HeroIconComponent;
  export const RocketLaunchIcon: HeroIconComponent;
  export const AdjustmentsHorizontalIcon: HeroIconComponent;
  export const ArrowDownTrayIcon: HeroIconComponent;
  export const ArrowLeftIcon: HeroIconComponent;
  export const ArrowRightIcon: HeroIconComponent;
  export const ArrowUpIcon: HeroIconComponent;
  export const BuildingOfficeIcon: HeroIconComponent;
  export const CalendarIcon: HeroIconComponent;
  export const CloudIcon: HeroIconComponent;
  export const ComputerDesktopIcon: HeroIconComponent;
  export const CubeIcon: HeroIconComponent;
  export const DevicePhoneMobileIcon: HeroIconComponent;
  export const EnvelopeIcon: HeroIconComponent;
  export const FaceSmileIcon: HeroIconComponent;
  export const FlagIcon: HeroIconComponent;
  export const GlobeAltIcon: HeroIconComponent;
  export const HashtagIcon: HeroIconComponent;
  export const HeartIcon: HeroIconComponent;
  export const KeyIcon: HeroIconComponent;
  export const LinkIcon: HeroIconComponent;
  export const ListBulletIcon: HeroIconComponent;
  export const LockClosedIcon: HeroIconComponent;
  export const MapPinIcon: HeroIconComponent;
  export const MinusIcon: HeroIconComponent;
  export const PencilIcon: HeroIconComponent;
  export const PlusIcon: HeroIconComponent;
  export const QuestionMarkCircleIcon: HeroIconComponent;
  export const ShareIcon: HeroIconComponent;
  export const StarIcon: HeroIconComponent;
  export const TagIcon: HeroIconComponent;
  export const TrashIcon: HeroIconComponent;
  export const UserIcon: HeroIconComponent;
  export const UsersIcon: HeroIconComponent;
  export const BugAntIcon: HeroIconComponent;
  export const CheckBadgeIcon: HeroIconComponent;
  export const CogIcon: HeroIconComponent;
  export const CurrencyDollarIcon: HeroIconComponent;
  export const ExclamationCircleIcon: HeroIconComponent;
  export const EyeIcon: HeroIconComponent;
  export const FunnelIcon: HeroIconComponent;
}

declare module '@heroicons/react/24/solid' {
  import type { ComponentType, SVGProps } from 'react';

  export type HeroIconComponent = ComponentType<SVGProps<SVGSVGElement> & { title?: string; titleId?: string }>;

  export const ChatBubbleLeftRightIcon: HeroIconComponent;
  export const SparklesIcon: HeroIconComponent;
  export const XMarkIcon: HeroIconComponent;
  export const XCircleIcon: HeroIconComponent;
  export const ClipboardDocumentIcon: HeroIconComponent;
  export const DocumentArrowDownIcon: HeroIconComponent;
  export const PaperAirplaneIcon: HeroIconComponent;
  export const ExclamationTriangleIcon: HeroIconComponent;
  export const ChartBarIcon: HeroIconComponent;
  export const CheckCircleIcon: HeroIconComponent;
  export const PauseIcon: HeroIconComponent;
  export const PlayIcon: HeroIconComponent;
  export const StopIcon: HeroIconComponent;
  export const ArrowPathIcon: HeroIconComponent;
  export const InformationCircleIcon: HeroIconComponent;
  export const ShieldCheckIcon: HeroIconComponent;
  export const BellIcon: HeroIconComponent;
  export const Cog6ToothIcon: HeroIconComponent;
  export const UserCircleIcon: HeroIconComponent;
  export const MagnifyingGlassIcon: HeroIconComponent;
  export const DocumentTextIcon: HeroIconComponent;
  export const FolderIcon: HeroIconComponent;
  export const HomeIcon: HeroIconComponent;
  export const ChartPieIcon: HeroIconComponent;
  export const CpuChipIcon: HeroIconComponent;
  export const ServerIcon: HeroIconComponent;
  export const ClockIcon: HeroIconComponent;
  export const TrophyIcon: HeroIconComponent;
  export const BoltIcon: HeroIconComponent;
  export const LightBulbIcon: HeroIconComponent;
  export const CodeBracketIcon: HeroIconComponent;
  export const RocketLaunchIcon: HeroIconComponent;
  export const AdjustmentsHorizontalIcon: HeroIconComponent;
  export const ArrowDownTrayIcon: HeroIconComponent;
  export const ArrowLeftIcon: HeroIconComponent;
  export const ArrowRightIcon: HeroIconComponent;
  export const ArrowUpIcon: HeroIconComponent;
  export const BuildingOfficeIcon: HeroIconComponent;
  export const CalendarIcon: HeroIconComponent;
  export const CloudIcon: HeroIconComponent;
  export const ComputerDesktopIcon: HeroIconComponent;
  export const CubeIcon: HeroIconComponent;
  export const DevicePhoneMobileIcon: HeroIconComponent;
  export const EnvelopeIcon: HeroIconComponent;
  export const FaceSmileIcon: HeroIconComponent;
  export const FlagIcon: HeroIconComponent;
  export const GlobeAltIcon: HeroIconComponent;
  export const HashtagIcon: HeroIconComponent;
  export const HeartIcon: HeroIconComponent;
  export const KeyIcon: HeroIconComponent;
  export const LinkIcon: HeroIconComponent;
  export const ListBulletIcon: HeroIconComponent;
  export const LockClosedIcon: HeroIconComponent;
  export const MapPinIcon: HeroIconComponent;
  export const MinusIcon: HeroIconComponent;
  export const PencilIcon: HeroIconComponent;
  export const PlusIcon: HeroIconComponent;
  export const QuestionMarkCircleIcon: HeroIconComponent;
  export const ShareIcon: HeroIconComponent;
  export const StarIcon: HeroIconComponent;
  export const TagIcon: HeroIconComponent;
  export const TrashIcon: HeroIconComponent;
  export const UserIcon: HeroIconComponent;
  export const UsersIcon: HeroIconComponent;
  export const BugAntIcon: HeroIconComponent;
  export const CheckBadgeIcon: HeroIconComponent;
  export const CogIcon: HeroIconComponent;
  export const CurrencyDollarIcon: HeroIconComponent;
  export const ExclamationCircleIcon: HeroIconComponent;
  export const EyeIcon: HeroIconComponent;
  export const FunnelIcon: HeroIconComponent;
}

// Augment cmdk types
declare module 'cmdk' {
  import type { ComponentType, HTMLAttributes } from 'react';

  export interface CommandProps extends HTMLAttributes<HTMLDivElement> {
    value?: string;
    onValueChange?: (value: string) => void;
    filter?: (value: string, search: string) => number;
    shouldFilter?: boolean;
    label?: string;
    children?: React.ReactNode;
  }

  export interface CommandInputProps extends Omit<HTMLAttributes<HTMLInputElement>, 'type' | 'onChange' | 'value'> {
    value?: string;
    onValueChange?: (value: string) => void;
  }

  export interface CommandListProps extends HTMLAttributes<HTMLDivElement> {
    children?: React.ReactNode;
  }

  export interface CommandGroupProps extends HTMLAttributes<HTMLDivElement> {
    heading?: React.ReactNode;
    children?: React.ReactNode;
  }

  export interface CommandItemProps extends HTMLAttributes<HTMLDivElement> {
    value?: string;
    onSelect?: (value: string) => void;
    disabled?: boolean;
    children?: React.ReactNode;
  }

  export const Command: ComponentType<CommandProps> & {
    Input: ComponentType<CommandInputProps>;
    List: ComponentType<CommandListProps>;
    Empty: ComponentType<HTMLAttributes<HTMLDivElement>>;
    Group: ComponentType<CommandGroupProps>;
    Item: ComponentType<CommandItemProps>;
    Separator: ComponentType<HTMLAttributes<HTMLDivElement>>;
  };
}

// Augment @storybook/react types for React 19 compatibility
declare module '@storybook/react' {
  import type { ComponentType } from 'react';

  export interface StoryContext<TArgs = any> {
    args: TArgs;
    argTypes: any;
    globals: any;
    hooks: any;
    parameters: any;
    viewMode: 'story' | 'docs';
    loaded: any;
    abortSignal: AbortSignal;
    canvasElement: HTMLElement;
    id: string;
    kind: string;
    name: string;
    story: string;
  }

  export interface StoryFn<TArgs = any> {
    (args: TArgs, context: StoryContext<TArgs>): React.ReactNode;
  }

  export type StoryObj<T = any> = {
    args?: Partial<T>;
    argTypes?: any;
    parameters?: any;
    decorators?: any[];
    render?: StoryFn<T>;
    play?: (context: StoryContext<T>) => Promise<void> | void;
  };

  export type Meta<T = any> = {
    title?: string;
    component?: ComponentType<T>;
    subcomponents?: Record<string, ComponentType<any>>;
    argTypes?: any;
    args?: Partial<T>;
    parameters?: any;
    decorators?: any[];
    tags?: string[];
  };
}

// Lodash type declarations
declare module 'lodash/debounce' {
  function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait?: number,
    options?: {
      leading?: boolean;
      maxWait?: number;
      trailing?: boolean;
    }
  ): T & { cancel(): void; flush(): void };
  export = debounce;
}

// Extend React namespace to handle additional types in ReactNode for React 19
declare namespace React {
  type ReactNode =
    | ReactElement
    | string
    | number
    | bigint
    | boolean
    | null
    | undefined
    | Iterable<ReactNode>
    | Promise<ReactNode>;
}

// Lodash types
declare module 'lodash/debounce' {
  function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait?: number,
    options?: {
      leading?: boolean;
      maxWait?: number;
      trailing?: boolean;
    }
  ): T & { cancel(): void; flush(): void };
  export = debounce;
}

// MSW types (Mock Service Worker)
declare module 'msw' {
  export const http: any;
  export const HttpResponse: any;
  export const rest: any;
  export const response: any;
  export const setupWorker: any;
}

// React-Redux types
declare module 'react-redux' {
  export type TypedUseSelectorHook<TState> = <TSelected>(
    selector: (state: TState) => TSelected,
    equalityFn?: (left: TSelected, right: TSelected) => boolean
  ) => TSelected;
  export const useDispatch: any;
  export const useSelector: any;
  export const Provider: any;
}

// JQuery types for legacy code
declare namespace JQuery {
  interface AjaxSettings {}
  interface Promise<T> {}
}

declare type JQuery<TElement = HTMLElement> = any;
