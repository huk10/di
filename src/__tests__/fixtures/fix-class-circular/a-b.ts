import { FB1 } from './b-a.js'
import { lazy } from '../../../src/lazy.js'
import { Inject, Injectable } from '../../../src/index.js'

@Injectable()
export class FA1 {
  constructor(@Inject(lazy(() => FB1)) public fb1: FB1) {}
}

