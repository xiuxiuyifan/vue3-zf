export function patchClass(el, nextValue) {
  if (nextValue == null) {
    // 不需要 class 则直接移除
    el.removeAttribute('class')
  } else {
    el.className = nextValue
  }
}
