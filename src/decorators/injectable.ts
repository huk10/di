import {typeInfo} from '../container.js';
import {Lifecycle} from '../lifecycle.js';
import {Constructor} from '../types/constructor.js';
import {getParamInfo, getPropertyInfo} from '../reflect-helper.js';

/**
 * 标记一个 class 表示它是可以依赖注入的。
 * 重复使用将出现覆盖的情况
 * @return {ClassDecorator}
 */
export function Injectable<T>(scope = Lifecycle.transient): ClassDecorator {
  return function (target) {
    typeInfo.set(<Constructor<T>>(<unknown>target), {
      scope: scope,
      type: <Constructor<T>>(<unknown>target),
      params: getParamInfo(<Constructor<T>>(<unknown>target)),
      property: getPropertyInfo(<Constructor<T>>(<unknown>target)),
    });
  };
}
