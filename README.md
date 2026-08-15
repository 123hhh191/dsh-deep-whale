# dsh-deep-whale · DSH 皮肤与主题工具系列

DeepSeek Harness Web GUI 的主题皮肤与自定义工具（独立分发仓库）。

## 效果预览

| maid-atelier 亮色模式 | maid-atelier 暗色模式 |
|---|---|
| [![maid-atelier 亮色模式](maid-atelier/preview/light.webp)](maid-atelier/preview/light.webp) | [![maid-atelier 暗色模式](maid-atelier/preview/dark.webp)](maid-atelier/preview/dark.webp) |

## 住户

| 皮肤/工具 | 包名 | 说明 | 许可 |
|---|---|---|---|
| [maid-atelier](maid-atelier/) | `@dsh-external/dsh-client-ui-skin-maid-atelier` | 深海女仆工坊:双女仆背景、深海蓝蕾丝界面与 Q 版侧栏 | CC BY-NC-SA 4.0 |
| [skin-studio](skin-studio/) | `@dsh-external/dsh-client-ui-skin-studio` | 主题定制工作室:背景图层系统(图片大小/自由位置/模糊/透明/羽化)、Token 编辑、原始 CSS、元素拾取与取色涂色、方案导入导出 | MIT |

## 安装

### maid-atelier（深海女仆工坊皮肤）

```sh
git clone https://github.com/123hhh191/dsh-deep-whale
cd <harness>
dsh plugin --profile web add ../dsh-deep-whale/maid-atelier
```

### skin-studio（主题定制工作室，推荐）

```sh
git clone https://github.com/123hhh191/dsh-deep-whale
cd <harness>
dsh plugin --profile web add ../dsh-deep-whale/skin-studio
```

装完**刷新浏览器页面**即可。skin-studio 使用说明见 [skin-studio/README.md](skin-studio/README.md)（含演示截图与 FAQ）。

## 许可

本仓库各皮肤为**衍生创作**,整体以 CC BY-NC-SA 4.0(署名-非商业性使用-相同方式共享)发布,禁止商业性使用。skin-studio 工具本体为 MIT。
