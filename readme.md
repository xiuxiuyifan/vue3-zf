## 仓库地址

[github](https://github.com/xiuxiuyifan/vue3-zf)  欢迎 start 和 一起学习 ^_^。

## 环境搭建

安装 pnpm

```bash
npm install -g pnpm@next-7

```

### 新建项目

```bash
mkdir vue3-zf

cd vue3-zf

pnpm init
```

配置 Monorepo

+pnpm-workspace.yaml

```shell
packages:
  - 'packages/**'

```

### 安装 vue

```shell
pnpm install vue -w
```

幽灵依赖， 就比如说， 我们在使用 express 这个包的时候，express 依赖了 connect 这个包，但是它在 node_modules 下面不会显示，但是在代码里面我们又可以使用 connect 这个包，我们的目的就是把这些依赖全部安装在 node_module 下面。

创建.npmrc 文件

```shell
shamefully-hoist = true
```

| 依赖                        |                           |
| --------------------------- | ------------------------- |
| typescript                  | 在项目中支持Typescript    |
| rollup                      | 打包工具                  |
| rollup-plugin-typescript2   | rollup 和 ts的 桥梁       |
| @rollup/plugin-json         | 支持引入json              |
| @rollup/plugin-node-resolve | 解析node第三方模块        |
| @rollup/plugin-commonjs     | 将CommonJS转化为ES6Module |
| minimist                    | 命令行参数解析            |
| execa@4                     | 开启子进程                |

```bash
pnpm install typescript rollup rollup-plugin-typescript2 @rollup/plugin-json @rollup/plugin-node-resolve @rollup/plugin-commonjs minimist execa@4 esbuild   -D -w
```

### 初始化TS

```ba
pnpm tsc --init
```

### 创建模块

> 我们现在`packages`目录下新建两个package

- reactivity 响应式模块
- shared 共享模块

**所有包的入口均为`src/index.ts` 这样可以实现统一打包**

reactivity/package.json

```json
{
  "name": "@vue/reactivity",
  "version": "1.0.0",
  "main": "index.js",
  "module":"dist/reactivity.esm-bundler.js",
  "unpkg": "dist/reactivity.global.js",
  "buildOptions": {        // 自定义属性
    "name": "VueReactivity",    // 打包后全局的名字
    "formats": [     
      "esm-bundler",   // 
      "cjs",
      "global"
    ]
  }
}
```

shared/package.json

```json{
{
    "name": "@vue/shared",
    "version": "1.0.0",
    "main": "index.js",
    "module": "dist/shared.esm-bundler.js",
    "buildOptions": {
        "formats": [
            "esm-bundler",
            "cjs"
        ]
    }
}
```

> **formats**为自定义的打包格式，有
>
> `esm-bundler`在构建工具中使用的格式、
>
> `esm-browser`在浏览器中使用的格式、
>
> `cjs`在node中使用的格式、
>
> `global`立即执行函数的格式

配置`ts`引用关系

```json
"baseUrl": ".",
"paths": {
	"@vue/*": ["packages/*/src"]    //  
}
```



## 实现构建流程

### 开发环境esbuild打包

创建开发时执行的脚本， 参数是要打包的模块

执行 script/dev.js 脚本， 打包那个模块 -f 以那种方式进行打包。

```json
 "scripts": {
    "dev": "node scripts/dev.js reactivity -f global"
  },
```

一般类库的策略就是： 开发环境下使用 `esbuild`、生产环境下使用`rollup`

```js
nodejs 
console.log(process.argv)   
```



![image-20220405150420888](https://picture-stores.oss-cn-beijing.aliyuncs.com/img/image-20220405150420888.png)

使用 `minimist` 

minimist轻量级的命令行参数解析引擎。

example/parse.js

```js
var argv = require('minimist')(process.argv.slice(2));
console.log(argv);
```

```bash
$ node example/parse.js -a beep -b boop
{ _: [], a: 'beep', b: 'boop' }
```

用这个包，可以解析出执行脚本的时候，命令行里面的参数。

scripts/dev.js

```js
const { build } = require('esbuild')
const { resolve } = require('path')

// 解析命令行参数
const args = require('minimist')(process.argv.slice(2))

// 获取打包那个模块
const target = args._[0] || 'reactivity'
// 获取打包格式
const format = args.f || 'global'

const pkg = resolve(__dirname, `../packages/${target}/package.json`)

const outfile = resolve(__dirname, `../packages/${target}/dist/${target}.${format}.js`)

// iife (function(){})()  立即执行函数
// cjs node中的模块 module.exports
// esm 浏览器中的 esModule import

const outputFormat = format.startsWith('global') ? 'iife' : format === 'cjs' ? 'cjs' : 'esm'

build({
  entryPoints: [resolve(__dirname, `../packages/${target}/src/index.ts`)], // 入口文件
  outfile, // 打包输出文件的位置
  bundle: true, // 将任何导入的依赖内联到文件本身中去，这个过程是递归的，因此依赖关系也会被内联
  sourcemap: true,
  format: outputFormat, // 输出的格式
  globalName: pkg.buildOptions?.name, //全局挂载的时候的名字  window.xxx
  platform: format === 'cjs' ? 'node' : 'browser',
  watch: {
    // 监听文件变化
    onRebuild(error) {
      if (!error) {
        console.log(`rebuilt`)
      }
    }
  }
}).then(() => {
  console.log('watching...')
})

```

运行 pnpm run dev ,可以看见打包文件已经生成好了。

![image-20220405160155360](https://picture-stores.oss-cn-beijing.aliyuncs.com/img/image-20220405160155360.png)

### 生产环境rollup打包





## 响应式原理

### 实现reactive

牛刀小试 先感受一下 `Proxy` 和 `Reflect`这两个 API 的简单使用。

```js
let obj = {
  name: '小明',
  get alias() {
    console.log(this)
    return this.name
  }
}

const proxy = new Proxy(obj, {
  // 原始对象，访问对象时的 key ， 代理对象
  get(target, key, receiver) {
    console.log(key)
    return target[key]
  },
  // 原始对象， 设置对象时的 key ， 设置的时候的值， 代理后然后的代理对象。
  set(target, key, value, receiver) {
    target[key] = value
    return true
  }
})

proxy.alias
```

![image-20220405174927221](https://picture-stores.oss-cn-beijing.aliyuncs.com/img/image-20220405174927221.png)

我们使用原始对象访问 `target[key]` 获取key值得时候，只会走一次 proxy 的 get 函数。

下面我们换成 `Reflect.get` 这个时候就会走两次 proxy 的 get 函数。
这时候你会不会有疑问？为什么必须要使用 `Reflect`呢？

假设：我们在页面里面使用了`alias`的值，那么在`name`变化了的时候页面用到`alias`的地方要不要重新渲染？

结论：在 name 发生了变化的需要收集依赖，

这里对 `receive`做一个解析：如果target对象中指定了getter，receiver则为getter调用时的this值。因为普通对象取值，不会走进 `proxy`对象的`get`函数里面去，所以这要加 `receive`,改变 getter 函数内部的 this。

![img](https://picture-stores.oss-cn-beijing.aliyuncs.com/img/856D1A91.jpg)

```js
get(target, key, receiver) {
    console.log(key)
    return Reflect.get(target, key, receiver)
},
```

![image-20220405175334497](https://picture-stores.oss-cn-beijing.aliyuncs.com/img/image-20220405175334497.png)



1. 实现同一个对象，如果被代理多次，就只返回同一个代理 ？

   ```js
    // 借助 weakMap 实现一个原始对象与代理对象的映射关系，进行缓存起来
    let obj = {
     name: '小明',
     get alias() {
       return this.name
     }
   }
   
   let reactiveMap = new WeakMap()   // 存储映射关系
   
   function reactive(obj) {
     // 如果不是对象直接 return
     if (!isObject) {
       return
     }
     if (reactiveMap.get(obj)) {
       // 检测 obj 是否被代理过
       return reactiveMap.get(obj)
     }
     const proxy = new Proxy(obj, {
       get(target, key, receive) {
         return Reflect.get(target, key, receive)
       },
       set(target, key, value, receive) {
         return Reflect.set(target, key, value, reactive)
       }
     })
     reactiveMap.set(obj, proxy)
     return proxy
   }
   
   
   let proxy = reactive(obj)
   let proxy1 = reactive(obj)
   
   console.log(proxy === proxy1)   true
   ```

   

2. 实现代理对象如果被再次代理，可以直接返回代理对象 ？

   借助被代理对象第一次代理的过程只是给代理对象添加 get set 等方法，并不会执行该方法，在第二次用代理对象访问这个属性的时候就会触发 `get函数`中的逻辑，如果符合，则就可以判断当前对象是否已经被代理过了。

   ```js
   let obj = {
     name: '小明',
     get alias() {
       return this.name
     }
   }
   
   let reactiveMap = new WeakMap()
   
   enum ReactiveFlags {
     IS_REACTIVE = '__v_isReactive'
   }
   function reactive(obj) {
     // 如果不是对象直接 return
     if (!isObject) {
       return
     }
     // 如果可以触发 get 函数，就说明传入的对象已经被代理过了，就直接返回该对象
     if (obj[ReactiveFlags.IS_REACTIVE]) {
       return obj
     }
     const proxy = new Proxy(obj, {
       get(target, key, receive) {
         // 说明已经代理过了，可以触发 get 函数了
         if (key === ReactiveFlags.IS_REACTIVE) {
           return true
         }
         Reflect.get(target, key, receive)
       },
       set(target, key, value, receive) {
         return Reflect.set(target, key, value, reactive)
       }
     })
     reactiveMap.set(obj, proxy)
     return proxy
   }
   
   let proxy = reactive(obj)
   let proxy1 = reactive(proxy)
   
   console.log(proxy === proxy1) // true
   ```

### 实现effect函数

+ effect的回调函数第一次会默认执行一次。
+ 用一个全局的变量将 副作用函数 和 proxy 里面的 get 函数关联起来。（effect副作用函数与属性对象关联起来）

初步实现

```js
// 记录当前正在执行的 effect 副作用
export let activeEffect = undefined

class ReactiveEffect {
  active = true
  constructor(public fn) {}
  run() {
    // 没有激活则不用收集依赖，只要执行函数就行了
    if (!this.active) {
      this.fn()
    }
    // 这里进行依赖收集，将当前 的 effect 和 副作用函数里面的属性关联起来
    try {
      activeEffect = this
      return this.fn()
    } finally {
      activeEffect = undefined
    }
  }
}

export function effect(fn) {
  const _effect = new ReactiveEffect(fn)
  _effect.run() // 默认执行一次 副作用函数
}

```

在上面的基础之上我们已经实现了把一个对象变成响应式对象的 reactive 函数。编写以下代码已经能够实现这样的功能。

```js
<div id="app"></div>
<script src="./dist/reactivity.global.js"></script>
<script>
    let { effect, reactive } = VueReactivity
    let obj = reactive({
        age: 10
    })
    console.log(obj)

    effect(() => {
        document.getElementById('app').innerHTML = obj.age
    })
</script>
```

![image-20220406222119838](https://picture-stores.oss-cn-beijing.aliyuncs.com/img/image-20220406222119838.png)

假如我们现在要编写以下代码，那么功能该如何实现呢？

```js
- 需要在 1s之后更改 age 的值，并且重新执行 effect 函数中的副作用函数？该怎么实现呢？
setTimeout(() => {
    obj.age++
}, 1000)
```

### 依赖收集的实现原理

baseHandler.ts

```ts
import { track, trigger } from './effect'

export const enum ReactiveFlags {
  IS_REACTIVE = '__v_isReactive'
}

export const mutableHandler = {
  get(target, key, receive) {
    // 说明已经代理过了，可以触发 get 函数了
    if (key === ReactiveFlags.IS_REACTIVE) {
      return true
    }
    // 依赖收集
    track(target, 'get', key)
    return Reflect.get(target, key, receive)
  },
  set(target, key, value, receive) {
    let oldValue = target[key]
    let result = Reflect.set(target, key, value, receive)
    // 如果新值和老值不相等的时候再触发更新
    if (oldValue !== value) {
      trigger(target, 'set', key, value, oldValue)
    }
    return result
  }
}

```

effect.ts

```ts
// 记录当前正在执行的 effect 副作用函数
export let activeEffect = undefined

class ReactiveEffect {
  // 表示当前 副作用函数是否激活
  active = true
  constructor(public fn) {}
  run() {
    // 没有激活则不用收集依赖，只要执行函数就行了
    if (!this.active) {
      this.fn()
    }
    // 这里进行依赖收集，将当前 的 effect 和 副作用函数里面的属性关联起来
    try {
      activeEffect = this
      return this.fn() // 执行副作用函数，在副作用函数里面就可以拿到全局的 activeEffect 了。
    } finally {
      // 当执行完 副作用函数的时候就把正咋激活的 effect 设置为上层的 effect实例
      // activeEffect = this.parent
      activeEffect = undefined
    }
  }
}

export function effect(fn) {
  const _effect = new ReactiveEffect(fn)
  _effect.run() // 默认执行一次 副作用函数
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
  // 后面如果一个对象的属性被依赖多次， 就一直往当前的 dep 里面添加 依赖信息就可以了。
  dep.add(activeEffect)
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
  effects && effects.forEach((effect) => effect.run())
}

```



依赖收集中注意事项：

1. 多个 effect 嵌套的问题。用 parent 记录上一次的 effect

2. 用 weakmap 记录着 effect 副作用，同时副作用也要记录是哪个属性用到了这个 effect。为分支切换与clearup做准备。

   ```js
   function track() {
       ....
         let shouldTrack = !dep.has(activeEffect)
         if (shouldTrack) {
           // 后面如果一个对象的属性被依赖多次， 就一直往当前的 dep 里面添加 依赖信息就可以了。
           dep.add(activeEffect)
           // effect 记住对应的 dep，在清理的时候会用到的
   +        activeEffect.deps.push(dep)
         }
   }
   ```

   ![image-20220408080631599](https://picture-stores.oss-cn-beijing.aliyuncs.com/img/image-20220408080631599.png)

   假如我们给一个 key 编写两个 effect

   ```js
   effect(() => {
       obj.foo = 100
       document.getElementById('app').innerHTML = obj.foo
   })
   effect(() => {
       obj.foo = 110
       document.getElementById('app').innerHTML = obj.foo
   })
   ```

   ![image-20220408082302214](https://picture-stores.oss-cn-beijing.aliyuncs.com/img/image-20220408082302214.png)

3. 避免无限递归触发 get 和 get 函数。（特殊处理）。

   ```js
    effect(() => {
        obj.foo = Math.random()
        document.getElementById('app').innerHTML = obj.foo
    })
   ```

   ```js
   trigger 函数
   export function trigger(target, type, key, value, oldValue) {
     // 根据 target 和 key 取出 依赖信息，并执行即可
   
     let depsMap = targetMap.get(target)
     if (!depsMap) return // 触发的值没有在 模板中使用
     let effects = depsMap.get(key) // 找到 key 对应的 effect 了
     effects &&
       effects.forEach((effect) => {
         // 在调用 effect 的时候，如果要执行和 effect 和全局的 activeEffect 一样的话，则就不需要调用
   +      if (effect !== activeEffect) {        
           effect.run()
         }
       })
   }
   ```

### 小结

1. 我们先创建一个响应式对象 new Proxy。
2. effect 函数接受一个匿名函数，这个匿名函数会默认执行，我们将当前正在执行的 effect 副作用函数存在一个全局变量里面，然后再调用副作用函数执行，渲染的时候就会取值，就会触发`get`方法，然后我们再get方法中进行依赖收集。
3. weakMap（对象：map（属性： set[effect1,effect2]）） 这样的一个结构存放元素值与依赖函数之间的关系。
4. 稍后数据发生变化的时候，就会触发proxy的`set`函数，我们通过原值值的对象属性就可以找到对应的`effect`集合，然后让他们全部执行。

### 分支切换的实现原理

假设我们编写了以下代码，在 state 的状态发生变化之后，DOM 的变化就不依赖 name 属性了。所以我们就需要清除依赖信息。

```js
let { effect, reactive } = VueReactivity
const state = reactive({
    flag: true,
    name: '张三',
    age: 100
})

effect(() => {
    console.log('render')
    document.body.innerHTML = state.flag ? state.name : state.age
})

// 所以就需要每次，在执行 effect 的时候把不需要的 effect 清理掉， 重新收集依赖
setTimeout(() => {
    state.flag = false // state 修改为 false 之后  dom 就不依赖 name 属性了
    setTimeout(() => {
        console.log('修改 name 原则上不执行 render 函数')
        state.name = '李四'
    }, 1000)
}, 1000)
```



![image-20220408223014030](https://picture-stores.oss-cn-beijing.aliyuncs.com/img/image-20220408223014030.png)

可以看到 副作用函数还是执行了。

所以我们就需要编写清除依赖的代码，在编写这个代码之前，我们先需要了解一个set的用法。

假设我们编写了如下代码，那么就会造成无限循环的情况。

```js
let s = new Set([1])
s.forEach(() => {
    console.log('hihi')          
    s.delete(1)
    s.add(1)
})
```

现在我们再回头来编写 `cleanupEffect`函数。

```js

+ function cleanupEffect(effect) {
  const { deps } = effect // deps 里面装的就是 name age 对应的 effect实例
  for (let i = 0; i < deps.length; i++) {
    deps[i].delete(effect) // 这里为啥是删除 effect
  }
  effect.deps.length = 0
}

class ReactiveEffect {
    run() {
        ...
+        cleanupEffect(this)  // 在收集依赖之前先清除依赖信息, 这块清除的应该是不同 key 的相同依赖。
        return this.fn()     // 在用户传递的副作用函数里面收集依赖
    }
}

还要做一件事情

function trigger() {
    ...
    if (effects) {
    // 在执行之前先拷贝一份，来执行，不要关联引用
+    effects = new Set(effects)
    effects.forEach((effect) => {
      // 在调用 effect 的时候，如果右要执行自己，则就不需要调用
      if (effect !== activeEffect) {
        effect.run()
      }
    })
  }
}
```

简化代码，我们再来看一下weakmap的数据结构

```js
let { effect, reactive } = VueReactivity
const state = reactive({
    flag: true,
    name: '张三',
    age: 100
})

effect(() => {
    console.log('render')
    document.body.innerHTML = state.flag ? state.name : state.age
})
```

![image-20220408221248647](https://picture-stores.oss-cn-beijing.aliyuncs.com/img/image-20220408221248647.png)

现在我们再来看，当 DOM 没有依赖 name 的时候，就不会再触发 effect 里面的副作用函数了。

![image-20220408223206128](https://picture-stores.oss-cn-beijing.aliyuncs.com/img/image-20220408223206128.png)

### 实现vue中的调度器

stop

```js
let { effect, reactive } = Vue
const state = reactive({
    flag: true,
    name: '张三',
    age: 100
})

let runner = effect(() => {
    document.body.innerHTML = state.age
})
runner.effect.stop() // 停止 effect执行

setTimeout(() => {
    state.age = 999 // effect 函数就不会执行

    setTimeout(() => {
        runner() // 重新手动调用
    }, 1000)
}, 1000)
```

在代码中实现它

1. effect 返回一个函数，可以让effect重新运行
2. effect 实例上添加一个 stop 的方法。

```js
class ReactiveEffect {
    stop() {
        if (this.active) {
            this.active = false
            cleanupEffect(this) // 停止收集 effect
        }
    }
}


export function effect(fn) {
  const _effect = new ReactiveEffect(fn)
  _effect.run() // 默认执行一次 副作用函数

+  const runner = _effect.run.bind(_effect)
+  runner.effect = _effect // 将 effect 挂载到 runner 函数上面
+  return runner
}

```

scheduler  我们编写以下代码。

```js
let { effect, reactive } = Vue
const state = reactive({
    flag: true,
    name: '张三',
    age: 100
})
let runner = effect(
    () => {
        document.body.innerHTML = state.age
    },
    {
        scheduler() {
            // 在 state 变化的时候，可以在 调度器里面控制  effect 副作用是否执行
            console.log('run')
        }
    }
)
state.age = 10
state.age = 20
state.age = 30
state.age = 40
```

可以看到，这里 scheduler 函数执行了 4 次，但是 effect 函数并没有执行。需要我们手动的在调度器函数里面调用。

![image-20220409203326008](https://picture-stores.oss-cn-beijing.aliyuncs.com/img/image-20220409203326395.png)

实现 scheduler

```js
export function effect(fn, options: any = {}) {
  const _effect = new ReactiveEffect(fn, options.scheduler)
  ...
}
  
function trigger() {
     effects.forEach((effect) => {
      // 在调用 effect 的时候，如果右要执行自己，则就不需要调用
      if (effect !== activeEffect) {
+        if (effect.scheduler) {
+          effect.scheduler() // 如果用户传递了 调度函数，那么久调用调度函数
        } else {
          effect.run()   // 否则就执行 effect 副作用函数
        }
      }
    })
}
```

同样我们也可以模拟批量的异步更新。代码如下

```js
let { effect, reactive } = VueReactivity
const state = reactive({
    flag: true,
    name: '张三',
    age: 100
})
let waiting = false
let runner = effect(
    () => {
        console.log('hi')
        document.body.innerHTML = state.age
    },
    {
        scheduler() {
            // 在 state 变化的时候，可以在 调度器里面控制  effect 副作用是否执行
            console.log('run')
            //  开启一个异步任务，等同步代码执行完成之后,异步任务里面的代码才会执行。
            if (!waiting) {
                waiting = true
                setTimeout(() => {
                    runner()
                    waiting = false
                })
            }
        }
    }
)
state.age = 10
state.age = 20
state.age = 30
state.age = 40
```

调度器函数执行了多次，而 effect 副作用函数值会执行一次（在多次修改数据的时候）

![image-20220409205103795](https://picture-stores.oss-cn-beijing.aliyuncs.com/img/image-20220409205103795.png)

### 深层代理reactive对象

```js
export const mutableHandler = {
    get() {
        ...
        // 取值的时候才会进行代理， 判断值如果是object 的话才给数据添加响应式
    if (isObject(res)) {
        return reactive(res)
    }
    return res   
    }
}
```

### 计算属性的实现原理

computed的特点：

+ 可以缓存
+ 返回的是一个 ComputedRefImpl

使用`computed`

```js
let { effect, reactive, computed } = Vue

const state = reactive({
    firstName: '张',
    lastName: '三'
})
const fullName = computed({
    get() {
        return state.firstName + state.lastName
    }
})

effect(() => {
    document.body.innerHTML = fullName.value
})

setTimeout(() => {
    state.firstName = '小'   // 依赖的属性变化之后，会重新计算  fullName的值
}, 1000)
```

 下面我们来实现它

+computed.ts文件

```js
import { isFunction } from '@vue/shared'
import { ReactiveEffect, trackEffects, triggerEffects } from './effect'

class ComputedRefImpl {
  public effect
  public _dirty = true // 默认是脏的 取值的时候进行计算
  public _value
  public dep = new Set()
  constructor(getter, public setter) {
    // 将用户传递的 getter 函数当做 effect 的副作用函数收集起来
    // 这个时候 firstName 和 lastName 都会被收集起来
    this.effect = new ReactiveEffect(getter, () => {
      // 数据变化之后就走调度器函数
      if (!this._dirty) {
        this._dirty = true
        // 实现触发更新
        triggerEffects(this.dep)
      }
    })
  }
  get value() {
    // 计算属性也要进行依赖收集
    trackEffects(this.dep)
    // 用  dirty 来做缓存
    if (this._dirty) {
      // 如果这个值是脏的，就让 effect 副作用函数执行一下
      this._dirty = false
      this._value = this.effect.run()
    }
    return this._value
  }
  set value(newValue) {
    this.setter(newValue)
  }
}

export const computed = (getterOrOptions) => {
  let onlyGetter = isFunction(getterOrOptions)

  let getter
  let setter
  // 如果参数是函数
  if (onlyGetter) {
    getter = getterOrOptions
    setter = () => {
      console.warn('no set')
    }
  } else {
    getter = getterOrOptions.get
    setter = getterOrOptions.set
  }
  return new ComputedRefImpl(getter, setter)
}

```

+ 利用 scheduler 实现对 getter 里面effect 父作用变化的一个监控，来改变 `dirty`变量的值，来决定是否要计算新值，以及是否需要触发 计算属性的依赖更新。

### watch的实现原理

watch 的基本使用

1. 接受一个对象

```js
let { effect, reactive, computed, watch } = Vue

const state = reactive({
    name: '张三',
    age: 10
})

watch(state, (newValue, oldValue) => {
    console.log(newValue, oldValue)
})

setTimeout(() => {
    state.age = 99
}, 1000)
```

可以看到监测一个对象 新值和老值是一样的，因为他们的引用地址不会发生变化。

![image-20220410114404103](https://picture-stores.oss-cn-beijing.aliyuncs.com/img/image-20220410114404103.png)

2. 接受一个函数

```js
let { effect, reactive, computed, watch } = Vue

const state = reactive({
    name: '张三',
    age: 10
})

watch(
    () => state.age,
    (newValue, oldValue) => {
        console.log(newValue, oldValue)
    }
)

setTimeout(() => {
    state.age = 99
}, 1000)
```

watch 一个基本数据类型的时候是可以拿到新值和老值的。

![image-20220410114643141](https://picture-stores.oss-cn-beijing.aliyuncs.com/img/image-20220410114643141.png)

+watch.ts

```js
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
  let oldValue

  // 当 watch 的值发生变化的时候就会触发 scheduler 调度函数执行，这个时候再执行用户传递的 callback 函数
  // 以及把新老值传递给 callback 函数
  const job = () => {
    const newValue = effect.run()
    cb(newValue, oldValue)
    oldValue = newValue
  }
  const effect = new ReactiveEffect(getter, job)

  oldValue = effect.run()
}

```

+ 应用，解除上一次的watch  onCleanup

应用场景：

当用户在输入框输入的时候，我们要根据用户的输入，调用 ajax 请求获取结果。

实现代码：

输入框的内容一发生变化就访问接口，然后更改 state 然后渲染页面，

这样做有问题吗？

```txt
假设请求
第一次   q = '你'     响应时长   2s
第二次   q = '你好'   响应时长   1s
```

那么渲染的结果就是，第一次的请求结果会覆盖掉，第二次请求的结果。不是我们想要的结果。

我们用以下代码进行模拟上面的场景

```js
const App = {
    setup() {
        const state = reactive({
            count: 10
        })
        const value = ref()

        effect(() => {})

        function getData(time) {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    resolve(time)
                }, time * 1000)
            })
        }
        let n = 2
        watch(value, async () => {
            let data = await getData(n--)   // 第一次请求 2s 返回
            								// 第二次请求 1s 返回
            console.log(data)
            state.count = data              // 最后渲染在页面上的值就不是第二次请求返回的值，而是第一次的值
        })

        return {
            value,
            state
        }
    }
}

const app = createApp(App).mount('#app')
```

我们可以添加一个变量，和一个 onCleanup 函数，在每次执行 watch 的函数之前手动控制是否要执行某些操作

```js
watch(value, async (newValue, oldValue, onCleanup) => {
    let clean = false
    // 调用这个函数可以清理上一次的 watch
    onCleanup(() => {
        clean = true
    })
    let data = await getData(n--)
    // 如果不清理，才可以渲染页面。
    if (!clean) {
        state.count = data
    }
})
```

### ref的实现原理

ref 的使用  在获取真实值的时候都需要加 `.value`因为 `proxy`无法直接代理原始值。

+ 原始类型使用ref value 返回的是一个原始值

```js
let { effect, reactive, computed, watch, ref, createApp } = Vue
let App = {
    setup() {
        let count = ref(10)
        console.log(count)
        return {
            count
        }
    }
}
let app = createApp(App)
app.mount('#app')
```

![image-20220410205633008](https://picture-stores.oss-cn-beijing.aliyuncs.com/img/image-20220410205633008.png)

+ 引用类型使用ref, value 返回的是一个 proxy 对象

```js
let arr = ref([])
console.log(count)
```

![image-20220410205544675](https://picture-stores.oss-cn-beijing.aliyuncs.com/img/image-20220410205544675.png)

+ref.ts

```js
import { isObject } from '@vue/shared'
import { trackEffects, triggerEffects } from './effect'
import { reactive } from './reactive'

function toReactive(value) {
  // 如果是对要转成 proxy 否则返回原始值
  return isObject(value) ? reactive(value) : value
}

class RefImpl {
  public dep = new Set()
  public _value
  public _v_isRef = true

  constructor(public rowValue) {
    this._value = toReactive(rowValue)
  }
  get value() {
    // 获取值的时候进行依赖收集
    // 把当前用到这个 ref 的 effect 副作用函数收集起来。
    trackEffects(this.dep)
    return this._value
  }

  set value(newValue) {
    // 新值和老值进行对比，如果不相等，则重新计算新值
    if (newValue !== this.rowValue) {
      this._value = toReactive(newValue)
      this.rowValue = newValue
      // 依次执行 effect
      triggerEffects(this.dep)
      // 设置完之后触发更新
    }
  }
}

export function ref(value) {
  return new RefImpl(value)
}

```

使用 torefs

```js
<div id="app">
    <div>count：{{count}}</div>
	<div>name：{{name}}</div>
    <div>address：{{address.area}}</div>   // 里面不会做深层的添加 .value
</div>
let App = {
    setup() {
        let obj = reactive({
            count: 100,
            name: '小明',
            address: {
              area: '北京'
            }
        })
        return {
            ...toRefs(obj)
        }
    }
}
```

![image-20220410222954538](https://picture-stores.oss-cn-beijing.aliyuncs.com/img/image-20220410222954538.png)

实现 toRefs

```js
class ObjectRefImpl {
  constructor(public object, public key) {}

  get value() {
    return this.object[this.key]
  }
  set value(newValue) {
    this.object[this.key] = newValue
  }
}

export function toRef(object, key) {
  return new ObjectRefImpl(object, key)
}

/**
 * 只是给每一个对象的属性都包装了一个 .value 的属性
 * @param object 原理的代理对象
 * @returns
 */
export function toRefs(object) {
  const result = isArray(object) ? new Array(object.length) : {}
  for (let key in object) {
    result[key] = toRef(object, key)
  }
  return result
}

```

使用 proxyRefs 功能就是让 ref 不用再手写 `.value`  接受一个对象，当当访问某个属性的时候返回这个属性值的`.value`

```js
let name = ref('小明')
let age = ref(10)
let person = proxyRefs({ name, age })

effect(() => {
    with (person) {
        app.innerHTML = name + age
    }
})
```

实现它

```js
export function proxyRefs(object) {
  return new Proxy(object, {
    get(target, key, receive) {
      let r = Reflect.get(target, key, receive)
      return r._v_isRef ? r.value : r
    },
    set(target, key, value, receive) {
      let oldValue = target[key]
      // 如果是 ref 就改写原来值的 .value 属性
      if (oldValue._v_isRef) {
        oldValue.value = value
        return true
      } else {
        Reflect.set(target, key, value, receive)
      }
    }
  })
}
```



### 源码调试



### 响应式模块总结





## 渲染原理

vue 中为了解耦，将逻辑分成了两个模块

+ 运行时 核心，不依赖于平台的（browser test 小程序 app canvas）靠的是虚拟DOM实现的
+ 针对于不同平台的运行时 vue 就是针对浏览器的运行时

```js
<div id="app"></div>
<script src="../../../node_modules/vue/dist/vue.global.js"></script>
<script>
    // 渲染器渲染的是虚拟 DOM，在内部，使用用户传递的方法，把虚拟DOM转换成真正要渲染的节点。在不同的平台上运行

    let { createRenderer, h } = Vue

let renderer = createRenderer({
    // 创建元素
    createElement(element) {
        return document.createElement(element)
    },
    // 设置元素的文本
    setElementText(el, text) {
        el.innerHTML = text
    },
    // 插入节点
    insert(el, container) {
        container.appendChild(el)
    }
})
renderer.render(h('h1', 'hello'), app)
```

![image-20220412112525794](https://picture-stores.oss-cn-beijing.aliyuncs.com/img/image-20220412112525794.png)

### runtime-dom 

封装了一些平台对应的代码，再调用创建渲染器的代码，具体渲染是 core 做的。

DOM API 渲染过程是用传入的 `renderOptions`来做的。

新建 runtime-dom 模块

+index.ts

```js
import { createRenderer } from '@vue/runtime-core'
import { nodeOps } from './nodeOps'
import { patchProp } from './patchProp'

// 渲染器渲染的参数
const renderOptions = Object.assign(nodeOps, { patchProp })

export function render(vnode, container) {
  // 在创建渲染器的时候  传入选项
  createRenderer(renderOptions).render(vnode, container)
}

export * from '@vue/runtime-core'

```



+nodeOps.ts   DOM 操作API

```js
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

```



+patchProp 属性操作API

```js
// 这个函数的作用就是修改 DOM 节点上的属性的值
// 属性可以分为  class、style、attr、event

import { patchAttr } from './modules/attr'
import { patchClass } from './modules/class'
import { patchEvent } from './modules/event'
import { patchStyle } from './modules/style'

/**
 *
 * @param el 一个 DOM 元素
 * @param key
 * @param prevValue  老值
 * @param nextValue  新值
 */
export function patchProp(el, key, prevValue, nextValue) {
  if (key === 'class') {
    patchClass(el, nextValue)
  } else if (key === 'style') {
    patchStyle(el, prevValue, nextValue)
  } else if (/^on[^a-z]/.test(key)) {
    // 这里的 key 是事件名称
    patchEvent(el, key, nextValue)
  } else {
    // 这里的 key 是属性名称
    patchAttr(el, key, nextValue)
  }
}

```



+./modules/attr.ts

```js
/**
 *
 * @param el DOM 元素
 * @param key 属性的key   属性格式 id=100
 * @param nextValue 新值
 */
export function patchAttr(el, key, nextValue) {
  if (nextValue) {
    el.setAttribute(key, nextValue)
  } else {
    el.removeAttribute(key)
  }
}

```



+./modules/class.ts

```tsx
export function patchClass(el, nextValue) {
  if (nextValue == null) {
    // 不需要 class 则直接移除
    el.removeAttribute('class')
  } else {
    el.className = nextValue
  }
}

```



+./modules/event.ts

```js
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

```



+./modules/style.ts

```js
export function patchStyle(el, prevValue, nextValue) {
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

```

现在我们的 render 函数需要有一个渲染器函数来接收 渲染器参数`renderOptiosn` 同时还需要给我们提供一个`render`函数，需要把`vnode`挂载到真实容器上的功能。这部分功能就是在`runtime-core`里面实现了。



### runtime-core

新建runtiem-core模块

+index.ts

```js
export { createRenderer } from './renderer'

export { h } from './h'

export * from './vnode'

```



+renderer.ts

```js
export function createRenderer(renderOptions) {
  const render = (vnode, container) => {}
  return {
    render
  }
}
```



+h.ts

```js
export function h() {}
```



+vnode.ts

```js
export function vnode() {}
```

现在我们使用自己编写的runtime-dom包编写以下代码，尝试用我们的去替换官方的

```js
<div id="app"></div>
<!-- <script src="../../../node_modules/vue/dist/vue.global.js"></script> -->
<script src="./runtime-dom.global.js"></script>
<script>
    // 渲染器渲染的是虚拟 DOM，在内部，使用用户传递的方法，把虚拟DOM转换成真正要渲染的节点。在不同的平台上运行

    let { createRenderer, h, render } = VueRuntimeDOM
	console.log(createRenderer, h, render)

	render(h('h1', 'hello'), app)
</script>
```

![image-20220412092603659](https://picture-stores.oss-cn-beijing.aliyuncs.com/img/image-20220412092603659.png)

可以看见他们都能够打印出来了，下面我们就开始去实现里面具体的函数主体。



### h方法和createNode的实现

shapeFlag 

位运算 向左乘2，向右除2

```js
export const enum ShapeFlags { // vue3提供的形状标识
  ELEMENT = 1, // 元素
  FUNCTIONAL_COMPONENT = 1 << 1, // 函数组件
  STATEFUL_COMPONENT = 1 << 2,
  TEXT_CHILDREN = 1 << 3, // children 是文本
  ARRAY_CHILDREN = 1 << 4, // children 是数组
  SLOTS_CHILDREN = 1 << 5,
  TELEPORT = 1 << 6,
  SUSPENSE = 1 << 7,
  COMPONENT_SHOULD_KEEP_ALIVE = 1 << 8,
  COMPONENT_KEPT_ALIVE = 1 << 9,
  COMPONENT = ShapeFlags.STATEFUL_COMPONENT | ShapeFlags.FUNCTIONAL_COMPONENT
}
```

假如我们要判断一个元素是不是组件，我们就可以用他来 & 上组件

```js
010    
110
这个按位与的结果就是
010
```

然后就可以通过这个返回的结果判断是否符合条件

vnode.ts

```js
import { isArray, isString, ShapeFlags } from '@vue/shared'

export function createVnode(type, props, children) {
  let shapeFlag = isString(type) ? ShapeFlags.ELEMENT : 0

  const vnode = {
    type,
    props,
    children,
    key: props?.key,
    __v_isVnode: true,
    shapeFlag
  }

  if (children) {
    let type = 0
    if (isArray(children)) {
      type = ShapeFlags.ARRAY_CHILDREN // 标识
    } else {
      children = String(children)
      type = ShapeFlags.TEXT_CHILDREN
    }
    vnode.shapeFlag |= type // 计算得出这个元素的类型
  }

  return vnode
}

```

h.ts

```js
// render(h('h1', 'hello'), app)

import { isArray, isObject } from '@vue/shared'
import { createVnode, isVnode } from './vnode'

// render(h('h1', null, h('span', null, 'hihi'), h('span', null, '999')), app)

// render(h('h1', h('span', null, 'hihi')), app)

// render(h('h1', null, 'hello', 'world'), app)

// render(
//   h('h1', { style: { color: 'red' } }, [h('span', null, 'hello'), h('span', null, 'world')]),
//   app
// )
/**
 * 先来看一下 h 函数的几种使用方法
 * @param type  标签
 * @param propsChildren   放属性
 * @param children  放儿子
 */
export function h(type, propsChildren, children) {
  let l = arguments.length
  // h('div',{style:{"color"：“red”}})
  // h('div',h('span'))
  // h('div',[h('span'),h('span')])
  // h('div','hello')
  if (l === 2) {
    // 为什么要将儿子包装成数组， 因为元素可以循环创建。 文本不需要包装了
    if (isObject(propsChildren) && !isArray(propsChildren)) {
      // h('div',h('span'))
      if (isVnode(propsChildren)) {
        return createVnode(type, null, [propsChildren])
      }
      return createVnode(type, propsChildren) // 是属性 h('div',{style:{"color"：“red”}})
    }
    // 是数组  h('div',[h('span'),h('span')])
    // 文本也走这里 h('div','hello')
    else {
      return createVnode(type, null, propsChildren)
    }
  } else {
    if (l > 3) {
      children = Array.from(arguments).slice(2)
    } else if (l === 3 && isVnode(children)) {
      // h('div,{},h('span'))
      children = [children]
    }
    return createVnode(type, propsChildren, children)
  }
}

```

现在就可以通过h函数来创建虚拟节点了，

### vue3元素的初始化渲染

```js
import { ShapeFlags } from '@vue/shared'

export function createRenderer(renderOptions) {
  let {
    insert: hostInsert,
    remove: hostRemove,
    setElementText: hostSetElementText,
    setText: hostSetText,
    parentNode: hostParentNode,
    nextSibling: hostNextSibling,
    createElement: hostCreateElement,
    createText: hostCreateText,
    patchProp: hostPatchProp
  } = renderOptions

  /**
   * 挂载子节点
   * @param children
   * @param container
   */
  const mountChildren = (children, container) => {
    for (let i = 0; i < children.length; i++) {
      patch(null, children[i], container)
    }
  }
  /**
   * 把虚拟节点递归转换成真实dom
   * @param vnode 虚拟节点
   * @param container 容器
   */
  const mountElement = (vnode, container) => {
    let { type, props, children, shapeFlag } = vnode
    // 根据 type 创建元素，并且把真实dom挂载到这个虚拟节点上
    let el = (vnode.el = hostCreateElement(type))

    // 如果有 props 就循环添加  props 包括 style class event attrs
    if (props) {
      for (let key in props) {
        hostPatchProp(el, key, null, props[key])
      }
    }
    // 如果是文本
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      hostSetElementText(el, children)
    }
    // 如果是数组
    else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(children, el)
    }
    // 把真实节点插入到容器中
    hostInsert(el, container)
  }

  /**
   *
   * @param n1 老的虚拟节点
   * @param n2 新的虚拟节点
   * @param container 容器
   */
  const patch = (n1, n2, container) => {
    // 老节点和新节点一样，这个时候不需要更新
    if (n1 === n2) {
      return
    }
    // 初次渲染，不需要更新
    if (n1 === null) {
      // 后序还有组建的初次渲染，目前是元素的初始化渲染
      mountElement(n2, container)
    } else {
      // 更新流程
    }
  }

  /**
   *
   * @param vnode 虚拟节点
   * @param container 容器
   */
  const render = (vnode, container) => {
    if (vnode == null) {
      // 卸载的逻辑
    } else {
      // 第一次的时候 vnode 是 null
      // 第二次的时候就会从 容器上去取 vnode 进行走更新的逻辑
      patch(container._vnode || null, vnode, container)
    }
    // 在容器上保存一份 vnode
    container._vnode = vnode
  }
  return {
    render
  }
}

```

createRenderer 函数接受到 runtime-dom里面的 DOM 操作函数，在内部返回出 render 函数。

render函数提供给用户，并且接受 vnode 和 container。

然后在 render 函数内部实现元素的渲染。

现在我们编写以下代码，就可以实现用`render`函数渲染出DOM节点到`app`元素内部了。

```js
<div id="app"></div>
<script src="./runtime-dom.global.js"></script> 
let { createRenderer, h, render } = VueRuntimeDOM
 render(
     h('h1', { style: { color: 'red' } }, [h('span', null, 'hello'), h('span', null, 'world')]),
     app
 )
```

![image-20220412233425480](https://picture-stores.oss-cn-beijing.aliyuncs.com/img/image-20220412233425480.png)

### 解决遗留问题

当我们这样用h函数在 render 函数里面创建`vnode`时。

```js
render(h('h1', null, [h('span', null, 'hello'), '423432']), app)
```

可以看到文本也被当做了元素节点，所以在创建节点的时候从 vnode 里面取type等属性的时候就会有问题，我们这边就需要特殊处理一下了。

![image-20220413070717320](https://picture-stores.oss-cn-beijing.aliyuncs.com/img/image-20220413070717320.png)

所以我们现在就需要写一个专门值渲染文本的功能。

我们定义一个`Symbol`的text类型的type,在 `patch`的时候通过判断type的类型，就可以区分开要渲染的是元素节点，还是文本节点。

这个时候创建出来的vnode节点如下

![image-20220413073123848](https://picture-stores.oss-cn-beijing.aliyuncs.com/img/image-20220413073123848.png)

```js
render(h('h1', null, [h('span', null, 'hello'), h(Text, '66666')]), app)

export const Text = Symbol(`Text`)

function patch() {
    ...
    if (n1 === null) {
      switch (type) {
        case Text:
+          processText(n1, n2, container)
          break
        default:
          // 当前节点是元素
          if (shapeFlag & ShapeFlags.ELEMENT) {
            // 后序还有组建的初次渲染，目前是元素的初始化渲染
            mountElement(n2, container)
          }
      }
    }
}

const processText = (n1, n2, container) => {
    if (n1 === null) {
        // 创建出n2对应的真实dom，并且把真实dom挂载到这个虚拟节点上，并且把真实dom插入到容器中
        hostInsert((n2.el = hostCreateText(n2.children)), container)
    }
}
```

达到的效果就是这样。只插入一个文本节点到容器当中去。

![image-20220413073549979](https://picture-stores.oss-cn-beijing.aliyuncs.com/img/image-20220413073549979.png)

在包装一层，如果用户在编写 render 函数的时候只有字符串的时候，是不是可以不用写 h 函数呢？直接写一个字符串可以吗？

```js
const mountChildren = (children, container) => {
    for (let i = 0; i < children.length; i++) {
+        const child = normalize(children, i)
        patch(null, child, container)
    }
}

const normalize = (children, i) => {
    // 检测如果是字符串的话，就把字符串转换成文本节点
    if (isString(children[i])) {
        let vnode = createVnode(Text, null, children[i])
        children[i] = vnode
    }
    return children[i]
}
```



卸载 DOM节点

```js
render(h('h1', null, [h('span', null, 'hello'), '66666']), app)

render(null, app)
```

假设我们要实现卸载某个DOM上的元素，那么我们只需要给render函数传递一个null的虚拟节点，然后通过DOM去找到它自身上面对应的`vdom`再调用移除的方法就可以了。

```js
const render = () => {
    if (vnode == null) {
      // 卸载的逻辑
      // 判断一下容器中是否有虚拟节点
      if (container._vnode) {
+        unmount(container._vnode)
      }
    }
}

const unmount = (vnode) => {
    hostRemove(vnode.el)
}
```



## Vue3 Diff 算法



### 比较元素

1. 两个元素不相同，先把老的节点卸载。

```js
// 判断两个元素是否相同，如果不相同，先把老的节点卸载，
// 然后再执行后面的逻辑
if (n1 && !isSameVnode(n1, n2)) {
    unmount(n1)
    n1 = null
}

// 用例

render(h('h1', null, [h('span', null, 'hello'), '66666']), app)

setTimeout(() => {
    render(h(Text, 'world'), app)
}, 1000)
```

2. 文本的更新

```js
render(h(Text, 'hello'), app)

setTimeout(() => {
    render(h(Text, 'world'), app)
}, 1000)

// 代码实现
const processText = (n1, n2, container) => {
    ...
    // 都是文本
    else {
        // 虽然文本的内容发生变化了，但是我们可以复用老的节点
        const el = (n2.el = n1.el)
        if (n1.children !== n2.children) {
            hostSetText(el, n2.children)
        }
    }
}
```

3. 元素的更新

```js
render(h('h1', { style: { color: 'red' } }, '111'), app)

setTimeout(() => {
    render(h('h1', { style: { color: 'blue', background: 'red' } }, '666'), app)
}, 1000)


// 实现

const processElement = (n1, n2, container) => {
    if (n1 === null) {
        ...
    } else {
        // 更新逻辑
+        patchElement(n1, n2)
    }
}
    
// 先复用节点、再比较属性、再比较儿子。
const patchElement = (n1, n2) => {
    // 复用节点
    let el = (n2.el = n1.el)
    let oldProps = n1.props || {}
    let newProps = n2.props || {}
    // 对比属性
    patchProps(oldProps, newProps, el)
    // 对比儿子
    patchChildren(n1, n2, el)
}

const patchProps = (oldProps, newProps, el) => {
    // 新的里面有直接用新的覆盖掉即可
    for (let key in newProps) {
        hostPatchProp(el, key, oldProps[key], newProps[key])
    }
    // {
    //   style: {color: 'red'}
    // }
    // {
    // }
    // 如果老的里面有新的里面没有，则是删除
    for (let key in oldProps) {
      if (newProps[key] == null) {
        hostPatchProp(el, key, oldProps[key], null)
      }
    }
}

const patchChildren = (n1, n2, el) => {}
```

![image-20220413212652048](https://picture-stores.oss-cn-beijing.aliyuncs.com/img/image-20220413212652048.png)

![image-20220413212943858](https://picture-stores.oss-cn-beijing.aliyuncs.com/img/image-20220413212943858.png)

### 简单的儿子比较

| 新儿子 | 旧儿子 | 操作方式                     |
| :----- | :----- | :--------------------------- |
| 文本   | 数组   | （删除老儿子，设置文本内容） |
| 文本   | 文本   | （更新文本即可）             |
| 文本   | 空     | （更新文本即可) 与上面的类似 |
| 数组   | 数组   | （diff算法）                 |
| 数组   | 文本   | （清空文本，进行挂载）       |
| 数组   | 空     | （进行挂载） 与上面的类似    |
| 空     | 数组   | （删除所有儿子）             |
| 空     | 文本   | （清空文本）                 |
| 空     | 空     | （无需处理）                 |

```js
//卸载儿子
const unmountChildren = (children) => {
    for (let i = 0; i < children.length; i++) {
        unmount(children[i])
    }
}

const patchChildren = (n1, n2, el) => {
    const c1 = n1.children
    const c2 = n2.children
    const prevShapeFlag = n1.shapeFlag
    const { shapeFlag } = n2

    // 新节点是文本
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
        // 如果旧节点是数组
        if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            // 卸载老的儿子节点
            unmountChildren(c1)
        }
        // 文本 文本
        // 文本 空
        // 上面的情况也会走这个逻辑
        if (c1 !== c2) {
            hostSetElementText(el, c2)
        }
    } else {
        // 如果老的是数组
        if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            // 新节点和老节点都是数组
            if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            }
            // 之前是数组，现在不是数组，就把之前的删掉
            // 现在不是数组 （文本和空 删除以前的）
            else {
                unmountChildren(c1)
            }
        } else {
            // 老的是文本，新的也是文本
            if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
                hostSetElementText(el, '')
            }
            // 老的是文本新的是数组
            if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                mountChildren(c2, el)
            }
        }
    }
}
```

新老节点都是数组的情况

```js
render(
    h('h1', { style: { color: 'red' } }, [
        h('li', {}, 'a'),
        h('li', {}, 'b'),
        h('li', {}, 'c')
    ]),
    app
)

setTimeout(() => {
    render(
        h('h1', { style: { color: 'red' } }, [
            h('li', {}, 'a'),
            h('li', {}, 'b'),
            h('li', {}, 'c')
        ]),
        app
    )
}, 1000)
```





```
i   0
e1  -1 
e2  1
```

![image-20220414215928324](https://picture-stores.oss-cn-beijing.aliyuncs.com/img/image-20220414215928324.png)

### diff算法的优化



### 实现乱序对比



### 最长递增子序列实现原理



### diff算法的优化



## 组件渲染原理



### vue3中的Fragment的实现



### 组件的渲染和更新原理

在`h`方法中传入一个对象，说明要渲染一个组件。

```js
export const createVNode = (type,props,children = null)=>{
    const shapeFlag = isString(type)  
        ? ShapeFlags.ELEMENT: isObject(type)  // 判断type是一个对象的时候
        ? ShapeFlags.STATEFUL_COMPONENT:0;
    // ... 稍后可以根据类型来进行组件的挂载
}
```

下面我们就要在`patch`函数里面根据不同的`type`类型去进行处理（进行挂载或更新）

```js
const patch = (n1,n2,container,anchor?) => {
    // 初始化和diff算法都在这里喲
    if(n1 == n2){return }
    if(n1 && !isSameVNodeType(n1,n2)){ // 有n1 是n1和n2不是同一个节点
        unmount(n1)
        n1 = null
    }
    const {type,shapeFlag} = n2;
    switch(type){
        // ...
        default:
            if(shapeFlag & ShapeFlags.ELEMENT){
                //...
            }else if(shapeFlag & ShapeFlags.COMPONENT){
                processComponent(n1,n2,container,anchor)
            }
    }
}
```

现在我们进入`processComponent()`函数中，在这个函数里面主要就是区分是更新组件还是初次挂载。现在我们先写组件的挂载逻辑。

```js
const processComponent = (n1,n2,container,anchor)=>{
    if(n1 == null){
        mountComponent(n2,container,anchor);
    }else{
        // 组件更新逻辑
    }
}

// 组件挂载函数
const mountComponent = (n2,container,anchor)=>{
    const {render,data=()=>({})} = n2.type;
   	// 我们把 data 函数返回的值
    const state = reactive(data())
    const instance = {
        state, // 组件的状态
        isMounted:false, // 组件是否挂载
        subTree:null, // 子树
        update:null,
        vnode:n2
    }
    const componentUpdateFn = ()=>{
        if(!instance.isMounted){
            const subTree = render.call(state,state);
            patch(null,subTree,container,anchor);
            instance.subTree = subTree
            instance.isMounted = true;
        }else{
            // 数据变化了之后，会重新生成 subTree 虚拟DOM ，再重新走patch方法。
            const subTree = render.call(state,state);
            patch(instance.subTree,subTree,container,anchor)
            instance.subTree = subTree
        }
    }
    // 创建一个 effect ，将render()函数作为副作用函数，
    const effect = new ReactiveEffect(componentUpdateFn)
    const update = instance.update = effect.run.bind(effect);
    update();
}

```

根据以上代码，我们编写以下的测试代码

```js
let { createRenderer, h, render, Text, Fragment } = VueRuntimeDOM

const VueComponent = {
    data() {
        return {
            name: '小明',
            age: 10
        }
    },
    render() {
        setTimeout(() => {
            console.log('render')
            this.age++
            this.name = '小红'
        }, 1000)
        return h('p', {}, `我叫${this.name}，今年${this.age}岁`)
    }
}

render(h(VueComponent), app)
```

我们发现，当数据被修改两次以后，render函数也会执行两次，这显然不是我们想要的，下面我们就需要做异步更新来优化现在的状态。

![image-20220416195417714](https://picture-stores.oss-cn-beijing.aliyuncs.com/img/image-20220416195417714.png)

怎么实现呢？我们用之前的`scheduler`来实现，配合`Promise.resolve()`

现在我们来修改调度方法，将更新方法压入到队列中去。

```js
const effect = new ReactiveEffect(
    componentUpdateFn,
    ()=>queueJob(instance.update) 
);
const update = instance.update = effect.run.bind(effect);
```

下面利用微任务，来批量执行压入栈中的任务

```js
const queue = [];
let isFlushing = false;
const resolvedPromise = Promise.resolve()
export function queueJob(job){
    if(!queue.includes(job)){
        queue.push(job);
    }
    if(!isFlushing){
        isFlushing = true;
        resolvedPromise.then(()=>{
            isFlushing = false;
            for(let i = 0; i < queue.length;i++){
                let job = queue[i];
                job();
            }
            queue.length = 0;
        })
    }
}
```



### 组件的props实现

```js
let { render, h } = VueRuntimeDOM

let App = {
    data() {
        return {
            age: 13
        }
    },
    props: {
        address: String
    },
    render() {
        return h('div', {}, [
            h('p', {}, this.age),  // state
            h('p', {}, this.address), // props
            h('p', {}, this.$attrs.a), // attrs
            h('p', {}, this.$attrs.b)  // attrs
        ])
    }
}
render(
    h(App, {
        age: 10,
        a: 1,
        b: 2
    }),
    document.getElementById('app')
)
```



### 代码整理

1. 要创造一个组件的实例
2. 给实例赋值、props attrs 等
3. 创建一个effect



### 组件属性更新原理

1. 对于元素而言复用的是DOM节点，对于组件来说复用的是实例
2. instance.props是响应式的，而且可以改变，属性改变之后，会触发页面更新。

如何比对props发生了变化？

1. 比对属性前后个数是否一致
2. 比对属性的值是否一致，循环新的，和老的进行对比。

### 更新操作的统一入口

renderer.ts

```js
const updateComponentPreRender = (instance, next) => {
    instance.next = null // next清空
    instance.vnode = next // 实例上最新的虚拟节点
    updateProps(instance.props, next.props)
}

const setupRenderEffect = (instance, container, anchor) => {
    const { render } = instance
    const componentUpdateFn = () => {
        // 初始化
        if (!instance.isMounted) {
            //.....
        } else {
            let { next, bu, u } = instance
            if (next) {
        
                updateComponentPreRender(instance, next)
            }
            
        }
    }
}

const shouldUpdateComponent = (n1, n2) => {
    const { props: prevProps, children: prevChildren } = n1
    const { props: nextProps, children: nextChildren } = n2
    if (prevProps === nextProps) return false
    if (prevChildren || nextChildren) {
        return true
    }
    return hasPropsChanged(prevProps, nextProps)
}

const updateComponent = (n1, n2) => {
    // instance.props 是响应式的，而且可以更改  属性的更新会导致页面重新渲染
    const instance = (n2.component = n1.component) // 对于元素而言，复用的是dom节点，对于组件来说复用的是实例

    // 需要更新就强制调用组件的update方法
    if (shouldUpdateComponent(n1, n2)) {
        instance.next = n2 // 将新的虚拟节点放到next属性上
        instance.update() // 统一调用update方法来更新
    }

    // updateProps(instance,prevProps,nextProps); // 属性更新
}
```

componentProps.ts

```js
export function updateProps(prevProps, nextProps) {
  // 看一下属性有没有变化
  // 值的变化 ，属性的个数是否发生变化
  for (const key in nextProps) {
    prevProps[key] = nextProps[key]
  }
  for (const key in prevProps) {
    if (!hasOwn(nextProps, key)) {
      delete prevProps[key]
    }
  }
}
```



### setup实现原理



### 事件和插槽的实现原理



### 组件的声明周期实现原理



## 编译优化



### vue优化靶向更新



### vue3中的编译优化



### vue3中的ast语法树转化









