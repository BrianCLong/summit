declare module '*';

declare namespace NodeJS {
  interface ProcessEnv {
    [key: string]: string | undefined;
  }
}

declare var process: any;
declare var __dirname: string;
declare var __filename: string;

declare const describe: any;
declare const it: any;
declare const test: any;
declare const expect: any;
declare const beforeAll: any;
declare const beforeEach: any;
declare const afterAll: any;
declare const afterEach: any;
declare const jest: any;

declare namespace jest {
  interface Mock<T = any> {
    (...args: any[]): any;
    mockResolvedValue?: (...args: any[]) => any;
    mockRejectedValue?: (...args: any[]) => any;
    mockImplementation?: (...args: any[]) => any;
  }
}

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
  interface Element {}
  interface ElementClass {
    props: any;
  }
  interface ElementAttributesProperty {
    props: any;
  }
}

declare module 'react' {
  export type FC<P = any> = (props: P & { children?: any }) => any;
  export type ReactNode = any;
  export const Fragment: any;
  export function createElement(...args: any[]): any;
  export function useState<T = any>(initial?: T): [T, (value: T) => void];
  export function useEffect(...args: any[]): void;
  export function useMemo<T = any>(factory: () => T, deps?: any[]): T;
  export function useCallback<T extends (...args: any[]) => any>(fn: T, deps?: any[]): T;
  export function useRef<T = any>(value?: T): { current: T };
  export function useContext<T = any>(context: any): T;
  export function useReducer<T = any>(...args: any[]): any;
  const React: {
    createElement: typeof createElement;
    Fragment: typeof Fragment;
  };
  export default React;
}

declare module 'react/jsx-runtime' {
  export const jsx: any;
  export const jsxs: any;
  export const Fragment: any;
}

declare module 'react-dom' {
  export const render: any;
  export const createPortal: any;
  export const hydrate: any;
}

declare module 'react-router-dom' {
  export const BrowserRouter: any;
  export const MemoryRouter: any;
  export const Routes: any;
  export const Route: any;
  export const Link: any;
  export const useNavigate: any;
  export const useParams: any;
  export const useLocation: any;
  export const Outlet: any;
  export const Navigate: any;
}

declare module '@apollo/client' {
  export const gql: any;
  export const ApolloProvider: any;
  export const InMemoryCache: any;
  export const ApolloClient: any;
  export const HttpLink: any;
  export const split: any;
  export const getMainDefinition: any;
  export const useQuery: <T = any>(...args: any[]) => T;
  export const useLazyQuery: <T = any>(...args: any[]) => T;
  export const useMutation: <T = any>(...args: any[]) => T;
  export const ApolloError: any;
  export type TypedDocumentNode<TData = any, TVariables = any> = any;
}

declare module '@apollo/client/react' {
  export * from '@apollo/client';
}

declare module '@mui/material' {
  const components: any;
  export default components;
  export const styled: any;
  export const createTheme: any;
  export const ThemeProvider: any;
  export const useTheme: any;
  export const Box: any;
  export const Grid: any;
  export const Stack: any;
  export const Button: any;
  export const Typography: any;
  export const IconButton: any;
  export const TextField: any;
  export const Divider: any;
  export const AppBar: any;
  export const Toolbar: any;
  export const List: any;
  export const ListItem: any;
  export const ListItemText: any;
  export const ListItemButton: any;
  export const Drawer: any;
  export const Collapse: any;
  export const Alert: any;
  export const Chip: any;
  export const Popover: any;
  export const Tooltip: any;
}

declare module '@mui/icons-material/*' {
  const Component: any;
  export default Component;
}

declare module '@testing-library/react' {
  export const render: any;
  export const screen: any;
  export const fireEvent: any;
  export const act: any;
}

declare module '@testing-library/user-event' {
  const userEvent: any;
  export default userEvent;
}

declare module '@testing-library/jest-dom' {
  export function toBeInTheDocument(): void;
  export function toHaveTextContent(): void;
}

declare module '@testing-library/react-hooks' {
  export function renderHook<T = any>(fn: any): { result: { current: T } };
}

declare module '@testing-library/react-hooks/server' {
  export * from '@testing-library/react-hooks';
}

declare module 'msw' {
  export const rest: any;
  export const setupServer: any;
}

declare module '@reduxjs/toolkit' {
  export const configureStore: any;
  export const createSlice: any;
  export const createAsyncThunk: any;
}

declare module 'react-redux' {
  export const Provider: any;
  export const useDispatch: any;
  export const useSelector: any;
}

declare module '@faker-js/faker' {
  export const faker: any;
}
