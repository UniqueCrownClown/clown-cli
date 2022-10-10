const path = require('path');
const extra = require('fs-extra');  // fs-extra 是 node fs 的扩展
const inquirer = require('inquirer');  // 命令行交互
const chalk = require('chalk');     // '粉笔'
const NewPageGenerator = require('./NewPageGenerator');
const NewTypeGenerator = require('./NewTypeGenerator');
const NewModelsGenerator = require('./NewModelsGenerator');

module.exports = async function (name) {

    const cwd = process.cwd(); // 项目根目录地址
    const targetAir = path.join(cwd, 'src', 'views', 'pages'); // 需要创建的目录地址

    // 读取项目文件夹目录
    const projectCatalogue = extra.readdirSync(targetAir)

    // 交互式提问获取用户选择的项目
    const inquirerAnswer = await inquirer.prompt({
        name: 'chooseProject',
        type: 'rawlist',
        message: '请选择需要添加页面的项目文件夹：',
        choices: [...projectCatalogue]
    })

    // 询问用户新路由页面名称
    const inquirerAnswerOfName = await inquirer.prompt({
        name: 'inputRouteName',
        type: 'input',
        message: '请输入新页面路由名称：',
        validate: (value) => {
            // 只含有汉字、数字、字母、下划线，下划线位置不限
            const reg = new RegExp(/^[a-zA-Z0-9_\u4e00-\u9fff]+$/)
            if (value.match(reg)) {
                return true
            }
            return '请输入汉字、数字、字母、下划线，下划线位置不限'
        }
    })

    // 具体项目路径
    const projectDir = path.join(targetAir, inquirerAnswer.chooseProject)

    // 判断页面文件是否存在
    if (extra.existsSync(path.join(projectDir, name))) {
        return console.log(`页面 ${chalk.green(name)} 已存在`)
    }


    makeGenerator(name, projectDir, inquirerAnswer.chooseProject, inquirerAnswerOfName.inputRouteName)
    // makeTypeGenerator(name, projectDir, inquirerAnswer.chooseProject, inquirerAnswerOfName.inputRouteName)
    // makeModelsGenerator(name, projectDir, inquirerAnswer.chooseProject, inquirerAnswerOfName.inputRouteName)
}

/**
 * 创建页面
 * @param {string} name 新页面名称
 * @param {string} targetAir 需要创建页面的项目地址
 * @param {string} chooseProject 用户选择的项目
 * @param {string} inputRouteName 新路由页面名称
 */
const makeGenerator = (name, targetAir, chooseProject, inputRouteName) => {
    const generator = new NewPageGenerator(name, targetAir, chooseProject, inputRouteName)

    generator.create()
}

/**
 * 创建type
 * @param {string} name 新页面名称
 * @param {string} targetAir 需要创建页面的项目地址
 * @param {string} chooseProject 用户选择的项目
 * @param {string} inputRouteName 新路由页面名称
 */
const makeTypeGenerator = (name, targetAir, chooseProject, inputRouteName) => {
    const generator = new NewTypeGenerator(name, targetAir, chooseProject, inputRouteName)

    generator.createType()
}

/**
 * 创建models
 * @param {string} name 新页面名称
 * @param {string} targetAir 需要创建页面的项目地址
 * @param {string} chooseProject 用户选择的项目
 * @param {string} inputRouteName 新路由页面名称 
 */
const makeModelsGenerator = (name, targetAir, chooseProject, inputRouteName) => {
    const generator = new NewModelsGenerator(name, targetAir, chooseProject, inputRouteName)
    generator.createModel()
}