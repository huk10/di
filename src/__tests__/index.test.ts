/**
 * 仅装饰器场景。
 * 1. 正常注入（参数注入和属性注入）。
 * 2. 多个类依赖同一个类：A 依赖 B 和 C 而 B 也依赖 C
 * 3. 简单嵌套无循环依赖，A -> B -> C -> D
 *
 * 纯手动注册场景。
 * 1. 使用（字符串、symbol、Token）注册一个 provider (支持的4中provider) 并 resolve 。
 * 2. 使用 class 或者 ref 和 lazy 包裹的 class 作为 Token 注册一个 provider 时。并对这个 class 使用 @Injectable。
 *  2.1 如果 provider 不是这个 class 的话，任何位置使用 class 作为 Token 时 resolve 时都以注册的 provider 优先。也就是覆盖了 @Injectable
 *  2.2 如果没传 provider 参数，或者 provider 参数是 class provider 并且 useClass 是其本身的话。与 @Injectable 一致。(需要处理循环依赖问题)
 *  2.3 如果 class 没有使用 @Injectable 也是如此逻辑。
 *
 * provider
 * 1. class provider 的 class 如果没有使用 @Injectable 则不能自动注入其依赖，如果其构造函数存在必传参数，则会报错。
 * 2. factory provider 每次都会 resolve 都会调用一次其 useFactory 方法。此 provider 不支持生命周期参数，其生命周期固定为 transient。
 * 3. value provider 相当于 LifeCycle.singleton 生命周期。
 * 4. token provider 相当与重定向功能，它在注册时会检查是否有出现循环依赖现象。
 *
 * 装饰器测试场景。
 * 1. 支持 resolve 没有使用 @Injectable 装饰的 class，以及 class provider。如果没有使用 @Injectable 则不能自动注入其依赖，如果其构造函数存在必传参数，则会报错。
 * 2. Inject 装饰器传入一个 Token 其与声明类型不同观察是否能正确获取实例。
 * 3. Inject 传参 string 、symbol 、Token 为简单的映射。
 * 4. Inject 传参 class 、ref 、lazy 。
 *  4.1 如果这个 class 没有进行注册过，则按照构造函数的方式解析。
 *  4.2 如果这个 class 有进行注册，则按照 provider 的方式解析。注意 class provider 中的 class 同样是以 provider 的方式解析。
 *
 * 循环依赖场景。
 * 1. 模块循环依赖
 *  1.1 模块有两个 class  A1 A2，B 模块有一个 class  B1，A1 依赖 B1，B1 依赖 A2 此时为单纯的模块循环依赖，与注入库无关。
 * 2. 类循环依赖。
 *  2.1 两个 class 互相依赖 (使用 lazy)
 *  2.2 多层嵌套：A1 -> B1 -> C1 -> A1
 * 3. 模块循环依赖 + 类循环依赖：模块 A 有一个 class A1 模块 B 有一个 class B1，A1 依赖 B1，B1 依赖 A1
 *
 * dispose 测试场景。
 * 1. 如果 dispose 方法不符合接口类型，则会忽略。(如果不是一个方法，存在必传参数)
 * 2. 只会调用当前容器内绑定的 dispose 方法。
 * 3. dispose 返回一个 promise ，在所有实例的 dispose 方法执行完毕后 resolve
 * 4. 任何实例的 dispose 方法如果抛出错误，则忽略并吞掉这个错误继续执行。
 *
 * 多层级容器测试场景。
 * 1. 子容器和访问父容器的注册表。如果某个 class 的生命周期是 skipContainer 则子容器还能获取父容器的实例。
 * 2. 父容器无法获取子容器的实例和注册表。
 * 3. 父容器销毁（dispose）时，子容器将无法访问父容器的注册表和实例，并且不会报错。
 * 4. 父容器销毁（dispose）时，不会触发子容器的 dispose 方法。同样子容器也不会触发父容器的。
 * 5. 【是否合理?】具有 skipContainer 生命周期的实例，可以从子容器获取，但是父容器 dispose 了就无法获取了。并且子容器销毁（dispose）不会触发其 dispose 方法。
 *
 * 生命周期测试场景。
 * 1. singleton 生命周期的实例，可以从任何层级的容器获取。它在 root 容器销毁（dispose）时触发 dispose 方法。
 * 2. transient 生命周期的实例，在每次 resolve 时都会实例化一个新的。它不会触发 dispose 方法。
 * 3. container 生命周期的实例，在单个容器下时唯一的。不同容器都能有一个不同的实例。它会在其容器销毁时（dispose）触发 dispose 方法。
 * 4. skipContainer 类似 container 但是子容器可以获取到父容器的实例。不过子容器销毁（dispose）不会触发其 dispose 方法。
 * 5. resolution 类似 transient 但是在一个 resolve 过程中是唯一的。
 *
 * 异常场景
 * 1. 非运行时类型(type、interface、any、unknown) 和基本类型值（string、number、null、undefined）
 * 2. @Inject 错误的参数
 * 3. @Inject 重复使用
 * 4. @Inject 模块循环依赖了
 * 5. 循环依赖了
 * 6. resolve 错误的参数
 * 6. token provider 循环依赖
 * 7. register 错误的参数
 * 8. 不可注入的类-没有使用@Injectable且存在必传参数
 *
 * 【设计考虑】
 * 1. 要不要把 dispose 功能给移除了？
 * 2. skipContainer 和container 要不要合并。
 */

import {beforeEach, describe, expect, test} from 'vitest';
import {container} from '../container.js';
import {Inject} from '../decorators/inject.js';
import {Injectable} from '../decorators/injectable.js';

beforeEach(() => container.reset());

// 仅装饰器场景。
// 1. 正常注入（参数注入和属性注入）。
// 2. 多个类依赖同一个类：A 依赖 B 和 C 而 B 也依赖 C
// 3. 简单嵌套无循环依赖，A -> B -> C -> D
describe('Normal decorator scene', () => {
  test('parameter and property injection', () => {
    @Injectable()
    class Bar {}

    @Injectable()
    class Foo {
      @Inject() bar1: Bar;

      constructor(public bar: Bar) {}
    }

    const instance = container.resolve(Foo);
    expect(instance).toBeInstanceOf(Foo);
    expect(instance.bar).toBeInstanceOf(Bar);
    expect(instance.bar1).toBeInstanceOf(Bar);
  });
  test('simple nesting without circular dependencies', () => {
    @Injectable()
    class Bar {}

    @Injectable()
    class Baz {
      constructor(public bar: Bar) {}
    }

    @Injectable()
    class Foo {
      constructor(public baz: Baz) {}
    }

    const instance = container.resolve(Foo);
    expect(instance.baz).toBeInstanceOf(Baz);
    expect(instance.baz.bar).toBeInstanceOf(Bar);
  });
  test('multiple classes depend on the same class', () => {
    @Injectable()
    class Bar {}

    @Injectable()
    class Baz {
      constructor(public bar: Bar) {}
    }

    @Injectable()
    class Foo {
      constructor(
        public baz: Baz,
        public bar: Bar
      ) {}
    }

    const instance = container.resolve(Foo);
    expect(instance.bar).toBeInstanceOf(Bar);
    expect(instance.baz).toBeInstanceOf(Baz);
    expect(instance.baz.bar).toBeInstanceOf(Bar);
  });
});
