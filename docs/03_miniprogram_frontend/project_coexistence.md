# Vue 3 网站项目与微信小程序项目共存与组织方案

如果您想开发微信小程序，同时**完整保留现有的 Vue 3 网站项目**，最优雅、最主流的做法是采用 **“同库子项目结构” (Subfolder / Monorepo Architecture)**。

通过这种方式，两个项目在同一个物理文件夹（以及同一个 Git 仓库）下各自独立，互不影响，且非常方便共享文档和数据。

---

## 📂 推荐的项目目录组织结构

我们建议在当前项目根目录下，新建一个 `wx_miniprogram` 子文件夹用来存放小程序代码：

```bash
BabyComplementaryFoods/ (项目根目录，即 Git 仓库根目录)
├── docs/                        # 共用的开发文档、排餐规则与 JSON 数据种子
├── wx_miniprogram/              # [NEW] 微信小程序原生项目根目录
│   ├── pages/                   # 小程序各个页面 (dashboard, mealplan, etc.)
│   ├── utils/                   # 小程序工具类 (storage.js, babyHelper.js)
│   ├── app.js                   # 小程序主入口
│   ├── app.json                 # 小程序配置文件
│   ├── app.wxss                 # 小程序全局样式
│   └── project.config.json      # 微信开发者工具配置文件
│
# 以下为原本的 Vue 3 网站项目文件 (完全保留，不受任何影响)
├── src/                         # Vue 3 源码目录
│   ├── views/                   # Vue 页面 (Dashboard.vue, Healthcare.vue)
│   ├── data/                    # 网站的静态初始化种子文件
│   └── main.js
├── public/                      # 网站公共资源
├── index.html                   # 网站入口 HTML
├── package.json                 # 网站的 npm 依赖与脚本
├── vite.config.js               # Vite 配置文件
└── README.md                    # 项目主说明文档
```

---

## 🚀 具体的开发与运行配置步骤

### 第一步：在微信开发者工具中打开子目录
当您启动 **微信开发者工具** 新建/导入项目时：
1. 项目目录**不要**选择最外层的 `BabyComplementaryFoods` 文件夹。
2. 而是点击选择子目录下的 **`BabyComplementaryFoods/wx_miniprogram`** 文件夹。
3. 微信开发者工具会自动识别该子目录为独立的小程序项目，并在此处生成小程序的配置文件 `project.config.json`，不会对外部的 Vue 3 网站文件做任何改动。

### 第二步：运行 Vue 3 网站项目 (保持不变)
在根目录下运行网站开发命令，依然可以正常打开浏览器查看网页端：
```bash
npm run dev
```

### 第三步：配置 Git 忽略规则 (`.gitignore`)
为了防止微信开发者工具在子目录下生成的本地临时文件被提交到 Git 仓库，请在项目根目录的 `.gitignore` 文件中追加：

```text
# 微信开发者工具本地临时文件
wx_miniprogram/project.private.config.json
wx_miniprogram/.wx/
```

---

## 💡 此方案的优势
1. **零耦合，零冲突**：Vue 3 网站使用的是 `npm` 和 Vite 打包；小程序使用微信开发者工具自带的编译器。二者的依赖、打包工具和运行命令完全隔离，绝不冲突。
2. **方便共享数据**：您可以随时把 `docs/miniprogram/db_seeds/` 下的 JSON 数据复制或导入到小程序对应的云开发端，真正做到“一份数据，两端复用”。
3. **单 Git 仓库管理**：所有代码都在一个 Git 库里，您的开发大事记、辅食规则文档只要有更新，两端都能在同一时间获取到最新的配置。
