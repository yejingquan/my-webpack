const path = require('path')
const fs = require('fs')
// 生成抽象语法树
const parser = require('@babel/parser')
// 替换抽象语法树的内容
const traverse = require('@babel/traverse').default
// 把抽象语法树转回代码
const generator = require('@babel/generator').default
const ejs = require('ejs')
const { SyncHooks, AsyncSeriesHook } = require('tapable')
class Compiler {
  constructor(config) {
    this.config = config
    this.entry = config.entry
    this.root = process.cwd()
    // 初始化一个空对象，存放所有的模块
    this.modules = {}
    // 将module.rules挂载到自身
    this.rules = config.module.rules
    this.hooks = {
      beforeRun: new AsyncSeriesHook(),
      run: new AsyncSeriesHook(),
      afterCompile: new AsyncSeriesHook(),
      emit: new AsyncSeriesHook(),
      afterEmit: new AsyncSeriesHook(),
      done: new AsyncSeriesHook(),
    }
    // plugins数组中的所有插件对象
    if (Array.isArray(this.config.plugins)) {
      this.config.plugins.forEach(plugin => plugin.apply(this))
    }
  }
  getSource(path) {
    return fs.readFileSync(path, 'utf-8')
  }

  depAnalyse(modulePath) {
    // 读取模块内容
    let source = this.getSource(modulePath)
    // 支持简单的loader
    let rules = this.rules
    const readAndCallLoader = (use, obj) => {
      const loaderPath = path.join(this.root, use)
      const loader = require(loaderPath)
      source = loader.call(obj, source)
    }
    for (let index = rules.length - 1; index >= 0; index--) {
      const { test, use } = rules[index]
      if (test.test(modulePath)) {
        let typeString = Object.prototype.toString.call(use).split(' ')[1]
        let type = typeString.substring(0, typeString.length - 1)
        switch (type) {
          case 'Array': {
            for (let i = use.length - 1; i >= 0; i--) {
              readAndCallLoader(use[i])
            }
          }
            break;
          case 'String': {
            readAndCallLoader(use)
          }
            break;
          case 'Object': {
            // const loaderPath = path.join(this.root, use.loader)
            // const loader = require(loaderPath)
            // source = loader.call({ query: use.options }, source)
            readAndCallLoader(use.loader, { query: use.options })

          }
            break;
          default:
            break;
        }
      }

    }
    // 准备一个数组，存储模块依赖
    const dependencies = []
    let ast = parser.parse(source)
    // console.log(ast);
    traverse(ast, {
      CallExpression(p) {
        if (p.node.callee.name === 'require') {
          // 把抽象语法树中的require替换成__webpack_require__
          p.node.callee.name = '__webpack_require__'
          const oldPath = p.node.arguments[0].value
          // windows路径\替换成/
          const newPath = './' + path.join('./src', oldPath).replace(/\\+/g, '/')
          p.node.arguments[0].value = newPath
          dependencies.push(p.node.arguments[0].value)
        }
      }
    })
    let soureCode = generator(ast).code
    let modulePathRelative = './' + path.relative(this.root, modulePath)
    modulePathRelative = modulePathRelative.replace(/\\/g, '/')
    this.modules[modulePathRelative] = soureCode
    // 递归加载所有依赖项
    dependencies.forEach(dep => this.depAnalyse(path.resolve(this.root, dep)))
  }
  emitFile() {
    let template = this.getSource(path.join(__dirname, '../template/output.ejs'))
    let result = ejs.render(template, {
      entry: this.entry,
      modules: this.modules
    })
    const outputPath = path.join(this.config.output.path, this.config.output.filename)
    this.hooks.emit.callAsync(
      () => {
        console.log('emit回调');
      }
    )
    fs.writeFileSync(outputPath, result)
    this.hooks.afterEmit.callAsync(
      () => {
        console.log('afterEmit回调');
      }
    )
  }
  start() {
    // 开始打包
    // 依赖分析
    // __dirname 表示的是 xiaoye-pack项目中Compiler.js所在目录
    // 而非入口文件所在目录
    // 如果要使用执行xiaoye-pack所在目录可以使用process.cwd()
    this.hooks.beforeRun.callAsync(
      () => {
        console.log('beforeRun回调');
      }
    )
    this.hooks.run.callAsync(
      () => {
        console.log('run回调');
      }
    )
    this.depAnalyse(path.resolve(this.root, this.entry))
    this.hooks.afterCompile.callAsync(
      () => {
        console.log('afterCompile回调');
      }
    )
    this.emitFile()
    this.hooks.done.callAsync(() => {
      console.log('done回调');
    })
  }
}
module.exports = Compiler