import { FA02 } from './a01.js';
import { ref } from '../../../src/ref.js'
import { Injectable } from '../../../src/decorators/injectable.js'
import { Inject } from '../../../src/decorators/inject.js'

@Injectable()
export class FB01 {
  constructor(@Inject(ref(() => FA02)) public fa02: FA02) {}
}
