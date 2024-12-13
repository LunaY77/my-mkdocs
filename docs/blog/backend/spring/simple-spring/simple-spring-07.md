---
title: 7. 向虚拟机注册钩子，实现Bean对象的初始化和销毁方法 
authors: [cangjingyue]
tags: 
    - spring
categories:
  - 手写spring
---

# 向虚拟机注册钩子，实现Bean对象的初始化和销毁方法

!!!tips
    原文链接：[(https://mp.weixin.qq.com/s/eQIg3Fd2oUeRLdSrRSGVPw)](https://mp.weixin.qq.com/s/eQIg3Fd2oUeRLdSrRSGVPw)


## 1. 目标

当我们的类创建的 Bean 对象，交给 Spring 容器管理以后，这个类对象就可以被赋予更多的使用能力。就像我们在上一章节已经给类对象添加了修改注册Bean定义未实例化前的属性信息修改和实例化过程中的前置和后置处理，这些额外能力的实现，都可以让我们对现有工程中的类对象做相应的扩展处理。

那么除此之外我们还希望可以在 Bean 初始化过程，执行一些操作。比如帮我们做一些数据的加载执行，链接注册中心暴漏RPC接口以及在Web程序关闭时执行链接断开，内存销毁等操作。**如果说没有Spring我们也可以通过构造函数、静态方法以及手动调用的方式实现，但这样的处理方式终究不如把诸如此类的操作都交给 Spring 容器来管理更加合适。** 因此你会看到到 spring.xml 中有如下操作：

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2024/11/23/17322400923203.jpg)

需要满足用户可以在 xml 中配置初始化和销毁的方法，也可以通过实现类的方式处理，比如我们在使用 Spring 时用到的 `InitializingBean`, `DisposableBean` 两个接口。-其实还可以有一种是注解的方式处理初始化操作，不过目前还没有实现到注解的逻辑，后续再完善此类功能。



## 2. 设计

可能面对像 Spring 这样庞大的框架，对外暴露的接口定义使用或者xml配置，完成的一系列扩展性操作，都让 Spring 框架看上去很神秘。其实对于这样在 Bean 容器初始化过程中额外添加的处理操作，无非就是预先执行了一个定义好的接口方法或者是反射调用类中xml中配置的方法，最终你只要按照接口定义实现，就会有 Spring 容器在处理的过程中进行调用而已。整体设计结构如下图：

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2024/11/23/17322402314469.jpg)


* 在 **spring.xml** 配置中添加 `init-method`、`destroy-method` 两个注解，在配置文件加载的过程中，把注解配置一并定义到 `BeanDefinition` 的属性当中。这样在 `initializeBean` 初始化操作的工程中，就可以通过**反射**的方式来调用配置在 Bean 定义属性当中的方法信息了。另外如果是**接口实现**的方式，那么直接可以通过 Bean 对象**调用对应接口定义的方法**即可，`((InitializingBean) bean).afterPropertiesSet()`，两种方式达到的效果是一样的。
* 除了在初始化做的操作外，`destroy-method` 和 `DisposableBean` 接口的定义，都会在 Bean 对象初始化完成阶段，执行注册销毁方法的信息到 `DefaultSingletonBeanRegistry` 类中的 `disposableBeans` 属性里，这是为了后续统一进行操作。这里还有一段适配器的使用，**因为反射调用和接口直接调用，是两种方式。所以需要使用适配器进行包装，下文代码讲解中参考 DisposableBeanAdapter 的具体实现**-关于销毁方法需要在虚拟机执行关闭之前进行操作，所以这里需要用到一个注册钩子的操作，如：`Runtime.getRuntime().addShutdownHook(new Thread(() -> System.out.println("close！")));` 这段代码你可以执行测试，另外你可以使用手动调用 `ApplicationContext.close` 方法关闭容器。




## 3. 实现

### 1. 工程结构


```
simple-spring-07
└── src
    ├── main
    │   ├── java
    │   │   └── com
    │   │       └── iflove
    │   │           └── simplespring
    │   │               ├── beans
    │   │               │   ├── BeansException.java
    │   │               │   ├── PropertyValue.java
    │   │               │   ├── PropertyValues.java
    │   │               │   └── factory
    │   │               │       ├── BeanFactory.java
    │   │               │       ├── ConfigurableListableBeanFactory.java
    │   │               │       ├── DisposableBean.java
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
    │   │               │       │   ├── InstantiationStrategy.java
    │   │               │       │   └── SimpleInstantiationStrategy.java
    │   │               │       └── xml
    │   │               │           └── XmlBeanDefinitionReader.java
    │   │               ├── context
    │   │               │   ├── ApplicationContext.java
    │   │               │   ├── ConfigurableApplicationContext.java
    │   │               │   └── support
    │   │               │       ├── AbstractApplicationContext.java
    │   │               │       ├── AbstractRefreshableApplicationContext.java
    │   │               │       ├── AbstractXmlApplicationContext.java
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
        │           ├── UserDao.java
        │           └── UserService.java
        └── resources
            └── spring.xml
```

---

Spring 应用上下文和对Bean对象扩展机制的类关系

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2024/11/23/17323568391551.jpg)

* 以上整个类图结构描述出来的就是本次新增 `Bean` 实例化过程中的**初始化**方法和**销毁**方法。
* 因为我们一共实现了**两种方式的初始化和销毁方法，xml配置和定义接口**，所以这里既有 `InitializingBean`、`DisposableBean` 也有需要 `XmlBeanDefinitionReader` 加载 `spring.xml` 配置信息到 `BeanDefinition` 中。
* 另外接口 `ConfigurableBeanFactory` 定义了 `destroySingletons` 销毁方法，并由 `AbstractBeanFactory` 继承的父类 `DefaultSingletonBeanRegistry` 实现 `ConfigurableBeanFactory` 接口定义的 `destroySingletons` 方法。**解释一下上述着这段话，意思是，destroySingletons 方法最终是由 DefaultSingletonBeanRegistry 来实现的，而这个类并没有直接实现 ConfigurableBeanFactory 接口，而是通过继承链的方式完成实现。**。**这种方式的设计可能大多数程序员是没有用过的，都是用的谁实现接口谁完成实现类，而不是把实现接口的操作又交给继承的父类处理。所以这块还是蛮有意思的，是一种不错的隔离分层服务的设计方式**
* 最后就是关于向虚拟机注册钩子，保证在虚拟机关闭之前，执行销毁操作。`Runtime.getRuntime().addShutdownHook(new Thread(() -> System.out.println("close！")));`

---


### 2. 定义初始化和销毁接口

```java
public interface InitializingBean {
    /**
     * Bean 处理了属性填充后调用
     *
     * @throws Exception
     */
    void afterPropertiesSet() throws Exception;
}
```

```java
public interface DisposableBean {
    void destroy() throws Exception;
}
```

* `InitializingBean`、`DisposableBean`，两个接口方法还是比较常用的，在一些需要结合 Spring 实现的组件中，经常会使用这两个方法来做一些**参数的初始化和销毁**操作。比如**接口暴漏、数据库数据读取、配置文件加载**等等。

---

### 3. Bean属性定义新增初始化和销毁

```java
public class BeanDefinition {

    private Class beanClass;

    private PropertyValues propertyValues;

    private String initMethodName;
    
    private String destroyMethodName;
    
    // ...get/set
}
```

* 在 `BeanDefinition` 新增加了两个属性：`initMethodName`、`destroyMethodName`，这两个属性是为了在 `spring.xml` 配置的 `Bean` 对象中，可以配置 `init-method="initDataMethod" destroy-method="destroyDataMethod"` 操作，最终实现接口的效果是一样的。只不过一个是接口方法的直接调用，另外是一个在配置文件中读取到方法反射调用
* **注意**：同时需要在 `XmlBeanDefinitionReader` 中添加**初始化**和**销毁**方法读取逻辑

---

### 4. 执行 Bean 对象的初始化方法

```java
public abstract class AbstractAutowireCapableBeanFactory extends AbstractBeanFactory implements AutowireCapableBeanFactory {
    /**
     * 初始化策略，默认cglib
     */
    private InstantiationStrategy instantiationStrategy = new CglibSubclassingInstantiationStrategy();

    /**
     * 初始化bean对象
     * @param beanName          bean名称
     * @param beanDefinition    bean定义
     * @param args              实例化参数
     * @return bean对象
     */
    @Override
    protected Object createBean(String beanName, BeanDefinition beanDefinition, Object[] args) throws BeansException {
        Object bean;
        try {
            // 创建bean实例对象
            bean = createBeanInstance(beanDefinition, beanName, args);
            // 注入bean属性依赖
            applyPropertyValues(beanDefinition, bean, beanName);
            // 执行 Bean 的初始化方法和 BeanPostProcessor 的前置和后置处理方法
            bean = initializeBean(beanName, bean, beanDefinition);
        } catch (Exception e) {
            throw new BeansException("Instantiation of bean failed", e);
        }

        // ...

        // 添加单例对象
        addSingleton(beanName, bean);
        return bean;
    }
    

    private Object initializeBean(String beanName, Object bean, BeanDefinition beanDefinition) {
        // 1. 执行 BeanPostProcessor Before 处理
        Object wrappedBean = applyBeanPostProcessorsBeforeInitialization(bean, beanName);

        // 2. 执行Bean的初始化方法
        try {
            invokeInitMethods(beanName, wrappedBean, beanDefinition);
        } catch (Exception e) {
            throw new BeansException("Invocation of init method of bean[" + beanName + "] failed", e);
        }

        // 2. 执行 BeanPostProcessor After 处理
        wrappedBean = applyBeanPostProcessorsAfterInitialization(bean, beanName);
        return wrappedBean;
    }

    /**
     * 执行 Bean 的初始化方法
     *
     * @param beanName
     * @param bean
     * @param beanDefinition
     */
    private void invokeInitMethods(String beanName, Object bean, BeanDefinition beanDefinition) throws Exception {
        // 1. 实现了接口 InitializingBean
        if (bean instanceof InitializingBean) {
            ((InitializingBean) bean).afterPropertiesSet();
        }

        // 2. 注解配置 initMethod, 同时判断避免二次调用
        String initMethodName = beanDefinition.getInitMethodName();
        if (StrUtil.isNotEmpty(initMethodName) && !(bean instanceof InitializingBean)) {
            Method initMethod = beanDefinition.getBeanClass().getMethod(initMethodName);
            if (Objects.isNull(initMethod)) {
                throw new BeansException("Could not find an init method named '" + initMethodName + "' on bean with name '" + beanName + "'");
            }
            initMethod.invoke(bean);
        }
    }
}   
```

* 抽象类 `AbstractAutowireCapableBeanFactory` 中的 `createBean` 是用来创建 `Bean` 对象的方法，在这个方法中我们之前已经扩展了 `BeanFactoryPostProcessor`、`BeanPostProcessor` 操作，这里我们继续完善执行 `Bean` 对象的**初始化**方法的处理动作。
* 在方法 `invokeInitMethods` 中，主要分为两块来执行实现了 `InitializingBean` 接口的操作，处理 `afterPropertiesSet` 方法。另外一个是判断配置信息 `init-method` 是否存在，执行反射调用 `initMethod.invoke(bean)`。这两种方式都可以在 `Bean` 对象初始化过程中进行处理加载 Bean 对象中的**初始化**操作，让使用者可以额外新增加自己想要的动作。


---

### 5. 定义销毁方法适配器(接口和配置)

```java
public class DisposableBeanAdapter implements DisposableBean {

    private final Object bean;
    private final String beanName;
    private String destroyMethodName;

    public DisposableBeanAdapter(Object bean, String beanName, BeanDefinition beanDefinition) {
        this.bean = bean;
        this.beanName = beanName;
        this.destroyMethodName = beanDefinition.getDestroyMethodName();
    }

    @Override
    public void destroy() throws Exception {
        // 1. 实现接口 DisposableBean
        if (bean instanceof DisposableBean) {
            ((DisposableBean) bean).destroy();
        }

        // 2. 注解配置 destroy-method，同时判断避免二次调用
        if (StrUtil.isNotEmpty(destroyMethodName) && !(bean instanceof DisposableBean && "destroy".equals(this.destroyMethodName))) {
            Method destroyMethod = bean.getClass().getMethod(destroyMethodName);
            if (null == destroyMethod) {
                throw new BeansException("Couldn't find a destroy method named '" + destroyMethodName + "' on bean with name '" + beanName + "'");
            }
            destroyMethod.invoke(bean);
        }
    }
}
```

* 可能你会想这里怎么有一个适配器的类呢，因为销毁方法有两种甚至多种方式，目前有**实现接口** `DisposableBean`、**配置信息** `destroy-method`，两种方式。而这两种方式的销毁动作是由 `AbstractApplicationContext` 在注册虚拟机钩子后看，虚拟机关闭前执行的操作动作。
* 那么在销毁执行时不太希望还得关注都销毁那些类型的方法，它的使用上更希望是有一个统一的接口进行销毁，所以这里就新增了适配类，做统一处理。


----

### 6. 创建Bean时注册销毁方法对象

```java
public abstract class AbstractAutowireCapableBeanFactory extends AbstractBeanFactory implements AutowireCapableBeanFactory {
    /**
     * 初始化策略，默认cglib
     */
    private InstantiationStrategy instantiationStrategy = new CglibSubclassingInstantiationStrategy();

    /**
     * 初始化bean对象
     * @param beanName          bean名称
     * @param beanDefinition    bean定义
     * @param args              实例化参数
     * @return bean对象
     */
    @Override
    protected Object createBean(String beanName, BeanDefinition beanDefinition, Object[] args) throws BeansException {
        Object bean;
        try {
            // 创建bean实例对象
            bean = createBeanInstance(beanDefinition, beanName, args);
            // 注入bean属性依赖
            applyPropertyValues(beanDefinition, bean, beanName);
            // 执行 Bean 的初始化方法和 BeanPostProcessor 的前置和后置处理方法
            bean = initializeBean(beanName, bean, beanDefinition);
        } catch (Exception e) {
            throw new BeansException("Instantiation of bean failed", e);
        }

        // 注册实现了 DisposableBean 接口的 Bean 对象
        registerDisposableBeanIfNecessary(beanName, bean, beanDefinition);

        // 添加单例对象
        addSingleton(beanName, bean);
        return bean;
    }

    protected void registerDisposableBeanIfNecessary(String beanName, Object bean, BeanDefinition beanDefinition) {
        if (bean instanceof DisposableBean || StrUtil.isNotEmpty(beanDefinition.getDestroyMethodName())) {
            registerDisposableBean(beanName, new DisposableBeanAdapter(bean, beanName, beanDefinition));
        }
    }
    
}    
```

* 在创建 `Bean` 对象的实例的时候，需要把**销毁方法保存起来**，方便后续执行销毁动作进行调用。
* 那么这个销毁方法的具体方法信息，会被注册到 `DefaultSingletonBeanRegistry` 中新增加的 `Map<String, DisposableBean> disposableBeans` 属性中去，因为这个接口的方法最终可以被类 `AbstractApplicationContext` 的 `close` 方法通过 `getBeanFactory().destroySingletons()` 调用。
* 在注册销毁方法的时候，会根据是接口类型和配置类型统一交给 `DisposableBeanAdapter` 销毁适配器类来做统一处理。**实现了某个接口的类可以被 instanceof 判断或者强转后调用接口方法**

---

### 7. 虚拟机关闭钩子注册调用销毁方法

```java
public interface ConfigurableApplicationContext extends ApplicationContext {

    /**
     * 刷新容器
     *
     * @throws BeansException
     */
    void refresh() throws BeansException;

    void registerShutdownHook();

    void close();
}
```

* 首先我们需要在 `ConfigurableApplicationContext` 接口中定义**注册虚拟机钩子**的方法 `registerShutdownHook` 和**手动执行关闭**的方法 `close`。


```java
public abstract class AbstractApplicationContext extends DefaultResourceLoader implements ConfigurableApplicationContext {
    
    ...
    
    @Override
    public void registerShutdownHook() {
        Runtime.getRuntime().addShutdownHook(new Thread(this::close));
    }

    @Override
    public void close() {
        getBeanFactory().destroySingletons();
    }
}
```

* 这里主要体现了关于注册钩子和关闭的方法实现，上文提到过的 `Runtime.getRuntime().addShutdownHook`，可以尝试验证。在一些中间件和监控系统的设计中也可以用得到，比如监测服务器宕机，执行备机启动操作。


## 4. 测试

### 1. 测试Bean

```java
public class UserDao {

    private static Map<String, String> hashMap = new HashMap<>();

    public void initDataMethod(){
        System.out.println("执行：init-method");
        hashMap.put("10001", "苍镜月");
    }

    public void destroyDataMethod(){
        System.out.println("执行：destroy-method");
        hashMap.clear();
    }

    public String queryUserName(String uId) {
        return hashMap.get(uId);
    }

}
```

```java
public class UserService implements InitializingBean, DisposableBean {

    private String uId;
    private String company;
    private String location;
    private UserDao userDao;

    @Override
    public void destroy() throws Exception {
        System.out.println("执行：UserService.destroy");
    }

    @Override
    public void afterPropertiesSet() throws Exception {
        System.out.println("执行：UserService.afterPropertiesSet");
    }

    public String queryUserInfo() {
        return userDao.queryUserName(uId) + "," + company + "," + location;
    }

    // ...getter setter
}
```

### 2. 配置文件

```xml
<?xml version="1.0" encoding="UTF-8"?>
<beans>

    <bean id="userDao" class="test.bean.UserDao" init-method="initDataMethod" destroy-method="destroyDataMethod"/>

    <bean id="userService" class="test.bean.UserService">
        <property name="uId" value="10001"/>
        <property name="company" value="腾讯"/>
        <property name="location" value="深圳"/>
        <property name="userDao" ref="userDao"/>
    </bean>

</beans>
```

### 3. 测试用例

```java
public class ApiTest {

    @Test
    public void test_xml() {
        // 1.初始化 BeanFactory
        ClassPathXmlApplicationContext applicationContext = new ClassPathXmlApplicationContext("classpath:spring.xml");
        applicationContext.registerShutdownHook();

        // 2. 获取Bean对象调用方法
        UserService userService = applicationContext.getBean("userService", UserService.class);
        String result = userService.queryUserInfo();
        System.out.println("测试结果：" + result);
    }

    @Test
    public void test_hook() {
        Runtime.getRuntime().addShutdownHook(new Thread(() -> System.out.println("close！")));
    }

}
```


测试结果：

``` title="result"
执行：init-method
执行：UserService.afterPropertiesSet
测试结果：苍镜月,腾讯,深圳
close！
执行：UserService.destroy
执行：destroy-method

Process finished with exit code 0
```



## 参考资料

[(https://mp.weixin.qq.com/s/eQIg3Fd2oUeRLdSrRSGVPw)](https://mp.weixin.qq.com/s/eQIg3Fd2oUeRLdSrRSGVPw)
