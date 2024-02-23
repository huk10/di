import {setParamInfo, setPropertyInfo} from '../reflect-helper.js';
import {isServiceIdentifier, ServiceIdentifier} from '../types/identifier.js';

// 用于属性注入和构造函数参数注入使用。
// 1. 构造函数参数注入 被 @injectable 标记的class时，无需使用此装饰器。
// 2. 使用属性注入时，必须使用此装饰器。
// 3. 可以重复使用时，但是会存在覆盖。
// 4. 如果什么的类型是 any、unknown、undefined、string 等，不会报错，但是会在 resolve 时报错。
// 5. 传递 undefined 会忽略，null 会报错
export function Inject(token?: ServiceIdentifier<unknown>): Function;
export function Inject<T>(token?: ServiceIdentifier<T>): PropertyDecorator;
export function Inject<T>(token?: ServiceIdentifier<T>): ParameterDecorator;
export function Inject(token?: unknown): unknown {
  return function (target: any, propertyKey: string | symbol, parameterIndex?: number) {
    if (token !== undefined && !isServiceIdentifier(token)) throw new Error('The token is valid service identifier');
    if (typeof parameterIndex !== 'number') {
      setPropertyInfo(target, propertyKey, <ServiceIdentifier<unknown>>token);
    } else {
      setParamInfo(target, parameterIndex, <ServiceIdentifier<unknown>>token);
    }
  };
}
