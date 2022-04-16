import { isString, ShapeFlags } from '@vue/shared'
import { getSequence } from './sequence'

import { Text, createVnode, isSameVnode, Fragment } from './vnode'

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
  const mountElement = (vnode, container, anchor) => {
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
    hostInsert(el, container, anchor)
  }
  const unmount = (vnode) => {
    let { type } = vnode
    if (type === Fragment) {
      return unmountChildren(vnode.children)
    }
    hostRemove(vnode.el)
  }
  /**
   *
   * @param n1 老vnode
   * @param n2 新vnode
   * @param container
   */
  const processText = (n1, n2, container) => {
    if (n1 === null) {
      // 创建出n2对应的真实dom，并且把真实dom挂载到这个虚拟节点上，并且把真实dom插入到容器中
      hostInsert((n2.el = hostCreateText(n2.children)), container)
    }
    // 都是文本
    else {
      // 虽然文本的内容发生变化了，但是我们可以复用老的节点
      const el = (n2.el = n1.el)
      if (n1.children !== n2.children) {
        hostSetText(el, n2.children)
      }
    }
  }

  const patchProps = (oldProps, newProps, el) => {
    // 新的里面有直接用新的覆盖掉即可
    for (let key in newProps) {
      hostPatchProp(el, key, oldProps[key], newProps[key])
    }
    // {
    //   style: {color: 'red'}
    // }
    // {
    // }
    // 如果老的里面有新的里面没有，则是删除
    for (let key in oldProps) {
      if (newProps[key] == null) {
        hostPatchProp(el, key, oldProps[key], undefined)
      }
    }
  }

  //卸载儿子
  const unmountChildren = (children) => {
    for (let i = 0; i < children.length; i++) {
      unmount(children[i])
    }
  }

  const patchKeyedChildren = (c1, c2, el) => {
    let i = 0
    let e1 = c1.length - 1
    let e2 = c2.length - 1

    while (i <= e1 && i <= e2) {
      const n1 = c1[i]
      const n2 = c2[i]
      // 这样做就是比较两个节点的属性和子节点
      if (isSameVnode(n1, n2)) {
        patch(n1, n2, el)
      } else {
        break
      }
      i++
    }
    console.log(i, e1, e2)
    while (i <= e1 && i <= e2) {
      const n1 = c1[e1]
      const n2 = c2[e2]
      if (isSameVnode(n1, n2)) {
        patch(n1, n2, el)
      } else {
        break
      }
      e1--
      e2--
    }
    console.log(i, e1, e2)
    // 有一方比较完了，要么就新增，要么就删除
    if (i > e1) {
      if (i <= e2) {
        while (i <= e2) {
          const nextPos = e2 + 1
          //根据下一个人的索引来看参照物
          // 如果下一个索引小于新节点的长度那么就是在新节点的前面插入，否则就是在尾部插入
          const anchor = nextPos < c2.length ? c2[nextPos].el : null
          patch(null, c2[i], el, anchor)
          i++
        }
      }
    } else if (i > e2) {
      if (i <= e1) {
        while (i <= e1) {
          unmount(c1[i])
          i++
        }
      }
    }

    // common sequence + unmount
    // i比e2大说明有要卸载的
    // i到e1之间的就是要卸载的

    // 优化完毕************************************
    // 乱序比对
    let s1 = i
    let s2 = i
    const keyToNewIndexMap = new Map() // key -> newIndex
    for (let i = s2; i <= e2; i++) {
      keyToNewIndexMap.set(c2[i].key, i)
    }

    // 循环老的元素 看一下新的里面有没有，如果有说明要比较差异，没有要添加到列表中，老的有新的没有要删除
    const toBePatched = e2 - s2 + 1 // 新的总个数
    const newIndexToOldIndexMap = new Array(toBePatched).fill(0) // 一个记录是否比对过的映射表
    for (let i = s1; i <= e1; i++) {
      const oldChild = c1[i] // 老的孩子
      let newIndex = keyToNewIndexMap.get(oldChild.key) // 用老的孩子去新的里面找
      if (newIndex == undefined) {
        unmount(oldChild) // 多余的删掉
      } else {
        // 新的位置对应的老的位置 , 如果数组里放的值>0说明 已经pactch过了
        newIndexToOldIndexMap[newIndex - s2] = i + 1 // 用来标记当前所patch过的结果
        patch(oldChild, c2[newIndex], el)
      }
    } // 到这这是新老属性和儿子的比对，没有移动位置

    // 获取最长递增子序列
    let increment = getSequence(newIndexToOldIndexMap)

    // 需要移动位置
    let j = increment.length - 1
    for (let i = toBePatched - 1; i >= 0; i--) {
      // 3 2 1 0
      let index = i + s2
      let current = c2[index] // 找到h
      let anchor = index + 1 < c2.length ? c2[index + 1].el : null
      if (newIndexToOldIndexMap[i] === 0) {
        // 创建   [5 3 4 0]  -> [1,2]
        patch(null, current, el, anchor)
      } else {
        // 不是0 说明是已经比对过属性和儿子的了
        if (i != increment[j]) {
          hostInsert(current.el, el, anchor) // 目前无论如何都做了一遍倒叙插入，其实可以不用的， 可以根据刚才的数组来减少插入次数
        } else {
          j--
        }
      }
      // 这里发现缺失逻辑 我需要看一下current有没有el。如果没有el说明是新增的逻辑
      // 最长递增子序列来实现  vue2 在移动元素的时候会有浪费  优化
    }
  }
  /**
   *
   * @param n1 老节点
   * @param n2 新节点
   * @param el
   */
  const patchChildren = (n1, n2, el) => {
    const c1 = n1.children
    const c2 = n2.children
    const prevShapeFlag = n1.shapeFlag
    const { shapeFlag } = n2

    // 新节点是文本
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // 如果旧节点是数组
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // 卸载老的儿子节点
        unmountChildren(c1)
      }
      // 文本 文本
      // 文本 空
      // 上面的情况也会走这个逻辑
      if (c1 !== c2) {
        hostSetElementText(el, c2)
      }
    } else {
      // 如果老的是数组
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // 新节点和老节点都是数组
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          patchKeyedChildren(c1, c2, el)
        }
        // 之前是数组，现在不是数组，就把之前的删掉
        // 现在不是数组 （文本和空 删除以前的）
        else {
          unmountChildren(c1)
        }
      } else {
        // 老的是文本，新的也是文本
        if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
          hostSetElementText(el, '')
        }
        // 老的是文本新的是数组
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          mountChildren(c2, el)
        }
      }
    }
  }

  // 先复用节点、再比较属性、再比较儿子。
  const patchElement = (n1, n2) => {
    // 复用节点
    let el = (n2.el = n1.el)
    let oldProps = n1.props || {}
    let newProps = n2.props || {}
    // 对比属性
    patchProps(oldProps, newProps, el)
    // 对比儿子
    patchChildren(n1, n2, el)
  }
  const processElement = (n1, n2, container, anchor) => {
    if (n1 === null) {
      mountElement(n2, container, anchor)
    } else {
      // 更新逻辑
      patchElement(n1, n2)
    }
  }

  const processFragment = (n1, n2, container) => {
    if (n1 == null) {
      mountChildren(n2.children, container)
    } else {
      patchChildren(n1, n2, container)
    }
  }
  /**
   * 核心方法
   * @param n1 老的虚拟节点
   * @param n2 新的虚拟节点
   * @param container 容器
   */
  const patch = (n1, n2, container, anchor = null) => {
    // 老节点和新节点一样，这个时候不需要更新
    if (n1 === n2) {
      return
    }
    // 判断两个元素是否相同，如果不相同，先把老的节点卸载，
    // 然后再执行后面的逻辑
    if (n1 && !isSameVnode(n1, n2)) {
      unmount(n1)
      n1 = null
    }
    const { type, shapeFlag } = n2
    // 初次渲染，不需要更新
    switch (type) {
      case Text:
        processText(n1, n2, container)
        break
      case Fragment:
        processFragment(n1, n2, container)
        break
      default:
        // 当前节点是元素
        if (shapeFlag & ShapeFlags.ELEMENT) {
          // 后序还有组建的初次渲染，目前是元素的初始化渲染
          processElement(n1, n2, container, anchor)
        }
    }
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

// 更新的情况分析：
// 1.如果前后完全没有关系 div -> p ，那么久删除老的 添加新的节点
// 2.老的和新的一样，如果属性不一样，就比对属性，然后更新属性
// 3.如果属性都一样，就比较儿子
