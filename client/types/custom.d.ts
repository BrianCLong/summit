import '@mui/material';

declare module '@mui/material' {
  interface GridProps {
    [key: string]: any;
  }
  interface GridBaseProps {
    [key: string]: any;
  }
  interface GridOwnProps {
    [key: string]: any;
  }
}

declare module '@mui/material/Grid' {
  import { GridProps } from '@mui/material';
  const Grid: React.FC<GridProps>;
  export { GridProps };
  export default Grid;
}
