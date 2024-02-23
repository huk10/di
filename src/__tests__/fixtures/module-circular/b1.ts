import {A02} from './a1.js';
import {Injectable} from '../../../decorators/injectable.js';

// es 模块循环依赖

@Injectable()
export class B01 {
  constructor(public a2: A02) {}
}
