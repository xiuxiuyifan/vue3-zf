import { isObject } from '@vue/shared'
import { track, trigger } from './effect'
import { reactive } from './reactive'

export const enum ReactiveFlags {
  IS_REACTIVE = '__v_isReactive'
}

export const mutableHandler = {
  get(target, key, receive) {
    // 说明已经代理过了，可以触发 get 函数了
    if (key === ReactiveFlags.IS_REACTIVE) {
      return true
    }
    // 依赖收集
    track(target, 'get', key)
    let res = Reflect.get(target, key, receive)
    // 取值的时候才会进行代理， 判断值如果是object 的话才给数据添加响应式
    if (isObject(res)) {
      return reactive(res)
    }
    return res
  },
  set(target, key, value, receive) {
    let oldValue = target[key]
    let result = Reflect.set(target, key, value, receive)
    // 如果新值和老值不相等的时候再触发更新
    if (oldValue !== value) {
      trigger(target, 'set', key, value, oldValue)
    }
    return result
  }
}
