import { Constructor, isConstructor } from './constructor.mjs'
import { InjectionToken, isInjectionToken } from '../token.mjs'

export type ServiceIdentifier<T = unknown> = Constructor<T> | InjectionToken<T>

export function isServiceIdentifier<T>(value: any): value is ServiceIdentifier<T> {
  return isConstructor(value) || isInjectionToken(value)
}


