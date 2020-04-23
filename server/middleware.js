// 修改 entry
const path = require("path");
let updateCompiler = (compiler) => {
    const config = compiler.options;
    config.entry = {
        main: [
            path.resolve(__dirname, "../client/socket.js"),
            config.entry
        ]
    }
    compiler.hooks.entryOption.call(config.context, config.entry);
}

module.exports = updateCompiler;
