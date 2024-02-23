// 纯手动注册场景。
// 1. 使用（字符串、symbol、Token）注册一个 provider (支持的4中provider) 并 resolve 。
// 2. 使用 class 或者 ref 和 lazy 包裹的 class 作为 Token 注册一个 provider 时。并对这个 class 使用 @Injectable。
//  2.1 如果 provider 不是这个 class 的话，任何位置使用 class 作为 Token 时 resolve 时都以注册的 provider 优先。也就是覆盖了 @Injectable
// 2.2 如果没传 provider 参数，或者 provider 参数是 class provider 并且 useClass 是其本身的话。与 @Injectable 一致。(需要处理循环依赖问题)
// 2.3 如果 class 没有使用 @Injectable 也是如此逻辑。
