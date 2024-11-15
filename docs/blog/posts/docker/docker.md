---
title: docker
authors: [cangjingyue]
tags: 
    - docker
date: 2024-11-12
categories:
  - docker
---


# Docker

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2024/11/12/17314039427461.jpg)
## docker 常用命令
1. 拉取docker镜像
`docker pull image_name`
2. 查看宿主机上的镜像，Docker镜像保存在/var/lib/docker目录下:
`docker images`
3. 删除镜像
`docker rmi docker.io/tomcat:7.0.77-jre7 或者 docker rmi b39c68b7af30`
4. 查看当前有哪些容器正在运行
`docker ps`
5. 查看所有容器
`docker ps -a`
6. 启动、停止、重启容器命令：
`docker start container_name/container_id `
`docker stop container_name/container_id `
`docker restart container_name/container_id`
7. 后台启动一个容器后，如果想进入到这个容器，可以使用attach命令：
`docker attach container_name/container_id`
8. 删除容器的命令：
`docker rm container_name/container_id`
9. 删除所有停止的容器：
`docker rm $(docker ps -a -q)`
10. 查看当前系统Docker信息
`docker info`
11. 从Docker hub上下载某个镜像:
`docker pull centos:latest docker pull centos:latest`
12. 查找Docker Hub上的nginx镜像
`docker search nginx`
13. 执行`docker pull centos`会将Centos这个仓库下面的所有镜像下载到本地repository。