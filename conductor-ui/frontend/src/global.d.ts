export {}; // ensure this file is a module

declare global {
  interface Window {
    __SYMPHONY_CFG__?: any;
  }
}

