---
title: Redis 部署
authors: [cangjingyue]
tags: 
    - docker
date: 2024-11-12 00:00:00
categories:
  - docker
---


# Redis 部署 

## 创建挂载目录
``` bash
#创建挂载目录
mkdir -p /data/redis
```

## 创建yml文件
``` bash
vim /data/redis/docker-compose.yml
```

<br/>


## 填入配置
``` bash
version: '3.8'
services:
  redis:
    image: redis:7.0.11
    container_name: redis
    restart: always
    ports:
      - 6379:6379
    volumes:
      - /data/redis/redis.conf:/etc/redis/redis.conf
      - /data/redis/data:/data
      - /data/redis/logs:/logs
    command: ["redis-server","/etc/redis/redis.conf"]
```

<br/>


## 创建挂载配置文件
``` bash
vim /data/redis/redis.conf
```

``` bash
protected-mode no
port 6379
timeout 0
#rdb配置
save 900 1
save 300 10
save 60 10000
rdbcompression yes
dbfilename dump.rdb
dir /data
appendonly yes
appendfsync everysec
#设置你的redis密码
requirepass 123456
```

<br/>

## 启动容器
``` bash
cd /data/redis
docker-compose up -d
#如果需要强制重新构建
docker-compose up --force-recreate -d
```

<br/>

## **!!! 安全组添加 6379 !!!**