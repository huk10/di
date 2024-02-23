import { Constructor } from './constructor.js'
import { ServiceProvider } from '../provider.js'

export interface ServiceMetadata<T = unknown> {
  instance?: T
  singleton: boolean
  type: Constructor<T>
  isDisposable?: boolean
  params: Record<number, ServiceProvider<T>> | null
  property: Record<string, ServiceProvider<T>> | null
}
