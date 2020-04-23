const io = require("socket.io-client/dist/socket.io");

let currentHash;

// 连接服务器
const URL = "/";
const socket = io(URL);

const onSocketMessage = {
    hash(hash) {
        console.log("hash", hash);
        currentHash = hash;// 获取最新hash
    },
    ok() {
        console.log("ok");
        reloadApp();// 开始热更新
    },
    connect() {
        console.log("client connect successful");
    }
};
// 添加监听回调
Object.keys(onSocketMessage).forEach(eventName => {
    let handler = onSocketMessage[eventName];
    socket.on(eventName, handler);
});


let reloadApp = () => {
    let hot = true;
    var status = module.hot.status();
// 结合了 hotReplacementPlugin 中注入的 hot 等方法
    if (status === 'idle') {
        console.log('Checking for updates to the bundle.');
        if (hot) {// 是否支持热更新
            module.hot.check().then(function (modules) {
                return module.hot.apply()
            }).catch(function (err) {
                var status = module.hot.status();
            });
        } else {
            // 如果不支持则直接刷新浏览器
            console.log(123)
            window.location.reload();
        }
    } else if (['abort', 'fail'].indexOf(status) >= 0) {
        console.log("Cannot apply update. A previous update ".concat(status, "ed. "));
        window.location.reload()
    }
}
