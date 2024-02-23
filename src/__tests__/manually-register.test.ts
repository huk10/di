import {beforeEach, describe, expect, test} from 'vitest';
import {container} from '../container.js';
import {Injectable} from '../decorators/injectable.js';
import {ref} from '../index.js';
import {Token} from '../token.js';

beforeEach(() => container.reset());

// 纯手动注册场景。
// 1. 使用（字符串、symbol、Token）注册一个 provider (支持的4中provider) 并 resolve 。
// 2. 使用 class 或者 ref 和 lazy 包裹的 class 作为 Token 注册一个 provider 时。并对这个 class 使用 @Injectable。
//  2.1 如果 provider 不是这个 class 的话，任何位置使用 class 作为 Token 时 resolve 时都以注册的 provider 优先。也就是覆盖了 @Injectable
// 2.2 如果没传 provider 参数，或者 provider 参数是 class provider 并且 useClass 是其本身的话。与 @Injectable 一致。(需要处理循环依赖问题)
// 2.3 如果 class 没有使用 @Injectable 也是如此逻辑。

describe('original type', () => {
  test('normal token', () => {
    const token1 = 'token1';
    const token2 = Symbol('token2');
    const token3 = new Token('token3');
    class Bar {}
    container.register(token1, {useValue: 1});
    container.register(token2, {useFactory: () => 2});
    container.register(token3, {useToken: 'token1'});
    container.register(Bar);

    expect(container.resolve(token1)).toEqual(1);
    expect(container.resolve(token2)).toEqual(2);
    expect(container.resolve(token3)).toEqual(1);
    expect(container.resolve(Bar)).toBeInstanceOf(Bar);
  });

  test('class register provider', () => {
    @Injectable()
    class Bar {}
    expect(container.resolve(Bar)).toBeInstanceOf(Bar);
    container.register(Bar, {useValue: 1});
    expect(container.resolve(Bar)).toEqual(1);
  });

  test('register class', () => {
    class Bar {}
    class Foo {}
    container.register(Bar);
    container.register(Foo, Foo);
    expect(container.resolve(Bar)).toBeInstanceOf(Bar);
    expect(container.resolve(Foo)).toBeInstanceOf(Foo);
  });

  test('class register other class provider', () => {
    class Bar {}
    class Foo {}
    container.register(Bar, {useClass: Foo});
    expect(container.resolve(Bar)).toBeInstanceOf(Foo);
  });

  test('resolve error params', () => {
    expect(() => container.resolve({} as any)).toThrowError(`unrecognized service identifier [object Object]`);
  });
});
