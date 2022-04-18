import { currentInstance, setCurrentInstance } from './component'

export const enum LifecycleHooks {
  BEFORE_MOUNT = 'bm',
  MOUNTED = 'm',
  BEFORE_UPDATE = 'bu',
  UPDATED = 'u'
}
function createHook(type) {
  return (hook, target = currentInstance) => {
    // hook 需要绑定到对应的实例上。 我们之前写的依赖收集
    if (target) {
      // 关联此currentInstance和hook
      // currentInstance['bm'] = [fn, fn]
      const hooks = target[type] || (target[type] = [])
      const wrappedHook = () => {
        setCurrentInstance(target)
        hook() // 将当前实例保存到currentInstance上
        setCurrentInstance(null)
      }
      hooks.push(wrappedHook) // 稍后执行hook的时候 这个instance指代的是谁呢？
    }
  }
}

// 工厂模式
export const onBeforeMount = createHook(LifecycleHooks.BEFORE_MOUNT)
export const onMounted = createHook(LifecycleHooks.MOUNTED)
export const onBeforeUpdate = createHook(LifecycleHooks.BEFORE_UPDATE)
export const onUpdated = createHook(LifecycleHooks.UPDATED)
