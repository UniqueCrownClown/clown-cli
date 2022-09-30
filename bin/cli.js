#! /usr/bin/env node

const {Command} = require('commander');

const program = new Command()

// 定义创建项目
program
.command('create <projectName>')
.description('create a new project, 创建一个新项目')
.option('-f, --force', '如果创建的目录存在则直接覆盖')
.action((name, option) => {
    // 引入create.js 模块并传递参数
    require('../lib/create')(name, option)
})

// 新建页面，并添加type、store、route等配置
program
.command('newPage <pageName>')
.description('创建新页面，并配置type、store、route')
.action((pageName) => {
    // 引入newPage.js 模块并传递参数
    require('../lib/newPage')(pageName)
})
// 配置版本信息
program
.version(`v${require('../package.json').version}`)
.description('使用说明')
.usage('<command> [option]')


program.parse(process.argv)