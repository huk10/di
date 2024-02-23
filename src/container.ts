import { CircularReferenceError, InjectionTokenTypeError, InvalidProviderError } from './constant.mjs'
import { Disposable, isDisposable, isPromise } from './types/disposable.mjs'
import { isInjectionToken, InjectionToken } from './token.mjs'
import { ServiceMetadata } from './types/service-metadata.mjs'
import { Constructor, isConstructor } from './types/constructor.mjs'
import { isServiceIdentifier, ServiceIdentifier } from './types/identifier.mjs'
import {
  ServiceProvider,
  isFactoryProvider,
  isClassProvider,
  isValueProvider,
  isProvider,
  isTokenProvider, TokenProvider,
} from './provider.mjs'

export const typeInfo = new Map<ServiceIdentifier, ServiceMetadata>()

// 容器有两个
/**
 *
 * 所有类是否是单例，通通有 @injectable 的参数决定，即便是使用的 useClass 注册的也是一样。
 *
 * 实例来源有两处：
 * 1. 自动采集的服务，这种服务都是通过 @injectable 装饰了的类。它们存储在一个全局的对象中。
 * 2. 用户收到注册的服务，通过调养 container.register 方法注册的服务。这类服务跟对应的 container 绑定在一起，如果当前容器没有会去它的父容器查询。
 *
 * container.register useClass 注册的 class 必须使用 @injectable 装饰，否则在构造函数拥有参数或属性注入时将无法构造。
 *
 */
export class Container {
  private disposed = false;
  // 存储该容器实例化过的所有的单例对象。
  // 单例对象初始化是初始化在 global-container 对象中的。
  private instances = new Map<ServiceIdentifier, unknown>();

  // 存储用户手动注册过的所有 provider
  private registry = new Map<InjectionToken, ServiceProvider>();

  // 父容器
  // 子容器可以从父容器中获取实例。
  // 父容器可以有多个子容器，不过父容器并不知道具体有哪些子容器。
  // 一般用于 root 容器提供通用服务，子容器提供特定服务。
  constructor(private parent?: Container) {}

  // 判断是否存在指定的可注入服务。
  has<T>(serviceIdentifier: ServiceIdentifier<T>): boolean {
    this.throwIfDisposed()
    // 是否存在于 this.register
    // 是否被 @injectable 装饰
    if (isInjectionToken(serviceIdentifier)) {
      return this.isRegistered(serviceIdentifier)
    }
    if (isConstructor(serviceIdentifier)) {
      return typeInfo.has(serviceIdentifier)
    }
    return false
  }

  // 是否已注册某个token
  // 如果传递 recursive 参数会先上递归去所有的父容器进行查找。
  isRegistered<T>(token: InjectionToken<T>, recursive = false): boolean {
    this.throwIfDisposed()
    if (this.registry.has(token)) {
      return true
    }
    if (this.parent && recursive) {
      return this.parent.isRegistered(token)
    }
    return false
  }

  /**
   * 供用户手动添加 provider
   * @param constructor
   */
  register<T>(constructor: Constructor<T>): void
  register<T>(token: InjectionToken<T>, provider: ServiceProvider<T>): void
  register<T>(token: InjectionToken<T> | Constructor<T>, provider?: ServiceProvider<T>): void {
    this.throwIfDisposed()
    if (isConstructor(token) && !provider) {
      this.registry.set(token as any, {useClass: token})
      return
    }
    if ( !isInjectionToken(token)) {
      throw new InjectionTokenTypeError(token)
    }
    if ( !isProvider(provider)) {
      throw InvalidProviderError
    }
    if (isTokenProvider(provider)) {
      if (provider.useToken === token) {
        throw new Error('Provider.useToken cannot be the same as InjectToken.')
      }
    }
    this.registry.set(token, provider)
  }

  /**
   * 通过解析 ServiceIdentifier 获取对应的服务实例。
   * @param {ServiceIdentifier} serviceIdentifier
   */
  resolve<T>(serviceIdentifier: ServiceIdentifier<T>): T {
    this.throwIfDisposed()

    if ( !isServiceIdentifier(serviceIdentifier)) {
      throw new Error("the serviceIdentifier type error")
    }

    // 1. token 的方式必须已存在于 this.register 中
    if (isInjectionToken(serviceIdentifier)) {
      return this.resolveInjectionToken<T>(serviceIdentifier)
    }

    // 2. 获取构造函数的实例
    if (isConstructor(serviceIdentifier)) {
      return this.resolveConstructor(serviceIdentifier)
    }

    throw new Error('unrecognized service identifier')
  }

  // 清空所有已经实例化的实例。
  // 只针对当前 container 注册的 provider useClass
  // 如果当前 container 是 global container 还会将所有的单例都给清除。
  // 不会触发 dispose 方法。
  reset(): void {
    this.throwIfDisposed()
    this.instances.clear()
    this.registry.clear()
  }

  // 调用内部所有实现了 Disposable 接口的实例的 dispose 方法
  // 如果任意一个实例的 dispose 方法抛出错误，都会停止并向上传递。
  async dispose(): Promise<void> {
    this.disposed = true
    const promises: Promise<void>[] = []
    for (const instance of this.instances.values()) {
      if ( !isDisposable(instance)) {
        continue
      }
      try {
        // 这里可能会 throw error
        const result = instance.dispose()
        if (result && isPromise<void>(result)) {
          promises.push(result)
        }
      } catch (err) {}
    }
    await Promise.all(promises)
  }

  createChildContainer(): Container {
    this.throwIfDisposed()
    return new Container(this)
  }

  // 检查该容器是否已经 disposed
  // 容器如果已经 disposed 则不能进行任何操作了。
  private throwIfDisposed(): void {
    if (this.disposed) {
      throw new Error('This container has been disposed, you cannot interact with a disposed container')
    }
  }

  // 解析构造函数获取对应的实例。
  private resolveConstructor<T>(ctor: Constructor<T>): T {
    // 服务是否是单例，如果是单例，实例是否已经创建好。
    const types = typeInfo.get(ctor) || null
    if (types === null) {
      throw new Error(`The metadata for \`${ ctor.name }\` was not found. Please check whether \`@injectable\` is used.`)
    }
    const instance = this.resolveConstructorInstance<T>(ctor, types as ServiceMetadata<T>)
    if (types.property !== null) {
      this.applyInstanceProperty(instance as unknown as Record<string, unknown>, types.property)
    }
    return instance
  }

  // 解析 injection token 获取对应的服务。
  private resolveInjectionToken<T>(token: InjectionToken<T>): T {
    const provider = this.registry.get(token) || null
    if (provider === null) {
      throw new Error(`Attempted to resolve unregistered dependency token: "${ token.toString() }"`)
    }
    return this.resolveProvider<T>(provider as ServiceProvider<T>);
  }

  private tokenProviderParse<T>(provider: TokenProvider<T>): ServiceProvider<T> {
    const paths: InjectionToken<unknown>[] = []
    const chain: ServiceProvider<unknown>[] = [provider]
    let provider_value: ServiceProvider<unknown>|null = null;
    while (chain.length) {
      const p = chain.shift()
      if (isTokenProvider(p)) {
        if (paths.includes(p.useToken)) {
          throw new Error(`This token \`${ provider.useToken.toString() }\` has a circular dependency.`)
        }
        paths.push(p.useToken)
        const value = this.registry.get(p.useToken) || null
        if (value === null) {
          throw new Error(`Attempted to resolve unregistered dependency token: "${ p.useToken.toString() }"`)
        }
        chain.push(value)
      } else {
        provider_value = p || null
      }
    }
    return provider_value as ServiceProvider<T>
  }

  // 解析 provider 获取值
  private resolveProvider<T>(provider: ServiceProvider<T>): T {
    if (isTokenProvider<T>(provider)) {
      provider = this.tokenProviderParse<T>(provider)
    }
    if (isValueProvider<T>(provider)) {
      return provider.useValue
    }
    if (isClassProvider<T>(provider)) {
      return this.resolveConstructor(provider.useClass)
    }
    if (isFactoryProvider<T>(provider)) {
      return provider.useFactory(this)
    }
    // 正常场景是不可达的.
    throw new Error("unknown provider")
  }

  // 获取构造函数的实例。
  private resolveConstructorInstance<T>(ctor: Constructor<T>, type: ServiceMetadata<T>): T {
    // 如果 class 存在默认参数则会判断错误。
    if (type.params === null || Object.keys(type.params).length !== ctor.length) {
      if (ctor.length === 0) {
        return new ctor()
      }
      throw new Error(`parameters cannot be injected into this class: '${ ctor.name }'`)
    }
    const params = []
    for (let [parameterIndex, value] of Object.entries(type.params)) {
      params[+parameterIndex] = this.resolveProvider(value)
    }
    return new ctor(...params)
  }

  // 为构造函数的实例装载属性。
  private applyInstanceProperty(instance: Record<string, unknown>, properties: Record<string, ServiceProvider>) {
    for (const [propertyKey, value] of Object.entries(properties)) {
      // @ts-ignore
      instance[propertyKey] = this.resolveProvider(value)
    }
  }

  // 获取指定 token 对应的 provider
  private getProvider<T>(token: InjectionToken<T>): ServiceProvider<T> | null {
    if (this.isRegistered(token)) {
      return this.registry.get(token) as unknown as ServiceProvider<T>
    }
    if (this.parent) {
      return this.parent.getProvider(token)
    }
    return null
  }
}

export const container = new Container();




