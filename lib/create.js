const path = require('path');
const extra = require('fs-extra');  // fs-extra 是 node fs 的扩展
const inquirer = require('inquirer');  // 命令行交互
const chalk = require('chalk');     // '粉笔'
const CreateGenerator = require('./CreateGenerator')

module.exports = async function (name, options) {
    // 验证是否正常取到值
    // console.log('create success', name, options);
    const cwd = process.cwd(); // 执行目录
    const targetAir = path.join(cwd, name); // 需要创建的目录地址
    // 判断目录是否已经存在？
    if (extra.existsSync(targetAir)) {
        // 是否为强制创建？
        if (options.force) {
            await extra.remove(targetAir)
            makeGenerator(name, targetAir)
        }
        else {
            // 在终端输出询问用户是否覆盖：
            const inquirerParams = [{
                name: 'aboutProject',
                type: 'list',
                message: '目标文件目录已经存在，请选择如下操作：',
                choices: [
                    { name: '替换当前目录', value: 'replace' },
                    { name: '移除已有目录', value: 'remove' },
                    { name: '取消当前操作', value: 'cancel' }
                ]
            }]
            let inquirerData = await inquirer.prompt(inquirerParams);
            // console.log('inquirerData', inquirerData)
            if (!inquirerData?.aboutProject) {
                return
            }
            else if (inquirerData.aboutProject === 'remove') {
                // 移除已存在的目录
                await extra.remove(targetAir)
                console.log('目录 <' + chalk.green(name) + '> 已移除')
            }
            else if (inquirerData.aboutProject === 'replace') {
                await extra.remove(targetAir)
                makeGenerator(name, targetAir)
            }
        }
    }
    else {
        makeGenerator(name, targetAir)
    }

};

/**
 * 创建项目
 * @param {string} name 项目名称
 * @param {string} targetAir 需要创建的目录地址
 */
const makeGenerator = (name, targetAir) => {
    const generator = new CreateGenerator(name, targetAir)

    generator.create()
}