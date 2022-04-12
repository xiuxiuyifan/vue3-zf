function createInvoker(callback) {
  // 在当前的事件函数上面添加一个属性，用来缓存事件函数，这样如果事件函数发生变化了，就不用频繁的调用 addEventListener函数
  // 进行绑定，只需要修改 事件函数的.value 属性即可。
  const invoker = (e) => invoker.value(e)
  invoker.value = callback
  return invoker
}

// el._vei 的数据结构
// {
//   click: invoker1    invoker1.value,
//   change: invoke2    invoke2.value
// }
// 在这里做了一个缓存，将事件绑定都缓存在 当前的DOM上面
export function patchEvent(el, eventName, nextValue) {
  let invokers = el._vei || (el._vei = {})
  let exits = invokers[eventName]
  // 如果已经绑定过了，并且有新的事件，则修改原来的 .value 即可
  if (exits && nextValue) {
    exits.value = nextValue
  } else {
    let event = eventName.slice(2).toLowerCase()
    // 如果有新的事件
    if (nextValue) {
      const invoker = (invokers[eventName] = createInvoker(nextValue))
      el.addEventListener(event, invoker)
    } else if (exits) {
      // 绑定过 但是没有新值，则需要移除事件
      el.removeEventListener(event, exits)
      invokers[eventName] = null // 清空相应的事件缓存
    }
  }
}
