const ora = require('ora');     // Ora 在控制台显示当前加载状态的(下载5.x版本)
const inquirer = require('inquirer');   // 用户与命令行交互
const chalk = require('chalk');     // ‘粉笔’ 用于设置终端字体颜色的库(下载4.x版本)
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

class NewTypeGenerator {
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
     * 生成type相关文件
     */
    createType = async() => {
        this.readType()
        this.makeTypeFile()
    }

    /**
     * 读取type
     * 创建新的type 引入
     */
    readType = async () => {
        const typePath = path.resolve(this.targetDir, 'type', 'index.ts')
        extra.readFile(typePath, 'utf8', (err, data) => {
            if (err) {
                throw err
            }
            // 将JS源码转换成语法树
            let typeDataTree = babelparser.parse(data, {
                sourceType: 'module',
                plugins: [
                    "typescript",   // 编译tsx文件
                    // "jsx",         // 编译jsx文件
                    // "flow",     // 流通过静态类型注释检查代码中的错误。这些类型允许您告诉Flow您希望您的代码如何工作，而Flow将确保它按照这种方式工作。

                ]
            })
            // 遍历和更新节点
            traverse(typeDataTree, {
                enter: (path, state) => {
                    if (path.node.type === 'Program') {
                        /**
                         * 创建全部导出节点
                         * export * from './pricingSystem';
                         */
                        const newExportDeclaration = babeltypes.exportAllDeclaration(
                            babeltypes.stringLiteral(`./${this.name}`)
                        )

                        path.node.body.push(newExportDeclaration)

                    }

                }
            })
            // 把AST抽象语法树反解，生成我们常规的代码
            const typeCode = generator(typeDataTree).code
            extra.outputFileSync(typePath, typeCode)
        })
    }

    /**
     * 在 type 文件夹中创建页面类型文件
     */
    makeTypeFile = async() => {
        // 修改首字母大写
        let fileName = this.name.replace(/^[a-z]/g,(L) => L.toUpperCase())
        let dirPath = path.resolve(this.targetDir, 'type', fileName)
        // 创建文件夹
        extra.ensureDirSync(dirPath)

        // 类型文件模板
        const typeTemp = `
        /**
         * 调价记录
         * @param tableLoad 列表load
         * @param qureyInfo 请求数据
         * @param resdata 调价列表响应数据
         */

        export interface ${fileName}State {
            tableLoad?: boolean | undefined;
            qureyInfo?: any;
            resdata?: any;
            [name: string]: any;
        }
        `
        // 输出type文件
        extra.outputFileSync(path.resolve(dirPath, 'index.ts'), typeTemp)
    }

}

module.exports = NewTypeGenerator;