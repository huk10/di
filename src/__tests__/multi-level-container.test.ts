import {beforeEach, describe, expect, test} from 'vitest';
import {container} from '../container.js';
import {Injectable} from '../decorators/injectable.js';
import {Token} from '../token.js';

beforeEach(() => container.reset());

// 多层级容器测试场景。
// 1. 子容器和访问父容器的注册表。如果某个 class 的生命周期是 skipContainer 则子容器还能获取父容器的实例。
// 2. 父容器无法获取子容器的实例和注册表。
// 3. 父容器销毁（dispose）时，子容器将无法访问父容器的注册表和实例，并且不会报错。
// 4. 父容器销毁（dispose）时，不会触发子容器的 dispose 方法。同样子容器也不会触发父容器的。
// 5. 【是否合理?】具有 skipContainer 生命周期的实例，可以从子容器获取，但是父容器 dispose 了就无法获取了。并且子容器销毁（dispose）不会触发其 dispose 方法。

describe('child container', () => {
  test('case1: Get singleton', () => {
    @Injectable()
    class Bar {}

    const child = container.createChildContainer();
    const instance = container.resolve(Bar);
    expect(instance).toBeInstanceOf(Bar);
    expect(child.resolve(Bar)).toStrictEqual(instance);
  });
  test('case2: Get the providers in the parent container', () => {
    const token = new Token('XXX_URL');
    const provider = {useValue: 'https://xxx.xxx.xxx.com'};

    container.register(token, provider);
    const child = container.createChildContainer();

    expect(child.resolve(token)).toBe(provider.useValue);
    expect(container.resolve(token)).toBe(provider.useValue);
  });
  // 父容器无法获取子容器注册的 provider。
  test('case3: Get the providers in this container', () => {
    const token = new Token('XXX_URL');
    const provider = {useValue: 'https://xxx.xxx.xxx.com'};

    const child = container.createChildContainer();
    child.register(token, provider);

    expect(child.resolve(token)).toBe(provider.useValue);
    expect(() => container.resolve(token)).toThrowError(
      `Attempted to resolve unregistered dependency token: "${token.toString()}"`
    );
  });
  test('case4: Unable to get providers in sibling container', () => {
    const token = new Token('XXX_URL');
    const provider = {useValue: 'https://xxx.xxx.xxx.com'};

    const child1 = container.createChildContainer();
    const child2 = container.createChildContainer();

    child1.register(token, provider);

    expect(child1.resolve(token)).toBe(provider.useValue);
    expect(() => child2.resolve(token)).toThrowError(
      `Attempted to resolve unregistered dependency token: "${token.toString()}"`
    );
  });
});
