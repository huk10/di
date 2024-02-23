export { container } from "./container.mjs"
export { inject } from './decorators/inject.mjs'
export type { ServiceProvider } from "./provider.mjs"
export { Token } from './token.mjs';
export type { InjectionToken } from './token.mjs';
export { injectable } from './decorators/injectable.mjs';
export type { InjectableOption } from './decorators/injectable.mjs';
export type { ServiceIdentifier } from "./types/identifier.mjs";
export type { Constructor } from "./types/constructor.mjs";
export type {Disposable} from './types/disposable.mjs'

/**
 * - 如果 class 构造函数没有必须的参数，并且没有属性注入，则可以不需要 @injectable 装饰即可注入。
 * - 如果一个 class 没有被 @injectable 装饰，构造函数也没有必须的参数，则可以被 resolve 出来。此时无法知道是否有进行属性注入，会忽略属性注入。
 * -
 *
 *
 *
 *
 * value provider 支持任何不为undefined的JavaScript 数据类型
 *
 *
 */
