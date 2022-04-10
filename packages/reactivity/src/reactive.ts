import { isObject } from '@vue/shared'
import { mutableHandler, ReactiveFlags } from './baseHandler'

let reactiveMap = new WeakMap()

/**
 *
 * @param value 判断某个对象是不是响应式的
 * @returns
 */
export function isReactive(value) {
  return !!(value && value[ReactiveFlags.IS_REACTIVE])
}

export function reactive(obj) {
  // 如果不是对象直接 return
  if (!isObject) {
    return
  }
  // 如果可以触发 get 函数，就说明传入的对象已经被代理过了，就直接返回该对象
  if (obj[ReactiveFlags.IS_REACTIVE]) {
    return obj
  }
  // 如果在缓存的 map 里面能找见，说明已经被代理过了，就直接返回该对象
  let existProxy = reactiveMap.get(obj)
  if (existProxy) {
    return existProxy
  }

  const proxy = new Proxy(obj, mutableHandler)
  reactiveMap.set(obj, proxy)
  return proxy
}
