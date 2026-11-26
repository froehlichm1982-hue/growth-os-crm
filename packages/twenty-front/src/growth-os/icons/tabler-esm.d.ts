// The DS icon shim re-exports the upstream ESM build directly (the bare
// specifier is aliased to the shim in vite.config.ts).
declare module '@tabler/icons-react/dist/esm/tabler-icons-react.mjs' {
  export * from '@tabler/icons-react';
}
