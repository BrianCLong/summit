// Type declarations for modules without types

declare module 'framer-motion' {
  export interface AnimationProps {
    initial?: any;
    animate?: any;
    exit?: any;
    transition?: any;
    whileHover?: any;
    whileTap?: any;
    variants?: any;
  }
  
  export interface MotionProps extends AnimationProps {
    children?: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    [key: string]: any;
  }

  export const motion: {
    div: React.ComponentType<MotionProps>;
    span: React.ComponentType<MotionProps>;
    button: React.ComponentType<MotionProps>;
    [key: string]: React.ComponentType<MotionProps>;
  };

  export const AnimatePresence: React.ComponentType<{
    children?: React.ReactNode;
    exitBeforeEnter?: boolean;
    initial?: boolean;
    onExitComplete?: () => void;
    mode?: 'wait' | 'sync' | 'popLayout';
  }>;
}

declare module 'dompurify' {
  interface Config {
    ALLOWED_TAGS?: string[];
    ALLOWED_ATTR?: string[];
    FORBID_TAGS?: string[];
    FORBID_ATTR?: string[];
    ALLOW_DATA_ATTR?: boolean;
    [key: string]: any;
  }

  interface DOMPurify {
    sanitize(dirty: string, config?: Config): string;
    sanitize(dirty: DocumentFragment, config?: Config): DocumentFragment;
    addHook(entryPoint: string, hookFunction: (currentNode?: Element, data?: any) => void): void;
    removeHook(entryPoint: string): void;
    removeHooks(entryPoint: string): void;
    removeAllHooks(): void;
    isValidAttribute(tag: string, attr: string, value: string): boolean;
  }

  const DOMPurify: DOMPurify;
  export default DOMPurify;
}

declare module 'react-bootstrap' {
  import * as React from 'react';
  
  export interface AlertProps {
    variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark';
    dismissible?: boolean;
    show?: boolean;
    onClose?: () => void;
    children?: React.ReactNode;
  }
  
  export const Alert: React.ComponentType<AlertProps>;
  
  export interface ButtonProps {
    variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark' | 'link' | 'outline-primary' | 'outline-secondary';
    size?: 'sm' | 'lg';
    disabled?: boolean;
    onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
    children?: React.ReactNode;
    type?: 'button' | 'submit' | 'reset';
  }
  
  export const Button: React.ComponentType<ButtonProps>;
  
  export interface CardProps {
    children?: React.ReactNode;
    className?: string;
  }
  
  export const Card: React.ComponentType<CardProps> & {
    Body: React.ComponentType<{ children?: React.ReactNode; className?: string }>;
    Header: React.ComponentType<{ children?: React.ReactNode; className?: string }>;
    Title: React.ComponentType<{ children?: React.ReactNode; className?: string }>;
  };
}

declare module 'react-bootstrap-icons' {
  import * as React from 'react';
  
  interface IconProps {
    size?: number | string;
    color?: string;
    className?: string;
  }
  
  export const CheckCircle: React.ComponentType<IconProps>;
  export const XCircle: React.ComponentType<IconProps>;
  export const InfoCircle: React.ComponentType<IconProps>;
  export const ExclamationTriangle: React.ComponentType<IconProps>;
  export const ChevronDown: React.ComponentType<IconProps>;
  export const ChevronRight: React.ComponentType<IconProps>;
  export const Search: React.ComponentType<IconProps>;
  export const Filter: React.ComponentType<IconProps>;
  export const Download: React.ComponentType<IconProps>;
  export const Upload: React.ComponentType<IconProps>;
  export const Trash: React.ComponentType<IconProps>;
  export const Edit: React.ComponentType<IconProps>;
  export const Plus: React.ComponentType<IconProps>;
  export const Minus: React.ComponentType<IconProps>;
  // Add more icons as needed
  [key: string]: React.ComponentType<IconProps>;
}

declare module '@/components/ui/button' {
  import * as React from 'react';
  
  export interface ButtonProps {
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    asChild?: boolean;
    children?: React.ReactNode;
    className?: string;
    disabled?: boolean;
    onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  }
  
  export const Button: React.ComponentType<ButtonProps>;
}

declare module '@/components/ui/card' {
  import * as React from 'react';
  
  export interface CardProps {
    className?: string;
    children?: React.ReactNode;
  }
  
  export const Card: React.ComponentType<CardProps>;
  export const CardHeader: React.ComponentType<CardProps>;
  export const CardFooter: React.ComponentType<CardProps>;
  export const CardTitle: React.ComponentType<CardProps>;
  export const CardDescription: React.ComponentType<CardProps>;
  export const CardContent: React.ComponentType<CardProps>;
}

declare module '@/components/ui/input' {
  import * as React from 'react';
  
  export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    className?: string;
  }
  
  export const Input: React.ComponentType<InputProps>;
}

declare module '@/components/ui/label' {
  import * as React from 'react';
  
  export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
    className?: string;
  }
  
  export const Label: React.ComponentType<LabelProps>;
}

declare module '@/components/ui/slider' {
  import * as React from 'react';
  
  export interface SliderProps {
    value?: number[];
    defaultValue?: number[];
    onValueChange?: (value: number[]) => void;
    max?: number;
    min?: number;
    step?: number;
    className?: string;
  }
  
  export const Slider: React.ComponentType<SliderProps>;
}

declare module '@/components/ui/switch' {
  import * as React from 'react';
  
  export interface SwitchProps {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    disabled?: boolean;
    className?: string;
  }
  
  export const Switch: React.ComponentType<SwitchProps>;
}

declare module '@/components/ui/tabs' {
  import * as React from 'react';
  
  export interface TabsProps {
    value?: string;
    defaultValue?: string;
    onValueChange?: (value: string) => void;
    className?: string;
    children?: React.ReactNode;
  }
  
  export const Tabs: React.ComponentType<TabsProps>;
  export const TabsList: React.ComponentType<{ className?: string; children?: React.ReactNode }>;
  export const TabsTrigger: React.ComponentType<{ value: string; className?: string; children?: React.ReactNode }>;
  export const TabsContent: React.ComponentType<{ value: string; className?: string; children?: React.ReactNode }>;
}

declare module '@/components/ui/separator' {
  import * as React from 'react';
  
  export interface SeparatorProps {
    orientation?: 'horizontal' | 'vertical';
    className?: string;
  }
  
  export const Separator: React.ComponentType<SeparatorProps>;
}

declare module '@/components/ui/popover' {
  import * as React from 'react';
  
  export interface PopoverProps {
    children?: React.ReactNode;
  }
  
  export const Popover: React.ComponentType<PopoverProps>;
  export const PopoverTrigger: React.ComponentType<{ asChild?: boolean; children?: React.ReactNode }>;
  export const PopoverContent: React.ComponentType<{ className?: string; children?: React.ReactNode }>;
}

declare module '@/components/ui/select' {
  import * as React from 'react';
  
  export interface SelectProps {
    value?: string;
    defaultValue?: string;
    onValueChange?: (value: string) => void;
    disabled?: boolean;
    children?: React.ReactNode;
  }
  
  export const Select: React.ComponentType<SelectProps>;
  export const SelectContent: React.ComponentType<{ children?: React.ReactNode }>;
  export const SelectItem: React.ComponentType<{ value: string; children?: React.ReactNode }>;
  export const SelectTrigger: React.ComponentType<{ className?: string; children?: React.ReactNode }>;
  export const SelectValue: React.ComponentType<{ placeholder?: string }>;
}

declare module '@/components/ui/alert' {
  import * as React from 'react';
  
  export interface AlertProps {
    variant?: 'default' | 'destructive';
    className?: string;
    children?: React.ReactNode;
  }
  
  export const Alert: React.ComponentType<AlertProps>;
  export const AlertDescription: React.ComponentType<{ children?: React.ReactNode }>;
  export const AlertTitle: React.ComponentType<{ children?: React.ReactNode }>;
}

declare module '@/components/ui/progress' {
  import * as React from 'react';
  
  export interface ProgressProps {
    value?: number;
    className?: string;
  }
  
  export const Progress: React.ComponentType<ProgressProps>;
}

declare module '@/components/ui/badge' {
  import * as React from 'react';
  
  export interface BadgeProps {
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
    className?: string;
    children?: React.ReactNode;
  }
  
  export const Badge: React.ComponentType<BadgeProps>;
}

declare module '@deck.gl/react' {
  import * as React from 'react';
  
  export interface DeckGLProps {
    viewState?: any;
    controller?: any;
    layers?: any[];
    onViewStateChange?: (info: any) => void;
    children?: React.ReactNode;
  }
  
  export const DeckGL: React.ComponentType<DeckGLProps>;
}

declare module '@deck.gl/layers' {
  export class ScatterplotLayer {
    constructor(props: any);
  }
  
  export class LineLayer {
    constructor(props: any);
  }
  
  export class ArcLayer {
    constructor(props: any);
  }
}

declare module 'react-map-gl' {
  import * as React from 'react';
  
  export interface MapProps {
    mapStyle?: string;
    width?: number | string;
    height?: number | string;
    latitude?: number;
    longitude?: number;
    zoom?: number;
    onViewportChange?: (viewport: any) => void;
    children?: React.ReactNode;
  }
  
  export const Map: React.ComponentType<MapProps>;
  export default Map;
}

declare module 'maplibre-gl' {
  export class Map {
    constructor(options: any);
    on(event: string, handler: (...args: any[]) => void): this;
    off(event: string, handler?: (...args: any[]) => void): this;
    addSource(id: string, source: any): this;
    addLayer(layer: any): this;
    removeLayer(id: string): this;
    removeSource(id: string): this;
    setLayoutProperty(layerId: string, name: string, value: any): this;
    setPaintProperty(layerId: string, name: string, value: any): this;
    fitBounds(bounds: any, options?: any): this;
    flyTo(options: any): this;
    getCanvas(): HTMLCanvasElement;
    getContainer(): HTMLElement;
    getBounds(): any;
    getCenter(): any;
    getZoom(): number;
    resize(): this;
    remove(): void;
  }
  
  export interface MapboxOptions {
    container: string | HTMLElement;
    style?: string;
    center?: [number, number];
    zoom?: number;
    bearing?: number;
    pitch?: number;
    [key: string]: any;
  }
}