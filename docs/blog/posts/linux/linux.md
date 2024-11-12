---
title: linux环境部署
authors: [cangjingyue]
tags: 
    - linux
date: 2024-11-12
categories:
  - linux
---
# linux环境部署

## SSH连接
我使用的是*macos*，选择软件 **Termius** 进行SSH远程连接
<br/>
![Termius](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2024/11/12/17314109093176.jpg)
<br/>


## linux 系统环境
``` bash
[root@iZbp12idmwavjjcx2k19kjZ ~]# cat /etc/os-release 
NAME="Alibaba Cloud Linux"
VERSION="3 (OpenAnolis Edition)"
ID="alinux"
ID_LIKE="rhel fedora centos anolis"
VERSION_ID="3"
VARIANT="OpenAnolis Edition"
VARIANT_ID="openanolis"
ALINUX_MINOR_ID="2104"
ALINUX_UPDATE_ID="10"
PLATFORM_ID="platform:al8"
PRETTY_NAME="Alibaba Cloud Linux 3.2104 U10 (OpenAnolis Edition)"
ANSI_COLOR="0;31"
HOME_URL="https://www.aliyun.com/"
```

<br/>

## 安装docker
``` bash
# 更新yum
yum upgrade

# 设置镜像仓库 (阿里云镜像)
yum-config-manager --add-repo http://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo

# 安装docker
yum install docker-ce

# 启动docker
sudo systemctl start docker
sudo systemctl enable docker

# 查看docker 版本
docker --version
```

<br/>


## 安装 docker-compose

``` bash
# 先执行这两行命令，直接pip会报错
sudo python3 -m pip install -U pip
sudo python3 -m pip install -U setuptools

# 安装docker-compose
pip install docker-compose

# 查看 docker-compose 版本
docker-compose --version
```
<br/>

## docker 配置国内镜像源
配置国内镜像源
[镜像源地址大全](https://blog.csdn.net/llc580231/article/details/139979603#:~:text=Docker镜像)

``` bash
vim  /etc/docker/daemon.json
```

```
{"registry-mirrors": [
"https://docker.1panel.dev",
"https://docker.fxxk.dedyn.io",
"https://docker.xn--6oq72ry9d5zx.cn",
"https://docker.m.daocloud.io",
"https://a.ussh.net",
"https://docker.zhai.cm"]}
```

上述镜像源 2024/10/10 可用

重启docker服务

``` bash
# 重新加载配置文件
sudo systemctl daemon-reload
# 重新启动docker服务
sudo service docker restart
```