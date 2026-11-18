/// <reference types="@rsbuild/core/types" />

declare interface ImportMetaEnv {
  readonly PUBLIC_BASE_PATH?: string;
  readonly PUBLIC_BASE_URL?: string;
}

declare interface ImportMeta {
  readonly env: ImportMetaEnv;
}
