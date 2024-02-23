# DI

IoC（Inversion of Control）控制反转，是面向对象编程中的一种设计原则，用来降低计算机代码之间的耦合度，而 DI 则是实现 IOC
的一种实现技术，简单来说就是我们将依赖注入给调用方，而不需要调用方来主动获取依赖。

<!-- TOC depthFrom:1 depthTo:3 -->

- [Features](#features)
- [Compatibility](#compatibility)
- [Install](#install)
- [Usage](#usage)
- [API](#api)
  - [Decorators](#decorators)
    - [@Injectable](#injectable)
    - [@Singleton](#singleton)
    - [@Inject](#inject)
  - [Service Identifier](#service-identifier)
  - [Provides](#providers)
    - [Value Provider](#value-provider)
    - [Class Provider](#class-provider)
    - [Factory Provider](#factory-provider)
    - [Token Provider](#token-provider)
  - [Life cycle](#life-cycle)
  - [Disposable](#disposable)
  - [ref](#ref)
  - [lazy](#lazy)
  - [Container](#container)
    - [resolve](#resolve)
    - [register](#register)
    - [dispose](#dispose)
    - [createChildContainer](#createchildcontainer)
- [Circular dependencies](#circular-dependencies)
- [License](#license)

<!-- /TOC -->

## Features

- 属性注入
- 构造函数注入
- 循环依赖支持
- 分层次依赖注入
- 支持多种 providers
- 支持多种生命周期管理如：单例

## Compatibility

支持 es2017 及以上版本。

以下为使用到的 es2015 以上的高级特性。
- Object.entries
- Array.includes

## Install

```shell

```

Modify your tsconfig.json to include the following settings:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

Add a polyfill for the Reflect API:

```typescript
// main.ts
import 'reflect-metadata';
// ...
```

## Usage

### 基本使用

属性注入和参数注入

```typescript
// 什么此类是可以被注入的。
@Injectable()
export class Bar {
  // 属性注入必须使用 @Inject
  @Inject() private foo: Foo;

  // 参数注入在注入 class 时可以不使用 @Inject
  constructor(private baz: Baz) {}
}

// 获取实例
const instance = container.resolve(Bar);
```

### 注入一个接口

`TypeScript` 中的 `interface` 是不存在于运行时的，所有我们不能获取 `interface` 的类型信息。
但是我们如果需要注入一个 `interface` 时，可以这样：

```typescript
interface Logger {
  info(message: string): void;
}

@Injectable()
export class UserService {
  constructor(@Inject('custom_logger') private logger: Logger) {}
}

// 实现了 Logger 接口的对象。
const log: Logger = {
  info(message: string) {
    console.info(message);
  },
};
// 向容器注册一个 logger 服务
// 建议使用 symbol 避免重复问题。
container.register('custom_logger', {useValue: log});
// 获取实例
container.resolve(UserService);
```

### 注入单例

实际运用中很多类都是可以复用的，不必每次都新创建一个浪费资源。
我们可以使用 `@Singleton` 或者为 `@Injectable` 传入 `Lifecycle.singleton` 参数来实现单例模式的效果。

```typescript
@Injectable(Lifecycle.singleton)
export class Logger {}

// 或者直接使用@Singleton装饰器
@Singleton()
export class Logger2 {}
```

## API

### Decorators

#### Injectable

标记一个 class 表示它是可注入的。 它具有一个可选的 Lifecycle 参数。默认：transient

```typescript
interface Injectable {
  (lifeCycle = Lifecycle.transient): ClassDecorator;
}
```

#### Singleton

它是 `Injectable` 装饰器的一个别名，它的 Lifecycle 参数为：singleton

```typescript
interface Singleton {
  (): ClassDecorator;
}
```

#### Inject

用于向一个 class 进行属性注入或者构造函数注入时使用，他会将一些需要的类型信息存储到 `class` 的元数据中。

它具有一个可选的参数。可以传入一个 `ServiceIdentifier<T>` 类型的参数。

- 属性注入必须使用 `@Inject` 。
- 构造函数参数注入时在注入的类型不是一个 `class` 时必须使用。
- 通过向 `@Inject` 装饰器传递参数将会覆盖声明的类型，此时 `TypeScript` 声明的参数类型与实际注入的可能会不同。

```typescript
interface Inject<T> {
  (token?: ServiceIdentifier<T>): PropertyDecorator | ParameterDecorator;
}
```

### Service Identifier

Service Identifier 的概念是作为一个类或者 provider 的 ID，可以通过此 ID，向容器注册它们的依赖关系。或者向容器获取其对应的服务实例。

```typescript
type ServiceIdentifier<T = unknown> = string | symbol | Token<T> | Constructor<T> | Ref<T> | Lazy<T>;
```

### Providers

向容器注册的服务提供者，该实现中支持四种 _provider_ 类型:

#### value provider

```typescript
interface ValueProvider<T> {
  // 任何非 undefined 的值都可以使用。
  useValue: T;
}
```

该 provider 用于向容器提供一些 JavaScript 基础类型值（不能是 undefined ）。

#### class provider

```typescript
interface ClassProvider<T> {
  useClass: Constructor<T>;
}
```

- class 没有被 `@Injectable` 装饰器装饰也可使用，但是其不能自动获取其依赖。在构造函数具有必传参数的场景下会抛出错误。
- 如果有使用此 `class` 作为 `ServiceIdentifier` 向容器注册过 `Provider` 时，则 `resolve` 时会优先使用注册的 `Provider`
  获取服务实例。

#### factory provider

```typescript
interface FactoryProvider<T> {
  useFactory: (container: Container) => T;
}
```

工厂函数在每次 resolve 时都会调用， 工厂函数中可以直接访问当前容器，可以使用容器获取其他的服务实例。

#### token provider

```typescript
interface TokenProvider<T> {
  useToken: ServiceIdentifier<T>;
}
```

此 `Provider` 可以认为是一个别名或者重定向功能。

在此 `Provider` 注册时会检查是否有构成循环依赖（`ServiceIdentifier` 的循环），如果有发现则会抛出错误。

### Life cycle

每个服务实例都有其对应的生命周期，不同生命周期有着不同的行为逻辑。默认都是 `transient`。

#### transient

默认的生命周期，即容器的每一次 `resolve` 都会创建一个全新的实例。

- 不会触发实例的 `dispose` 方法。

#### singleton

即单例，实例全局唯一且只会实例化一次。

- 任何层级的容器都能获取到这个生命周期的实例，并且获取到的都是同一个引用。
- 根容器调用 `dispose` 方法后，会触发所有具有此生命周期的实例的 `dispose` 方法。

#### container

实例在单个容器中是唯一的。不同容器会在首次 `resolve` 时创建一个实例。

- 会在其绑定的容器调用 `dispose` 方法时触发实例的 `dispose` 方法。

#### resolution

类似 `transient`，不同之处在于一次 `resolve` 的过程中创建的实例都是唯一的。

即：A 依赖 B 和 C ，B 依赖 C, 那么如果 C 的生命周期是 `resolution`, 那么 B 和 A 都将引用同一个 C 的实例。

#### skipContainer

类似 `container` 生命周期，但是子容器可以获取到父容器的实例。

- 子容器调用 `dispose` 方法时不会触发实例的 `dispose` 方法。

### Disposable

实现了此接口的实例，会在其绑定的容器 `dispose` 时触发。

- 任何实例的 `dispose` 方法如果抛出错误，会被忽略。

```typescript
interface Disposable {
  dispose(): Promise<void> | void;
}
```

### Ref

用于解决模块循环依赖的问题。`@Inject` 装饰器会从 reflect-metadata 中获取注入的类型信息。
但是如果出现模块循环依赖的情况，就拿不到正确的类型了。这时就可使用此方法解决。

> https://github.com/rbuckton/reflect-metadata/issues/135

```typescript
interface ref<T> {
  (r: () => Constructor<T>): Ref<T>;
}
```

### Lazy

用于解决类循环依赖的问题。使用此方法会，`resolve` 时不会真正的实例化一个类，而是为这个类创建一个 `proxy` 对象。
在第一次使用这个类时才会去实例化它，从而绕过循环依赖的问题。

`lazy` 包含了 `ref` 的功能。

```typescript
interface lazy<T> {
  (r: () => Constructor<T>): Lazy<T>;
}
```

### Container

Container 指的就是依赖注入（Dependency Injection，DI）容器就是一个对象，它知道怎样初始化并配置对象及其依赖的所有对象。

> [Inversion of Control Containers and the Dependency Injection pattern](https://martinfowler.com/articles/injection.html)

#### resolve

传入一个 `ServiceIdentifier` 以获取其对应的实例。

- 如果 resolve 的 class、Ref、Lazy 没有使用 `@Injectable` 或者 `Singleton` 则无法获取依赖，在构造函数存在必须参数时会抛出错误。
- 如果 resolve 的 class、Ref、Lazy 有注册过 `Provider` 则会从对应的 `Provider` 取值。
- 子容器可以从父容器的注册表中获取 Provider

```typescript
interface resolve<T> {
  (serviceIdentifier: ServiceIdentifier<T>): T;
}
```

#### register

向依赖注入容器注册一个 `Provider` ，容器再 `resolve` 会使用此 `Provider` 获取服务实例。

- 如果 `ServiceIdentifier` 和 `Provider` 是同一个 `class` 则可以省略 `Provider` 参数。
- 如果 `Provider` 参数是一个 `class provider` 时，可以直接传入对应的 `class`。

```typescript
interface register<T> {
  (constructor: Constructor<T>): void;

  (serviceIdentifier: ServiceIdentifier<T>, provider: Constructor<T>): void;

  (serviceIdentifier: ServiceIdentifier<T>, provider: ServiceProvider<T>): void;
}
```

#### dispose

当一个容器调用其 `dispose` 方法后，会触发所有与此容器绑定并实现的 `Disposable` 接口的实例的 `dispose` 方法。

- 单一个容器调用 `dispose` 方法后就无法继续使用了，后续调用任何方法都会抛出错误。
- `dispose` 方法会返回一个 `promise` ，在所有实例的 `dispose` 方法执行完毕后 `resolve`。
- 任何实例的 `dispose` 方法如果抛出错误，则忽略并吞掉这个错误继续执行。
- 如果实例的 `dispose` 方法存在必传参数，则认为没有实现 `Disposable` 接口。

```typescript
interface dispose {
  (): Promise<void>;
}
```

#### createChildContainer

创建一个子容器，用于实现分层次依赖注入。

- 子容器可以返回父容器注册的 `Provider`。
- 父容器无法访问和感知子容器。
- 如果某个 class 的生命周期是 skipContainer 则子容器还能获取父容器中的对应实例。

```typescript
interface createChildContainer {
  (): Container;
}
```

## Circular dependencies

在容器 resolve 过程如果发现有循环依赖会抛出一个错误：

> Discovery of circular dependencies: B -> A -> B

如果不能从代码上进行修复避免时可以参考下面的几种场景进行修复处理（实现中属性注入和参数注入行为一致）：

### 1. 类依赖循环。

```typescript
// a file
@Injectable()
class A {
  constructor(public b: B) {}
}

// b file
@Injectable()
class B {
  constructor(public a: A) {}
}

// main file
container.resolve(A);
```

以上案例 A 类和 B 类是互相依赖的关系。面对此问题如有必要可以使用：`lazy` 方法。

```typescript
@Injectable()
class A {
  constructor(@Inject(lazy(() => B)) public b: B) {}
}

// b file
@Injectable()
class B {
  constructor(@Inject(lazy(() => A)) public a: A) {}
}

// main file
container.resolve(A);
```

使用了 `lazy` 方法后，在 `resolve` 时会创建一个 `proxy` 对象没有真正的实例化。它会延迟到第一次访问实例才进行实例化。

### 2. 模块依赖循环。

在发现存在模块依赖循环的问题时，会抛出一个错误，如：

> Cannot inject dependency at #0 for constructor 'B01'. Could mean a circular dependency problem. Try using `ref` function.

示例:

```typescript
// a file
@Injectable()
class A {
  constructor(public b1: B1) {}
}

@Injectable()
class A1 {
  constructor() {}
}

// b file
@Injectable()
class B {
  constructor(public a1: A1) {}
}

// main file
container.resolve(A);
```

以上场景中 A 类的依赖关系为：`A -> B -> A1`

其中并没有出现类依赖循环，但是两个模块是有互相依赖的，在运行时一个模块将在另一个模块之前被解析，此时 `@Inject` 装饰器将拿不到正确的类型。

> https://github.com/rbuckton/reflect-metadata/issues/135

如果出现此场景时，建议是通过文件结构调整修复，也可以使用提供的 `ref` 方法解决。

```typescript
@Injectable()
class B {
  constructor(@Inject(ref(() => A1)) public a1: A1) {}
}
```

### 3. 模块依赖循环 + 类依赖循环

`lazy` 方法已包含了 `ref` 的功能，使用 `lazy` 方法即可。

## License

Di is [MIT licensed](./LICENSE).
