---
title: 02.IdeaGit 基础操作
authors: [cangjingyue]
tags: 
    - tools
    - git
date: 2025-02-02 00:00:00
categories:
  - tools
---

# 02.IdeaGit 基础操作


## 1. 初始化

```bash
git init
```

查看目录结构中，就可以看到包含有 `.git` 子目录，这就说明创建版本库成功

相当于idea中的 `vcs----create git repository`

## 2. 将文件添加到版本库

### 2.1 将文件添加到暂存区

```bash
git add 001.txt        // 添加单个文件到暂存区
git add .                // 将当前目录下所有修改添加到暂存区，除按照规则忽略的之外
```

相当于idea中的`git --> add`

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/02/17384735316063.jpg)


 不同之处是在idea中即便不进行`add`，依旧可以`commit`
 
 ![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/02/17384736316265.jpg)

---

### 2.2 将暂存区文件提交到仓库

```bash
git commit        // 如果暂存区有文件，则将其中的文件提交到仓库
git commit -m 'your comments'         // 带评论提交，用于说明提交内容、变更、作用等
```

这个和idea中的`git -commit`一致，不同点：**注释必须写**

---


### 2.3 查看仓库状态

```bash
git status
```

在idea中，直接在commit界面可以看到改动的所有文件以及未add的文件

**红色**: 代表未`add`到暂存区
**绿色**: 代表已在暂存区但是有修改
**无标记**：代表无修改

---


### 2.4 查看仓库中的具体修改

```bash
git diff    // 查看版本库中所有的改动
git diff 001.txt        // 查看具体文件的改动
```

在idea中，可以在`commit`界面中双击文件查看，或者也可以通过右键标签`--show diff with working tree`查看

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/02/17384750087901.jpg)

---

### 2.5 查看历史提交记录

```bash
git log     // 显示所有提交的历史记录
git log --pretty=oneline    // 单行显示提交历史记录的内容
```

相当于idea中的`git`窗口，同时`commit id` 位于右下角

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/02/17384755481541.jpg)

---

### 2.6 版本回退

```bash
git reset --hard HEAD^        // 回退到上一个提交版本
git reset --hard HEAD^^        // 回退到上上一个提交版本
git reset --hard 'commit_id'    // 会退到 commit_id 指定的提交版本
```

如下图，某个`git`仓库中存在2个提交记录，需要版本回退到第一个记录

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/02/17384762470357.jpg)

输入 `git reset --hard f731`

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/02/17384764342333.jpg)

此时，如果反悔了，不希望回退，如何重新返回？

输入`git log`，发现仅存在一条提交记录，查询不到第2条提交记录

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/02/17384765048307.jpg)

可以通过`git reflog`找到之前的提交记录

```bash
git reflog
git reset --hard 'commit_id'
```

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/02/17384767022152.jpg)

---

#### **git工作区域**

`git reset`的方式不仅仅只有`hard`一种，还有`soft`、`mixed`、`keep`，而在介绍它们之间的异同前，首先需要理解git的工作区域

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/02/17384787225267.jpg)

* **Workspace**： 工作区，就是你平时存放项目代码的地方
* **Index / Stage**： 暂存区，用于临时存放你的改动，事实上它只是一个文件，保存即将提交到文件列表信息
* **Repository**： 仓库区（或版本库），就是安全存放数据的位置，这里面有你提交到所有版本的数据。其中HEAD指向最新放入仓库的版本
* **Remote**： 远程仓库，托管代码的服务器，可以简单的认为是你项目组中的一台电脑用于远程数据交换

执行`reset`命令后还存在文件的区域

![git reset](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/02/git-reset.png)


---

#### **2.6.1 git reset --soft**

!!!操作
    移动本地库HEAD指针

前置准备(其他演示类似不做过多赘述)

类似上文，某个`git`仓库中存在2个提交记录，需要版本回退到第一个记录

远程仓库如下图所示

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/02/17384798524843.jpg)


输入下述命令，使用`soft`回滚，并推送到远程仓库

```bash
git reset --soft 'commitid'
git push --force origin master # 注意这里要强制推送
```

可以看到远程仓库中第2次提交不存在了，意味着**版本库发生修改**

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/02/17384801148839.jpg)

运行 `git status` 和 `ll`(alias for `ls -l`), 观察结果可知**工作区和暂存区未发生修改**

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/02/17384804227014.jpg)


!!!结论
    soft只影响版本库，不影响工作区和暂存区


---

#### **2.6.2 git reset --mixed**

!!!操作
    移动本地库HEAD指针<br>
    重置暂存区

输入下述命令，使用mixed回滚，并推送到远程仓库

```bash
git reset --mixed 'commitid'
git push --force origin master # 注意这里要强制推送
```

可以看到远程仓库中第2次提交不存在了，意味着**版本库发生修改**

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/02/17384801148839.jpg)


运行 `git status` 和 `ll`(alias for `ls -l`), 观察结果可知**工作区未发生修改，暂存区发生修改(丢失了对t2的追踪)**

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/02/17384808994217.jpg)


!!!结论
    mixed影响版本库和暂存区，不影响工作区

---

#### **2.6.3 git reset --hard**

!!!操作
    移动本地库HEAD指针<br>
    重置暂存区<br>
    重置工作区

输入下述命令，使用hard回滚，并推送到远程仓库

```bash
git reset --hard 'commitid'
git push --force origin master # 注意这里要强制推送
```

可以看到远程仓库中第2次提交不存在了，意味着**版本库发生修改**

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/02/17384801148839.jpg)


运行 `git status` 和 `ll`(alias for `ls -l`), 观察结果可知**工作区发生修改，暂存区发生修改(丢失了对t2的追踪)**

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/02/17384813014765.jpg)


!!!结论
    hard影响版本库、暂存区和工作区
    
---

#### **2.6.4 git reset --keep**

!!!操作
    移动本地库HEAD指针<br>
    重置暂存区<br>
    重置工作区, 保留改动
    
`keep`模式和`hard`模式有些类似，但是对工作区的操作有些不同，具体如下

工作区中文件如果当前版本和退回版本之间没有发生过变动，则工作区的修改保持不便；如果发生了变动，并且工作区也进行了修改，需要自行合并（或者冲突解决）    

**1. 工作区文件未发生变动**

```bash
git reset --keep 'commitid'
```

与`hard`模式保持一致，版本库、暂存区和工作区均发生修改

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/02/17385062341253.jpg)



**2. 工作区文件发生变动**

在`reset`之前，将`t1`文件中的`111`改为`311`，并添加到暂存区

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/02/17385063385330.jpg)


执行reset

```bash
git reset --keep 'commitid'
```

神奇的是，加入暂存区的对应文件发生的变动也被保留了下来


![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/02/17385066722249.jpg)


再来看变动的另一种情况，在`reset`之前，将`t1`文件中的`111`改为`311`，且将`t2`文件中的`222`改成`322`，并添加到暂存区

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/02/17385070975436.jpg)

执行 reset

```bash
git reset --keep 'commitid'
```

发现出现报错，原因是`f731`版本中`t2`文件是不存在的，导致无法`merge`

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/02/17385072743507.jpg)



!!!结论
    keep影响版本库、暂存区和工作区，可以撤销提交而不丢失文件的更改

---

接下来学习idea git中的版本回退

首先在项目中创建一个名为 `GitResetTest.java` 的文件

添加到暂存区并提交

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/02/17384772401073.jpg)

修改文件，再次提交

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/02/17384775261247.jpg)


右键希望回退到的版本，选择`Reset`

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/02/17384815478017.jpg)

选择hard模式

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/02/17384816262743.jpg)


如果希望撤销回滚，同样需要查询`reflog`, 打开`terminal`输入`git reflog`, 找到对应的`commitid`

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/02/17384817819940.jpg)

通过右键项目的reset head进行回退

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/02/17384818343975.jpg)

---

### 2.7 撤销修改

```bash
git checkout -- 004.txt   // 如果 004.txt 文件在工作区，则丢弃其修改
git checkout -- .            // 丢弃当前目录下所有工作区中文件的修改
```


idea中：

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/02/17384829703640.jpg)

注意到在`rollback`右侧有一个**静默搁置**按钮

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/02/17384830460831.jpg)

点击之后修改的代码也会消失，这个功能主要是用于**暂存**你修改后的代码，并把你工作区的代码回滚到最后commit的记录，恢复的时候通过:

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/02/17384831469756.jpg)

那么这个操作具体使用场景是什么呢？

试想一下，在我们开发的时候，正在写某个需求的代码，然而此时项目经理要求你去做一个更加重要/紧迫的任务，那么现在这部分需求代码暂未写完，是不能提交的，此时就可以使用**静默搁置**，将代码暂时搁置，等到把项目经理的任务忙完后，选择取消静默，接着写即可

---

### 2.8 删除文件

在被 git 管理的目录中删除文件时，可以选择如下两种方式来记录删除动作：

1. `rm + git commit -am "abc"`

2. `git rm + git commit -m "abc"`

区别在于

* 如果文件已经被git跟踪，那么 1、2 都可以正常工作
* 如果文件未被git跟踪
    * `rm + git commit -am "abc"` 不会提交删除
    * `git rm + git commit -m "abc"` 可以确保文件删除被git记录并提交
    
    