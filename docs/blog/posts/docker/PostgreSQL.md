---
title: PostgreSQL 部署
authors: [cangjingyue]
tags: 
    - docker
date: 2024-11-12 00:00:00
categories:
  - docker
---

# PostgreSQL 部署

## 创建挂载目录

``` bash
mkdir -p /data/postgresql/data
mkdir -p /data/postgresql/log
```

## 创建yml文件

``` bash
vim /data/postgresql/docker-compose.yml
```

## 填入配置

``` bash
services:
  postgres_db: # 服务名称
    image: postgres:15.7 # 指定镜像及其版本
    container_name: docker_postgres # 指定容器的名称
    environment:
      POSTGRES_PASSWORD: 123456
    ports: # 端口映射
      - "5432:5432"
    volumes: # 数据持久化的配置
      - /data/postgresql/data:/var/lib/postgresql/data
      - /data/postgresql/log:/var/log/postgresql
    logging:
      options:
        max-size: "10m"
        max-file: "3"
    networks:  # 网络配置
      - pub-network  # 加入到 pub-network 网络

networks:  # 网络
  pub-network:
      driver: bridge
```

## 启动容器

``` bash
cd /data/postgresql
docker-compose up -d
```

## **!!! 安全组添加 5432 !!!**
