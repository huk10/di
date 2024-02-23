import {beforeEach, describe, expect, test, vi} from 'vitest';
import {container} from '../container.js';
import {Injectable} from '../decorators/injectable.js';
import {Singleton} from '../decorators/singleton.js';
import {Lifecycle} from '../lifecycle.js';
import {Disposable} from '../types/disposable.js';

beforeEach(() => container.reset());

// 生命周期测试场景。
// 1. singleton 生命周期的实例，可以从任何层级的容器获取。它在 root 容器销毁（dispose）时触发 dispose 方法。
// 2. transient 生命周期的实例，在每次 resolve 时都会实例化一个新的。它不会触发 dispose 方法。
// 3. container 生命周期的实例，在单个容器下时唯一的。不同容器都能有一个不同的实例。它会在其容器销毁时（dispose）触发 dispose 方法。
// 4. skipContainer 类似 container 但是子容器可以获取到父容器的实例。不过子容器销毁（dispose）不会触发其 dispose 方法。
// 5. resolution 类似 transient 但是在一个 resolve 过程中是唯一的。

test('default params', () => {
  @Injectable()
  class Foo {}

  const instance1 = container.resolve(Foo);
  const instance2 = container.resolve(Foo);
  const instance3 = container.resolve(Foo);
  expect(instance1).toBeInstanceOf(Foo);
  expect(instance2).toBeInstanceOf(Foo);
  expect(instance3).toBeInstanceOf(Foo);
  expect(instance1 === instance2).toBeFalsy();
  expect(instance3 === instance2).toBeFalsy();
  expect(instance3 === instance1).toBeFalsy();
});

// 单例-全局单例。无论在哪个容器 resolve 都只会获取一个唯一实例。
describe('LifeCycle.singleton', () => {
  test('resolve', () => {
    @Singleton()
    class Bar {}

    const container1 = container.createChildContainer();
    const container2 = container.createChildContainer();

    const container3 = container1.createChildContainer();
    const container4 = container2.createChildContainer();

    expect(container.resolve(Bar)).toBeInstanceOf(Bar);

    expect(container.resolve(Bar) === container.resolve(Bar)).toBeTruthy();
    expect(container.resolve(Bar) === container1.resolve(Bar)).toBeTruthy();
    expect(container.resolve(Bar) === container2.resolve(Bar)).toBeTruthy();
    expect(container.resolve(Bar) === container3.resolve(Bar)).toBeTruthy();
    expect(container.resolve(Bar) === container4.resolve(Bar)).toBeTruthy();
  });

  // 单例存储在根容器中。
  test('dispose', async () => {
    @Singleton()
    class Bar implements Disposable {
      dispose(): Promise<void> | void {}
    }
    const instance = container.resolve(Bar);

    const spy = vi.spyOn(instance, 'dispose');
    expect(spy.getMockName()).toEqual('dispose');

    await container.dispose();
    expect(spy).toHaveBeenCalledOnce();
  });
});

// 每次 resolve 都会实例化一个新的实例。
describe('LifeCycle.transient', () => {
  test('resolve', () => {
    @Injectable(Lifecycle.transient)
    class Bar {}

    const instance1 = container.resolve(Bar);
    const instance2 = container.resolve(Bar);
    const instance3 = container.resolve(Bar);
    expect(instance1).toBeInstanceOf(Bar);
    expect(instance2).toBeInstanceOf(Bar);
    expect(instance3).toBeInstanceOf(Bar);
    expect(instance1 === instance2).toBeFalsy();
    expect(instance3 === instance2).toBeFalsy();
    expect(instance3 === instance1).toBeFalsy();
  });

  test('dispose', async () => {
    @Injectable(Lifecycle.transient)
    class Bar implements Disposable {
      dispose(): Promise<void> | void {}
    }
    const container1 = container.createChildContainer();
    const instance = container1.resolve(Bar);

    const spy = vi.spyOn(instance, 'dispose');
    expect(spy.getMockName()).toEqual('dispose');

    await container1.dispose();
    expect(spy).toHaveBeenCalledTimes(0);
  });
});

// 实例的生命周期会跟随容器，如果一个 class 会在多个容器下使用，那么每个容器都会有一个实例。但是单个容器下是唯一的。
// 子容器不会使用父容器的实例，如果容器调用了 dispose 方法，会触发所有绑定这个容器的实例的 dispose 方法。需要实例实现 Disposed 接口。
describe('LifeCycle.container', () => {
  test('resolve', () => {
    @Injectable(Lifecycle.container)
    class Foo {}

    const container1 = container.createChildContainer();
    const container2 = container.createChildContainer();

    expect(container1.resolve(Foo)).toBeInstanceOf(Foo);
    expect(container1.resolve(Foo) !== container2.resolve(Foo)).toBeTruthy();

    const instance1 = container1.resolve(Foo);
    const instance2 = container1.resolve(Foo);

    expect(instance1 === instance2).toBeTruthy();

    const instance3 = container2.resolve(Foo);
    const instance4 = container2.resolve(Foo);

    expect(instance3 === instance4).toBeTruthy();

    expect(instance1 !== instance3).toBeTruthy();
  });

  test('dispose', async () => {
    @Injectable(Lifecycle.container)
    class Bar implements Disposable {
      dispose(): Promise<void> | void {}
    }
    const container1 = container.createChildContainer();
    const instance = container1.resolve(Bar);

    const spy = vi.spyOn(instance, 'dispose');
    expect(spy.getMockName()).toEqual('dispose');

    await container1.dispose();
    expect(spy).toHaveBeenCalledOnce();
  });
});

// 类似 container 但是子容器会使用父容器的实例，子容器 dispose 时不会触发父容器的实例的 dispose 方法。
describe('LifeCycle.skipContainer', () => {
  test('resolve', async () => {
    @Injectable(Lifecycle.skipContainer)
    class Foo {}

    const container1 = container.createChildContainer();
    const container2 = container.createChildContainer();
    const container3 = container1.createChildContainer();

    const instance1 = container1.resolve(Foo);
    const instance2 = container2.resolve(Foo);
    const instance3 = container3.resolve(Foo);
    // 兄弟容器中的实例是不同的。
    expect(instance1).toBeInstanceOf(Foo);
    expect(instance1 !== instance2).toBeTruthy();

    // 子容器可以读取父容器中的实例。
    expect(instance1 === instance3).toBeTruthy();
  });
  test('dispose', async () => {
    @Injectable(Lifecycle.skipContainer)
    class Foo implements Disposable {
      dispose(): Promise<void> | void {}
    }

    const container1 = container.createChildContainer();
    const container2 = container1.createChildContainer();

    const instance1 = container1.resolve(Foo);
    const instance2 = container2.resolve(Foo);
    expect(instance1 === instance2).toBeTruthy();

    // 由于实例本身存在于父容器中。子容器 dispose 触发时，实例的 dispose 方法不会触发
    const spy = vi.spyOn(instance2, 'dispose');
    expect(spy.getMockName()).toEqual('dispose');
    await container2.dispose();
    expect(spy).toHaveBeenCalledTimes(0);

    // 父容器 dispose
    await container1.dispose();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

// 一次解析过程中的共同依赖的实例为单例如：A 依赖 B 和 C ，B 依赖 C, 那么如果 C 的 scope 是 resolution, B 和 A 都将引用同一个实例。
describe('LifeCycle.resolution', () => {
  test('resolve', async () => {
    @Injectable(Lifecycle.resolution)
    class X {}

    @Injectable()
    class Bar {
      constructor(public x: X) {}
    }

    @Injectable()
    class Foo {
      constructor(
        public bar: Bar,
        public x: X
      ) {}
    }

    const container1 = container.createChildContainer();
    const instance = container1.resolve(Foo);
    expect(instance.x === instance.bar.x).toBeTruthy();
  });
  test('dispose', async () => {
    @Injectable(Lifecycle.resolution)
    class X implements Disposable {
      disposed = false;
      dispose(): Promise<void> | void {
        this.disposed = true;
      }
    }

    @Injectable()
    class Bar {
      constructor(public x: X) {}
    }

    @Injectable()
    class Foo {
      constructor(
        public bar: Bar,
        public x: X
      ) {}
    }

    const container1 = container.createChildContainer();
    const instance = container1.resolve(Foo);

    await container1.dispose();
    expect(instance.bar.x.disposed).toBeFalsy();
  });
});
