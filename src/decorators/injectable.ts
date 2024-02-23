import { typeInfo } from '../container.mjs'
import { Constructor } from '../types/constructor.mjs'
import { PARAM_METADATA_KEY, PROPERTY_METADATA_KEY } from '../constant.mjs'

export interface InjectableOption {
  singleton: boolean
}

/**
 * 标记一个 class 表示它是可以依赖注入的。
 * @param {InjectableOption} option
 * @return {ClassDecorator}
 */
export function injectable<T>(option: InjectableOption = {singleton: true}): ClassDecorator {
  return function(target) {

    const paramTypes = Reflect.getMetadata("design:paramtypes", target)

    console.log( target, paramTypes)
    typeInfo.set(target as unknown as Constructor<T>, {
      singleton: option.singleton,
      type: target as unknown as Constructor<T>,
      params: Reflect.getOwnMetadata(PARAM_METADATA_KEY, target) || paramTypes?.map((val: any) => ({useClass: val})) || null,
      property: Reflect.getOwnMetadata(PROPERTY_METADATA_KEY, target) || null,
    })
  }
}
