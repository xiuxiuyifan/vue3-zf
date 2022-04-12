import { createRenderer } from '@vue/runtime-core'
import { nodeOps } from './nodeOps'
import { patchProp } from './patchProp'

// 渲染器渲染的参数
const renderOptions = Object.assign(nodeOps, { patchProp })

export function render(vnode, container) {
  // 在创建渲染器的时候  传入选项
  createRenderer(renderOptions).render(vnode, container)
}

export * from '@vue/runtime-core'
