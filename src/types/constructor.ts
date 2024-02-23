export type Constructor<T> = new (...args: any[]) => T;

export function isConstructor<T>(value: any): value is Constructor<T> {
  return typeof value === 'function'
}
