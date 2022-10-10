const ora = require('ora');     // Ora 在控制台显示当前加载状态的(下载5.x版本)
const inquirer = require('inquirer');   // 用户与命令行交互
const chalk = require('chalk');     // '粉笔' 用于设置终端字体颜色的库(下载4.x版本)
const path = require('path');
const child_process = require('child_process');
const extra = require('fs-extra');  // fs-extra 是 node fs 的扩展
const babelparser = require('@babel/parser');   // 将JS源码转换成语法树
const traverse = require('@babel/traverse').default;    // 遍历和更新节点
const generator = require('@babel/generator').default;  // 把AST抽象语法树反解，生成我们常规的代码
const babeltypes = require('@babel/types');

/**
 *ora、chalk 等依赖最新版只支持ESModule格式，是使用export default导出的，
 *之前的版本支持CommomJs格式，是使用module.exports导出的。
 *最新版使用 require引入所以报错。
 */

// 使用 ora 初始化，传入提示信息 message
const spinner = ora()


/**
 * @wrapLoading 交互加载动画
 * @param {*} fn 在 wrapLoading 函数中执行的方法
 * @param {*} message 执行动画时的提示信息
 * @param  {...any} args 传递给 fn 方法的参数
 * @returns 
 */
async function wrapLoading(fn, message, ...args) {
    spinner.text = message.loadingMsg
    // 开始加载动画
    spinner.start()

    try {
        // 执行传入的方法 fn
        const result = await fn(...args)
        // 动画修改为成功
        spinner.succeed(message.seccessfulMsg)
        return result
    } catch (error) {
        // 动画修改为失败
        spinner.fail(message.failedMsg + ': ', error)
    }
}

class NewModelsGenerator {
    constructor(name, targetDir) {
        // 目录名称
        this.name = name;
        // 创建位置
        this.targetDir = targetDir;
        /** 
         * 对 download-git-repo 进行 promise 化改造
         * 使用 child_process 的 execSync 方法拉取仓库模板
        */
        this.downloadGitRepo = child_process.execSync

    }

    /**
     * 生成Model相关文件
     */
    createModel = async () => {
        this.readModel()
        this.makeModelFile()
    }

    /**
     * 读取Model
     * 创建新的Model 引入
     */
    readModel = async () => {
        const modelPath = path.resolve(this.targetDir, 'models', 'connect.d.ts')
        extra.readFile(modelPath, 'utf8', (err, data) => {
            if (err) {
                throw err
            }
            // 将JS源码转换成语法树
            let modeldataTree = babelparser.parse(data, {
                sourceType: 'module',
                plugins: [
                    'typescript'
                ]
            })

            // 首字母大写
            let fileName = this.name.replace(/^[a-z]/g, (L) => L.toUpperCase())

            traverse(modeldataTree, {
                enter: (path, state) => {
                    // 加上引入的类型文件
                    if (path.node.type === 'ImportDeclaration' && path.node.source.value === '../type') {
                        // console.log(path.node)
                        const newImportSpecifier = babeltypes.importSpecifier(
                            babeltypes.identifier(`${fileName}State`),
                            babeltypes.identifier(`${fileName}State`),
                        )
                        path.node.specifiers.push(newImportSpecifier)
                    }
                    // 加上导出的类型约束
                    if (path.node.type === 'ExportNamedDeclaration' && path.node.declaration.id.name === 'ConnectState') {
                        // console.log(path.node.declaration.body.body)
                        // 创建对象类型属性
                        const newObjectTypeProperty = babeltypes.objectTypeProperty(
                            // 创建节点名称
                            babeltypes.identifier(`${this.name}Store`),
                            // 创建泛型类型注释
                            babeltypes.genericTypeAnnotation(
                                // 创建泛型类型注释节点名称
                                babeltypes.identifier(`${fileName}State`)
                            ),
                        )

                        // to study optional: true 可选条件加入
                        /* const newObjectTypeProperty = babeltypes.objectTypeProperty(
                            babeltypes.identifier(`${this.name}Store`),
                            babeltypes.genericTypeAnnotation(
                                babeltypes.identifier(`${fileName}State`),
                            ),
                            babeltypes.validate('minus'),
                            babeltypes.identifier(`optional`),
                            babeltypes.booleanLiteral(true),
                            babeltypes.booleanLiteral(false),
                            babeltypes.booleanLiteral(false),
                        ) */
                        path.node.declaration.body.body.push(newObjectTypeProperty)
                        // console.log(path.node.declaration.body.body)
                    }
                }
            })
            // 把AST抽象语法树反解，生成我们常规的代码
            const modelCode = generator(modeldataTree).code
            // console.log('mode:', modelCode)
            extra.outputFileSync(modelPath, modelCode)
        })

    }

    /**
     * 在 Model 文件夹中创建页面类型文件
     */
    makeModelFile = async () => {
        // let dirPath = path.resolve(this.targetDir, 'models', this.name)
        // 创建文件夹
        // extra.ensureDirSync(dirPath)

        // 首字母大写
        let fileName = this.name.replace(/^[a-z]/g, (L) => L.toUpperCase())

        // model模板
        const modelTemp = `
        import { Reducer, Effect } from 'umi';
        import { ConnectState } from './connect';
        import { ${fileName}State } from '../type'
            
        export interface ${fileName}Type {
            namespace: '${this.name}Store';
            state: ${fileName}State;
            effects: {};
            reducers: {};
        }
        
        
        const ${fileName}: ${fileName}Type = {
            namespace: '${this.name}Store',
        
            state: {
            
            },
        
            effects: {
            
            },
        
            reducers: {
            
            },
        };
        
        export default ${fileName};
        `
        // 输出model文件
        extra.outputFileSync(path.resolve(this.targetDir, 'models', `${this.name}Store.ts`), modelTemp)
    }

}

module.exports = NewModelsGenerator;