import {Injectable} from '../../../decorators/injectable.js';
import {B01} from './b1.js';

@Injectable()
export class A01 {
  constructor(public b01: B01) {}
}

@Injectable()
export class A02 {}
