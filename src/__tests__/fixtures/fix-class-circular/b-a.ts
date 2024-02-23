import {FA1} from './a-b.js';
import {lazy} from '../../../lazy.js';
import {Inject, Injectable} from '../../../index.js';

@Injectable()
export class FB1 {
  constructor(@Inject(lazy(() => FA1)) public fa1: FA1) {}
}
