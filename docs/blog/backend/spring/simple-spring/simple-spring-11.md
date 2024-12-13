---
title: 11. 基于JDK和Cglib动态代理，实现AOP核心功能
authors: [cangjingyue]
tags: 
    - spring
categories:
  - 手写spring
---

# 基于JDK和Cglib动态代理，实现AOP核心功能

!!!tips
    原文链接：[https://mp.weixin.qq.com/s/lDL14DMzaY_WzvmizDG-zw](https://mp.weixin.qq.com/s/lDL14DMzaY_WzvmizDG-zw)

## 1. 目标

到本章节我们将要从 IOC 的实现，转入到关于 **AOP(Aspect Oriented Programming)** 内容的开发。在软件行业，**AOP 意为：面向切面编程**，通过预编译的方式和运行期间动态代理实现程序功能功能的统一维护。其实 AOP 也是 OOP 的延续，在 Spring 框架中是一个非常重要的内容，使用 AOP 可以对业务逻辑的各个部分进行隔离，从而使各模块间的业务逻辑耦合度降低，提高代码的可复用性，同时也能提高开发效率。

关于 AOP 的核心技术实现主要是**动态代理**的使用，就像你可以给一个接口的实现类，使用代理的方式替换掉这个实现类，使用代理类来处理你需要的逻辑。比如：
```java
@Test
public void test_proxy_class() {
    IUserService userService = (IUserService) Proxy.newProxyInstance(Thread.currentThread().getContextClassLoader(), new Class[]{IUserService.class}, (proxy, method, args) -> "你被代理了！");
    String result = userService.queryUserInfo();
    System.out.println("测试结果：" + result);
}
```
代理类的实现基本都大家都见过，那么有了一个基本的思路后，接下来就需要考虑下怎么给方法做代理呢，而不是代理类。另外怎么去代理所有符合某些规则的所有类中方法呢。如果可以代理掉所有类的方法，就可以做一个方法拦截器，给所有被代理的方法添加上一些自定义处理，比如打印日志、记录耗时、监控异常等。




## 2. 设计

在把 AOP 整个切面设计融合到 Spring 前，我们需要解决两个问题，包括：**如何给符合规则的方法做代理**，以及**做完代理方法的案例后，把类的职责拆分出来**。而这两个功能点的实现，都是以切面的思想进行设计和开发。如果不是很清楚 AOP 是啥，你可以把切面理解为用刀切韭菜，一根一根切总是有点慢，那么用手(代理)把韭菜捏成一把，用菜刀或者斧头这样不同的拦截操作来处理。而程序中其实也是一样，只不过韭菜变成了方法，菜刀变成了拦截方法。整体设计结构如下图：

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2024/11/29/17325989235694.png)

* 就像你在使用 `Spring` 的 `AOP` 一样，只处理一些需要被拦截的方法。在拦截方法后，执行你对方法的扩展操作。
* 那么我们就需要先来实现一个可以代理方法的 `Proxy`，其实代理方法主要是使用到方法拦截器类处理方法的调用 `MethodInterceptor#invoke`，而不是直接使用 `invoke` 方法中的入参 `Method method` 进行 `method.invoke(targetObj, args)` 这块是整个使用时的差异。
* 除了以上的核心功能实现，还需要使用到 `org.aspectj.weaver.tools.PointcutParser` 处理拦截表达式 `"execution(* cn.bugstack.springframework.test.bean.IUserService.*(..))"`，有了方法代理和处理拦截，我们就可以完成设计出一个 AOP 的雏形了。


## 3. 实现


### 1. 工程结构

```java
simple-spring-11
└── src
    ├── main
    │   ├── java
    │   │   └── com
    │   │       └── iflove
    │   │           └── simplespring
    │   │               ├── aop
    │   │               │   ├── AdvisedSupport.java
    │   │               │   ├── ClassFilter.java
    │   │               │   ├── MethodMatcher.java
    │   │               │   ├── PointCut.java
    │   │               │   ├── TargetSource.java
    │   │               │   ├── aspectj
    │   │               │   │   └── AspectJExpressionPointcut.java
    │   │               │   └── framework
    │   │               │       ├── AopProxy.java
    │   │               │       ├── Cglib2AopProxy.java
    │   │               │       ├── JdkDynamicAopProxy.java
    │   │               │       └── ReflectiveMethodInvocation.java
    │   │               ├── beans
    │   │               │   ├── BeansException.java
    │   │               │   ├── PropertyValue.java
    │   │               │   ├── PropertyValues.java
    │   │               │   └── factory
    │   │               │       ├── Aware.java
    │   │               │       ├── BeanClassLoaderAware.java
    │   │               │       ├── BeanFactory.java
    │   │               │       ├── BeanFactoryAware.java
    │   │               │       ├── BeanNameAware.java
    │   │               │       ├── ConfigurableListableBeanFactory.java
    │   │               │       ├── DisposableBean.java
    │   │               │       ├── FactoryBean.java
    │   │               │       ├── HierarchicalBeanFactory.java
    │   │               │       ├── InitializingBean.java
    │   │               │       ├── ListableBeanFactory.java
    │   │               │       ├── config
    │   │               │       │   ├── AutowireCapableBeanFactory.java
    │   │               │       │   ├── BeanDefinition.java
    │   │               │       │   ├── BeanFactoryPostProcessor.java
    │   │               │       │   ├── BeanPostProcessor.java
    │   │               │       │   ├── BeanReference.java
    │   │               │       │   ├── ConfigurableBeanFactory.java
    │   │               │       │   └── SingletonBeanRegistry.java
    │   │               │       ├── support
    │   │               │       │   ├── AbstractAutowireCapableBeanFactory.java
    │   │               │       │   ├── AbstractBeanDefinitionReader.java
    │   │               │       │   ├── AbstractBeanFactory.java
    │   │               │       │   ├── BeanDefinitionReader.java
    │   │               │       │   ├── BeanDefinitionRegistry.java
    │   │               │       │   ├── CglibSubclassingInstantiationStrategy.java
    │   │               │       │   ├── DefaultListableBeanFactory.java
    │   │               │       │   ├── DefaultSingletonBeanRegistry.java
    │   │               │       │   ├── DisposableBeanAdapter.java
    │   │               │       │   ├── FactoryBeanRegistrySupport.java
    │   │               │       │   ├── InstantiationStrategy.java
    │   │               │       │   └── SimpleInstantiationStrategy.java
    │   │               │       └── xml
    │   │               │           └── XmlBeanDefinitionReader.java
    │   │               ├── context
    │   │               │   ├── ApplicationContext.java
    │   │               │   ├── ApplicationContextAware.java
    │   │               │   ├── ApplicationEvent.java
    │   │               │   ├── ApplicationEventPublisher.java
    │   │               │   ├── ApplicationListener.java
    │   │               │   ├── ConfigurableApplicationContext.java
    │   │               │   ├── event
    │   │               │   │   ├── AbstractApplicationEventMulticaster.java
    │   │               │   │   ├── ApplicationContextEvent.java
    │   │               │   │   ├── ApplicationEventMulticaster.java
    │   │               │   │   ├── ContextClosedEvent.java
    │   │               │   │   ├── ContextRefreshedEvent.java
    │   │               │   │   └── SimpleApplicationEventMulticaster.java
    │   │               │   └── support
    │   │               │       ├── AbstractApplicationContext.java
    │   │               │       ├── AbstractRefreshableApplicationContext.java
    │   │               │       ├── AbstractXmlApplicationContext.java
    │   │               │       ├── ApplicationContextAwareProcessor.java
    │   │               │       └── ClassPathXmlApplicationContext.java
    │   │               ├── core
    │   │               │   └── io
    │   │               │       ├── ClassPathResource.java
    │   │               │       ├── DefaultResourceLoader.java
    │   │               │       ├── FileSystemResource.java
    │   │               │       ├── Resource.java
    │   │               │       ├── ResourceLoader.java
    │   │               │       └── UrlResource.java
    │   │               └── utils
    │   │                   └── ClassUtils.java
    │   └── resources
    └── test
        └── java
```
---
AOP 切点表达式和使用以及基于 JDK 和 CGLIB 的动态代理类关系：

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2024/11/29/17328624708126.jpg)


* 整个类关系图就是 `AOP` 实现核心逻辑的地方，上面部分是关于方法的匹配实现，下面从 `AopProxy` 开始是关于方法的代理操作。
* `AspectJExpressionPointcut` 的核心功能主要依赖于 `aspectj` 组件并处理 `Pointcut`、`ClassFilter`,、`MethodMatcher` 接口实现，专门用于处理类和方法的匹配过滤操作。
* `AopProxy` 是代理的抽象对象，它的实现主要是基于 `JDK` 的代理和 `Cglib` 代理。在前面章节关于对象的实例化 `CglibSubclassingInstantiationStrategy`，我们也使用过 `Cglib` 提供的功能。
* 有以下的结论：
    * **jdk 动态代理**要求目标**必须**实现接口，生成的代理类实现相同接口，因此代理与目标之间是**平级兄弟**关系
    * **cglib** 不要求目标实现接口，它生成的**代理类是目标的子类**，因此代理与目标之间是**子父**关系

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2024/11/30/17329329332907.jpg)


---

### 2. 切点表达式

**定义接口**

```java
public interface Pointcut {

    /**
     * Return the ClassFilter for this pointcut.
     * @return the ClassFilter (never <code>null</code>)
     */
    ClassFilter getClassFilter();

    /**
     * Return the MethodMatcher for this pointcut.
     * @return the MethodMatcher (never <code>null</code>)
     */
    MethodMatcher getMethodMatcher();

}
```

* 切入点接口，定义用于获取 `ClassFilter`、`MethodMatcher` 的两个类，这两个接口获取都是切点表达式提供的内容。

---

```java
public interface ClassFilter {

    /**
     * Should the pointcut apply to the given interface or target class?
     * @param clazz the candidate target class
     * @return whether the advice should apply to the given target class
     */
    boolean matches(Class<?> clazz);

}
```

* 定义类匹配类，用于切点找到给定的接口和目标类。


----

```java
public interface MethodMatcher {

    /**
     * Perform static checking whether the given method matches. If this
     * @return whether or not this method matches statically
     */
    boolean matches(Method method, Class<?> targetClass);
    
}
```

* 方法匹配，找到表达式范围内匹配下的目标类和方法。在上文的案例中有所体现：`methodMatcher.matches(method, targetObj.getClass())`

---

实现切点表达式类

```java
public class AspectJExpressionPointcut implements PointCut, ClassFilter, MethodMatcher {

    private static final Set<PointcutPrimitive> SUPPORTED_PRIMITIVES = new HashSet<>();

    static {
        SUPPORTED_PRIMITIVES.add(PointcutPrimitive.EXECUTION);
    }

    private final PointcutExpression pointcutExpression;

    public AspectJExpressionPointcut(String expression) {
        PointcutParser pointcutParser = PointcutParser.getPointcutParserSupportingSpecifiedPrimitivesAndUsingSpecifiedClassLoaderForResolution(SUPPORTED_PRIMITIVES, this.getClass().getClassLoader());
        pointcutExpression = pointcutParser.parsePointcutExpression(expression);
    }

    @Override
    public boolean matches(Class<?> clazz) {
        return pointcutExpression.couldMatchJoinPointsInType(clazz);
    }

    @Override
    public boolean matches(Method method, Class<?> targetClass) {
        return pointcutExpression.matchesMethodExecution(method).alwaysMatches();
    }

    @Override
    public ClassFilter getClassFilter() {
        return this;
    }

    @Override
    public MethodMatcher getMethodMatcher() {
        return this;
    }
}
```

* 切点表达式实现了 `Pointcut`、`ClassFilter`、`MethodMatcher`，三个接口定义方法，同时这个类主要是对 `aspectj` 包提供的表达式校验方法使用。
* **匹配 matches**：`pointcutExpression.couldMatchJoinPointsInType(clazz)`、`pointcutExpression.matchesMethodExecution(method).alwaysMatches()`，这部分内容可以单独测试验证。


---

**匹配验证**

```java
@Test
public void test_aop() throws NoSuchMethodException {
    AspectJExpressionPointcut pointcut = new AspectJExpressionPointcut("execution(* cn.bugstack.springframework.test.bean.UserService.*(..))");
    Class<UserService> clazz = UserService.class;
    Method method = clazz.getDeclaredMethod("queryUserInfo");   

    System.out.println(pointcut.matches(clazz));
    System.out.println(pointcut.matches(method, clazz));          
    
    // true、true
}
```

这里单独提供出来一个匹配方法的验证测试，可以看看你拦截的方法与对应的对象是否匹配。


---

### 3. 包装切面通知信息

```java
public class AdvisedSupport {

    // 被代理的目标对象
    private TargetSource targetSource;
    // 方法拦截器
    private MethodInterceptor methodInterceptor;
    // 方法匹配器(检查目标方法是否符合通知条件)
    private MethodMatcher methodMatcher;
    
    // ...get/set
}
```

* `AdvisedSupport`，主要是用于把代理、拦截、匹配的各项属性包装到一个类中，方便在 `Proxy` 实现类进行使用。这和你的业务开发中包装入参是一个道理
* `TargetSource`，是一个目标对象，在目标对象类中提供 `Object` 入参属性，以及获取目标类 `TargetClass` 信息。
* `MethodInterceptor`，是一个具体拦截方法实现类，由用户自己实现 `MethodInterceptor#invoke` 方法，做具体的处理。像我们本文的案例中是做方法监控处理
* `MethodMatcher`，是一个匹配方法的操作，这个对象由 `AspectJExpressionPointcut` 提供服务。

---

### 4. 代理抽象实现(JDK&Cglib)

**定义接口**

```java
public interface AopProxy {

    Object getProxy();

}
```

* 定义一个标准接口，用于获取代理类。因为具体实现代理的方式可以有 JDK 方式，也可以是 Cglib 方式，所以定义接口会更加方便管理实现类。


---

**JDK**

```java
public class JdkDynamicAopProxy implements AopProxy, InvocationHandler {

    private final AdvisedSupport advised;

    public JdkDynamicAopProxy(AdvisedSupport advised) {
        this.advised = advised;
    }

    @Override
    public Object getProxy() {
        return Proxy.newProxyInstance(Thread.currentThread().getContextClassLoader(), advised.getTargetSource().getTargetClass(), this);
    }

    @Override
    public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
        if (advised.getMethodMatcher().matches(method, advised.getTargetSource().getTarget().getClass())) {
            MethodInterceptor methodInterceptor = advised.getMethodInterceptor();
            return methodInterceptor.invoke(new ReflectiveMethodInvocation(advised.getTargetSource().getTarget(), method, args));
        }
        return method.invoke(advised.getTargetSource().getTarget(), args);
    }

}
```

* 基于 `JDK` 实现的代理类，需要实现接口 `AopProxy`、`InvocationHandler`，这样就可以把代理对象 `getProxy` 和反射调用方法 `invoke` 分开处理了。
* `getProxy` 方法中的是代理一个对象的操作，需要提供入参 `ClassLoader`、`AdvisedSupport`、和当前这个类 `this`，因为这个类提供了 `invoke` 方法。
* `invoke` 方法中主要处理匹配的方法后，使用用户自己提供的方法拦截实现，做反射调用 `methodInterceptor.invoke` 。
* 这里还有一个 `ReflectiveMethodInvocation`，其他它就是一个入参的包装信息，提供了入参对象：**目标对象、方法、入参**。

---

**Cglib**

```java
public class Cglib2AopProxy implements AopProxy {

    private final AdvisedSupport advised;

    public Cglib2AopProxy(AdvisedSupport advised) {
        this.advised = advised;
    }

    @Override
    public Object getProxy() {
        Enhancer enhancer = new Enhancer();
        enhancer.setSuperclass(advised.getTargetSource().getTarget().getClass());
        enhancer.setInterfaces(advised.getTargetSource().getTargetClass());
        enhancer.setCallback(new DynamicAdvisedInterceptor(advised));
        return enhancer.create();
    }

    private static class DynamicAdvisedInterceptor implements MethodInterceptor {

        @Override
        public Object intercept(Object o, Method method, Object[] objects, MethodProxy methodProxy) throws Throwable {
            CglibMethodInvocation methodInvocation = new CglibMethodInvocation(advised.getTargetSource().getTarget(), method, objects, methodProxy);
            if (advised.getMethodMatcher().matches(method, advised.getTargetSource().getTarget().getClass())) {
                return advised.getMethodInterceptor().invoke(methodInvocation);
            }
            return methodInvocation.proceed();
        }
    }

    private static class CglibMethodInvocation extends ReflectiveMethodInvocation {

        @Override
        public Object proceed() throws Throwable {
            return this.methodProxy.invoke(this.target, this.arguments);
        }

    }

}
```

* 基于 `Cglib` 使用 `Enhancer` 代理的类可以在运行期间为接口使用底层 `ASM` 字节码增强技术处理对象的代理对象生成，因此被代理类**不需要实现任何接口**。
* 关于扩展进去的用户拦截方法，主要是在 `Enhancer#setCallback` 中处理，用户自己的新增的拦截处理。这里可以看到 `DynamicAdvisedInterceptor#intercept` 匹配方法后做了相应的反射操作。



## 4. 测试

### 1. 实现准备

```java
public interface IUserService {

    String queryUserInfo();

    String register(String userName);
}
```

```java
public class UserService implements IUserService {

    public String queryUserInfo() {
        try {
            Thread.sleep(new Random(1).nextInt(100));
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
        return "苍镜月，100001，深圳";
    }

    public String register(String userName) {
        try {
            Thread.sleep(new Random(1).nextInt(100));
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
        return "注册用户：" + userName + " success！";
    }

}
```

### 2. 自定义拦截方法

```java
public class UserServiceInterceptor implements MethodInterceptor {

    @Override
    public Object invoke(MethodInvocation invocation) throws Throwable {
        long start = System.currentTimeMillis();
        try {
            return invocation.proceed();
        } finally {
            System.out.println("监控 - Begin By AOP");
            System.out.println("方法名称：" + invocation.getMethod());
            System.out.println("方法耗时：" + (System.currentTimeMillis() - start) + "ms");
            System.out.println("监控 - End\r\n");
        }
    }

}
```

### 3. 单元测试

```java
@Test
public void test_dynamic() {
    // 目标对象
    IUserService userService = new UserService();     

    // 组装代理信息
    AdvisedSupport advisedSupport = new AdvisedSupport();
    advisedSupport.setTargetSource(new TargetSource(userService));
    advisedSupport.setMethodInterceptor(new UserServiceInterceptor());
    advisedSupport.setMethodMatcher(new AspectJExpressionPointcut("execution(* test.bean.IUserService.*(..))"));
    
    // 代理对象(JdkDynamicAopProxy)
    IUserService proxy_jdk = (IUserService) new JdkDynamicAopProxy(advisedSupport).getProxy();
    // 测试调用
    System.out.println("测试结果：" + proxy_jdk.queryUserInfo());
    
    // 代理对象(Cglib2AopProxy)
    IUserService proxy_cglib = (IUserService) new Cglib2AopProxy(advisedSupport).getProxy();
    // 测试调用
    System.out.println("测试结果：" + proxy_cglib.register("花花"));
}
```

* 整个案例测试了 AOP 在于 Spring 结合前的核心代码，包括什么是目标对象、怎么组装代理信息、如何调用代理对象。
* AdvisedSupport，包装了目标对象、用户自己实现的拦截方法以及方法匹配表达式。
* 之后就是分别调用 JdkDynamicAopProxy、Cglib2AopProxy，两个不同方式实现的代理类，看看是否可以成功拦截方法

**测试结果**

```bash
监控 - Begin By AOP
方法名称：public abstract java.lang.String test.bean.IUserService.queryUserInfo()
方法耗时：91ms
监控 - End

测试结果：苍镜月，100001，深圳
监控 - Begin By AOP
方法名称：public java.lang.String test.bean.UserService.register(java.lang.String)
方法耗时：95ms
监控 - End

测试结果：注册用户：花花 success！
```


## 参考资料

[https://mp.weixin.qq.com/s/lDL14DMzaY_WzvmizDG-zw](https://mp.weixin.qq.com/s/lDL14DMzaY_WzvmizDG-zw)