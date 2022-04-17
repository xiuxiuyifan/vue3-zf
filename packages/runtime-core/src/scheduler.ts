const queue = []
let isFlushing = false

const resolvePromise = Promise.resolve()

export function queueJob(job) {
  if (!queue.includes(job)) {
    queue.push(job)
  }
  if (!isFlushing) {
    isFlushing = true
    resolvePromise.then(() => {
      isFlushing = false
      for (let i = 0; i < queue.length; i++) {
        queue[i]()
      }
      queue.length = 0
    })
  }
}
