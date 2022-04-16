import { isArray, isString, ShapeFlags } from '@vue/shared'

export const Text = Symbol(`Text`)
export const Fragment = Symbol(`Fragment`)

export const isSameVnode = (n1, n2) => {
  return n1.key === n2.key && n1.type === n2.type
}

export function createVnode(type, props, children = null) {
  let shapeFlag = isString(type) ? ShapeFlags.ELEMENT : 0

  const vnode = {
    type,
    props,
    children,
    key: props?.key,
    __v_isVnode: true,
    shapeFlag // 定义节点的类型
  }

  if (children) {
    let type = 0
    if (isArray(children)) {
      type = ShapeFlags.ARRAY_CHILDREN // 标识儿子是数组
    } else {
      children = String(children)
      type = ShapeFlags.TEXT_CHILDREN
    }
    vnode.shapeFlag |= type // 计算得出这个元素的类型
  }

  return vnode
}

export function isVnode(value) {
  return !!(value && value.__v_isVnode) // 看有没有__v_isVnode 这个属性并转换成布尔值
}
