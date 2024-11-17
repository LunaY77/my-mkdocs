---
title: 3. 基于Cglib实现含构造函数的类实例化策略
authors: [cangjingyue]
tags: 
    - spring
date: 2024-11-17
categories:
  - 手写spring
---

# 基于Cglib实现含构造函数的类实例化策略

## 1. 目标

在上一章节我们扩充了 `Bean` 容器的功能，把实例化对象交给容器来统一处理，但在我们实例化对象的代码里并没有考虑对象类是否含构造函数，也就是说如果我们去实例化一个含有构造函数的对象那么就要抛**异常**了。

**那么本章的目标就是将这个坑填平。**


## 2. 设计

填平这个坑的技术设计主要考虑两部分，一个是串流程从哪合理的把构造函数的入参信息传递到实例化操作里，另外一个是怎么去实例化含有构造函数的对象。
![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2024/11/17/17318115645279.jpg)

* 参考 Spring Bean 容器源码的实现方式，在 `BeanFactory` 中添加 `Object getBean(String name, Object... args)` 接口，这样就可以在获取 `Bean` 时把构造函数的入参信息传递进去了。
* 另外一个核心的内容是使用什么方式来创建含有构造函数的 `Bean` 对象呢？这里有两种方式可以选择，一个是基于 Java 本身自带的方法 `DeclaredConstructor`，另外一个是使用 **Cglib** 来动态创建 `Bean` 对象。**Cglib** 是基于字节码框架 **ASM** 实现，所以你也可以直接通过 **ASM** 操作指令码来创建对象


## 3. 实现

### 1. 工程结构
```
simple-spring-03
└── src
    ├── main
    │   └── java
    │       └── com
    │           └── iflove
    │               └── simplespring
    │                   ├── BeansException.java
    │                   └── factory
    │                       ├── BeanFactory.java
    │                       ├── config
    │                       │   ├── BeanDefinition.java
    │                       │   └── SingletonBeanRegistry.java
    │                       └── support
    │                           ├── AbstractAutowireCapableBeanFactory.java
    │                           ├── AbstractBeanFactory.java
    │                           ├── BeanDefinitionRegistry.java
    │                           ├── CglibSubclassingInstantiationStrategy.java
    │                           ├── DefaultListableBeanFactory.java
    │                           ├── DefaultSingletonBeanRegistry.java
    │                           ├── InstantiationStrategy.java
    │                           └── SimpleInstantiationStrategy.java
    └── test
        └── java
            ├── ApiTest.java
            └── bean
                └── UserService.java
```

Spring 容器关系：

<img src="https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2024/11/17/17318117360963.jpg" style="height:500px; display: block; margin: auto;">

<br/>

本章节 **“填坑”** 主要是在现有工程中添加 `InstantiationStrategy` 实例化策略接口，以及补充相应的 `getBean` 入参信息，让外部调用时可以传递构造函数的入参并顺利实例化。

### 2. 新增getBean接口

```java
public interface BeanFactory {
    Object getBean(String beanName) throws BeansException;

    Object getBean(String beanName, Object... args) throws BeansException;
}
```

* `BeanFactory` 中我们重载了一个含有入参信息 **args** 的 `getBean` 方法，这样就可以方便的传递入参给构造函数实例化了。

### 3. 定义实例化策略接口

``` java
public interface InstantiationStrategy {
    Object instantiate(BeanDefinition beanDefinition, String beanName, Constructor ctor, Object[] args);
}
```

* 在实例化接口 instantiate 方法中添加必要的入参信息，包括：`beanDefinition`、 `beanName`、`ctor`、`args`
* 其中 `Constructor` 你可能会有一点陌生，它是 `java.lang.reflect` 包下的 `Constructor` 类，里面包含了一些必要的类信息，有这个参数的目的就是为了拿到符合入参信息相对应的构造函数。
* 而 `args` 就是一个具体的入参信息了，最终实例化时候会用到。


### 4. JDK实例化

```java
public class SimpleInstantiationStrategy implements InstantiationStrategy {
    @Override
    public Object instantiate(BeanDefinition beanDefinition, String beanName, Constructor ctor, Object[] args) {
        Class clazz = beanDefinition.getBeanClass();
        try {
            if (Objects.nonNull(ctor)) {
                return clazz.getDeclaredConstructor(ctor.getParameterTypes()).newInstance(args);
            } else {
                return clazz.getDeclaredConstructor().newInstance();
            }
        } catch (InvocationTargetException | InstantiationException | IllegalAccessException | NoSuchMethodException e) {
            throw new RuntimeException(e);
        }
    }
}
```

* 首先通过 `beanDefinition` 获取 `Class` 信息，这个 `Class` 信息是在 `Bean` 定义的时候传递进去的。
* 接下来判断 `ctor` 是否为空，如果为空则是**无构造函数**实例化，否则就是需要**有构造函数**的实例化。
* 这里我们重点关注有构造函数的实例化，实例化方式为 `clazz.getDeclaredConstructor(ctor.getParameterTypes()).newInstance(args);`，把入参信息传递给 `newInstance` 进行实例化。



### 5. Cglib实例化

```java
public class CglibSubclassingInstantiationStrategy implements InstantiationStrategy {
    @Override
    public Object instantiate(BeanDefinition beanDefinition, String beanName, Constructor ctor, Object[] args) {
        Enhancer enhancer = new Enhancer();
        enhancer.setSuperclass(beanDefinition.getBeanClass());
        enhancer.setCallback(new NoOp() {
            @Override
            public int hashCode() {
                return super.hashCode();
            }
        });
        if (Objects.isNull(ctor)) return enhancer.create();
        return enhancer.create(ctor.getParameterTypes(), args);
    }
}
```

### 6. 创建策略调用

``` java
public abstract class AbstractAutowireCapableBeanFactory extends AbstractBeanFactory{
    private InstantiationStrategy instantiationStrategy = new CglibSubclassingInstantiationStrategy();

    @Override
    protected Object createBean(String beanName, BeanDefinition beanDefinition, Object[] args) throws BeansException {
        Object bean;
        try {
            bean = createBeanInstance(beanDefinition, beanName, args);
        } catch (Exception e) {
            throw new BeansException("Instantiation of bean failed", e);
        }
        addSingleton(beanName, bean);
        return bean;
    }

    protected Object createBeanInstance(BeanDefinition beanDefinition, String beanName, Object[] args) {
        Constructor constructorToUse = null;
        Class beanClass = beanDefinition.getBeanClass();
        Constructor[] declaredConstructors = beanClass.getDeclaredConstructors();
        for (Constructor ctor : declaredConstructors) {
            if (Objects.nonNull(args) && ctor.getParameterTypes().length == args.length) {
                constructorToUse = ctor;
                break;
            }
        }
        return getInstantiationStrategy().instantiate(beanDefinition, beanName, constructorToUse, args);
    }

    public InstantiationStrategy getInstantiationStrategy() {
        return instantiationStrategy;
    }

    public void setInstantiationStrategy(InstantiationStrategy instantiationStrategy) {
        this.instantiationStrategy = instantiationStrategy;
    }
}
```


* 首先在 `AbstractAutowireCapableBeanFactory` 抽象类中定义了一个创建对象的实例化策略属性类 `InstantiationStrategy instantiationStrategy`，这里我们选择了 **Cglib** 的实现类。
* 接下来抽取 `createBeanInstance` 方法，在这个方法中需要注意 Constructor 代表了你有多少个构造函数，通过 `beanClass.getDeclaredConstructors()` 方式可以获取到你所有的构造函数，是一个集合。
* 接下来就需要循环比对出构造函数集合与入参信息 **args** 的匹配情况，这里我们对比的方式比较简单，只是一个数量对比，而实际 **Spring** 源码中还需要比对入参类型，否则相同数量不同入参类型的情况，就会抛异常了。


## 4. 测试

### 1. 测试bean

``` java
public class UserService {

    private String name;

    public UserService() {
    }

    public UserService(String name) {
        this.name = name;
    }

    public void queryUserInfo() {
        System.out.println("查询用户信息：" + name);
    }

    @Override
    public String toString() {
        final StringBuilder sb = new StringBuilder("");
        sb.append("").append(name);
        return sb.toString();
    }
}
```

这里唯一多在 `UserService` 中添加的就是一个有 **name** 入参的构造函数，方便我们验证这样的对象是否能被实例化。

### 2. 测试用例

```java
@Test
public void test_BeanFactory() {
    // 1.初始化 BeanFactory
    DefaultListableBeanFactory beanFactory = new DefaultListableBeanFactory();

    // 3. 注入bean
    BeanDefinition beanDefinition = new BeanDefinition(UserService.class);
    beanFactory.registerBeanDefinition("userService", beanDefinition);

    // 4.获取bean
    UserService userService = (UserService) beanFactory.getBean("userService", "苍镜月");
    userService.queryUserInfo();
}
```

* 在此次的单元测试中除了包括；**Bean 工厂**、**注册 Bean**、**获取 Bean**，三个步骤，还额外增加了一次对象的获取和调用。这里主要测试验证单例对象的是否正确的存放到了缓存中。
* 此外与上一章节测试过程中不同的是，我们把 `UserService.class` 传递给了 `BeanDefinition` 而不是像上一章节那样直接 `new UserService()` 操作。


启动时需要添加VM参数 (貌似是因为Cglib与高版本java不兼容)
``` bash
--add-opens java.base/java.lang=ALL-UNNAMED
```

测试结果

```
查询用户信息：苍镜月

Process finished with exit code 0
```