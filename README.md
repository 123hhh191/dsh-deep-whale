# dsh-deep-whale · skin-studio

DeepSeek Harness Web GUI 的**主题定制工作室**插件：背景图层系统、Token 编辑器、原始 CSS、元素拾取与取色涂色、方案导入导出——全部可视化操作。

## 安装

```sh
# 1. 在你的 harness 目录的【上一级】克隆（保证和 harness 是同级文件夹）
cd <harness 的上级目录>
git clone https://github.com/123hhh191/dsh-deep-whale

# 2. 进入 harness，安装插件
cd <harness 目录>
dsh plugin --profile web add ../dsh-deep-whale/skin-studio
```

> 如果 clone 到了别的位置，把最后一行换成绝对路径即可：
> `dsh plugin --profile web add <clone 到的绝对路径>\skin-studio`

装完**刷新浏览器页面**，进入 设置 → 通用 → 主题定制 即可使用。克隆出来的文件夹要保留（link 安装依赖它）。

## 详细文档

功能演示截图、使用指南、FAQ 见 [skin-studio/README.md](skin-studio/README.md)。

## 许可

MIT。
