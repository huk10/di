import {beforeEach, describe, expect, test} from 'vitest';
import {container} from '../container.js';
import {Inject} from '../decorators/inject.js';
import {Injectable} from '../decorators/injectable.js';
import {lazy} from '../lazy.js';

beforeEach(() => container.reset());

describe('lazy', () => {
  test('access properties', () => {
    class Foo {
      bar = 10;
    }
    const instance = lazy(() => Foo).createProxy(ctor => container.resolve(ctor));

    expect(instance).toBeInstanceOf(Foo);
    expect(instance.bar).toEqual(10);
  });
});
