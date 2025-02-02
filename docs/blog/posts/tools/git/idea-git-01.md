---
title: 01.IdeaGit-Demo
authors: [cangjingyue]
tags: 
    - tools
date: 2025-02-02 00:00:00
categories:
  - tools
---

# 01.IdeaGit-Demo

## 准备

1. 创建一个github repo

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/02/17384704824842.jpg)

2. 创建一个idea项目

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/02/17384705175307.jpg)

注意到，github repo中是存在一个预先定义的`README`文件，而idea项目中不存在

## 尝试提交并推送

找到左侧`commit`选项，选中全部并点击`Commit`

<img src="https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/02/17384709818490.jpg" style="height:500px; display: block; margin: auto;">

在`commit`完成之后右键`master`分支，将其改名为`main`，目的是保证和github repo中的分支保持一致

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/02/17384714566627.jpg)

右键`main`分支，尝试`push`

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/02/17384715515555.jpg)


此时还未定义`git remote`，点击`Define remote`，复制`github repo`的链接粘贴进去，再次尝试推送


不出意外，应该要出意外了，idea会提示`push reject`，代表出现**冲突**

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/02/17384716669820.jpg)


解决办法如下：

1. 命令行

```bash
git fetch
git pull --rebase origin main
```

2. idea手动拉取

首先进行`fetch`，然后进行`pull`

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/02/17384720555254.jpg)


我这里选择命令行执行

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/02/17384722185240.jpg)

此时 push 成功，rt

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/02/17384724897536.jpg)

