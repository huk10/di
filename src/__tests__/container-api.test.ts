import {beforeEach, describe, expect, test} from 'vitest';
import {container} from '../container.js';

beforeEach(() => container.reset());

describe('container api', () => {
  describe('isRegister', () => {
    test('not recursive', () => {
      container.register('token', {useValue: 1});
      expect(container.isRegistered('token')).toBeTruthy();
      expect(container.isRegistered('token2')).toBeFalsy();
    });
    test('recursive', () => {
      container.register('token', {useValue: 1});
      const child = container.createChildContainer();
      expect(container.isRegistered('token')).toBeTruthy();
      expect(child.isRegistered('token', true)).toBeTruthy();
    });
  });
});
