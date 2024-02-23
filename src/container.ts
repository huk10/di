import {Lazy} from './lazy.js';
import {isRef, Ref} from './ref.js';
import {Lifecycle} from './lifecycle.js';
import {isNormalToken, NormalToken} from './token.js';
import {ServiceMetadata} from './types/service-metadata.js';
import {isDisposable, isPromise} from './types/disposable.js';
import {Constructor, isConstructor} from './types/constructor.js';
import {ServiceProvider, TokenProvider} from './types/provider.js';
import {serviceIdentifierName, ServiceIdentifier} from './types/identifier.js';
import {isClassProvider, isFactoryProvider, isProvider, isTokenProvider, isValueProvider} from './types/provider.js';

export const typeInfo = new Map<ServiceIdentifier, ServiceMetadata>();

// 用以检查循环依赖和保持 resolution 生命周期的实例
class ResolveContext {
  constructor(public root: ServiceIdentifier<unknown>) {}
  // 依赖链，这里只是从根节点到任意依赖的链条不是完整的依赖树
  // 也会使用这里的数据来检查循环依赖
  // 不只是 class 可以是任意 ServiceIdentifier
  private chain: Array<{token: ServiceIdentifier<unknown>; done: boolean; kind: 'class' | 'provider'}> = [];
  // 一次 resolve 过程中解析成功的服务实例
  // 不只是 class 可以是任意 ServiceIdentifier
  private instances = new Map<ServiceIdentifier<unknown>, unknown>();

  public parent: ServiceIdentifier<unknown> | null = null;
  public dependencyType: 'parameter' | 'properties' | undefined;
  public propertyKey: number | symbol | string | undefined;
  public parameterIndex: number | symbol | string | undefined;

  hasCircularDependency(kind: 'class' | 'provider', token: ServiceIdentifier<unknown>) {
    return this.chain.length > 0 && this.chain.some(val => val.token === token && !val.done && val.kind === kind);
  }

  getDependencyChain() {
    return this.chain.map(val => serviceIdentifierName(val.token)).join(' -> ');
  }

  hasInstance(token: ServiceIdentifier<unknown>) {
    return this.instances.has(token);
  }

  getInstance(token: ServiceIdentifier<unknown>) {
    return this.instances.get(token);
  }

  startResolveDependency(kind: 'class' | 'provider', token: ServiceIdentifier<unknown>) {
    this.chain.push({token, done: false, kind});
  }

  endResolveDependency(kind: 'class' | 'provider', token: ServiceIdentifier<unknown>, instance: unknown) {
    const result = this.chain.find(val => val.token === token && val.kind === kind);
    if (result) {
      result.done = true;
    } else {
      this.chain.push({token, done: true, kind});
    }
    this.instances.set(token, instance);
  }

  clone() {
    const ctx = new ResolveContext(this.root);
    ctx.chain = this.chain.slice();
    ctx.instances = this.instances;
    return ctx;
  }
}

export class Container {
  private disposed = false;
  // 存储所有生命周期 为 container 级别的实例。
  // 单例对象初始化是初始化在 root-container 对象中的。
  private instances = new Map<ServiceIdentifier, unknown>();

  // 存储用户在这个容器中手动注册过的所有 provider 信息。
  private registry = new Map<ServiceIdentifier, ServiceProvider>();

  // 子容器可以从父容器中获取实例。
  // 父容器可以有多个子容器，不过父容器并不知道具体有哪些子容器。
  // 一般用于 root 容器提供通用服务，子容器提供特定服务。
  constructor(private parent?: Container) {}

  // 是否已注册某个token
  // 如果传递 recursive 参数会先上递归去所有的父容器进行查找。
  isRegistered<T>(token: NormalToken<T>, recursive = false): boolean {
    this.throwIfDisposed();
    if (this.registry.has(token)) {
      return true;
    }
    if (this.parent && recursive) {
      return this.parent.isRegistered(token);
    }
    return false;
  }

  /**
   * 供用户手动添加 provider
   * token 可以是以下 4 种类型：string | symbol | Token<T> | Constructor<T>
   * provider 可以是支持的 4 种 provider 之一：value provider、factory provider、class provider、token provider
   * 如果 token 是 class 并且 class provider 也是此 class 的话，可以省略 provider 参数。
   * class provider 可以直接传 class
   */
  register<T>(constructor: Constructor<T>): void;
  register<T>(token: ServiceIdentifier<T>, provider: Constructor<T>): void;
  register<T>(token: ServiceIdentifier<T>, provider: ServiceProvider<T>): void;
  register<T>(token: Exclude<ServiceIdentifier<T>, Ref<T>>, provider?: ServiceProvider<T> | Constructor<T>): void {
    this.throwIfDisposed();

    // 1. 如果 token 是 class 并且 class provider 也是此 class 的话，可以省略 provider 参数。
    if (isConstructor(token) && !provider) {
      return;
      // provider = {useClass: token};
    }
    // 2. class provider 可以直接传 class
    if (isConstructor(provider)) {
      // 如果都是 class，只有满足条件就不需要注册也支持。
      // 如果注册了，以目前的规则会出现循环。
      if (provider === token) return;
      provider = {useClass: provider};
    }

    // 检查下 provider 是否正确。
    // ts 的库应该是可以省略这个的。
    if (!isProvider(provider)) {
      throw new Error('This provider is not an valid provider.');
    }
    // 检查下 token 是否出现循环。
    // 本方法 token === provider.useToken 也是循环的一种。
    if (isTokenProvider(provider)) {
      const paths: ServiceIdentifier<unknown>[] = [token];
      let tokenProvider: TokenProvider<unknown> | null = provider;
      while (tokenProvider) {
        const currentToken = tokenProvider.useToken;
        if (paths.includes(currentToken)) {
          const chain = paths
            .concat(currentToken)
            .map(val => serviceIdentifierName(val))
            .join(' -> ');
          throw new Error(`Token registration cycle detected! ${chain}`);
        }
        paths.push(currentToken);
        // 这里要去父容器哪里查询吗？
        const registration = this.registry.get(currentToken);
        if (registration && isTokenProvider(registration)) {
          tokenProvider = registration;
        } else {
          tokenProvider = null;
        }
      }
    }

    this.registry.set(token, provider);
  }

  /**
   * 通过解析 ServiceIdentifier 获取对应的服务实例。支持 4 种入参类型：string | symbol | Token<T> | Constructor<T>
   * @param {ServiceIdentifier} serviceIdentifier
   * @param {ResolveContext} context
   */
  private _resolve<T>(serviceIdentifier: ServiceIdentifier<T>, context: ResolveContext): T {
    this.throwIfDisposed();

    // string | symbol | Token<T> | Constructor<T> | Ref<T> | Lazy<T>

    // 1. string | symbol | Token<T> 这三类只能被注册才能使用。

    // 2. 不管是什么类型，只要有注册，就获取对应的内容。

    // 3. ref 正常使用必定不会被 register，但是 ref 指向的 constructor 可能被注册了，也可能没有被注册, 如果注册了在 2 处理。

    // 4. constructor 可能会被注册，也可能不会。如果注册了在 2 处理。

    const registration = <ServiceProvider<T> | undefined>this.getProvider(<NormalToken<unknown>>serviceIdentifier);

    // 标准的 token 如果没有注册就无法使用。
    if (isNormalToken(serviceIdentifier) && !registration) {
      throw new Error(`Attempted to resolve unregistered dependency token: "${serviceIdentifier.toString()}"`);
    }

    // 如果该 serviceIdentifier 有注册任何的 provider。
    if (registration) {
      return this.resolveProviderDelegate<T>(serviceIdentifier, registration, context);
    }

    // ref 外部一般是不对使用这个作为入参的。但是内部会使用这个作为入参。
    if (isRef(serviceIdentifier)) {
      // 这个 ref 也可以有注册 provider
      // 所以这里需要调用 _resolve 而不是 resolveConstructor
      return this._resolve(serviceIdentifier.value(), context);
    }

    // Lazy 创建一个 proxy 返回。
    if (serviceIdentifier instanceof Lazy) {
      // lazy 函数包装的 class 也可能有注册 provider
      // 这里需要使用 _resolve 而不是 resolveConstructor
      context.startResolveDependency('class', serviceIdentifier);
      // 这里创建 proxy 就认定是实例创建成功了。
      // 后续真正实例化时报错怎么处理？
      //  本次 resolve 在这里应该就已经结束了。
      //  createProxy 中的resolve 是新的一次 resolve 应该使用 resolve 方法而不是 _resolve
      const instance = serviceIdentifier.createProxy(ctor => this.resolve(ctor));
      context.endResolveDependency('class', serviceIdentifier, instance);
      return instance;
    }

    // ref 和 Lazy 也会是 constructor，要放在最后处理。
    // 这里已经过滤了 ref 和 lazy 所以可以使用 resolveConstructor 解析。
    if (isConstructor(serviceIdentifier)) {
      return this.resolveConstructorDelegate(serviceIdentifier, context);
    }

    throw new Error(`unrecognized service identifier ${serviceIdentifierName(serviceIdentifier)}`);
  }

  resolve<T>(serviceIdentifier: ServiceIdentifier<T>): T {
    return this._resolve(serviceIdentifier, new ResolveContext(serviceIdentifier));
  }

  // 重置本容器的状态。
  // 不会触发 dispose 方法。
  reset(): void {
    // this.throwIfDisposed();
    this.disposed = false;
    this.instances.clear();
    this.registry.clear();
    if (this === root) {
      typeInfo.clear();
    }
  }

  // 调用内部所有实现了 Disposable 接口的实例的 dispose 方法。
  // 如果任意一个实例的 dispose 方法抛出错误，都会停止并向上传递。
  // 用于已注册的实例和本容器生命周期一直的场景。
  // 调用 dispose 方法后，可以再调用 reset 方法删除对那些实例的引用。
  async dispose(): Promise<void> {
    this.disposed = true;
    const promises: Promise<void>[] = [];
    for (const instance of this.instances.values()) {
      if (!isDisposable(instance)) {
        continue;
      }
      try {
        // 这里可能会 throw error
        const result = instance.dispose();
        if (result && isPromise<void>(result)) {
          promises.push(result);
        }
      } catch (err) {
        // 忽略这个错误。
      }
    }
    await Promise.all(promises);
  }

  // 创建一个子容器。
  // 子容器可以获取父容器中的注册信息，父容器中存储的 instance 也可以使用。
  createChildContainer(): Container {
    this.throwIfDisposed();
    return new Container(this);
  }

  // 检查该容器是否已经 disposed
  // 容器如果已经 disposed 则不能进行任何操作了。
  private throwIfDisposed(): void {
    if (this.disposed) {
      throw new Error('This container has been disposed, you cannot interact with a disposed container');
    }
  }

  // 检查循环依赖
  // 目前实现有问题，如果 依赖中存在一个类被多个类依赖，此时不能算循环依赖
  private throwIfCircularDependency(
    serviceIdentifier: ServiceIdentifier,
    kind: 'class' | 'provider',
    context: ResolveContext
  ) {
    if (context.hasCircularDependency(kind, serviceIdentifier)) {
      throw new Error(
        `Discovery of circular dependencies: ${context.getDependencyChain()} -> ${serviceIdentifierName(serviceIdentifier)}`
      );
    }
    context.startResolveDependency(kind, serviceIdentifier);
  }

  // 处理不同生命周期在实例化前的行为
  private beforeInstantiate<T>(ctor: Constructor<T>, types: ServiceMetadata, context: ResolveContext): T | null {
    switch (types.scope) {
      case Lifecycle.container:
        if (this.instances.has(ctor)) {
          return <T>this.instances.get(ctor);
        }
        break;
      case Lifecycle.resolution:
        if (context.hasInstance(ctor)) {
          return <T>context.getInstance(ctor);
        }
        break;
      case Lifecycle.singleton:
        if (this !== root) {
          // 要调用 resolve 而不是 _resolve 不然会触发循环依赖检查
          return root.resolve(ctor);
        }
        // 如果已经实例化了，就直接返回实例。
        if (this.instances.has(ctor)) {
          return <T>this.instances.get(ctor);
        }
        break;
      case Lifecycle.skipContainer:
        {
          let instance = this.getInstance(ctor, true);
          if (instance) return instance;
        }
        break;
      case Lifecycle.transient:
        // 不用管。
        break;
    }
    return null;
  }

  // 处理不同生命周期在实例化后的行为
  private afterInstantiate<T>(ctor: Constructor<T>, types: ServiceMetadata, instance: T) {
    switch (types.scope) {
      case Lifecycle.resolution:
        // 外层循环检测时就已经存入了
        break;
      case Lifecycle.singleton:
        // 这里必定在 root 上。
        this.instances.set(ctor, instance);
        break;
      case Lifecycle.transient:
        // 什么也不做
        break;
      case Lifecycle.skipContainer:
        this.instances.set(ctor, instance);
        break;
      case Lifecycle.container:
        this.instances.set(ctor, instance);
        break;
    }
  }

  private resolveConstructorDelegate<T>(ctor: Constructor<T>, context: ResolveContext): T {
    this.throwIfCircularDependency(ctor, 'class', context);
    const metadata = typeInfo.get(ctor) || null;

    // 如果查不到元数据，也有可能支持创建实例。
    if (!metadata) {
      const instance = this.resolveConstructor(ctor, metadata, context);
      // 如果不抛出则一定创建实例成功了。
      context.endResolveDependency('class', ctor, instance);
      return instance;
    }

    // 处理不同生命周期
    // 一些生命周期不会每次创建一个新的实例。
    const existedInstance = this.beforeInstantiate<T>(ctor, metadata, context);
    if (existedInstance) {
      context.endResolveDependency('class', ctor, existedInstance);
      return existedInstance;
    }

    const instance = this.resolveConstructor(ctor, metadata, context);

    // 处理不同生命周期
    this.afterInstantiate(ctor, metadata, instance);
    context.endResolveDependency('class', ctor, instance);
    return instance;
  }

  // 解析构造函数获取对应的实例。
  // 此方法主要用于 class provider 和 @injectable
  // 这里不会存在 class 已注册为 provider 的场景。
  private resolveConstructor<T>(ctor: Constructor<T>, metadata: ServiceMetadata | null, context: ResolveContext): T {
    if (!metadata) {
      // 如果没有找到 typeInfo 但是这个构造函数没有参数，那么也可以实例化。
      if (ctor.length === 0) {
        return new ctor();
      }
      // 可能是 module 出现循环依赖导致拿不到正确的 metadata
      // 如果是 module 出现循环依赖，这里的 ctor 就会是 Object
      const maybeCircularDependency = ctor.name === 'Object';
      let error = '';
      if (context.parent) {
        if (context.dependencyType === 'properties') {
          error = `Cannot inject property dependency '${context.propertyKey?.toString()}' for class '${serviceIdentifierName(context.parent)}'.`;
        } else {
          error = `Cannot inject dependency at #${context.parameterIndex?.toString()} for constructor '${serviceIdentifierName(context.parent)}'.`;
        }
      } else {
        error = `Cannot inject dependencies for class '${serviceIdentifierName(ctor)}'.`;
      }
      if (maybeCircularDependency) {
        error += ' Could mean a circular dependency problem. Try using `ref` function.';
      }
      throw new Error(error);
    }
    // 如果在下面 try catch 的话可以做到更细致的错误提示。
    // 默认参数是不在 ctor.length 中的。
    // 可以对默认参数使用 装饰器吗？
    const params = [];
    for (let [parameterIndex, value] of Object.entries(metadata.params)) {
      // value 可能是任何的 token 这里需要使用 resolve 解析。
      const ctx = context.clone();
      ctx.parent = ctor;
      ctx.dependencyType = 'parameter';
      ctx.parameterIndex = parameterIndex;
      params[+parameterIndex] = this._resolve(value, ctx);
    }
    const instance = new ctor(...params);
    // 为构造函数的实例装载属性。
    for (const [propertyKey, value] of Object.entries(metadata.property || {})) {
      // value 可能是任何的 token 这里需要使用 resolve 解析。
      const ctx = context.clone();
      ctx.parent = ctor;
      ctx.dependencyType = 'properties';
      ctx.propertyKey = propertyKey;
      (<Record<string, unknown>>instance)[propertyKey] = this._resolve(value, ctx);
    }
    return instance;
  }

  private resolveProviderDelegate<T>(
    serviceIdentifier: ServiceIdentifier<T>,
    provider: ServiceProvider<T>,
    context: ResolveContext
  ): T {
    // 如果是 class provider 或者 token provider 是有可能出现循环的，在这里也检查一下。
    this.throwIfCircularDependency(serviceIdentifier, 'provider', context);
    const instance = this.resolveProvider(provider, context);
    context.endResolveDependency('provider', serviceIdentifier, instance);
    return instance;
  }

  // 解析 provider 获取值
  private resolveProvider<T>(provider: ServiceProvider<T>, context: ResolveContext): T {
    if (isValueProvider<T>(provider)) {
      return provider.useValue;
    }
    if (isFactoryProvider<T>(provider)) {
      return provider.useFactory(this);
    }
    if (isClassProvider<T>(provider)) {
      // 这里的这个 class 可能是 ref 也可能是 lazy
      // 规则是 如果 class 有注册 provider 那么以注册的内容为准。所以这里需要调用 _resolve 重新走流程。
      // 将 context clone 下传递保证依赖链不出错。
      return this._resolve(provider.useClass, context.clone());
    }
    if (isTokenProvider<T>(provider)) {
      // 递归调用即可
      // 将 context clone 下传递保证依赖链不出错。
      return this._resolve<T>(provider.useToken, context.clone());
    }
    // 正常场景是不可达的.
    throw new Error('unknown provider');
  }

  // 获取指定 token 对应的 provider
  private getProvider<T>(token: NormalToken<T>): ServiceProvider<T> | null {
    if (this.isRegistered(token)) {
      return <ServiceProvider<T>>this.registry.get(token);
    }
    if (this.parent) {
      return this.parent.getProvider(token);
    }
    return null;
  }

  // 查询是否存在已初始化的容器。
  // 如果 recursive 为 true，则会递归向上查询。
  private getInstance<T>(ctor: Constructor<T>, recursive: boolean): T | null {
    if (this.instances.has(ctor)) return <T>this.instances.get(ctor);
    if (recursive && this.parent) return this.parent.getInstance(ctor, recursive);
    return null;
  }
}

const root = new Container();

export const container = root;
