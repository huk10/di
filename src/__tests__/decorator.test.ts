import {describe, test, expect, beforeEach} from 'vitest';
import {container} from '../container.js';
import {Inject} from '../decorators/inject.js';
import {Injectable} from '../decorators/injectable.js';
import {lazy} from '../lazy.js';
import {ref} from '../ref.js';
import {Token} from '../token.js';

beforeEach(() => container.reset());

// 装饰器测试场景。
// 1. 支持 resolve 没有使用 @Injectable 装饰的 class，以及 class provider。如果没有使用 @Injectable 则不能自动注入其依赖，如果其构造函数存在必传参数，则会报错。
describe('@Injectable', () => {
  test('Support parsing classes that do not use the `@Injectable` decorator', () => {
    class Bar {}

    expect(container.resolve(Bar)).toBeInstanceOf(Bar);
  });
  test('Do not use the `@inj decorator`, but the class has required parameters', () => {
    class Bar {}

    class Foo {
      constructor(public bar: Bar) {}
    }

    expect(() => container.resolve(Foo)).toThrowError(`Cannot inject dependencies for class 'Foo'.`);
  });
});

// 2. Inject 装饰器传入一个 Token 其与声明类型不同观察是否能正确获取实例。
// 3. Inject 传参 string 、symbol 、Token 为简单的映射。
// 4. Inject 传参 class 、ref 、lazy 。
//  4.1 如果这个 class 没有进行注册过，则按照构造函数的方式解析。
//  4.2 如果这个 class 有进行注册，则按照 provider 的方式解析。注意 class provider 中的 class 同样是以 provider 的方式解析。
describe('@Inject', () => {
  // 覆盖声明类型
  test('pass parameters: other class', () => {
    class Bar {}

    class Baz {}

    @Injectable()
    class Foo {
      constructor(@Inject(Baz) public bar: Bar) {}
    }

    expect(container.resolve(Foo).bar).toBeInstanceOf(Baz);
  });
  test('pass parameters: Ref ', () => {
    class Bar {}

    class Baz {}

    @Injectable()
    class Foo {
      constructor(@Inject(ref(() => Baz)) public bar: Bar) {}
    }

    expect(container.resolve(Foo).bar).toBeInstanceOf(Baz);
  });
  test('pass parameters: Lazy ', () => {
    class Bar {}

    class Baz {}

    @Injectable()
    class Foo {
      constructor(@Inject(lazy(() => Baz)) public bar: Bar) {}
    }

    expect(container.resolve(Foo).bar).toBeInstanceOf(Baz);
  });
  test('pass parameters: normal token', () => {
    class Bar {}

    class Baz {}

    // string
    container.register('token1', Baz);
    @Injectable()
    class Foo {
      constructor(@Inject('token1') public bar: Bar) {}
    }
    expect(container.resolve(Foo).bar).toBeInstanceOf(Baz);

    const token = Symbol('token');
    container.register(token, Baz);
    @Injectable()
    class Foo2 {
      constructor(@Inject(token) public bar: Bar) {}
    }
    expect(container.resolve(Foo2).bar).toBeInstanceOf(Baz);

    const token2 = new Token('token');
    container.register(token2, Baz);
    @Injectable()
    class Foo3 {
      constructor(@Inject(token2) public bar: Bar) {}
    }
    expect(container.resolve(Foo3).bar).toBeInstanceOf(Baz);
  });

  // 注册过 provider 的类
  test('Classe that have registered with provider', () => {
    class Bar {}

    class Baz {}

    container.register(Baz, {useValue: 'baz'});

    @Injectable()
    class Foo {
      constructor(@Inject(Baz) public bar: Bar) {}
    }

    expect(container.resolve(Foo).bar).toEqual('baz');
  });
});
