export function getSequence(arr) {
  const len = arr.length
  const result = [0] // 以默认第0个为基准来做序列
  const p = new Array(len).fill(0) // 最后要标记索引 **放的东西不用关心，但是要和数组一样长**
  let start
  let end
  let middle
  let resultLastIndex
  for (let i = 0; i < len; i++) {
    let arrI = arr[i]
    if (arrI !== 0) {
      // 因为vue里面的序列中0 意味着没有意义需要创建
      resultLastIndex = result[result.length - 1]
      if (arr[resultLastIndex] < arrI) {
        // 比较最后一项和当前项的值，如果比最后一项大，则将当前索引放到结果集中
        result.push(i)

        p[i] = resultLastIndex // 当前放到末尾的要记住他前面的那个人是谁
        continue
      }
      // 这里我们需要通过二分查找，在结果集中找到比当前值大的，用当前值的索引将其替换掉
      // 递增序列 采用二分查找 是最快的
      start = 0
      end = result.length - 1
      while (start < end) {
        // start === end的时候就停止了  .. 这个二分查找在找索引
        middle = ((start + end) / 2) | 0
        // 1 2 3 4 middle 6 7 8 9   6
        if (arr[result[middle]] < arrI) {
          start = middle + 1
        } else {
          end = middle
        }
      }
      // 找到中间值后，我们需要做替换操作  start / end
      if (arr[result[end]] > arrI) {
        // 这里用当前这一项 替换掉以有的比当前大的那一项。 更有潜力的我需要他
        result[end] = i
        p[i] = result[end - 1] // 记住他的前一个人是谁
      }
    }
  }
  // 1) 默认追加
  // 2) 替换
  // 3) 记录每个人的前驱节点
  // 通过最后一项进行回溯
  let i = result.length
  let last = result[i - 1] // 找到最后一项了
  while (i-- > 0) {
    // 倒叙追溯
    result[i] = last // 最后一项是确定的
    last = p[last]
  }
  return result
}
