import webpack from 'webpack';
import WebpackNotifierPlugin from 'webpack-notifier';
import proxy from 'http-proxy-middleware';
import zlib from 'zlib';


const
    DIR = __dirname,
    DATA = {a:1, b:2},
    DATA_PATH = 'data.json';

const proxyfy = ({ url, data={}, path, opts }) => ({
    [url]: {
        bypass:
            (req, res, opts) =>
                (req.url === opts.context)
                ? (
                    path
                    ? path
                    : res.send(data)
                )
                : false,
        ...opts
    }
});

// https://www.npmjs.com/package/http-proxy
// https://www.npmjs.com/package/http-proxy-middleware
const proxyfy_modify =
    (app) =>
    ({
        target, url,
        reducer = ({ status, headers, body }) => ({ status, headers, body }),
        ...opts
    }) => {
        app.use(
            url,
            proxy({
                target,
                onProxyRes: (proxyRes, req, res) => {
                    const end = res.end;
                    const write = res.write;
                    const writeHead = res.writeHead;
                    let status, headers;
                    let buffer = new Buffer('');
                    res.writeHead = (code, phrase, hdrs) => {
                        status = { code, phrase };
                        headers = hdrs || {};
                    };
                    res.write = (chunk) => buffer = Buffer.concat([buffer, chunk]);
                    res.end = () => {
                        const isZipped = proxyRes.headers['content-encoding'] === 'gzip';
                        const body = (isZipped ? zlib.gunzipSync(buffer) : buffer).toString('utf8');
                        const reduced = reducer({ status, headers, body });
                        const response = {
                            ...reduced,
                            headers: {
                                'content-length': Buffer.byteLength(reduced.body),
                                'content-encoding': '',
                                ...reduced.headers
                            }
                        };
                        // res.setHeader('content-length', Buffer.byteLength(output_body));
                        // res.setHeader('content-encoding', '');
                        writeHead.call(res, response.status.code, response.status.phrase, response.headers);
                        write.call(res, response.body);
                        end.call(res);
                    }
                },
                ...opts
            })
        );
    };


export default {

    entry: {
        index: `${DIR}/index.html`
    },

    plugins: [
        new webpack.NoEmitOnErrorsPlugin(),
        new WebpackNotifierPlugin({alwaysNotify: true})
    ],

    module: {
        rules: [{
            test: /\.html$/,
            // eslint-disable-next-line no-useless-escape
            use: 'file-loader?name=[1].html?[hash]&regExp=pages/(.+)\.html$'
        }]
    },

    devServer: {
        before: (app) => {
            const modify = proxyfy_modify(app);

            app.use((req, res, next) => {
                console.log(`${req.method} ${req.url}`);
                next();
            });
            // фейковый эндпоинт, проксирующий запрос и модифицирующий тело и заголовки ответа от сервера
            app.use(
                '/proxy/response-from-server-modify',
                proxy({
                    target: 'http://localhost:3000/users/1',
                    pathRewrite: { '^/.+': '' },
                    onProxyRes: (proxyRes, req, res) => {
                        const end = res.end;
                        const write = res.write;
                        const writeHead = res.writeHead;
                        let writeHeadArgs;
                        let buffer = new Buffer('');
                        res.writeHead = (...args) => { writeHeadArgs = args };
                        res.write = (chunk) => buffer = Buffer.concat([buffer, chunk]);
                        res.end = () => {
                            const isZipped = proxyRes.headers['content-encoding'] === 'gzip';
                            const body = (isZipped ? zlib.gunzipSync(buffer) : buffer).toString('utf8');
                            const json = {...{ a: 1, b: 2 }, ...JSON.parse(body)};
                            const output = JSON.stringify(json);
                            res.setHeader('content-length', Buffer.byteLength(output));
                            res.setHeader('content-encoding', '');
                            writeHead.apply(res, writeHeadArgs);
                            write.call(res, output);
                            end.call(res);
                        }
                    }
                })
            );
            modify({
                url: '/proxy/response-from-server-modify-helper',
                target: 'http://localhost:3000/users/1',
                pathRewrite: { '^/.+': '' },
                reducer: ({ status: { code, phrase }, headers, body }) => {
                    console.log({ status: { code, phrase }, headers, body });
                    const s = { code: code + 22, phrase: `Say: ${phrase}` };
                    const b = { ...{ c: 3, d: 4 }, ...JSON.parse(body || '{}') };
                    const h = { ...headers, 'x-some-header': 'some value'};
                    return {
                        status: s,
                        headers: h,
                        body: JSON.stringify(b)
                    };
                }
            });
        },
        proxy: {
            '/api': 'http://localhost:3000',

            // фейковый эндпоинт, генерирующий тело ответа
            '/proxy/response-generated': {
                // logLevel: 'debug',
                bypass: (req, res, opts) => {
                    if (req.url === opts.context) {
                        console.log(`${req.url} -> bypass: response generated`);
                        res.send({ id: 1, title: 'title' });
                    }
                    // передаем дальше
                    return false;
                }
            },

            // фейковый эндпоинт, передающий файл как тело ответа
            '/proxy/response-from-file': {
                // logLevel: 'debug',
                bypass: (req, res, opts) => {
                    if (req.url === opts.context) {
                        console.log(`${req.url} -> bypass: response from file "${DATA_PATH}"`);
                        // возвращаем путь к файлу, котороый надо отдать в качестве ответа
                        return DATA_PATH;
                    }
                    return false;
                }
            },

            ...proxyfy({
                url: '/proxy/response-generated-proxyfy',
                data: DATA
            }),
            ...proxyfy({
                url: '/proxy/response-from-file-proxyfy',
                path: DATA_PATH
            })
        },
        host: '0.0.0.0'
    }

};
