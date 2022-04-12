// 这个函数的作用就是修改 DOM 节点上的属性的值
// 属性可以分为  class、style、attr、event

import { patchAttr } from './modules/attr'
import { patchClass } from './modules/class'
import { patchEvent } from './modules/event'
import { patchStyle } from './modules/style'

/**
 *
 * @param el 一个 DOM 元素
 * @param key
 * @param prevValue  老值
 * @param nextValue  新值
 */
export function patchProp(el, key, prevValue, nextValue) {
  if (key === 'class') {
    patchClass(el, nextValue)
  } else if (key === 'style') {
    patchStyle(el, prevValue, nextValue)
  } else if (/^on[^a-z]/.test(key)) {
    // 这里的 key 是事件名称
    patchEvent(el, key, nextValue)
  } else {
    // 这里的 key 是属性名称
    patchAttr(el, key, nextValue)
  }
}
