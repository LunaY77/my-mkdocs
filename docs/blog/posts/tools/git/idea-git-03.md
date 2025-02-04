---
title: 03.IdeaGit 远程仓库
authors: [cangjingyue]
tags: 
    - tools
    - git
date: 2025-02-02 00:00:00
categories:
  - tools
---

# 03.IdeaGit 远程仓库

## 1. 克隆仓库

```bash
git clone 你的仓库地址
```

idea中即创建项目的时候选择 from version control

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/02/17385040106726.jpg)

## 2. 添加远程仓库

```bash
git remote add origin 你的仓库地址
```

## 3. 查看远程仓库信息

```bash
git remote [-v] // 显示远程仓库信息
```

idea中

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/02/17385043929108.jpg)

## 4. 推送本地内容到远程仓库

```bash
git push -u origin <branch>
```

`-u` 代表设置上游分支。

在执行 `git push -u origin <branch>` 后，Git 会将当前本地分支与远程仓库的 `<branch>` 分支关联。之后，你可以简单地使用 `git push `或 `git pull`，Git 会知道应该推送/拉取哪个远程分支，而不需要每次都指定远程分支的名称。

## 5. 修改本地仓库对应的远程仓库地址

```bash
git remote set-url origin url
```
