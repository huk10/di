// 仅装饰器场景。
// 1. 正常注入（参数注入和属性注入）。
// 2. 多个类依赖同一个类：A 依赖 B 和 C 而 B 也依赖 C
// 3. 简单嵌套无循环依赖，A -> B -> C -> D

import {describe, test, expect, beforeEach} from 'vitest'
import { container } from '../container.js'

beforeEach(() => container.reset())

describe('Normal scene', () => {
  test('general')
})
