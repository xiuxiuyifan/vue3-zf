import { reactive } from '@vue/reactivity'
import { hasOwn } from '@vue/shared'

export function initProps(instance, rawProps) {
  const props = {}
  const attrs = {}

  const options = instance.propsOptions || {}

  if (rawProps) {
    for (let key in rawProps) {
      const value = rawProps[key]
      if (hasOwn(options, key)) {
        props[key] = value
      } else {
        attrs[key] = value
      }
    }
  }
  // 这里props不希望在组件内部被更改，但是props得是响应式的，因为后续属性变化了要更新视图， 用的应该是shallowReactive
  instance.props = reactive(props)
  instance.attrs = attrs
}

export const hasPropsChanged = (prevProps = {}, nextProps = {}) => {
  const nextKeys = Object.keys(nextProps)
  if (nextKeys.length !== Object.keys(prevProps).length) {
    return true
  } // 比对属性前后 个数是否一致
  for (let i = 0; i < nextKeys.length; i++) {
    const key = nextKeys[i]
    if (nextProps[key] !== prevProps[key]) {
      return true
    }
  } // 比对属性对应的值是否一致  {a:{xxx:xxx}} {a:{qqq:qq}}
  return false
}

export function updateProps(prevProps, nextProps) {
  // 看一下属性有没有变化
  // 值的变化 ，属性的个数是否发生变化
  for (const key in nextProps) {
    prevProps[key] = nextProps[key]
  }
  for (const key in prevProps) {
    if (!hasOwn(nextProps, key)) {
      delete prevProps[key]
    }
  }
}
