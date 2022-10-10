const ora = require("ora"); // Ora 在控制台显示当前加载状态的(下载5.x版本)
const inquirer = require("inquirer"); // 用户与命令行交互
const chalk = require("chalk"); // '粉笔' 用于设置终端字体颜色的库(下载4.x版本)
const path = require("path");
const child_process = require("child_process");
const extra = require("fs-extra"); // fs-extra 是 node fs 的扩展
const babelparser = require("@babel/parser"); // 将JS源码转换成语法树
const traverse = require("@babel/traverse").default; // 遍历和更新节点
const generator = require("@babel/generator").default; // 把AST抽象语法树反解，生成我们常规的代码

/**
 *ora、chalk 等依赖最新版只支持ESModule格式，是使用export default导出的，
 *之前的版本支持CommomJs格式，是使用module.exports导出的。
 *最新版使用 require引入所以报错。
 */

// 使用 ora 初始化，传入提示信息 message
const spinner = ora();

/**
 * @wrapLoading 交互加载动画
 * @param {*} fn 在 wrapLoading 函数中执行的方法
 * @param {*} message 执行动画时的提示信息
 * @param  {...any} args 传递给 fn 方法的参数
 * @returns
 */
async function wrapLoading(fn, message, ...args) {
  spinner.text = message.loadingMsg;
  // 开始加载动画
  spinner.start();

  try {
    // 执行传入的方法 fn
    const result = await fn(...args);
    // 动画修改为成功
    spinner.succeed(message.seccessfulMsg);
    return result;
  } catch (error) {
    // 动画修改为失败
    spinner.fail(message.failedMsg + ": ", error);
  }
}

class CreateGenerator {
  constructor(name, targetDir) {
    // 目录名称
    this.name = name;
    // 创建位置
    this.targetDir = targetDir;
    /**
     * 对 download-git-repo 进行 promise 化改造
     * 使用 child_process 的 execSync 方法拉取仓库模板
     */
    this.downloadGitRepo = child_process.execSync;
  }

  /**
   * @download 下载远程模板
   */
  async download() {
    // 设置模板下载地址
    const modelUrl = `https://github.com/UniqueCrownClown/clown-admin.git`;

    // child_process.spawn 参数
    /**
     * @param masterBranch master分支
     * @param projectBranch project-demo分支
     */
    const masterBranch = `git clone -b master ${modelUrl} ${path.resolve(
      process.cwd(),
      this.targetDir
    )}`;
    // const projectBranch = `git clone -b project-demo ${modelUrl} ${path.resolve(process.cwd(), this.targetDir, 'src', 'pages', this.name)}`
    // 调用动画加载效果，加载master分支
    await wrapLoading(
      this.downloadGitRepo,
      {
        loadingMsg: "加载模板中...",
        seccessfulMsg: "master加载成功",
        failedMsg: "master加载失败",
      },
      masterBranch
      // modelUrl,
      // path.resolve(process.cwd(), this.targetDir),
    );

    // // 调用动画加载效果，加载project-demo分支
    // await wrapLoading(
    //     this.downloadGitRepo,
    //     { loadingMsg: '加载模板中...', seccessfulMsg: 'project-demo加载成功', failedMsg: 'project-demo加载失败' },
    //     projectBranch
    //     // modelUrl,
    //     // path.resolve(process.cwd(), this.targetDir),
    // )
  }

  // 核心创建逻辑
  async create() {
    // console.log(chalk.yellow(`name: ${this.name}`))
    // console.log(chalk.yellow(`targetDir: ${this.targetDir}`))

    await this.download();

    // 写环境变量文件
    extra.outputFileSync(
      path.resolve(this.targetDir, ".env"),
      `PROJECT = ${this.name}`
    );

    this.readRoute();
  }

  /**
   * 读取路由
   * 统一修改路由中项目路径
   */
  readRoute = async () => {
    const routePath = path.resolve(
      this.targetDir,
      "src",
      "route",
      "index.ts"
    );
    extra.readFile(routePath, "utf8", (err, data) => {
      if (err) {
        throw err;
      }
      // 将JS源码转换成语法树
      let routeDataTree = babelparser.parse(data, {
        sourceType: "module",
        plugins: [
          "typescript", // 编译tsx文件
          // "jsx",         // 编译jsx文件
          // "flow",     // 流通过静态类型注释检查代码中的错误。这些类型允许您告诉Flow您希望您的代码如何工作，而Flow将确保它按照这种方式工作。
        ],
      });
      // 遍历和更新节点
      traverse(routeDataTree, {
        ObjectProperty: (path, state) => {
          // console.log(path.isIdentifier({name: 'name'}))
          if (path.node.key.name === "component") {
            path.node.value.value = `@/pages/adjustTheRecord`;
          }
        },
      });
      // 把AST抽象语法树反解，生成我们常规的代码
      const routeCode = generator(routeDataTree).code;
      extra.outputFileSync(routePath, routeCode);
      // console.log(routeCode)
    });
  };
}

module.exports = CreateGenerator;
