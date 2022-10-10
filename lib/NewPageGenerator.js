const ora = require("ora"); // Ora 在控制台显示当前加载状态的(下载5.x版本)
const inquirer = require("inquirer"); // 用户与命令行交互
const chalk = require("chalk"); // '粉笔' 用于设置终端字体颜色的库(下载4.x版本)
const path = require("path");
const child_process = require("child_process");
const extra = require("fs-extra"); // fs-extra 是 node fs 的扩展
const babelparser = require("@babel/parser"); // 将JS源码转换成语法树
const traverse = require("@babel/traverse").default; // 遍历和更新节点
const generator = require("@babel/generator").default; // 把AST抽象语法树反解，生成我们常规的代码
const babeltypes = require("@babel/types");
const ejs = require("ejs");
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

class NewPageGenerator {
  constructor(name, targetDir, chooseProject, inputRouteName) {
    // 目录名称
    this.name = name;
    // 创建位置
    this.targetDir = targetDir;
    // 用户选择的项目名称
    this.chooseProject = chooseProject;
    // 用户输入路由名称
    this.inputRouteName = inputRouteName;
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
    const pagesBranch = `git clone -b pages-demo ${modelUrl} ${path.resolve(
      process.cwd(),
      this.targetDir,
      "pages",
      this.name
    )}`;

    // 调用动画加载效果，加载pages-demo分支
    await wrapLoading(
      this.downloadGitRepo,
      {
        loadingMsg: "加载模板中...",
        seccessfulMsg: "pages-demo加载成功",
        failedMsg: "pages-demo加载失败",
      },
      pagesBranch
      // modelUrl,
      // path.resolve(process.cwd(), this.targetDir),
    );
  }

  /**
   * @copyFile 拷贝本地模板文件
   */
  async copyFile() {
    try {
      await fs.copy(
        path.resolve("./", "template", "page.tpl"),
        path.resolve(this.targetDir, this.name, "index.vue")
      );
      console.log("success!");
    } catch (err) {
      console.error("fail", err);
    }
  }

  // 核心创建逻辑
  async create() {
    // 创建页面文件夹
    extra.ensureDirSync(path.join(this.targetDir, this.name));

    // 下载页面模板,多文件用gitclone的方式，文件少的考虑用本地文件
    // await this.download();

    await this.copyFile();

    // 模板引擎填补坑位
    this.ejsModel();

    // 读取路由写入路由文件
    this.readRoute();
  }

  // 使用 ejs 模板引擎读取文件内容，并写入到输出目录
  ejsModel = () => {
    // 修改首字母大写
    let fileName = this.name.replace(/^[a-z]/g, (L) => L.toUpperCase());

    const ejsParams = {
      name: this.name,
      fileName,
    };

    // 替换 .tsx 模板
    ejs.renderFile(
      path.join(this.targetDir, this.name, "index.vue"),
      ejsParams,
      (err, result) => {
        if (err) {
          throw err;
        }
        extra.writeFileSync(
          path.join(this.targetDir, this.name, "index.vue"),
          result
        );
      }
    );
  };

  /**
   * 读取路由
   * 创建新路由节点
   */
  readRoute = async () => {
    const cwd = process.cwd(); // 项目根目录地址
    const routePath = path.resolve(cwd, "src", "router", "index.ts");
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
        /**
         * 进入节点，可以打印 path.node.type 查看文件中所有节点类型
         * 可以一层一层往里打印，查看各个类型下的 node 节点内容
         * 这里找到 ExpressionStatement 里的是文件的内容
         * path.node.type = ArrayExpression  中的是需要修改的内容
         */
        enter: (path, state) => {
          // console.log(path.isIdentifier({name: 'name'}))
          // console.log(path.node.type)
          if (path.node.type === "ArrayExpression") {
            // 给新 object 项添加路由属性
            // console.log(this.inputRouteName, this.chooseProject)
            const newRouteObj = babeltypes.objectExpression([
              babeltypes.objectProperty(
                babeltypes.identifier("path"),
                babeltypes.stringLiteral(`/${this.name}`)
              ),
              babeltypes.objectProperty(
                babeltypes.identifier("exact"),
                babeltypes.booleanLiteral(true)
              ),
              babeltypes.objectProperty(
                babeltypes.identifier("name"),
                babeltypes.stringLiteral(this.inputRouteName)
              ),
              babeltypes.objectProperty(
                babeltypes.identifier("component"),
                babeltypes.stringLiteral(
                  `@/views/pages/${this.chooseProject}/${this.name}`
                )
              ),
              babeltypes.objectProperty(
                babeltypes.identifier("layout"),
                babeltypes.objectExpression([
                  babeltypes.objectProperty(
                    babeltypes.identifier("hideNav"),
                    babeltypes.booleanLiteral(true)
                  ),
                ])
              ),
            ]);
            // 将新路由object添加到路由数组中
            path.node.elements.push(newRouteObj);
          }
          // if (path.node.key.name === 'component') {
          //     path.node.value.value = `@/pages/${this.name}/pages/adjustTheRecord`
          // }
        },
        // 退出节点
        // exit(path) {
        //     console.log(`  exit ${path.type}(${path.key})`)
        // }
      });
      // 把AST抽象语法树反解，生成我们常规的代码
      const routeCode = generator(
        routeDataTree,
        { jsescOption: { minimal: true } },
        ""
      ).code;
      extra.outputFileSync(routePath, routeCode);
    });
  };
}

module.exports = NewPageGenerator;
