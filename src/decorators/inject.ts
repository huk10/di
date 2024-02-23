import { InjectionToken, isInjectionToken } from '../token.mjs'
import { ServiceProvider } from '../provider.mjs'
import { PARAM_METADATA_KEY, PROPERTY_METADATA_KEY } from '../constant.mjs'
import { Constructor, isConstructor } from '../types/constructor.mjs'

// 用于属性注入和构造函数参数注入使用。
// 1. 构造函数参数注入 被 @injectable 标记的class时，无需使用此装饰器。
// 2. 使用属性注入时，必须使用此装饰器。
export function inject(token?: InjectionToken | Constructor<unknown>): Function
export function inject<T>(token?: InjectionToken<T> | Constructor<T>): PropertyDecorator
export function inject<T>(token?: InjectionToken<T> | Constructor<T>): ParameterDecorator
export function inject<T>(token?: InjectionToken<T> | Constructor<T>): PropertyDecorator | ParameterDecorator {
  return function(target: any, propertyKey: string | symbol, parameterIndex?: number) {
    const tokenIsConstructor = token && isConstructor(token)

    if (token && !isInjectionToken(token) && !tokenIsConstructor) {
      throw new Error("the token is valid injection token")
    }

    if (typeof parameterIndex !== 'number') {
      const metadata = Reflect.getOwnMetadata(PROPERTY_METADATA_KEY, target) || {} as Record<string, ServiceProvider>
      if (token) {
        metadata[propertyKey] = tokenIsConstructor ? {useClass: token} : {useToken: token}
        Reflect.defineMetadata(PROPERTY_METADATA_KEY, metadata, target.constructor)
        return
      }
      const constructor = Reflect.getMetadata("design:type", target, propertyKey)
      metadata[propertyKey] = {useClass: constructor}
      Reflect.defineMetadata(PROPERTY_METADATA_KEY, metadata, target.constructor)
      return
    }

    const metadata = Reflect.getOwnMetadata(PARAM_METADATA_KEY, target) || {} as Record<string, ServiceProvider>
    if (token) {
      metadata[parameterIndex.toString()] = tokenIsConstructor ? {useClass: token} : {useToken: token}
      Reflect.defineMetadata(PARAM_METADATA_KEY, metadata, target)
      return
    }
    const paramTypes = Reflect.getMetadata("design:paramtypes", target)
    metadata[parameterIndex.toString()] = {useClass: paramTypes[parameterIndex]}
    Reflect.defineMetadata(PARAM_METADATA_KEY, metadata, target)
  }
}
