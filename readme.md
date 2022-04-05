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











