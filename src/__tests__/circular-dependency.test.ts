import {beforeEach, describe, expect, test} from 'vitest';
import {FA1} from './fixtures/fix-class-circular/a-b.js';
import {FB1} from './fixtures/fix-class-circular/b-a.js';
import {FA01, FA02} from './fixtures/fix-module-circular/a01.js';
import {FB01} from './fixtures/fix-module-circular/b01.js';
import {A01} from './fixtures/module-circular/a1.js';
import {container} from '../container.js';
import {B1} from './fixtures/class-circular/b-a.js';

// 这里不能进行 reset 装饰器写在其他文件，在这里reset的话会将装饰器的信息给reset掉。
// beforeEach(() => container.reset());

// 循环依赖场景。
// 1. 模块循环依赖
// 1.1 模块有两个 class  A1 A2，B 模块有一个 class  B1，A1 依赖 B1，B1 依赖 A2 此时为单纯的模块循环依赖，与注入库无关。
// 2. 类循环依赖。
//  2.1 两个 class 互相依赖 (使用 lazy)
// 2.2 多层嵌套：A1 -> B1 -> C1 -> A1
// 3. 模块循环依赖 + 类循环依赖：模块 A 有一个 class A1 模块 B 有一个 class B1，A1 依赖 B1，B1 依赖 A1

// 循环依赖有以下几种场景：
// 1. 构造函数参数循环依赖。
// 2. 属性注入循环依赖。
// 3. es module 循环依赖 -> 这个建议用户修改代码，不过这里也支持。
// 4. 单例等生命周期貌似不影响这个。
describe('circular dependence', () => {
  // class 依赖循环
  test('class circular dependency', () => {
    const error = `Discovery of circular dependencies: B1 -> A1 -> B1`;
    expect(() => container.resolve(B1)).toThrowError(error);

    // fix circular dependency
    expect(container.resolve(FA1)).toBeInstanceOf(FA1);
    expect(container.resolve(FA1).fb1).toBeInstanceOf(FB1);
    expect(container.resolve(FA1).fb1.fa1).toBeInstanceOf(FA1);
  });

  // es 模块出现循环依赖 reflect-metadata 在模块循环依赖时无法正确获取到类型。
  // https://github.com/rbuckton/reflect-metadata/issues/135
  test('es module circular dependency', () => {
    const error =
      "Cannot inject dependency at #0 for constructor 'B01'. Could mean a circular dependency problem. Try using `ref` function.";
    expect(() => container.resolve(A01)).toThrowError(error);

    // fix circular dependency
    expect(container.resolve(FA01)).toBeInstanceOf(FA01);
    expect(container.resolve(FA01).fb01).toBeInstanceOf(FB01);
    expect(container.resolve(FA01).fb01.fa02).toBeInstanceOf(FA02);
  });
});
