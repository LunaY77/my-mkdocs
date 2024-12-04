---
title: 12. 把AOP动态代理，融入到Bean的生命周期
authors: [cangjingyue]
tags: 
    - spring
categories:
  - 手写spring
---

# 把AOP动态代理，融入到Bean的生命周期


## 1. 目标


在上一章节我们通过基于 `Proxy.newProxyInstance` 代理操作中处理方法匹配和方法拦截，对匹配的对象进行自定义的处理操作。并把这样的技术核心内容拆解到 `Spring` 中，用于实现 `AOP` 部分，通过拆分后基本可以明确各个类的职责，包括你的代理目标对象属性、拦截器属性、方法匹配属性，以及两种不同的代理操作 `JDK` 和 `CGlib` 的方式。

再有了一个 `AOP` 核心功能的实现后，我们可以通过单元测试的方式进行验证切面功能对方法进行拦截，但如果这是一个面向用户使用的功能，就不太可能让用户这么复杂且没有与 `Spring` 结合的方式单独使用 `AOP`，虽然可以满足需求，但使用上还是过去分散。

因此我们需要在本章节完成 `AOP` 核心功能与 `Spring` 框架的整合，最终能通过在 `Spring` 配置的方式完成切面的操作。



## 2. 设计

其实在有了AOP的核心功能实现后，把这部分功能服务融入到 Spring 其实也不难，只不过要解决几个问题，包括：怎么借着 BeanPostProcessor 把动态代理融入到 Bean 的生命周期中，以及如何组装各项切点、拦截、前置的功能和适配对应的代理器。整体设计结构如下图：

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2024/11/30/17329428955974.jpg)

* 为了可以让对象创建过程中，能把xml中配置的代理对象也就是切面的一些类对象实例化，就需要用到 `BeanPostProcessor` 提供的方法，因为这个类的中的方法可以分别作用于 **Bean 对象执行初始化前后修改 Bean 的对象的扩展信息**。但这里需要集合于 `BeanPostProcessor` 实现新的接口和实现类，这样才能定向获取对应的类信息。
* 但因为创建的是代理对象不是之前流程里的普通对象，所以我们需要前置于其他对象的创建，所以在实际开发的过程中，需要在 `AbstractAutowireCapableBeanFactory#createBean` 优先完成 `Bean` 对象的判断，是否需要代理，有则直接返回代理对象。在Spring的源码中会有 `createBean` 和 `doCreateBean` 的方法拆分
* 这里还包括要解决方法拦截器的具体功能，提供一些 `BeforeAdvice`、`AfterAdvice` 的实现，让用户可以更简化的使用切面功能。除此之外还包括需要包装切面表达式以及拦截方法的整合，以及提供不同类型的代理方式的代理工厂，来包装我们的切面服务。



## 3. 实现

### 1. 工程结构

```bash
simple-spring-12
└── src
    ├── main
    │   ├── java
    │   │   └── com
    │   │       └── iflove
    │   │           └── simplespring
    │   │               ├── aop
    │   │               │   ├── AdvisedSupport.java
    │   │               │   ├── Advisor.java
    │   │               │   ├── BeforeAdvice.java
    │   │               │   ├── ClassFilter.java
    │   │               │   ├── MethodBeforeAdvice.java
    │   │               │   ├── MethodMatcher.java
    │   │               │   ├── PointCut.java
    │   │               │   ├── PointcutAdvisor.java
    │   │               │   ├── TargetSource.java
    │   │               │   ├── aspectj
    │   │               │   │   ├── AspectJExpressionPointcut.java
    │   │               │   │   └── AspectJExpressionPointcutAdvisor.java
    │   │               │   └── framework
    │   │               │       ├── AopProxy.java
    │   │               │       ├── Cglib2AopProxy.java
    │   │               │       ├── JdkDynamicAopProxy.java
    │   │               │       ├── ProxyFactory.java
    │   │               │       ├── ReflectiveMethodInvocation.java
    │   │               │       ├── adapter
    │   │               │       │   └── MethodBeforeAdviceInterceptor.java
    │   │               │       └── autoproxy
    │   │               │           └── DefaultAdvisorAutoProxyCreator.java
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
    │   │               │       │   ├── InstantiationAwareBeanPostProcessor.java
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
        ├── java
        │   └── test
        │       ├── ApiTest.java
        │       └── bean
        │           ├── IUserService.java
        │           ├── UserService.java
        │           ├── UserServiceBeforeAdvice.java
        │           └── UserServiceInterceptor.java
        └── resources
            └── spring.xml
```

---

AOP 动态代理融入到Bean的生命周期中类关系

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2024/11/30/17329431535096.jpg)


* 整个类关系图中可以看到，在以 `BeanPostProcessor` 接口实现继承的 `InstantiationAwareBeanPostProcessor` 接口后，做了一个自动代理创建的类 `DefaultAdvisorAutoProxyCreator`，这个类的就是用于处理整个 `AOP` 代理融入到 `Bean` 生命周期中的核心类。
* `DefaultAdvisorAutoProxyCreator` 会依赖于拦截器、代理工厂和Pointcut与Advisor的包装服务 `AspectJExpressionPointcutAdvisor`，由它提供切面、拦截方法和表达式。
* `Spring` 的 `AOP` 把 `Advice` 细化了 `BeforeAdvice`、`AfterAdvice`、`AfterReturningAdvice`、`ThrowsAdvice`，目前我们做的测试案例中只用到了 `BeforeAdvice`，这部分可以对照 Spring 的源码进行补充测试。

---

### 2. 定义Advice拦截器

```java
public interface BeforeAdvice extends Advice {

}
```

```java
public interface MethodBeforeAdvice extends BeforeAdvice {

    /**
     * Callback before a given method is invoked.
     *
     * @param method method being invoked
     * @param args   arguments to the method
     * @param target target of the method invocation. May be <code>null</code>.
     * @throws Throwable if this object wishes to abort the call.
     *                   Any exception thrown will be returned to the caller if it's
     *                   allowed by the method signature. Otherwise the exception
     *                   will be wrapped as a runtime exception.
     */
    void before(Method method, Object[] args, Object target) throws Throwable;

}
```

* 在 `Spring` 框架中，`Advice` 都是通过方法拦截器 `MethodInterceptor` 实现的。环绕 `Advice` 类似一个拦截器的链路，`Before Advice`、`After advice`等，不过暂时我们需要那么多就只定义了一个 `MethodBeforeAdvice` 的接口定义。

---

### 3. 定义Advisor访问者

```java
public interface Advisor {

    /**
     * Return the advice part of this aspect. An advice may be an
     * interceptor, a before advice, a throws advice, etc.
     * @return the advice that should apply if the pointcut matches
     * @see org.aopalliance.intercept.MethodInterceptor
     * @see BeforeAdvice
     */
    Advice getAdvice();

}
```

```java
public interface PointcutAdvisor extends Advisor {

    /**
     * Get the Pointcut that drives this advisor.
     */
    Pointcut getPointcut();

}
```

* `PointcutAdvisor` 承担了 `Pointcut` 和 `Advice` 的组合，`Pointcut` 用于获取 `JoinPoint`，而 `Advice` 决定于 `JoinPoint` 执行什么操作。

---

```java
public class AspectJExpressionPointcutAdvisor implements PointcutAdvisor {

    // 切面
    private AspectJExpressionPointcut pointcut;
    // 具体的拦截方法
    private Advice advice;
    // 表达式
    private String expression;

    public void setExpression(String expression){
        this.expression = expression;
    }

    @Override
    public Pointcut getPointcut() {
        if (null == pointcut) {
            pointcut = new AspectJExpressionPointcut(expression);
        }
        return pointcut;
    }

    @Override
    public Advice getAdvice() {
        return advice;
    }

    public void setAdvice(Advice advice){
        this.advice = advice;
    }

}
```

* `AspectJExpressionPointcutAdvisor` 实现了 `PointcutAdvisor` 接口，把切面 `pointcut`、拦截方法 `advice` 和具体的拦截表达式包装在一起。这样就可以在 `xml` 的配置中定义一个 `pointcutAdvisor` 切面拦截器了。

---

### 4. 方法拦截器

```java
public class MethodBeforeAdviceInterceptor implements MethodInterceptor {

    private MethodBeforeAdvice advice;

    public MethodBeforeAdviceInterceptor(MethodBeforeAdvice advice) {
        this.advice = advice;
    }

    public MethodBeforeAdvice getAdvice() {
        return advice;
    }

    public void setAdvice(MethodBeforeAdvice advice) {
        this.advice = advice;
    }

    @Override
    public Object invoke(MethodInvocation methodInvocation) throws Throwable {
        this.advice.before(methodInvocation.getMethod(), methodInvocation.getArguments(), methodInvocation.getThis());
        return methodInvocation.proceed();
    }

}
```

* `MethodBeforeAdviceInterceptor` 实现了 `MethodInterceptor` 接口，在 `invoke` 方法中调用 `advice` 中的 `before` 方法，传入对应的参数信息。
* 而这个 `advice.before` 则是用于自己实现 `MethodBeforeAdvice` 接口后做的相应处理。其实可以看到具体的 `MethodInterceptor` 实现类，其实和我们之前做的测试是一样的，只不过现在交给了 `Spring` 来处理

---

### 5. 代理工厂

```java
public class ProxyFactory {

    private AdvisedSupport advisedSupport;

    public ProxyFactory(AdvisedSupport advisedSupport) {
        this.advisedSupport = advisedSupport;
    }

    public Object getProxy() {
        return createAopProxy().getProxy();
    }

    private AopProxy createAopProxy() {
        if (advisedSupport.isProxyTargetClass()) {
            return new Cglib2AopProxy(advisedSupport);
        }

        return new JdkDynamicAopProxy(advisedSupport);
    }

}
```

* 其实这个代理工厂主要解决的是关于 `JDK` 和 `Cglib` 两种代理的选择问题，有了代理工厂就可以按照不同的创建需求进行控制。

---

### 6. 融入Bean生命周期的自动代理创建者

```java
public class DefaultAdvisorAutoProxyCreator implements InstantiationAwareBeanPostProcessor, BeanFactoryAware {

    private DefaultListableBeanFactory beanFactory;

    @Override
    public void setBeanFactory(BeanFactory beanFactory) throws BeansException {
        this.beanFactory = (DefaultListableBeanFactory) beanFactory;
    }

    @Override
    public Object postProcessBeforeInstantiation(Class<?> beanClass, String beanName) throws BeansException {

        if (isInfrastructureClass(beanClass)) return null;

        Collection<AspectJExpressionPointcutAdvisor> advisors = beanFactory.getBeansOfType(AspectJExpressionPointcutAdvisor.class).values();

        for (AspectJExpressionPointcutAdvisor advisor : advisors) {
            ClassFilter classFilter = advisor.getPointcut().getClassFilter();
            if (!classFilter.matches(beanClass)) continue;

            AdvisedSupport advisedSupport = new AdvisedSupport();

            TargetSource targetSource = null;
            try {
                targetSource = new TargetSource(beanClass.getDeclaredConstructor().newInstance());
            } catch (Exception e) {
                e.printStackTrace();
            }
            advisedSupport.setTargetSource(targetSource);
            advisedSupport.setMethodInterceptor((MethodInterceptor) advisor.getAdvice());
            advisedSupport.setMethodMatcher(advisor.getPointcut().getMethodMatcher());
            advisedSupport.setProxyTargetClass(false);

            return new ProxyFactory(advisedSupport).getProxy();

        }

        return null;
    }
    
}
```

* 这个 `DefaultAdvisorAutoProxyCreator` 类的主要核心实现在于 `postProcessBeforeInstantiation` 方法中，从通过 `beanFactory.getBeansOfType` 获取 `AspectJExpressionPointcutAdvisor` 开始。
* 获取了 `advisors` 以后就可以遍历相应的 `AspectJExpressionPointcutAdvisor` 填充对应的属性信息，包括：**目标对象、拦截方法、匹配器，之后返回代理对象即可**。
* 那么现在调用方获取到的这个 `Bean` 对象就是一个已经被切面注入的对象了，当调用方法的时候，则会被按需拦截，处理用户需要的信息。

---

### 7. 融入到Bean的生命周期

```java
public abstract class AbstractAutowireCapableBeanFactory extends AbstractBeanFactory implements AutowireCapableBeanFactory {

    private InstantiationStrategy instantiationStrategy = new CglibSubclassingInstantiationStrategy();

    @Override
    protected Object createBean(String beanName, BeanDefinition beanDefinition, Object[] args) throws BeansException {
        Object bean = null;
        try {
            // 判断是否返回代理 Bean 对象
            bean = resolveBeforeInstantiation(beanName, beanDefinition);
            if (null != bean) {
                return bean;
            }

            bean = createBeanInstance(beanDefinition, beanName, args);
            // 给 bean 填充属性
            applyPropertyValues(beanName, bean, beanDefinition);
            // 执行 Bean 的初始化方法和 BeanPostProcessor 的前置和后置处理方法
            bean = initializeBean(beanName, bean, beanDefinition);
        } catch (Exception e) {
            throw new BeansException("Instantiation of bean failed.", e);
        }

        // 注册实现了 DisposableBean 接口的 Bean 对象
        registerDisposableBeanIfNecessary(beanName, bean, beanDefinition);

        // 判断 SCOPE_SINGLETON，SCOPE_PROTOTYPE
        if (beanDefinition.isSingleton()) {
            registerSingleton(beanName, bean);
        }
        return bean;
    }

    protected Object resolveBeforeInstantiation(String beanName, BeanDefinition beanDefinition) {
        Object bean = applyBeanPostProcessorBeforeInstantiation(beanDefinition.getBeanClass(), beanName);
        if (null != bean) {
            bean = applyBeanPostProcessorAfterInitialization(bean, beanName);
        }
        return bean;
    }

    // 注意，此方法为新增方法，与 “applyBeanPostProcessorBeforeInitialization” 是两个方法
    public Object applyBeanPostProcessorBeforeInstantiation(Class<?> beanClass, String beanName) throws BeansException {
        for (BeanPostProcessor processor : getBeanPostProcessors()) {
            if (processor instanceof InstantiationAwareBeanPostProcessor) {
                Object result = ((InstantiationAwareBeanPostProcessor)processor).postProcessBeforeInstantiation(beanClass, beanName);
                if (null != result) return result;
            }
        }
        return null;
    }
}
```

* 因为创建的是代理对象不是之前流程里的普通对象，所以我们需要前置于其他对象的创建，即需要在 `AbstractAutowireCapableBeanFactory#createBean` 优先完成 `Bean` 对象的判断，是否需要代理，有则直接返回代理对象。




## 4. 测试

### 1. 事先准备

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
public class UserServiceBeforeAdvice implements MethodBeforeAdvice {

    @Override
    public void before(Method method, Object[] args, Object target) throws Throwable {
        System.out.println("拦截方法：" + method.getName());
    }

}
```

### 3. 配置文件

```java
<?xml version="1.0" encoding="UTF-8"?>
<beans>

    <bean id="userService" class="test.bean.UserService"/>

    <bean class="com.iflove.simplespring.aop.framework.autoproxy.DefaultAdvisorAutoProxyCreator"/>

    <bean id="beforeAdvice" class="test.bean.UserServiceBeforeAdvice"/>

    <bean id="methodInterceptor" class="com.iflove.simplespring.aop.framework.adapter.MethodBeforeAdviceInterceptor">
        <property name="advice" ref="beforeAdvice"/>
    </bean>

    <bean id="pointcutAdvisor" class="com.iflove.simplespring.aop.aspectj.AspectJExpressionPointcutAdvisor">
        <property name="expression" value="execution(* test.bean.IUserService.*(..))"/>
        <property name="advice" ref="methodInterceptor"/>
    </bean>

</beans>
```

### 4. 单元测试


```java
@Test
public void test_aop() {
    ClassPathXmlApplicationContext applicationContext = new ClassPathXmlApplicationContext("classpath:spring.xml");

    IUserService userService = applicationContext.getBean("userService", IUserService.class);
    System.out.println("测试结果：" + userService.queryUserInfo());
}
```


**测试结果**

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2024/11/30/17329525685664.jpg)


```bash
拦截方法：queryUserInfo
测试结果：苍镜月，100001，深圳
```

* 通过测试结果可以看到，我们已经让拦截方法生效了，也不需要自己手动处理切面、拦截方法等内容。截图上可以看到，这个时候的 IUserService 就是一个代理对象



## 参考资料


[AOP Aspect Implementation](https://bugstack.cn/md/spring/develop-spring/2021-07-22-%E7%AC%AC13%E7%AB%A0%EF%BC%9A%E8%A1%8C%E4%BA%91%E6%B5%81%E6%B0%B4%EF%BC%8C%E6%8A%8AAOP%E5%8A%A8%E6%80%81%E4%BB%A3%E7%90%86%EF%BC%8C%E8%9E%8D%E5%85%A5%E5%88%B0Bean%E7%9A%84%E7%94%9F%E5%91%BD%E5%91%A8%E6%9C%9F.html#%E5%9B%9B%E3%80%81%E5%AE%9E%E7%8E%B0)