/// <reference types="@rsbuild/core/types" />

declare interface ImportMetaEnv {
  readonly PUBLIC_BASE_PATH?: string;
}

declare interface ImportMeta {
  readonly env: ImportMetaEnv;
}
