import {Constructor} from './types/constructor.js';
import {ServiceIdentifier} from './types/identifier.js';

export const PARAM_METADATA_KEY = Symbol('di:parameters');
export const PROPERTY_METADATA_KEY = Symbol('di:properties');

// 获取构造函数的参数信息。
export function getParamInfo(target: Constructor<unknown>): ServiceIdentifier<unknown>[] {
  const paramTypes = Reflect.getMetadata('design:paramtypes', target) || [];
  const metadata: Record<string, ServiceIdentifier<any>> = Reflect.getOwnMetadata(PARAM_METADATA_KEY, target) || {};
  for (let [key, value] of Object.entries(metadata)) {
    paramTypes[+key] = value;
  }
  return paramTypes;
}

// inject 使用时可以传入 token 参数也可以不传。不传就使用 metadata 上的信息。
// 但是 get 方法会使用默认值，这里可以只设置传了 token 参数的场景。
export function setParamInfo(
  target: Constructor<unknown>,
  parameterIndex: number,
  token?: ServiceIdentifier<unknown>
): void {
  const paramTypes = Reflect.getMetadata('design:paramtypes', target) || [];
  const metadata: Record<string, ServiceIdentifier<any>> = Reflect.getOwnMetadata(PARAM_METADATA_KEY, target) || {};
  // 如果出现模块循环依赖，这里获取到的类型会是：[Function: Object]
  metadata[parameterIndex.toString()] = token || paramTypes[parameterIndex];
  Reflect.defineMetadata(PARAM_METADATA_KEY, metadata, target);
}

// 获取属性注入信息
export function getPropertyInfo(target: Constructor<unknown>): Record<string, ServiceIdentifier<unknown>> | null {
  return Reflect.getOwnMetadata(PROPERTY_METADATA_KEY, target) || null;
}

// inject 使用时可以传入 token 参数也可以不传。不传就使用 metadata 上的信息。
export function setPropertyInfo(
  target: Object,
  propertyKey: string | symbol,
  token?: ServiceIdentifier<unknown>
): void {
  const metadata: Record<string, ServiceIdentifier<any>> = Reflect.getOwnMetadata(PROPERTY_METADATA_KEY, target) || {};
  // 如果出现模块循环依赖，这里获取到的类型会是：[Function: Object]
  metadata[propertyKey.toString()] = token || Reflect.getMetadata('design:type', target, propertyKey);
  Reflect.defineMetadata(PROPERTY_METADATA_KEY, metadata, target.constructor);
}
