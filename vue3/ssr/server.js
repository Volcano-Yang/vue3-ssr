const fs = require('fs')
const path = require('path')
const express = require('express')
const { createServer: createViteServer } = require('vite')

const isProd = process.env.SERVER_RENDER_MODE === 'production';

async function createServer() {
    const app = express()

    const manifest = isProd
        ? // @ts-ignore
        require('./dist/client/ssr-manifest.json')
        : {}

    // 以中间件模式创建 Vite 应用，这将禁用 Vite 自身的 HTML 服务逻辑
    // 并让上级服务器接管控制
    //
    // 在中间件模式下，如果你想使用 Vite 自带的 HTML 服务
    // 请将 `middlewareMode` 设置为 `'html'` (具体请参考 https://cn.vitejs.dev/config/#server-middlewaremode)
    const vite = await createViteServer({
        server: { middlewareMode: 'ssr' }
    })
    
    // 使用 vite 的 Connect 实例作为中间件
    app.use(vite.middlewares)

    // 中间件处理静态文件请求，不做这个处理的话，访问静态资源也会被当成要直出，返回了直出模板。
    app.use(express.static("./dist/client", { index: false }));

    app.use('*', async (req, res) => {
        // 服务 index.html - 下面我们来处理这个问题
        const url = req.originalUrl

        try {
            console.log("isProd", isProd);

            if (isProd) {
                // 1. 读取 index.html
                let template = fs.readFileSync(
                    path.resolve(__dirname, './dist/client/index.html'),
                    'utf-8'
                )

                // 2. 应用 Vite HTML 转换。这将会注入 Vite HMR 客户端，
                //    同时也会从 Vite 插件应用 HTML 转换。
                //    例如：@vitejs/plugin-react 中的 global preambles
                template = await vite.transformIndexHtml(url, template)

                // 3. 加载服务器入口。vite.ssrLoadModule 将自动转换
                //    你的 ESM 源码使之可以在 Node.js 中运行！无需打包
                //    并提供类似 HMR 的根据情况随时失效。

                console.log("manifest", manifest);
                // 生产环境用打包产物
                const render = require('./dist/server/entry-server.js').render;
                console.log("render", render);
                const appHtml = await render(url, manifest);
                console.log("appHtml", appHtml);

                // 5. 注入渲染后的应用程序 HTML 到模板中。
                const html = template.replace(`<!--ssr-outlet-->`, appHtml.template);

                // 6. 返回渲染后的 HTML。
                res.status(200).set({ 'Content-Type': 'text/html' }).end(html)
            } else {
                // 1. 读取 index.html
                let template = fs.readFileSync(
                    path.resolve(__dirname, 'index.html'),
                    'utf-8'
                )

                // 2. 应用 Vite HTML 转换。这将会注入 Vite HMR 客户端，
                //    同时也会从 Vite 插件应用 HTML 转换。
                //    例如：@vitejs/plugin-react 中的 global preambles
                template = await vite.transformIndexHtml(url, template)

                // 3. 加载服务器入口。vite.ssrLoadModule 将自动转换
                //    你的 ESM 源码使之可以在 Node.js 中运行！无需打包
                //    并提供类似 HMR 的根据情况随时失效。

                // 开发时直接引用产物
                const { render } = await vite.ssrLoadModule('/src/entry-server.ts')

                // 4. 渲染应用的 HTML。这假设 entry-server.js 导出的 `render`
                //    函数调用了适当的 SSR 框架 API。
                //    例如 ReactDOMServer.renderToString()
                const appHtml = await render(url)

                // 5. 注入渲染后的应用程序 HTML 到模板中。
                const html = template.replace(`<!--ssr-outlet-->`, appHtml.template)

                // 6. 返回渲染后的 HTML。
                res.status(200).set({ 'Content-Type': 'text/html' }).end(html)
            }

        } catch (e) {
            // 如果捕获到了一个错误，让 Vite 来修复该堆栈，这样它就可以映射回
            // 你的实际源码中。
            vite.ssrFixStacktrace(e)
            console.error(e)
            res.status(500).end(e.message)
        }
    })

    app.listen(3000)
    console.log("server is running at 3000")
}

createServer()