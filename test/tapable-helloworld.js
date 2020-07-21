// 学习前端
// 流程 : 1.html 2.css 3.js 4. react 5.工程化
// 生命周期
const { SyncHook , AsyncParallelHook} = require('tapable')
class Frontend {
  constructor() {
    // 注册钩子
    this.hooks = {
      beforeHtml: new SyncHook(),
      afterHtml: new SyncHook(),
      afterCss: new SyncHook(),
      afterJs: new SyncHook(),
      afterReact: new SyncHook(),
    }
  }
  study() {
    // 触发事件, 发布者
    this.hooks.beforeHtml.call()
    console.log('html');
    this.hooks.afterHtml.call()
    console.log('css');
    this.hooks.afterCss.call()

    // 抽象化
    console.log('js');
    this.hooks.afterJs.call()

    console.log('react');
    this.hooks.afterReact.call()

    console.log('工程化');
  }
}
let f = new Frontend()
// 注册事件, 订阅者
f.hooks.afterHtml.tap('afterHtml', () => {
  console.log('学完html,需要继续学习');
})
f.hooks.afterJs.tap('afterJs', () => {
  console.log('学完Js,准备学习框架');
})
// f.study()
// AsyncParallelHook 钩子：tapAsync/callAsync 的使用
//const { AsyncParallelHook } = require("tapable");

// 创建实例
let asyncParallelHook = new SyncHook(["name", "age"]);

// 注册事件
console.time("time");
asyncParallelHook.tap("1", (name, age) => {
  // setTimeout(() => {
      
  //   }, 2000);
    console.log("1", name, age, new Date());
    // done();
});

asyncParallelHook.tap("2", (name, age ) => {
    // setTimeout(() => {
      
    // }, 1000);
    console.log("2", name, age, new Date());
    // done();
});

asyncParallelHook.tap("3", (name, age) => {
  // setTimeout(() => {
       
  //   }, 3000);
    console.log("3", name, age, new Date());
    // done();
    console.timeEnd("time");
});

// 触发事件，让监听函数执行
asyncParallelHook.call("panda", 18, () => {
    console.log("complete");
});