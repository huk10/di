// @ts-ignore
export class Token<T> {
  constructor(private description: string) {}

  // 仅用于打印错误。
  toString() {
    return `${this.description}`;
  }
}

export type NormalToken<T = unknown> = Token<T> | string | symbol;

export function isNormalToken<T>(value: any): value is Token<T> {
  return value instanceof Token || ['string', 'symbol'].includes(typeof value);
}
