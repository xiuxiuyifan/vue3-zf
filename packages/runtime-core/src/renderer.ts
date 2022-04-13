import { isString, ShapeFlags } from '@vue/shared'

import { Text, createVnode } from './'

export function createRenderer(renderOptions) {
  let {
    insert: hostInsert,
    remove: hostRemove,
    setElementText: hostSetElementText,
    setText: hostSetText,
    parentNode: hostParentNode,
    nextSibling: hostNextSibling,
    createElement: hostCreateElement,
    createText: hostCreateText,
    patchProp: hostPatchProp
  } = renderOptions

  const normalize = (children, i) => {
    // 检测如果是字符串的话，就把字符串转换成文本节点
    if (isString(children[i])) {
      let vnode = createVnode(Text, null, children[i])
      children[i] = vnode
    }
    return children[i]
  }
  /**
   * 挂载子节点
   * @param children
   * @param container
   */
  const mountChildren = (children, container) => {
    for (let i = 0; i < children.length; i++) {
      const child = normalize(children, i)
      patch(null, child, container)
    }
  }
  /**
   * 把虚拟节点递归转换成真实dom
   * @param vnode 虚拟节点
   * @param container 容器
   */
  const mountElement = (vnode, container) => {
    let { type, props, children, shapeFlag } = vnode
    // 根据 type 创建元素，并且把真实dom挂载到这个虚拟节点上
    let el = (vnode.el = hostCreateElement(type))

    // 如果有 props 就循环添加  props 包括 style class event attrs
    if (props) {
      for (let key in props) {
        hostPatchProp(el, key, null, props[key])
      }
    }
    // 如果是文本
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      hostSetElementText(el, children)
    }
    // 如果是数组
    else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(children, el)
    }
    // 把真实节点插入到容器中
    hostInsert(el, container)
  }

  const processText = (n1, n2, container) => {
    if (n1 === null) {
      // 创建出n2对应的真实dom，并且把真实dom挂载到这个虚拟节点上，并且把真实dom插入到容器中
      hostInsert((n2.el = hostCreateText(n2.children)), container)
    }
  }
  /**
   * 核心方法
   * @param n1 老的虚拟节点
   * @param n2 新的虚拟节点
   * @param container 容器
   */
  const patch = (n1, n2, container) => {
    // 老节点和新节点一样，这个时候不需要更新
    if (n1 === n2) {
      return
    }
    const { type, shapeFlag } = n2
    // 初次渲染，不需要更新
    if (n1 === null) {
      switch (type) {
        case Text:
          processText(n1, n2, container)
          break
        default:
          // 当前节点是元素
          if (shapeFlag & ShapeFlags.ELEMENT) {
            // 后序还有组建的初次渲染，目前是元素的初始化渲染
            mountElement(n2, container)
          }
      }
    } else {
      // 更新流程
    }
  }

  const unmount = (vnode) => {
    hostRemove(vnode.el)
  }
  /**
   *
   * @param vnode 虚拟节点
   * @param container 容器
   */
  const render = (vnode, container) => {
    if (vnode == null) {
      // 卸载的逻辑
      // 判断一下容器中是否有虚拟节点
      if (container._vnode) {
        unmount(container._vnode)
      }
    } else {
      // 第一次的时候 vnode 是 null
      // 第二次的时候就会从 容器上去取 vnode 进行走更新的逻辑
      patch(container._vnode || null, vnode, container)
    }
    // 在容器上保存一份 vnode
    container._vnode = vnode
  }
  return {
    render
  }
}

// 注意事项：
// 文本的处理需要自己添加类型，不能通过document.createElement来创建
// 如果传入的vnode 是 null的话，则是卸载逻辑，需要删除DOM节点
