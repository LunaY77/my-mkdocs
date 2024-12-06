---
title: oh-my-zsh
authors: [cangjingyue]
tags: 
    - tools
date: 2024-12-06 00:00:00
categories:
  - tools
---

# oh-my-zsh

本文基于 **macos** 系统，使用 **oh-my-zsh** 对终端进行美化。

**Oh My Zsh** 是基于 **zsh** 命令行的一个扩展工具集，提供了丰富的扩展功能。

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2024/12/06/17334678151323.jpg)







## 1. 安装 oh-my-zsh


```bash
sh -c "$(curl -fsSL https://install.ohmyz.sh/)"
```

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2024/12/06/17334625616432.jpg)

## 2. 配置主题

使用 [powerlevel10k](https://github.com/romkatv/powerlevel10k) 主题。

```bash
git clone --depth=1 https://github.com/romkatv/powerlevel10k.git ${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}/themes/powerlevel10k
```

在 `~/.zshrc` 设置 `ZSH_THEME="powerlevel10k/powerlevel10k"`。

**运行命令**

```bash
source ~/.zshrc
```

接下来，终端会自动引导你配置 `powerlevel10k`。

如果希望**重新配置**，输入以下命令

```bash
p10k configure
```


## 3. 安装插件

### 3.1 zsh -autosuggestions

[zsh -autosuggestions](https://github.com/zsh-users/zsh-autosuggestions) 是一个命令提示插件，当你输入命令时，会自动推测你可能需要输入的命令，按下右键可以快速采用建议。效果如下：

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2024/12/06/17334673829105.jpg)



安装方式：把插件下载到本地的 `~/.oh-my-zsh/custom/plugins` 目录

```bash
git clone https://github.com/zsh-users/zsh-autosuggestions ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-autosuggestions
```


### 3.2 zsh-syntax-highlighting

[zsh-syntax-highlighting](https://github.com/zsh-users/zsh-syntax-highlighting) 是一个命令语法校验插件，在输入命令的过程中，若指令不合法，则指令显示为红色，若指令合法就会显示为绿色。效果如下：

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2024/12/06/17334674054382.jpg)


安装方式：把插件下载到本地的 `~/.oh-my-zsh/custom/plugins` 目录。


```bash
git clone https://github.com/zsh-users/zsh-syntax-highlighting.git ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-syntax-highlighting
```

### 3.3 z

`oh-my-zsh` 内置了 `z` 插件。`z` 是一个文件夹快捷跳转插件，对于曾经跳转过的目录，只需要输入最终目标文件夹名称，就可以快速跳转，避免再输入长串路径，提高切换文件夹的效率。效果如下：

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2024/12/06/17334674281105.jpg)




### 3.4 启用插件

修改 `~/.zshrc` 中插件列表为：

```
plugins=(git zsh-syntax-highlighting zsh-autosuggestions z)
```

执行 `source ~/.zshrc`