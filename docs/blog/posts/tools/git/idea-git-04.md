---
title: 04.IdeaGit 分支管理
authors: [cangjingyue]
tags: 
    - tools
    - git
date: 2025-02-02 00:00:00
categories:
  - tools
---

# 04.IdeaGit 分支管理

## 1. 查看分支

```bash
git branch        // 查看本地分支信息
git branch -v     // 查看相对详细的本地分支信息
git branch -av     // 查看包括远程仓库在内的分支信息
```


注意：在 `git branch` 的输出内容中，有一个分支，前面带有 `*` 号，这标识我们当前所在的分支。

## 2. 创建分支

分支创建后，新分支基于当前分支。

```bash
git branch dev 
```

idea 中

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/03/17385111405146.jpg)


## 3. 切换分支


```bash
git checkout dev
```

idea:

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/03/17385112531304.jpg)


## 4. 创建并切换分支

```bash
git checkout -b dev # 新建 dev 分支，并切换到该分支上
```

## 5. 合并分支

```bash
git checkout master        # 切换回 master 分支
git merge dev            # 将 dev 分钟中的修改合并回 master 分支
```



idea:先check out 到指定标签，在把需要合并的标签右键合并即可。

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/03/17385118440191.jpg)


## 6. 删除分支

```bash
git branch -d dev # 删除 dev 分支
```

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/03/17385119365997.jpg)


## 7. 建立本地分支和远程分支的关联


### 7.1 本地分支存在，远程分支存在，但之间没有关联关系。

```bash
git push -u origin/remote_branch 命令推送。
```

### 7.2 本地分支存在，但远程分支不存在。

```bash
git push origin local_branch:remote_branch 
```

### 7.3 本地分支存在，远程分支存在，且关联关系已建立

使用 `git push` 命令进行推送即可


idea中本地`push`时直接修改远程分支名即可

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/03/17385612620818.jpg)


## 8. 从远程仓库拉取

通过 `git fetch` 和 `git pull` 来获取远程仓库的内容。

```bash
git fetch origin master    
git pull origin master
```

`git fetch` 和 `git pull` 之间的区别：

### 8.1 git fetch

`git fetch` 是仅仅获取远程仓库的更新内容，并不会自动做合并。

需要先查看更新：

```bash
git log -p FETCH_HEAD
```

或者拉取到一个其他分支（目前还没见过分支创建）

如果没有问题，再进行合并：

```bash
git merge origin/master
```

新建一个本地分支，拉取远程到本地temp,查看不同，没问题则合并，合并后删除即可。

```bash
## 在本地新建一个temp分支，并将远程origin仓库的master分支代码下载到本地temp分支；
$ git fetch origin master:temp
 
## 比较本地代码与刚刚从远程下载下来的代码的区别；
$ git diff temp
 
## 合并temp分支到本地的master分支;
$ git merge temp
 
## 如果不想保留temp分支，删除;
$ git branch -d temp
```

实机演示:

在远程仓库手动修改`t1`的`111`为`511`, 在本地仓库的`t1`文件中添加`666`并`commit`

**1. git fetch origin master:temp**


![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/03/17385617397534.jpg)


**2. git diff temp**

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/03/17385621563579.jpg)



**3. git merge temp**

出现冲突，手动解决

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/03/17385622823768.jpg)


选择全部接受(`lazygit`按`b`)，当然也可以只选择某一个`hunk`

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/03/17385624491784.jpg)

最终`commit log`如下所示

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/03/17385625438433.jpg)


**4. git branch -d temp**

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/03/17385627395601.jpg)


---

### 8.2 git pull

`git pull` 在获取远程仓库的内容后，会自动做合并，可以看成 `git fetch` 之后 `git merge`。


```bash
# 因为存在冲突故git pull会报错，以下命令二选一即可
git pull --no-rebase # merge冲突
git pull --rebase # rebase冲突
```

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/03/17385631714218.jpg)




---

### 8.3 idea 拉取远程仓库


#### **1. 前置准备**

本地创建`GitPullTest.java`并添加`f1`函数，提交并推送

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/03/17385636994485.jpg)

本地仓库添加`f2`函数，并提交

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/03/17385637972911.jpg)

远程仓库添加`f3`函数，并提交

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/03/17385639061562.jpg)

----

#### **2. git fetch**

找到idea上方`git`菜单，选择`fetch` (这里仅演示`fetch`，不演示`pull`，思想都是一致的)

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/03/17385640017030.jpg)

选择`remote`下的`main`分支，查看更改

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/03/17385644208683.jpg)


检查过后发现没有问题，右键`remote`的`main`分支，选择`merge`或`rebase`合并

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/03/17385645222242.jpg)


选择`merge`，发现出现冲突，需要解决

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/03/17385645636944.jpg)

点击`merge`按钮，弹出冲突解决页面

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/03/17385646405123.jpg)

左侧为本地仓库代码，右侧为远程仓库代码

有两种方式解决冲突

1. 左下角 `Accept Left` 和 `Accept Right`，但只能选择一个仓库的代码作为最终合并文件
2. 屏幕中间的`>>`和`<<`，可以同时保留本地和远程代码，也可以只选择其中一份

这里选择同时保留本地和远程代码

PS: 中间部分可以随意修改/调换位置，但两侧是无法修改的

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/03/17385649529158.jpg)


最终效果如图所示(`merge`)

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/03/17385650035106.jpg)


如果选择`rebase`，最终效果如下图所示

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/03/17385652050655.jpg)


---

### 8.4 merge与rebase的区别(存在冲突)

![merge:rebase](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/03/mergerebase.png)


**1. merge**

* 保留分支历史（会产生合并提交 merge commit）。
* 适合多人协作，不会修改历史记录。

**2. rebase**

* 不产生合并提交，而是将 feature 分支上的提交重新应用到 main 分支后面。
* 历史会被重写（提交哈希值改变），适合保持提交历史整洁。


---

### 8.5 merge fast-forward(不存在冲突)

`Fast-forward` 是 Git 中的一种 合并方式，当你执行 `git merge` 时，如果当前分支**没有**新的提交（即该分支的 HEAD **没有分歧**），Git 会直接将当前分支指向目标分支的最新提交，而不创建额外的合并提交。

什么时候会发生 `Fast-Forward`？

* 当目标分支**没有新的提交**，并且**当前分支完全处于目标分支的前面**（即目标分支是当前分支的祖先），Git 就可以简单地将当前分支 **“快进”** 到目标分支的最新提交，而不需要创建新的合并提交。

![merge ff:rebase](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/03/merge-ffrebase.png)


上面的例子中，`dev`分支为目标分支，`feature`分支为当前分支

`dev`分支中不存在新的提交，且`feature`分支完全处于`dev`分支之前，此时进行`merge`将触发`fast-forward`，效果与`rebase`一致





