import { isObject } from '@vue/shared'
import { trackEffects, triggerEffects } from './effect'
import { reactive } from './reactive'

function toReactive(value) {
  // 如果是对要转成 proxy 否则返回原始值
  return isObject(value) ? reactive(value) : value
}

class RefImpl {
  public dep = new Set()
  public _value
  public _v_isRef = true

  constructor(public rowValue) {
    this._value = toReactive(rowValue)
  }
  get value() {
    // 获取值的时候进行依赖收集
    // 把当前用到这个 ref 的 effect 副作用函数收集起来。
    trackEffects(this.dep)
    return this._value
  }

  set value(newValue) {
    // 新值和老值进行对比，如果不相等，则重新计算新值
    if (newValue !== this.rowValue) {
      this._value = toReactive(newValue)
      this.rowValue = newValue
      // 依次执行 effect
      triggerEffects(this.dep)
      // 设置完之后触发更新
    }
  }
}

export function ref(value) {
  return new RefImpl(value)
}
