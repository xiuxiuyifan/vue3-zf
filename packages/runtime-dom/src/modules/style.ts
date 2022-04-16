export function patchStyle(el, prevValue, nextValue = {}) {
  // 先直接用新的覆盖老的
  for (let key in nextValue) {
    el.style[key] = nextValue[key]
  }

  // 如果老的里面有， 新的里面没有，则需要删除
  // {color: 'blue', width: '20px'}   老的
  // {color: 'red', height: '100px'}   新的
  // 这里先把新的全部给DOM节点赋值，然后循环老的，如果发现老的属性已经不在新的里面了，则需要将当前属性删除掉

  for (let key in prevValue) {
    if (nextValue[key] == null || nextValue[key] == undefined) {
      el.style[key] = null
    }
  }
}
