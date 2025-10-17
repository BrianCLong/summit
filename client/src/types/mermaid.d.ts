declare module 'mermaid' {
  const mermaid: {
    initialize: (config: any) => void;
    run: (options?: any) => void;
  };
  export default mermaid;
}
