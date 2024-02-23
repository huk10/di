import {Lifecycle} from '../lifecycle.js';
import {Injectable} from './injectable.js';

/**
 * 装饰一个类，它将作为单例进行解析。
 * @return {ClassDecorator}
 */
export function Singleton(): ClassDecorator {
  return Injectable(Lifecycle.singleton);
}
