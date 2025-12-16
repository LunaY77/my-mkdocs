---
title: Missing Semester of MacOS - A Vim Enthusiast Programmer’s Perspective
authors: [cangjingyue]
tags:
    - mac
date: 2025-07-03 00:00:00
categories:
    - mac
---

# Missing Semester of MacOS - A Vim Enthusiast Programmer’s Perspective

## 前言

当我经历了使用 MacBook Air 开启 **docker + n 个 idea 项目 + cursor + vscode + 一堆浏览器标签页** 卡到爆炸的体验之后，决定迁移我的开发环境到 MacBook Pro 上，在购买前了解到 mac 有非常"先进"的 Migration Assistant，能无缝复制所有的配置到新的 MacBook 上(内心 os: 哎呀这真是个好东西，看来不用自己再配置一遍了)

然后... 不出意外地出了意外，我的 mba 的 Migration Assistant 抽风了，程序一进入到选择页面就是彻底卡死->黑屏->等待几小时依然黑屏->重启->重新启动程序->彻底卡死->....

我甚至没有在网上搜索到任何一位有跟我类似的卡死受害者，一些方法比如将系统版本升级到最新版都试过了，依然无效。

总之放弃了，正好一直想跟别人推荐我的 MacOS 配置，而且之前使用的过程中还是拉了很多史在自己的电脑里，那么就借此记录一下我是如何从零配置我的 MacOS 的吧。

## 系统设置

开启三指拖拽

![image.png](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/picgo/20250703083208.png)

开启轻点

![image.png](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/picgo/20250703083303.png)

去掉动画效果

![image.png](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/picgo/20250703083326.png)

自动隐藏 dock

![image.png](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/picgo/20250703083350.png)

禁用根据最近使用重排序窗口

![image.png](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/picgo/20250703083415.png)

finder 默认打开在 user 文件夹 (打开 finder 窗口，左上角 settings)

![image.png](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/picgo/20250703090715.png)

Mac 长按连续输入 (重启生效)

```shell
defaults write -g ApplePressAndHoldEnabled -bool false
```

禁用键盘自动加句号

![image.png](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/picgo/20250703091226.png)

![image.png](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/picgo/20250703091229.png)

键盘按键 repeat 拉满

![image.png](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/picgo/20250703091450.png)

打开 Terminal，输入

```shell
cd ~/Documents
mkdir {Code,Dev-Tools,docker,Privacy,Resources}
mkdir Code/{github.com,Java,Go,Python,vscode,FrontEnd,CS\ Course}
```

这是我喜欢的 mac 文件管理方式，我的 mac 的桌面上不会有任何文件

-   Code: 存放代码文件
    -   github.com
    -   Java
    -   Go
    -   Python
    -   vscode
    -   FrontEnd
    -   CS Course
-   Dev-Tools：开发工具，比如 maven
-   docker：docker-compose 文件
-   Privacy：隐私文件
-   Resources：学习资料

![CS Course.png](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/picgo/CS%20Course.png)

keyboard shortcuts 中打开快捷键切换桌面，使用 option+数字键切换 (需要创建多个桌面才会有选项)

![image.png](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/picgo/20250703101136.png)

## 网络

这里使用 `Clash Verge`

你跟我说要 VPN 才能去 github 下 clash？那你下个 Clash 啊 ()

## HomeBrew

执行以下代码，跟着配置就行

```shell
/bin/zsh -c "$(curl -fsSL https://gitee.com/cunkai/HomebrewCN/raw/master/Homebrew.sh)"
```

## Arc

神中神！下载 Arc 浏览器

[Download Arc](https://arc.net/download)

![image.png](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/picgo/20250703092334.png)

一些快捷键

-   `cmd + t` ：打开搜索框，搜索框内输入不同 space 的名称，找到 `focus on space名称` 这个选项，即可实现切换 space 效果
-   `cmd + shift + c` ：复制当前网站链接
-   `cmd + shift + option + c` ：以 md 格式复制当前网站链接，名字+链接
-   `cmd + s` ：打开/关闭侧边栏

## Raycast

神中神！吊打 spotlight

[Raycast - Your shortcut to everything](https://www.raycast.com/)

安装完毕之后，在系统设置的 keyboard shortcuts 中关闭 spotlight

![image.png](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/picgo/20250703095700.png)

更改 raycast 快捷键

![image.png](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/picgo/20250703095824.png)

![image.png](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/picgo/20250703095843.png)

后续下载别的软件后会进一步配置

## 微信输入法

神！比原生输入法好用，选它主要是我要配置一些东西 + 跨设备复制同步

[微信输入法-简洁好用打字快](https://z.weixin.qq.com/)

![image.png](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/picgo/20250703100845.png)

现在使用 `control + space` 或者 `fn` 切换输入法

## Karabiner-Elements

神中神！改键位无敌，真的好用

[Karabiner-Elements](https://karabiner-elements.pqrs.org/)

先把 mac 内置键盘的 fn 和 control 调换一下位置 (我说 mac 键盘设计真是一坨，control 放那个位置)

![image.png](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/picgo/20250703102219.png)

接着进行复杂的键位映射

![image.png](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/picgo/20250703102408.png)

1. 映射 `cmd + shift` 到 `control + space`，现在切换输入法可以使用 `cmd + shift` 了
2. 映射大写键到 `cmd + shift + option + control` ，大写键现在没用了，设置为辅助键位
3. 映射大写键 + hjkl 到方向键，vim 用户应该懂这个的含金量，无敌！

相关的配置代码如下

```
{
    "description": "Command + Shift to control + spacebar",
    "manipulators": [
        {
            "from": {
                "key_code": "left_shift",
                "modifiers": { "mandatory": ["left_command"] }
            },
            "to": [
                {
                    "key_code": "spacebar",
                    "modifiers": ["left_control"]
                }
            ],
            "type": "basic"
        }
    ]
}
```

```
{
    "description": "Change LeftShift+LeftCommand+LeftControl+LeftOption+hjkl to arrow keys",
    "manipulators": [
        {
            "from": {
                "key_code": "h",
                "modifiers": {
                    "mandatory": ["left_shift", "left_command", "left_control", "left_option"],
                    "optional": ["any"]
                }
            },
            "to": [{ "key_code": "left_arrow" }],
            "type": "basic"
        },
        {
            "from": {
                "key_code": "j",
                "modifiers": {
                    "mandatory": ["left_shift", "left_command", "left_control", "left_option"],
                    "optional": ["any"]
                }
            },
            "to": [{ "key_code": "down_arrow" }],
            "type": "basic"
        },
        {
            "from": {
                "key_code": "k",
                "modifiers": {
                    "mandatory": ["left_shift", "left_command", "left_control", "left_option"],
                    "optional": ["any"]
                }
            },
            "to": [{ "key_code": "up_arrow" }],
            "type": "basic"
        },
        {
            "from": {
                "key_code": "l",
                "modifiers": {
                    "mandatory": ["left_shift", "left_command", "left_control", "left_option"],
                    "optional": ["any"]
                }
            },
            "to": [{ "key_code": "right_arrow" }],
            "type": "basic"
        }
    ]
}
```

```
{
    "manipulators": [
        {
            "description": "Change caps_lock to command+control+option+shift.",
            "from": {
                "key_code": "caps_lock",
                "modifiers": { "optional": ["any"] }
            },
            "to": [
                {
                    "key_code": "left_shift",
                    "modifiers": ["left_command", "left_control", "left_option"]
                }
            ],
            "type": "basic"
        }
    ]
}
```

Karabiner-Elements 还可以进行其他配置，比如禁用 mac 的内置键盘，然后你的外置键盘就能直接放在内置键盘上了

![image.png](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/picgo/20250703102919.png)

## Raycast 再配置

在刚刚进行了 Karabiner-Elements 的配置之后，我们已经将大写键作为辅助键位映射到了 `cmd + shift + option + control` ，所以我可以 100% 保证不可能有键位冲突

让我们输入 `cmd + ,` 打开 raycast 的 settings，找到 extensions

这里以我 mba 上的配置为例，仅供参考，你可以按你喜欢的来

![image.png](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/picgo/20250703103322.png)

现在切换窗口已然变得非常丝滑，应用之间使用 `CapsLock+字母` 进行切换，如果想切换到桌面，比如访问 finder，那么只需要输入 `option+数字` 即可

## Arc 再配置

改一个键位即可，映射 CapsLock + N 到打开 little arc window

![image.png](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/picgo/20250703103729.png)

什么是 little arc window？

这东西灰常好用啊，比如我现在全屏的 obsidian 窗口，我希望查询一个东西，那么就可以打开小窗口，查完 cmd + w 关闭即可，非常的方便

rt

![image.png](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/picgo/20250703104051.png)

## iterm2

[iTerm2 - macOS Terminal Replacement](https://iterm2.com/)

shell 相关的配置请看 [oh-my-zsh](../tools/oh-my-zsh.md)

or 你可以直接到我的 dotfiles 仓库 **[LunaY-dotfiles](https://github.com/LunaY77/LunaY-dotfiles)** 找到 zsh 文件夹的 .zshrc

把文件 mv 到 ~ 下

记得安装字体，然后去 iterm2 的 settings 中选择 hack-nerd-font

```shell
brew install font-hack-nerd-font
```

## tmux

tmux 插件管理器

```shell
git clone https://github.com/tmux-plugins/tpm ~/.tmux/plugins/tpm
```

```shell
brew install tmux
tmux
```

dotfiles 仓库 **[LunaY-dotfiles](https://github.com/LunaY77/LunaY-dotfiles)** 找到 tmux 文件夹下的 `.tmux.conf`

然后 mv 到 ~ 文件夹下

输入

```shell
tmux source ~/.tmux.conf
```

键位映射很久之前配的了，说下我常用的

-   **prefix**: `control+z`
-   **水平切分窗口**：`prefix + |`
-   **垂直切分窗口**: `prefix + -`

## Lazygit

神中神！用了都说好，终端里的 git 图形化界面

```shell
brew install lazygit
```

## Snipaste

神！截图软件，苹果自带的截图也是一坨

[Snipaste - 截图 + 贴图](https://zh.snipaste.com/)

这边把截图快捷键映射到`大写键+1`，因为我的键盘的 `f1` 键要用 `fn+1` 才能按出来很不方便

![image.png](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/picgo/20250703114657.png)

如何使用?

-   `大写键+1`：开始截图
-   `,`: 上一张截图
-   `。`：下一张截图

## Input Source Pro

神！自动切换输入法

```shell
brew install --cask input-source-pro
```

或者去官网下载

[Input Source Pro - 自动切换输入法加上适时的提示，让每一次输入都游刃有余](https://inputsource.pro/zh-CN)

一些配置

![image.png](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/picgo/20250703115458.png)

![image.png](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/picgo/20250703115512.png)

## DropOver

一般。相当于给你一个 buffer 复制粘贴文件

但是！这软件免费版移动文件到 buffer 里要先等 3 秒，呃呃

不过还是很好用的

[Dropover - Easier Drag and Drop on your Mac.](https://dropoverapp.com/)

## RunCat

哈基米！挂右上角看系统信息的

总之可爱就行

## PicGo

神中神！无需多言

```shell
brew install picgo --cask
```

## Scroll Reverser

翻转鼠标滚轮用的

[Scroll Reverser for macOS](https://pilotmoon.com/scrollreverser/)

## idea

我的 ideavim 配置：[ideavimrc](https://github.com/LunaY77/LunaY-dotfiles/blob/master/ideavim/.ideavimrc)

## vscode

```shell
brew install --cask visual-studio-code
```

我的 vscode + vscode vim 配置：[vscode](https://github.com/LunaY77/LunaY-dotfiles/tree/master/vscode)

## neovim

我的 neovim 配置：[neovim](https://github.com/LunaY77/LunaY-dotfiles/tree/master/nvim)
