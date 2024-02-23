import { FA1 } from './a-b.js'
import { lazy } from '../../../src/lazy.js'
import { Inject, Injectable } from '../../../src/index.js'

@Injectable()
export class FB1 {
  constructor(@Inject(lazy(() => FA1)) public fa1: FA1) {
  }
}
