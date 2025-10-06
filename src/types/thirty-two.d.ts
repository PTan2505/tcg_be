declare module 'thirty-two' {
  export function encode(buffer: Buffer): Buffer;
  export function decode(str: string): Buffer;
}