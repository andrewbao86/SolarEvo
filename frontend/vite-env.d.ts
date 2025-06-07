/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_ENDPOINT: string
  readonly VITE_API_KEY: string
  readonly AWS_REGION: string
  readonly MODE: string
  readonly DEV: boolean
  readonly PROD: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Global Amplify configuration (injected at build time)
declare global {
  interface Window {
    __AMPLIFY_CONFIG__?: {
      VITE_API_ENDPOINT: string;
      VITE_API_KEY: string;
      AWS_REGION: string;
    };
    __RUNTIME_CONFIG__?: any;
    BackendServiceV2?: any;
  }
} 