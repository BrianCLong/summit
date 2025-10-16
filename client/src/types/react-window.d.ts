declare module 'react-window' {
  import * as React from 'react';
  export interface ListChildComponentProps<T = any> {
    index: number;
    style: React.CSSProperties;
    data: T;
    isScrolling?: boolean;
    isVisible?: boolean;
    key?: string;
    parent?: any;
  }
  export interface FixedSizeListProps<T = any> {
    height: number;
    width?: number | string;
    itemCount: number;
    itemSize: number;
    itemData?: T;
    overscanCount?: number;
    children: (props: ListChildComponentProps<T>) => React.ReactNode;
  }
  export class FixedSizeList<T = any> extends React.Component<FixedSizeListProps<T>> {}
  export { FixedSizeList as List };
}
