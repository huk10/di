import {beforeEach, describe, expect, test} from 'vitest';
import {container} from '../container.js';
import {Injectable} from '../decorators/injectable.js';
import {Lifecycle} from '../lifecycle.js';
import {Disposable} from '../types/disposable.js';

beforeEach(() => container.reset());

// dispose 测试场景。
// 1. 如果 dispose 方法不符合接口类型，则会忽略。(如果不是一个方法，存在必传参数)
// 2. 只会调用当前容器内绑定的 dispose 方法。
// 3. dispose 返回一个 promise ，在所有实例的 dispose 方法执行完毕后 resolve
// 4. 任何实例的 dispose 方法如果抛出错误，则忽略并吞掉这个错误继续执行。
// 5. disposable 接口只应用在 class 上。

describe('disposable', () => {
  test('No method can be used after disposed', async () => {
    const err = 'This container has been disposed, you cannot interact with a disposed container';
    const cont = container.createChildContainer();
    await cont.dispose();
    expect(() => cont.createChildContainer()).toThrowError(err);
    expect(() => cont.isRegistered('1')).toThrowError(err);
    expect(() => cont.resolve('1')).toThrowError(err);
    expect(() => cont.register('1', {useValue: 1})).toThrowError(err);
  });

  test('Call the `dispose` method of all instances with the `dispose` method', async () => {
    @Injectable(Lifecycle.container)
    class Bar implements Disposable {
      disposed = false;
      dispose(): Promise<void> | void {
        this.disposed = true;
      }
    }

    @Injectable(Lifecycle.container)
    class Bzz implements Disposable {
      disposed = false;
      dispose(): Promise<void> | void {
        this.disposed = true;
      }
    }

    // 实例初始化的惰性的。需要先 resolve 才会初始化第一个单例。
    const instance1 = container.resolve(Bar);
    const instance2 = container.resolve(Bzz);
    await container.dispose();
    expect(instance1.disposed).toBeTruthy();
    expect(instance2.disposed).toBeTruthy();
  });

  test('The `dispose` method is asynchronous', async () => {
    @Injectable(Lifecycle.container)
    class Bar implements Disposable {
      dispose(): Promise<void> | void {}
    }

    container.resolve(Bar);
    await expect(container.dispose()).resolves.toBeUndefined();
  });

  test('The interface is not implemented correctly', async () => {
    @Injectable(Lifecycle.container)
    class Bar {
      disposed = false;
      dispose(a: string) {
        this.disposed = true;
      }
    }

    const instance = container.resolve(Bar);
    await expect(container.dispose());
    expect(instance.disposed).toBeFalsy();
  });

  test('An error is reported by `dispose` method call', async () => {
    @Injectable(Lifecycle.container)
    class Bar implements Disposable {
      dispose(): Promise<void> | void {
        throw Error('call bar dispose method error');
      }
    }

    @Injectable(Lifecycle.container)
    class Foo {}

    @Injectable(Lifecycle.container)
    class Bzz implements Disposable {
      disposed = false;
      async dispose(): Promise<void> {
        this.disposed = true;
      }
    }

    container.resolve(Bar);
    container.resolve(Foo);
    const instance = container.resolve(Bzz);
    // 报错会被吞掉。
    await expect(container.dispose()).resolves.toBeUndefined();
    expect(instance.disposed).toBeTruthy();
  });
});
