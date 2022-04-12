/**
 *
 * @param el DOM 元素
 * @param key 属性的key   属性格式 id=100
 * @param nextValue 新值
 */
export function patchAttr(el, key, nextValue) {
  if (nextValue) {
    el.setAttribute(key, nextValue)
  } else {
    el.removeAttribute(key)
  }
}
