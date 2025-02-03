---
title: 05.IdeaGit 杂项
authors: [cangjingyue]
tags: 
    - tools
    - git
date: 2025-02-02 00:00:00
categories:
  - tools
---

# 05.IdeaGit 杂项

## Cherry-Pick

复用[04.IdeaGit 分支管理](idea-git-04.md)中`8.3`的前置准备

在`merge`过程上略有不同，保留函数`f2`，去除函数`f3`

最终效果如下：

```java
public class GitPullTest {

    public void f1() {
        System.out.println("f1");
    }

    public void f2() {
        System.out.println("f2");
    }
}
```

此时，继续创建函数`f4`

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/03/17385688027308.jpg)

问题来了，在实现函数`f4`时，发现其可以使用函数`f3`的逻辑简化代码

而想要重新获取之前已经放弃的函数`f3`，可以选中记录后点击`cherry-pick`按钮进行合并（可能需要解决冲突），之后会对函数`f4`在主干上重新提交，被抛弃的代码也可以重新获得。

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/03/17385690143285.jpg)


解决冲突后，最终效果如下图所示

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/03/17385690638619.jpg)



## Undo Commit，Revert Commit，Drop Commit


![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/03/17385703923046.jpg)


![undo:revert:drop](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/03/undorevertdrop.png)


## Tag

在项目完工准备发布时，可以对最后一个提交打上`Tag`

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/03/17385705270381.jpg)

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/03/17385705891215.jpg)

注意：push的时候一定要选中左下角`Push tags`，否则无法生效

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/03/17385707721201.jpg)

查看远端仓库

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/02/03/17385708440221.jpg)
