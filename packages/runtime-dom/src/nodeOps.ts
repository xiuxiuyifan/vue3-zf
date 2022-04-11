// 实现 dom 节点 的 增加 删除 修改 查询
export const nodeOps = {
  insert(child, parent, anchor = null) {
    parent.insertBefore(child, anchor) // 如果没有参考的元素，就相当于 appendChild
  },
  remove(child) {
    let parentNode = child.parentNode
    if (parentNode) {
      parentNode.removeChild(child)
    }
  },
  setElementText(el, text) {
    el.textContent = text
  },
  setText(node, text) {
    node.nodeValue = text
  },
  querySelector(selector) {
    document.querySelector(selector)
  },
  parentNode(node) {
    return node.parentNode
  },
  nextSibling(node) {
    return node.nextSibling
  },
  createElement(tagName) {
    return document.createElement(tagName)
  },
  createText(text) {
    return document.createTextNode(text)
  }
}
