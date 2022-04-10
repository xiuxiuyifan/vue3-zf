import { isFunction } from '@vue/shared'
import { ReactiveEffect, trackEffects, triggerEffects } from './effect'

class ComputedRefImpl {
  public effect
  public _dirty = true // 默认是脏的 取值的时候进行计算
  public _value
  public dep = new Set()
  constructor(getter, public setter) {
    // 将用户传递的 getter 函数当做 effect 的副作用函数收集起来
    // 这个时候 firstName 和 lastName 都会被收集起来
    this.effect = new ReactiveEffect(getter, () => {
      // 数据变化之后就走调度器函数
      if (!this._dirty) {
        this._dirty = true
        // 实现触发更新
        triggerEffects(this.dep)
      }
    })
  }
  get value() {
    // 计算属性也要进行依赖收集
    trackEffects(this.dep)
    // 用  dirty 来做缓存
    if (this._dirty) {
      // 如果这个值是脏的，就让 effect 副作用函数执行一下
      this._dirty = false
      this._value = this.effect.run()
    }
    return this._value
  }
  set value(newValue) {
    this.setter(newValue)
  }
}

export const computed = (getterOrOptions) => {
  let onlyGetter = isFunction(getterOrOptions)

  let getter
  let setter
  // 如果参数是函数
  if (onlyGetter) {
    getter = getterOrOptions
    setter = () => {
      console.warn('no set')
    }
  } else {
    getter = getterOrOptions.get
    setter = getterOrOptions.set
  }
  return new ComputedRefImpl(getter, setter)
}
