---
title: 1.实现一个简单的Bean容器
authors: [cangjingyue]
tags: 
    - spring
date: 2024-11-14
categories:
  - 手写spring
---

# 实现一个简单的Bean容器

## 一. 目标

> Spring Bean 容器是什么？

Spring 包含并管理应用对象的配置和生命周期，在这个意义上它是一种用于承载对象的容器，你可以配置你的每个 Bean 对象是如何被创建的，这些 Bean 可以创建一个单独的实例或者每次需要时都生成一个新的实例，以及它们是如何相互关联构建和使用的。

如果一个 Bean 对象交给 Spring 容器管理，那么这个 Bean 对象就应该以类似零件的方式被拆解后存放到 Bean 的定义中，这样相当于一种把对象解耦的操作，可以由 Spring 更加容易的管理，就像处理循环依赖等操作。

当一个 Bean 对象被定义存放以后，再由 Spring 统一进行装配，这个过程包括 Bean 的初始化、属性填充等，最终我们就可以完整的使用一个 Bean 实例化后的对象了。

而我们本章节的案例目标就是定义一个简单的 Spring 容器，用于定义、存放和获取 Bean 对象。

## 二. 设计

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2024/11/15/17316411867800.jpg)

* 定义：`BeanDefinition`，可能这是你在查阅 Spring 源码时经常看到的一个类，例如它会包括 `singleton`、`prototype`、`BeanClassName` 等。但目前我们初步实现会更加简单的处理，只定义一个 `Object` 类型用于存放对象。
* 注册：这个过程就相当于我们把数据存放到 `HashMap` 中，只不过现在 `HashMap` 存放的是定义了的 `Bean` 的对象信息。
* 获取：最后就是获取对象，`Bean` 的名字就是key，Spring 容器初始化好 `Bean` 以后，就可以直接获取了。

## 三. 实现

### 1. 工程结构：
```
simple-spring-01
└── src
    ├── main
    │   └── java
    │       └── com
    │           └── iflove
    │               └── simplespring
    │                   ├── BeanDefinition.java
    │                   └── BeanFactory.java
    └── test
        └── java
            ├── ApiTest.java
            └── bean
                └── UserService.java
```

Simple-Spring Bean 容器类关系：

<img src="https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2024/11/15/17316424937588.jpg" style="height:500px; display: block; margin: auto;">

Spring Bean 容器的整个实现内容非常简单，也仅仅是包括了一个简单的 `BeanFactory` 和 `BeanDefinition`，这里的类名称是与 Spring 源码中一致，只不过现在的类实现会相对来说更简化一些，在后续的实现过程中再不断的添加内容。

* `BeanDefinition`，用于定义 Bean 实例化信息，现在的实现是以一个 Object 存放对象
* `BeanFactory`，代表了 Bean 对象的工厂，可以存放 Bean 定义到 Map 中以及获取

### 2. Bean定义

``` java
public class BeanDefinition {
    private Object bean;

    public BeanDefinition(Object bean) {
        this.bean = bean;
    }

    public Object getBean() {
        return bean;
    }
}
```

### 3. Bean工厂

``` java
public class BeanFactory {
    private Map<String, BeanDefinition> beanDefinitionMap = new ConcurrentHashMap<>();

    public Object getBean(String name) {
        return beanDefinitionMap.get(name).getBean();
    }

    public void registerBeanDefinition(String name, BeanDefinition beanDefinition) {
        beanDefinitionMap.put(name, beanDefinition);
    }
}
```

在 Bean 工厂的实现中，包括了 Bean 的注册，这里注册的是 Bean 的定义信息。同时在这个类中还包括了获取 Bean 的操作。

## 四. 测试

### 1. 测试Bean

``` java
public class UserService {
    public void queryUserInfo(){
        System.out.println("查询用户信息");
    }
}
```

### 2. 测试用例

``` java
public class ApiTest {

    @Test
    public void test() {
        BeanFactory beanFactory = new BeanFactory();

        BeanDefinition beanDefinition = new BeanDefinition(new UserService());
        beanFactory.registerBeanDefinition("userService", beanDefinition);

        UserService userService = (UserService) beanFactory.getBean("userService");
        userService.queryUserInfo();
    }
}
```

* 在单测中主要包括初始化 Bean 工厂、注册 Bean、获取 Bean，三个步骤，使用效果上贴近与 Spring，但显得会更简化。
* 在 Bean 的注册中，这里是直接把 UserService 实例化后作为入参传递给 BeanDefinition 的，在后续的陆续实现中，我们会把这部分内容放入 Bean 工厂中实现。