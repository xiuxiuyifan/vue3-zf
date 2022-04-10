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

加入我们现在要编写以下代码，那么功能该如何实现呢？

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

   加入我们给一个 key 编写两个 effect

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

、可以看到，这里 scheduler 函数执行了 4 次，但是 effect 函数并没有执行。需要我们手动的在调度器函数里面调用。

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



### 源码调试



### 响应式模块总结





## 渲染原理



### runtime-dom 



### runtime-core



### h方法和createNode的实现



### vue3元素的初始化渲染



### 解决遗留问题



## Vue3 Diff 算法



### 比较元素



### 简单的儿子比较



### diff算法的优化



### 实现乱序对比



### 最长递增子序列实现原理



### diff算法的优化



## 组件渲染原理



### vue3中的Fragment的实现



### 组件的渲染和更新原理



### 组件的props实现



### 代码整理



### 组件属性更新原理



### 更新操作的统一入口



### setup实现原理



### 事件和插槽的实现原理



### 组件的声明周期实现原理



## 编译优化



### vue优化靶向更新



### vue3中的编译优化



### vue3中的ast语法树转化









