import {beforeEach, describe, expect, test} from 'vitest';
import {container} from '../container.js';
import {Inject} from '../decorators/inject.js';
import {Injectable} from '../decorators/injectable.js';
import {Token} from '../token.js';

beforeEach(() => container.reset());

// provider
// 1. class provider 的 class 如果没有使用 @Injectable 则不能自动注入其依赖，如果其构造函数存在必传参数，则会报错。
// 2. factory provider 每次都会 resolve 都会调用一次其 useFactory 方法。此 provider 不支持生命周期参数，其生命周期固定为 transient。
// 3. value provider 相当于 LifeCycle.singleton 生命周期。
// 4. token provider 相当与重定向功能，它在注册时会检查是否有出现循环依赖现象。
describe('providers', () => {
  // 支持处理 undefined 以外的任何 JavaScript 数据类型。
  test('value provider', () => {
    const cases = {
      number: 1,
      object: {},
      string: '1',
      null: null,
      symbol: Symbol(1),
    };
    for (let [key, value] of Object.entries(cases)) {
      container.register(key, {useValue: value});
    }
    for (let [key, value] of Object.entries(cases)) {
      expect(container.resolve(key)).toStrictEqual(value);
    }
    expect(() => container.register('undefined', {useValue: undefined})).toThrowError(
      'This provider is not an valid provider.'
    );
  });

  // token 循环了会抛出错误
  test('token provider', () => {
    container.register('token1', {useValue: 1});
    container.register('token2', {useToken: 'token1'});
    expect(container.resolve('token1')).toBe(1);
    expect(container.resolve('token2')).toBe(1);
  });

  // class provider 的 class 必须已被 @injectable 装饰器装饰。
  test('class provider', () => {
    class Foo {}

    container.register('token', {useClass: Foo});
    expect(container.resolve('token')).toBeInstanceOf(Foo);
  });

  // factory 函数的第一个参数是 container 可以使用它获取其他的服务实例。
  test('factory provider', () => {
    class Foo {}

    container.register('token', {useFactory: () => new Foo()});
    expect(container.resolve('token')).toBeInstanceOf(Foo);

    container.register('token2', {
      useFactory: cont => cont.resolve('token'),
    });
    expect(container.resolve('token2')).toBeInstanceOf(Foo);
  });
});

// token 循环了会抛出错误
describe('token provider circular', () => {
  test('on container.register check', () => {
    // 最基础的循环
    expect(() => container.register('token3', {useToken: 'token3'})).toThrowError(
      `Token registration cycle detected! token3 -> token3`
    );

    const token4 = new Token('token4');
    expect(() => container.register(token4, {useToken: token4})).toThrowError(
      `Token registration cycle detected! Token('token4') -> Token('token4')`
    );

    const token5 = Symbol('token5');
    expect(() => container.register(token5, {useToken: token5})).toThrowError(
      `Token registration cycle detected! Symbol(token5) -> Symbol(token5)`
    );
  });

  test('nested token is not registered', () => {
    container.register('token6', {useToken: 'token7'});
    container.register('token7', {useToken: 'token8'});
    const err = `Attempted to resolve unregistered dependency token: "${'token8'}"`;
    expect(() => container.resolve('token6')).toThrowError(err);
  });

  test('nested', () => {
    // 循环嵌套
    container.register('token6', {useToken: 'token8'});
    container.register('token7', {useToken: 'token6'});

    expect(() => container.register('token8', {useToken: 'token6'})).toThrowError(
      `Token registration cycle detected! token8 -> token6 -> token8`
    );
  });
});

test('token provider resolve', () => {
  const err = `Attempted to resolve unregistered dependency token: "${'token6'}"`;
  expect(() => container.resolve('token6')).toThrowError(err);
});
