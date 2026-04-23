declare module 'imagemin-jpegtran' {
  const plugin: (options?: unknown) => (input: Uint8Array) => Promise<Uint8Array>
  export default plugin
}

declare module 'imagemin-svgo' {
  const plugin: (options?: unknown) => (input: Uint8Array) => Promise<Uint8Array>
  export default plugin
}
