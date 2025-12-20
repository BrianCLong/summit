/**
 * MUI v7 Grid backwards compatibility patch for React 19
 * MUI v7 deprecated Grid in favor of Grid2, but codebase still uses Grid with `item` prop
 */

import '@mui/material';

declare module '@mui/material/Grid' {
  export interface GridOwnProps {
    /**
     * @deprecated Use Grid2 instead. Grid will be removed in MUI v8.
     * If true, the component will have the flex item behavior.
     */
    item?: boolean;
    /**
     * @deprecated Use Grid2 instead. Grid will be removed in MUI v8.
     * If true, the component will have the flex container behavior.
     */
    container?: boolean;
    /**
     * @deprecated Use Grid2 instead. Grid will be removed in MUI v8.
     * Defines the number of grids the component is going to use.
     */
    xs?: boolean | 'auto' | number;
    /**
     * @deprecated Use Grid2 instead. Grid will be removed in MUI v8.
     * Defines the number of grids the component is going to use.
     */
    sm?: boolean | 'auto' | number;
    /**
     * @deprecated Use Grid2 instead. Grid will be removed in MUI v8.
     * Defines the number of grids the component is going to use.
     */
    md?: boolean | 'auto' | number;
    /**
     * @deprecated Use Grid2 instead. Grid will be removed in MUI v8.
     * Defines the number of grids the component is going to use.
     */
    lg?: boolean | 'auto' | number;
    /**
     * @deprecated Use Grid2 instead. Grid will be removed in MUI v8.
     * Defines the number of grids the component is going to use.
     */
    xl?: boolean | 'auto' | number;
    /**
     * @deprecated Use Grid2 instead. Grid will be removed in MUI v8.
     * Defines the space between the type `item` component.
     */
    spacing?: number | string;
    /**
     * @deprecated Use Grid2 instead. Grid will be removed in MUI v8.
     * Defines the horizontal space between the type `item` components.
     */
    columnSpacing?: number | string;
    /**
     * @deprecated Use Grid2 instead. Grid will be removed in MUI v8.
     * Defines the vertical space between the type `item` components.
     */
    rowSpacing?: number | string;
    /**
     * @deprecated Use Grid2 instead. Grid will be removed in MUI v8.
     * If provided, it will change the component orientation.
     */
    direction?: 'row' | 'row-reverse' | 'column' | 'column-reverse';
    /**
     * @deprecated Use Grid2 instead. Grid will be removed in MUI v8.
     * Defines the `flex-wrap` style property.
     */
    wrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
    /**
     * @deprecated Use Grid2 instead. Grid will be removed in MUI v8.
     * Defines the `align-items` style property.
     */
    alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch' | 'baseline';
    /**
     * @deprecated Use Grid2 instead. Grid will be removed in MUI v8.
     * Defines the `align-content` style property.
     */
    alignContent?: 'stretch' | 'center' | 'flex-start' | 'flex-end' | 'space-between' | 'space-around';
    /**
     * @deprecated Use Grid2 instead. Grid will be removed in MUI v8.
     * Defines the `justify-content` style property.
     */
    justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
  }
}
