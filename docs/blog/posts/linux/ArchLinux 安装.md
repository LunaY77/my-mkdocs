---
title: ArchLinux安装与配置
authors: [cangjingyue]
tags: 
    - linux
date: 2025-01-27 00:00:00
categories:
  - linux
---



# ArchLinux安装与配置


## 安装

我是跟着下述教程安装的，体验下来并不难 [archlinux 基础安装 | archlinux 简明指南](https://arch.icekylin.online/guide/rookie/basic-install.html)

我个人不是很推荐第一次安装用`archinstall`，用起来不是很舒服...(看个人吧)

安装成功！系统信息如下：

![1f11b2036d0a3e1b5d0790cb4b84588c_720](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/01/27/1f11b2036d0a3e1b5d0790cb4b84588c720.jpg)


## [解决] grub 找不到 Windows 引导

背景如下：

我的 `ArchLinux` 安装在一块新买的固态硬盘上，我个人认为是这个原因导致其无法找到 `Windows Boot`，即 运行命令 `grub-mkconfig -o /boot/grub/grub.cfg` 后，在 `grub` 界面只能找到 `ArchLinux` 引导但没有 `Windows`

排查流程如下：

运行命令 `fdisk -l` 查找 `Windows` 的 `EFI` 分区

![cd3acee020854d26b7e41660c946db16](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/01/27/cd3acee020854d26b7e41660c946db16.jpeg)

观察到 `Windows` 的 `EFI`分区位于 `/dev/nvme0n1p1` 目录下

运行命令 `mount /dev/nvme0n1p1 /mnt` 将 `Windows EFI` 挂载到 `/mnt` 上

运行命令 `lsblk` 查看是否正确挂载

![1abbd9d2c00c07c241ddeca5f2a668f9](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/01/27/1abbd9d2c00c07c241ddeca5f2a668f9.jpeg)


运行命令 `os-prober` 发现 `Windows` 引导

运行命令 `grub-mkconfig -o /boot/grub/grub.cfg` 生成 `grub` 配置文件


![e7aa8d1ce4ebc6e5e972a16b405b71f3](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/01/27/e7aa8d1ce4ebc6e5e972a16b405b71f3.jpeg)

最后`grub` 成功发现 `Windows` 引导，问题成功解决！！！


## 安装NVIDIA显卡驱动

查看显卡
```bash
lspci -k | grep -A 2 -E "(VGA|3D)"
```

安装驱动

```bash
sudo pacman -S nvidia nvidia-utils nvidia-settings
```

```bash
sudo nvim /etc/default/grub
```

在`GRUB_CMDLINE_LINUX`中添加`nvidia_drm.modeset=1`

```bash
sudo grub-mkconfig -o /boot/grub/grub.cfg
```

```bash
sudo nvim /etc/mkinitcpio.conf
```

在`MODULES`中加入`nvidia nvidia_modeset nvidia_uvm nvidia_drm`

将`kms`从`HOOKS`中去掉

```bash
sudo mkinitcpio -P
```

`reboot` 重启

`nvidia-smi` 验证是否安装成功

## 安装Hyprland

```bash
sudo pacman -S hyprland kitty waybar
sudo pacman -S sddm
sudo pacman -S ttf-jetbrains-mono-nerd adobe-source-han-sans-cn-fonts adobe-source-code-pro-fonts
sudo systemctl enable sddm
```

```bash
vim ~/.config/hypr/hyprland.conf
#添加NVIDIA环境变量
env = LIBVA_DRIVER_NAME,nvidia
env = XDG_SESSION_TYPE,wayland
env = GBM_BACKEND,nvidia-drm
env = __GLX_VENDOR_LIBRARY_NAME,nvidia
env = WLR_NO_HARDWARE_CURSORS,1
```

执行完上述命令且无报错后，`reboot` 重启

以下是 `Hyprland` 的基本操作

* Win+Q 开启终端
* Win+C 关闭窗口
* Win+R 呼出菜单
* Win+数字 切换桌面
* Win+Shift+数字 将当前窗口移动到对应工作区
* Win+鼠标左键 拖动窗口
* Win+鼠标右键 调整窗口大小
* Win+V 让窗口浮动出来



## 安装基础组件

1. 安装输入法
```bash
sudo pacman -S fcitx5-im # 输入法基础包组
sudo pacman -S fcitx5-chinese-addons # 官方中文输入引擎
sudo pacman -S fcitx5-anthy # 日文输入引擎
sudo pacman -S fcitx5-pinyin-moegirl # 萌娘百科词库。二刺猿必备（archlinuxcn）
sudo pacman -S fcitx5-material-color # 输入法主题
```

通过 vim 创建并编辑文件 `~/.config/environment.d/im.conf`：

```bash
vim ~/.config/environment.d/im.conf
```

在文件中加入以下内容并保存退出

```
# fix fcitx problem
GTK_IM_MODULE=fcitx
QT_IM_MODULE=fcitx
XMODIFIERS=@im=fcitx
SDL_IM_MODULE=fcitx
GLFW_IM_MODULE=ibus
```


        
2. 配置输入法
```bash
fcitx5-configtool
```

3. 安装paru
```bash   
git clone https://aur.archlinux.org/paru.git
cd paru
makepkg -si
```

4. 安装代理

```bash
paru -S clash-verge-rev
```

5. 安装rofi

```bash
sudo pacman -S rofi
```

6. 安装google和vscode

```bash
paru -S google-chrome
sudo pacman -S code
```

7. 配置声音

```bash
sudo pacman -S pavucontrol-qt
pavucontrol-qt
```


## 最终效果

帅！

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/01/28/17380204002928.jpg)

