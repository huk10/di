import {beforeEach, describe, expect, test} from 'vitest';
import {container} from '../container.js';
import {Inject} from '../decorators/inject.js';
import {Injectable} from '../decorators/injectable.js';

beforeEach(() => container.reset());

// 异常场景
// 1. 非运行时类型(type、interface、any、unknown) 和基本类型值（string、number、null、undefined）
// 2. @Inject 错误的参数
// 3. @Inject 重复使用
// 4. @Inject 模块循环依赖了
// 5. 循环依赖了
// 6. resolve 错误的参数
// 6. token provider 循环依赖
// 7. register 错误的参数
// 8. 不可注入的类-没有使用@Injectable且存在必传参数

describe('TypeScrip type is non-class and interface', () => {
  test('any', () => {
    class Foo {
      constructor(public bar: any) {}
    }
    expect(() => container.resolve(Foo)).toThrowError("Cannot inject dependencies for class 'Foo'.");
  });
  test('undefined', () => {
    class Foo {
      constructor(public bar: undefined) {}
    }
    expect(() => container.resolve(Foo)).toThrowError("Cannot inject dependencies for class 'Foo'.");
  });
  test('unknown', () => {
    class Foo {
      constructor(public bar: unknown) {}
    }
    expect(() => container.resolve(Foo)).toThrowError("Cannot inject dependencies for class 'Foo'.");
  });
  test('string', () => {
    class Foo {
      constructor(public bar: string) {}
    }
    expect(() => container.resolve(Foo)).toThrowError("Cannot inject dependencies for class 'Foo'.");
  });
  // 用了装饰器会有更详细的错误信息。
  test('@Injectable + any parameter', () => {
    @Injectable()
    class Foo {
      constructor(public bar: string) {}
    }
    expect(() => container.resolve(Foo)).toThrowError("Cannot inject dependency at #0 for constructor 'Foo'.");
  });
  // 用了装饰器会有更详细的错误信息。
  test('@Injectable + any properties', () => {
    @Injectable()
    class Foo {
      @Inject() public bar: string;
    }
    expect(() => container.resolve(Foo)).toThrowError("Cannot inject property dependency 'bar' for class 'Foo'.");
  });
});

describe("'@Inject' error", () => {
  test('invalid token', () => {
    expect(() => {
      class Bar {
        // @ts-ignore
        constructor(@Inject(null) public a: number) {}
      }
    }).toThrowError('The token is valid service identifier');
  });
});
