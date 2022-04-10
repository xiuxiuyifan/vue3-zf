const { build } = require('esbuild')
const { resolve } = require('path')

// 解析命令行参数
const args = require('minimist')(process.argv.slice(2))

// 获取打包那个模块
const target = args._[0] || 'reactivity'
// 获取打包格式
const format = args.f || 'global'

// 取出当前打包的 package.json文件
const pkg = require(resolve(__dirname, `../packages/${target}/package.json`))

const outfile = resolve(__dirname, `../packages/${target}/dist/${target}.${format}.js`)

// iife (function(){})()  立即执行函数
// cjs node中的模块 module.exports
// esm 浏览器中的 esModule import

const outputFormat = format.startsWith('global') ? 'iife' : format === 'cjs' ? 'cjs' : 'esm'
console.log(pkg.buildOptions.name)
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
