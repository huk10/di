import {FB1} from './b-a.js';
import {lazy} from '../../../lazy.js';
import {Inject, Injectable} from '../../../index.js';

@Injectable()
export class FA1 {
  constructor(@Inject(lazy(() => FB1)) public fb1: FB1) {}
}
