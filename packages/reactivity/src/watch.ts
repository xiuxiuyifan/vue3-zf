import { isFunction, isObject } from '@vue/shared'
import { ReactiveEffect } from './effect'
import { isReactive } from './reactive'

/**
 *
 * @param value
 * @param set   考虑循环引用的问题
 * @returns
 */
function traversal(value, set = new Set()) {
  if (~isObject(value)) {
    return value
  }
  if (set.has(value)) {
    return value
  }
  set.add(value)
  for (let key in value) {
    traversal(value[key], set)
  }
  return value
}

/**
 *
 * @param source用户传递的对象
 * @param cb
 */
export function watch(source, cb) {
  let getter
  if (isReactive(source)) {
    // 进行一个递归访问
    getter = () => traversal(source)
  } else if (isFunction(source)) {
    getter = source
  }
  let cleanup
  const onCleanup = (fn) => {
    cleanup = fn // 保存用户的函数
  }
  let oldValue

  // 当 watch 的值发生变化的时候就会触发 scheduler 调度函数执行，这个时候再执行用户传递的 callback 函数
  // 以及把新老值传递给 callback 函数
  const job = () => {
    if (cleanup) cleanup() // 下一次watch 执行的时候就会触发上一次 watch 的清理
    const newValue = effect.run()
    cb(newValue, oldValue, onCleanup)
    oldValue = newValue
  }
  const effect = new ReactiveEffect(getter, job)

  oldValue = effect.run()
}

// watch = effect 内部会保存老值和新值，并传递给 callback 函数
