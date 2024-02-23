import {isLazy, Lazy} from '../lazy.js';
import {isRef, Ref} from '../ref.js';
import {isNormalToken, Token} from '../token.js';
import {Constructor, isConstructor} from './constructor.js';

export type ServiceIdentifier<T = unknown> = string | symbol | Token<T> | Constructor<T> | Ref<T> | Lazy<T>;

export function isServiceIdentifier<T>(value: any): value is ServiceIdentifier<T> {
  return isNormalToken(value) || isConstructor(value) || isRef(value) || value instanceof Lazy;
}

export function serviceIdentifierName(serviceIdentifier: ServiceIdentifier): string {
  if (isRef(serviceIdentifier)) {
    return `ref(${serviceIdentifier.name()})`;
  }
  if (isLazy(serviceIdentifier)) {
    return `lazy(${serviceIdentifier.name()})`;
  }
  if (serviceIdentifier instanceof Token) {
    return `Token('${serviceIdentifier.toString()}')`;
  }
  if (isConstructor(serviceIdentifier)) {
    return serviceIdentifier.name;
  }
  return serviceIdentifier.toString();
}
