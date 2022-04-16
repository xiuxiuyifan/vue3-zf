// 记录当前正在执行的 effect 副作用函数
export let activeEffect = undefined

function cleanupEffect(effect) {
  const { deps } = effect // deps 里面装的就是 name age 对应的 effect实例
  for (let i = 0; i < deps.length; i++) {
    deps[i].delete(effect) // 这里为啥是删除 effect
  }
  effect.deps.length = 0
}

export class ReactiveEffect {
  // 表示当前 副作用函数是否激活
  active = true
  // 记录着 effect 被那些属性所使用？
  deps = []
  //
  parent = null
  constructor(public fn, public scheduler?) {}
  run() {
    // 没有激活则不用收集依赖，只要执行函数就行了
    if (!this.active) {
      this.fn()
    }
    // 这里进行依赖收集，将当前 的 effect 和 副作用函数里面的属性关联起来
    try {
      // 在当前的 effect 的属性上记录上一个 effect
      this.parent = activeEffect
      activeEffect = this
      // 在收集依赖之前先清除依赖信息, 这块清除的应该是不同 key 的相同依赖。
      cleanupEffect(this)
      return this.fn() // 执行副作用函数，在副作用函数里面就可以拿到全局的 activeEffect 了。
    } finally {
      // 当执行完 副作用函数的时候就把正咋激活的 effect 设置为上层的 effect实例
      activeEffect = this.parent
    }
  }
  stop() {
    if (this.active) {
      this.active = false
      cleanupEffect(this) // 停止收集 effect
    }
  }
}

export function effect(fn, options: any = {}) {
  const _effect = new ReactiveEffect(fn, options.scheduler)
  _effect.run() // 默认执行一次 副作用函数

  const runner = _effect.run.bind(_effect)
  runner.effect = _effect // 将 effect 挂载到 runner 函数上面
  return runner
}

// 依赖收集
/**
 *
 * @param target 代理的原始值
 * @param type 区分get 还是 set
 * @param key 依赖了那个对象上的 key
 */

const targetMap = new WeakMap() // obj : {key: [effect1, effect2]}

export function track(target, type, key) {
  //如果当前没有正在执行的副作用函数，就不收集依赖信息
  if (!activeEffect) return
  let depsMap = targetMap.get(target) //第一次肯定没有值
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map())) // 就把它设置为一个 空的 map    obj : {}
  }
  // 从 map 里面根据 key 取 effect 依赖
  let dep = depsMap.get(key)
  if (!dep) {
    depsMap.set(key, (dep = new Set())) // obj: {key: []}
  }
  trackEffects(dep)
}

export function trackEffects(dep) {
  if (activeEffect) {
    // 检测一下 set 里面有没有当前的这个 effect
    // 没有的时候可以添加
    let shouldTrack = !dep.has(activeEffect)
    if (shouldTrack) {
      // 后面如果一个对象的属性被依赖多次， 就一直往当前的 dep 里面添加 依赖信息就可以了。
      dep.add(activeEffect)
      // effect 记住它所有的依赖，在清理的时候会用到的
      activeEffect.deps.push(dep)
    }
  }
}

// 触发更新
/**
 *
 * @param target
 * @param type
 * @param key
 * @param value
 * @param oldValue
 */
export function trigger(target, type, key, value, oldValue) {
  // 根据 target 和 key 取出 依赖信息，并执行即可

  let depsMap = targetMap.get(target)
  if (!depsMap) return // 触发的值没有在 模板中使用
  let effects = depsMap.get(key) // 找到 key 对应的 effect 了
  if (effects) {
    triggerEffects(effects)
  }
}

export function triggerEffects(effects) {
  // 在执行之前先拷贝一份，来执行，不要关联引用
  effects = new Set(effects)
  effects.forEach((effect) => {
    // 在调用 effect 的时候，如果右要执行自己，则就不需要调用
    if (effect !== activeEffect) {
      if (effect.scheduler) {
        effect.scheduler() // 如果用户传递了 调度函数，那么久调用调度函数
      } else {
        // 否则就执行 effect 副作用函数
        effect.run()
      }
    }
  })
}
