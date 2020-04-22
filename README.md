### 热更新的原理简单描述一下
- 前置知识
webpack-dev-server 中文件保存在内存中，优化读取文件的速度。使用 memory-fs。感觉这点可以利用一下。
### 服务端的步骤
- webpack-dev-server 启动一个静态资源服务器，建立一个 socket 服务，通过 webpack 的 watch 方法监听文件的变化并把打包的不同状态获取到通过 socket 传递给客户端，done 结束以后把 stats 中的新 hash，通过 socket 发送给客户端。
### 客户端
- 通过增加 entry 把 socket 内容打包进入文件中。插件 HotReplacementPlugin.runtime 会把 module 增加 hot 属性，里面包含 check accept 等方法，此时客户端把收到的 hash，获取以后在 socket 中通过 module.hot.check 方法下载新的 hmr 模块，模块替换，执行 hotApply 进行热更新，最后通过 accept 加载更新的模块，达到更新单一文件，保留全局状态。补充一下这也就是为什么我们需要手动在入口文件判断一下 module.hot 执行 module.hot.accept 的原因。就是引入新的模块的过程。

