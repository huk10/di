export class Token<T> {
  constructor(private description: string) {}

  // 仅用于打印错误。
  toString() {
    return `${this.description}`
  }
}

export type InjectionToken<T = unknown> = Token<T> | string | symbol;

export function isInjectionToken<T>(value: any): value is Token<T> {
  return value instanceof Token || ['string', 'symbol'].includes(typeof value)
}
