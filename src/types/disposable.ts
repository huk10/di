export interface Disposable {
  dispose(): Promise<void> | void;
}

export function isDisposable(instance: any): instance is Disposable {
  if (typeof (instance as Disposable).dispose !== 'function') {
    return false;
  }
  // 是否具有多个参数。
  if ((instance as Disposable).dispose.length > 0) {
    return false;
  }
  return true;
}

export function isPromise<T>(obj: any): obj is Promise<T> {
  const types = typeof obj;
  return !!obj && ['object', 'function'].includes(types) && typeof obj.then === 'function';
}
