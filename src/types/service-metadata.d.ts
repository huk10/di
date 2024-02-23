import {Lifecycle} from '../lifecycle.js';
import {Constructor} from './constructor.js';
import {ServiceIdentifier} from './identifier.js';

export interface ServiceMetadata<T = unknown> {
  scope: Lifecycle;
  type: Constructor<T>;
  params: ServiceIdentifier<unknown>[];
  property: Record<string, ServiceIdentifier<unknown>> | null;
}
