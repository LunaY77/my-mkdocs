---
title: 6. 实现应用上下文，自动识别、资源加载、扩展机制
authors: [cangjingyue]
tags: 
    - spring
categories:
  - 手写spring
---

# 实现应用上下文，自动识别、资源加载、扩展机制

## 1. 目标

如果你在自己的实际工作中开发过基于 `Spring` 的技术组件，或者学习过关于 `SpringBoot` 中间件设计和开发 等内容。那么你一定会**继承或者实现**了 `Spring` 对外**暴露的类或接口**，在接口的实现中获取了 `BeanFactory` 以及 `Bean` 对象的获取等内容，并对这些内容做一些操作，例如：修改 Bean 的信息，添加日志打印、处理数据库路由对数据源的切换、给 RPC 服务连接注册中心等。

在对容器中 `Bean` 的**实例化**过程添加扩展机制的同时，还需要把目前关于 **Spring.xml 初始化和加载策略**进行优化，因为我们不太可能让面向 `Spring` 本身开发的 `DefaultListableBeanFactory` 服务，直接给予用户使用。修改点如下：

<img src="https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2024/11/21/17321481552432.jpg" style="height:200px; display: block; margin: auto;">

----

* `DefaultListableBeanFactory`、`XmlBeanDefinitionReader`，是我们在目前 `Spring` 框架中对于服务功能测试的使用方式，它能很好的体现出 `Spring` 是**如何对 xml 加载以及注册Bean对象**的操作过程，但这种方式是面向 `Spring` 本身的，还不具备一定的扩展性。
* 就像我们现在需要提供出一个可以在 `Bean` 初始化过程中，完成对 `Bean` 对象的扩展时，就很难做到自动化处理。所以我们要把 `Bean` 对象扩展机制功能和对 `Spring` 框架上下文的包装融合起来，对外提供完整的服务。


## 2. 设计

为了能满足于在 `Bean` 对象从注册到实例化的过程中执行用户的**自定义**操作，就需要在 `Bean` 的定义和初始化过程中
插入接口类，这个接口再有外部去实现自己需要的服务。那么在结合对 `Spring` 框架上下文的处理能力，就可以满足我们的目标需求了。整体设计结构如下图：

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2024/11/21/17321670966640.jpg)


---

* 满足于对 **Bean 对象扩展**的两个接口，其实也是 Spring 框架中非常具有重量级的两个接口：`BeanFactoryPostProcess` 和 `BeanPostProcessor`，也几乎是大家在使用 Spring 框架额外**新增开发自己组建需求的两个必备接口**。
* `BeanFactoryPostProcessor`，是由 Spring 框架组建提供的**容器扩展机制**，允许**在 Bean 对象注册后但未实例化之前**，对 Bean 的定义信息 `BeanDefinition` 执行**修改**操作。
* `BeanPostProcessor`，也是 Spring 提供的**扩展机制**，不过 `BeanPostProcessor` 是**在 Bean 对象实例化之后修改 Bean 对象**，也可以**替换** Bean 对象。这部分与后面要实现的 **AOP** 有着密切的关系。
* 同时如果只是添加这两个接口，不做任何包装，那么对于使用者来说还是非常麻烦的。我们希望于**开发** `Spring` 的**上下文操作类**，**把相应的 XML 加载 、注册、实例化以及新增的修改和扩展都融合进去**，让 Spring 可以自动扫描到我们的新增服务，便于用户使用。

---
关于 `BeanPostProcessor` 和 `BeanFactoryPostProcess` 的对比总结：


| 特性       | BeanFactoryPostProcess                              | BeanPostProcessor                              |
|------------|-----------------------------------------------------|------------------------------------------------|
| 作用对象   | Bean定义 （BeanDefinition）                           | Bean 初始化前后                                |
| 执行时机   | Bean 实例化之前，配置加载后                          | Bean 初始化前后                                |
| 主要功能   | 修改 Bean 的元数据，动态调整配置                     | 增强或代理 Bean，添加功能                       |
| 典型场景   | - 动态修改属性值 - 占位符解析 - 添加/删除 Bean 定义 | - AOP 代理 - 注解处理 - 动态增强               |
| 常见实现类 | PropertySourcesPlaceholderConfigurer                | AutowiredAnnotationBeanPostProcessor- AOP 相关 |

---

**关键点：**

* `BeanFactoryPostProcessor` 操作的是**容器中的 Bean 定义，改变的是 Bean 的配置。**
* `BeanPostProcessor` 操作的是**容器中的 Bean 实例，改变的是运行时的行为。**


