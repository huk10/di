import { B1 } from './b-a.js'
import { Inject, Injectable, ref } from '../../../src/index.js'

@Injectable()
export class A1 {
  constructor(@Inject(ref(() => B1)) public b1: B1) {}
}

