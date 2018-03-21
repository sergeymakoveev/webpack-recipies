import webpack from 'webpack';
import WebpackNotifierPlugin from 'webpack-notifier';


const
    DIR = __dirname;
    // DIR_SRC = `${DIR}/src`,
    // DIR_DIST = `${DIR}/dist`,
    // DIR_PUBLIC = '/';


export default {

    // context: DIR_SRC,

    entry: {
        index: `${DIR}/index.html`
    },

    // output: {
    //     path: DIR_DIST,
    //     publicPath: DIR_PUBLIC,
    //     filename: '[name].entry.js',
    //     library: '[name]'
    // },

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
            app.use((req, res, next) => {
                console.log(`${req.method} ${req.url}`);
                next();
            });
        //     app.use((req, res, next) => {
        //         const end = res.end;
        //         const write = res.write;
        //         const writeHead = res.writeHead;
        //         let writeHeadArgs;
        //         let body = '';
        //         res.writeHead = (...args) => { writeHeadArgs = args };
        //         res.write = (chunk) => body += chunk.toString();
        //         res.end = () => {
        //             const json = fp.set('details', {a:1, b:2}, JSON.parse(body));
        //             const output = JSON.stringify(json);
        //             res.setHeader('content-length', Buffer.byteLength(output));
        //             writeHead.apply(res, writeHeadArgs);
        //             write.call(res, output);
        //             end.apply(res);
        //         };
        //         next();
        //     })
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
                        const data_path = 'data.json';
                        console.log(`${req.url} -> bypass: response from file "${data_path}"`);
                        // возвращаем путь к файлу, котороый надо отдать в качестве ответа
                        return data_path;
                    }
                    return false;
                }
            },

            // фейковый эндпоинт, модифицирующийк тело ответа от сервера
            '/proxy/response-from-server-modify': {
                target: 'http://localhost:3000/users',
                pathRewrite: { '^/.+': '' }
            }

        },
        host: '0.0.0.0'
    }

};
