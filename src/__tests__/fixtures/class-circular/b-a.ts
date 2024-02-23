import { A1 } from './a-b.js'
import { Injectable } from '../../../src/index.js'

@Injectable()
export class B1 {
  constructor(public a1: A1) {
  }
}
