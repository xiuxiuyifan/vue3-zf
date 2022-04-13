// 实现 dom 节点 的 增加 删除 修改 查询
export const nodeOps = {
  // 插入节点
  insert(child, parent, anchor = null) {
    parent.insertBefore(child, anchor) // 如果没有参考的元素，就相当于 appendChild
  },
  // 移除节点
  remove(child) {
    let parentNode = child.parentNode
    if (parentNode) {
      parentNode.removeChild(child)
    }
  },
  // 设置元素文本
  setElementText(el, text) {
    el.textContent = text
  },
  // 设置文本节点内容
  setText(node, text) {
    node.nodeValue = text
  },
  // 查询元素
  querySelector(selector) {
    document.querySelector(selector)
  },
  // 返回元素的父节点
  parentNode(node) {
    return node.parentNode
  },
  // 返回元素的下一个兄弟节点
  nextSibling(node) {
    return node.nextSibling
  },
  // 创建元素
  createElement(tagName) {
    return document.createElement(tagName)
  },
  //创建文本节点
  createText(text) {
    return document.createTextNode(text)
  }
}
