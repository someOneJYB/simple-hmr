// 启动一个 express 服务，未使用 EventEmitter 参考 https://github.com/gracehui88/HMR 感谢大佬
const express = require('express');
const mime = require("mime");
const path = require("path");
const http = require('http');
const socket = require("socket.io");
const MemoryFileSystem = require("memory-fs");
const updateCompiler = require("./middleware");

class Server {
    constructor(compiler) {
        this.compiler = compiler;
        updateCompiler(compiler);// 修改config的entry属性，注入客户端处理的socket，同时结合hotReplacePlugin 中增加的相关 hot 方法
        this.currentHash;// 编译hash
        this.clientSocketList = [];// 客户端集合
        this.fs = null;// 文件系统
        this.server = null;// http实例
        this.app = null;// express实例
        this.middleware;// webpack-dev-middleware返回的中间件，存入到文件系统中
        this.setDevMiddleware();// 监听done事件，发送 hash
        this.initApp();// 创建express实例
        this.setupDevMiddleware();// webpack-dev-middleware
        this.routes();// app使用中间件
        this.createServer();// 创建静态服务器
        this.createSocketServer();// 创建websocket服务器
    }
    setDevMiddleware() {
        let { compiler } = this;
        // 编译完成
        compiler.hooks.done.tap("webpack-dev-server", (stats) => {
            console.log("stats.hash", stats.hash);
            this.currentHash = stats.hash;
            //每当新一个编译完成后都会向客户端发送消息
            this.clientSocketList.forEach(socket => {
                console.log('emit hash')
                // 发送最新的hash
                socket.emit("hash", this.currentHash);
                // 再向客户端发送一个ok
                socket.emit("ok");
            });
        });
    }
    // 实现 webpack-dev-middleware 功能
    setupDevMiddleware() {
        let { compiler } = this;
        // 以watch模式进行编译，会监控文件的变化
        compiler.watch({}, () => {
            console.log("watch Compiled successfully!");
        });
        //设置文件系统为内存文件系统，webpack-dev-middleware 将 webpack 原本的 outputFileSystem (node的fs系统)替换成了MemoryFileSystem 实例，这样代码就将输出到内存中
        let fs = new MemoryFileSystem();
        this.fs = compiler.outputFileSystem = fs;

        // express中间件，将编译的文件返回
        this.middleware = (fileDir) => {
            return (req, res, next) => {
                let { url } = req;
                if (url === "/favicon.ico") {
                    return res.sendStatus(404);
                }
                url === "/" ? url = "/index.html" : null;
                let filePath = path.join(fileDir, url);
                try {
                    let statObj = this.fs.statSync(filePath);
                    if (statObj.isFile()) {
                        let content = this.fs.readFileSync(filePath);
                        // 写入文件到内存中
                        res.setHeader("Content-Type", mime.getType(filePath));
                        res.send(content);
                    } else {
                        res.sendStatus(404);
                    }
                } catch (error) {
                    res.sendStatus(404);
                }
            }
        }
    }
    initApp() {
        this.app = new express();
    }
    routes() {
        let config = this.compiler.options;
        this.app.use(this.middleware(config.output.path));
    }
    createServer() {
        this.server = http.createServer(this.app);
    }
    createSocketServer() {
        // 实现一个websocket长链接,socket 对应方法注册进去了，在完成编译之后发送
        const io = socket(this.server);
        io.on("connection", (socket) => {
            console.log("a new client connect server");

            this.clientSocketList.push(socket);
            socket.on("disconnect", () => {
                let num = this.clientSocketList.indexOf(socket);
                this.clientSocketList = this.clientSocketList.splice(num, 1);
            });
            // 向客户端发送最新的一个编译hash
            socket.emit('hash', this.currentHash);
            // 再向客户端发送一个ok
            socket.emit('ok');
        });
    }
    listen(port, host = "localhost", cb = new Function()) {
        this.server.listen(port, host, cb);
    }
}
module.exports = Server;
