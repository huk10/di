// 以下所有生命周期都只能在 class 和 class provider 上使用。
export enum LifeCycle {
  // 单例-全局单例。无论在哪个容器 resolve 都只会获取一个唯一实例。
  singleton = 'singleton',
  // 每次 resolve 都会实例化一个新的实例。
  transient = 'transient',
  // 实例的生命周期会跟随容器，如果一个 class 会在多个容器下使用，那么每个容器都会有一个实例。但是单个容器下是唯一的。
  // 子容器不会使用父容器的实例，如果容器调用了 dispose 方法，会触发所有绑定这个容器的实例的 dispose 方法。需要实例实现 Disposed 接口。
  container = 'container',
  // 类似 container 但是子容器会使用父容器的实例，子容器 dispose 时不会触发父容器的实例的 dispose 方法。
  skipContainer = "skipContainer",
  // 一次解析过程中的共同依赖的实例为单例如：A 依赖 B 和 C ，B 依赖 C, 那么如果 C 的 scope 是 resolution, B 和 A 都将引用同一个实例。
  resolution = "resolution",
}

