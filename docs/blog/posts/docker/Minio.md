---
title: Minio 部署
authors: [cangjingyue]
tags: 
    - docker
date: 2024-11-12
categories:
  - docker
---


# Minio 部署

## 创建挂载目录
``` bash
#创建挂载目录
mkdir -p /data/minio
```

<br/>

## 创建yml文件
``` bash
vim /data/minio/docker-compose.yml
```

<br/>

## 填入配置
``` bash
version: '3.9'
services:
  minio:
    image: "quay.io/minio/minio:RELEASE.2022-08-02T23-59-16Z"
    container_name: minio
    ports:
      - "9000:9000" # api 端口
      - "9001:9001" # 控制台端口
    environment:
      TZ: Asia/Shanghai # 时区上海
      MINIO_ROOT_USER: admin # 管理后台用户名
      MINIO_ROOT_PASSWORD: 12345678 # 管理后台密码，最小8个字符
      MINIO_COMPRESS: "off" # 开启压缩 on 开启 off 关闭
      MINIO_COMPRESS_EXTENSIONS: "" # 扩展名 .pdf,.doc 为空 所有类型均压缩
      MINIO_COMPRESS_MIME_TYPES: "" # mime 类型 application/pdf 为空 所有类型均压缩
    volumes:
      - /data/minio/data:/data/ # 映射当前目录下的data目录至容器内/data目录      
      - /data/minio/config:/root/.minio/ # 映射配置目录
    command: server --address ':9000' --console-address ':9001' /data  # 指定容器中的目录 /data
    privileged: true
```

<br/>

## 启动容器
``` bash
cd /data/minio
docker-compose up -d
#如果需要强制重新构建
docker-compose up --force-recreate -d
```

<br/>

## ！！安全组添加端口 9000，9001 ！！

<br/>
<br/>

## 配置桶
创建桶
![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2024/11/12/17314171812095.jpg)
设置桶为公开
![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2024/11/12/17314171999358.jpg)

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2024/11/12/17314172139345.jpg)

创建一个权限用户，获取密钥

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2024/11/12/17314172311411.jpg)

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2024/11/12/17314172366136.jpg)

点击create按钮后，会随机生成accessKey secretKey。
会将这两个key进行展示，此时可以复制粘贴到一个文本文件上，后续使用代码上传文件时需要用到这两个key