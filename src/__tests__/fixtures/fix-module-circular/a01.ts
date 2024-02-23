import { Injectable } from '../../../src/decorators/injectable.js'
import { FB01 } from './b01.js'

@Injectable()
export class FA01 {
  constructor(public fb01: FB01) {}
}

@Injectable()
export class FA02 {

}
