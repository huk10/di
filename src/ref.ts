import {Constructor} from './types/constructor.js';

export class Ref<T> {
  constructor(private forwardRef: () => Constructor<T>) {}

  value(): Constructor<T> {
    return this.forwardRef();
  }
  name() {
    return this.forwardRef().name;
  }
}

// 解决 reflect-metadata 在出现循环依赖时拿不到具体类型的问题。
// https://github.com/rbuckton/reflect-metadata/issues/135
export function ref<T>(forwardRef: () => Constructor<T>): Ref<T> {
  return new Ref(forwardRef);
}

export function isRef<T>(value: any): value is Ref<T> {
  return value instanceof Ref;
}
