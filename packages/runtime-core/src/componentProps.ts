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
