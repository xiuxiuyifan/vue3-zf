import { isArray, isObject } from '@vue/shared'
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

class ObjectRefImpl {
  constructor(public object, public key) {}

  get value() {
    return this.object[this.key]
  }
  set value(newValue) {
    this.object[this.key] = newValue
  }
}

export function toRef(object, key) {
  return new ObjectRefImpl(object, key)
}

/**
 * 只是给每一个对象的属性都包装了一个 .value 的属性
 * @param object 原理的代理对象
 * @returns
 */
export function toRefs(object) {
  const result = isArray(object) ? new Array(object.length) : {}
  for (let key in object) {
    result[key] = toRef(object, key)
  }
  return result
}

export function proxyRefs(object) {
  return new Proxy(object, {
    get(target, key, receive) {
      let r = Reflect.get(target, key, receive)
      return r._v_isRef ? r.value : r
    },
    set(target, key, value, receive) {
      let oldValue = target[key]
      // 如果是 ref 就改写原来值的 .value 属性
      if (oldValue._v_isRef) {
        oldValue.value = value
        return true
      } else {
        Reflect.set(target, key, value, receive)
      }
    }
  })
}
