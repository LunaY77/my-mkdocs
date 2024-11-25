---
title: 10. 基于观察者实现，容器事件和事件监听器
authors: [cangjingyue]
tags: 
    - spring
categories:
  - 手写spring
---


# 基于观察者实现，容器事件和事件监听器

## 1. 目标

在 Spring 中有一个 `Event` 事件功能，它可以提供**事件的定义、发布以及监听事件**来完成一些自定义的动作。比如你可以定义一个新用户注册的事件，当有用户执行注册完成后，在事件监听中给用户发送一些优惠券和短信提醒，这样的操作就可以把属于基本功能的注册和对应的策略服务分开，降低系统的耦合。以后在扩展注册服务，比如需要添加风控策略、添加实名认证、判断用户属性等都不会影响到依赖注册成功后执行的动作。

那么在本章节我们需要以**观察者模式**的方式，设计和实现 `Spring Event` 的**容器事件**和**事件监听器**功能，最终可以让我们在现有实现的 Spring 框架中可以定义、监听和发布自己的事件信息。


## 2. 设计

其实事件的设计本身就是一种**观察者模式**的实现，它所要解决的就是一个对象状态改变给其他对象通知的问题，而且要考虑到易用和低耦合，保证高度的协作。

在功能实现上我们需要定义出事件类、事件监听、事件发布，而这些类的功能需要结合到 Spring 的 `AbstractApplicationContext#refresh()`，以便于处理事件初始化和注册事件监听器的操作。整体设计结构如下图
![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2024/11/25/17325361302349.jpg)

* 在整个功能实现过程中，仍然需要在面向用户的应用上下文 `AbstractApplicationContext` 中添加相关事件内容，包括：**初始化事件发布者、注册事件监听器、发布容器刷新完成事件**。
* 使用观察者模式定义事件类、监听类、发布类，同时还需要完成一个**广播器**的功能，接收到事件推送时进行分析处理符合监听事件接受者**感兴趣**的事件，也就是使用 `isAssignableFrom` 进行判断。
* `isAssignableFrom` 和 `instanceof` 相似，不过 `isAssignableFrom` 是用来判断**子类和父类的关系**的，或者**接口的实现类和接口的关系**的，默认所有的类的终极父类都是Object。**如果A.isAssignableFrom(B)结果是true，证明B可以转换成为A,也就是A可以由B转换而来，即 A 是 B 的父类或本身。**



## 3. 实现

### 1. 工程结构

```bash
simple-spring-10
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
        ├── java
        │   └── test
        │       ├── ApiTest.java
        │       └── event
        │           ├── ContextClosedEventListener.java
        │           ├── ContextRefreshedEventListener.java
        │           ├── CustomEvent.java
        │           └── CustomEventListener.java
        └── resources
            └── spring.xml
```

---
容器事件和事件监听器实现类关系：

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2024/11/25/17325363001070.jpg)

* 以上整个类关系图以围绕实现 `event` 事件定义、发布、监听功能实现和把事件的相关内容使用 `AbstractApplicationContext#refresh` 进行注册和处理操作。
* 在实现的过程中主要以扩展 `spring context` 包为主，事件的实现也是在这个包下进行扩展的，当然也可以看出来目前所有的实现内容，仍然是以`IOC`为主。
* `ApplicationContext` 容器继承事件发布功能接口 `ApplicationEventPublisher`，并在实现类中提供事件监听功能。
* `ApplicationEventMulticaster` 接口是注册监听器和发布事件的广播器，提供添加、移除和发布事件方法。
* 最后是发布容器关闭事件，这个仍然需要扩展到 `AbstractApplicationContext#close `方法中，由注册到虚拟机的钩子实现。

---


### 2. 定义和实现事件

```java
public abstract class ApplicationEvent extends EventObject {

    /**
     * Constructs a prototypical Event.
     *
     * @param source The object on which the Event initially occurred.
     * @throws IllegalArgumentException if source is null.
     */
    public ApplicationEvent(Object source) {
        super(source);
    }

}
```

* 以继承 `java.util.EventObject` 定义出具备事件功能的抽象类 `ApplicationEvent`，后续所有事件的类都需要继承这个类。

```java
public class ApplicationContextEvent extends ApplicationEvent {

    /**
     * Constructs a prototypical Event.
     *
     * @param source The object on which the Event initially occurred.
     * @throws IllegalArgumentException if source is null.
     */
    public ApplicationContextEvent(Object source) {
        super(source);
    }

    /**
     * Get the <code>ApplicationContext</code> that the event was raised for.
     */
    public final ApplicationContext getApplicationContext() {
        return (ApplicationContext) getSource();
    }

}
```

```java
public class ContextClosedEvent extends ApplicationContextEvent{

    /**
     * Constructs a prototypical Event.
     *
     * @param source The object on which the Event initially occurred.
     * @throws IllegalArgumentException if source is null.
     */
    public ContextClosedEvent(Object source) {
        super(source);
    }

}
```

```java
public class ContextRefreshedEvent extends ApplicationContextEvent{
    /**
     * Constructs a prototypical Event.
     *
     * @param source The object on which the Event initially occurred.
     * @throws IllegalArgumentException if source is null.
     */
    public ContextRefreshedEvent(Object source) {
        super(source);
    }

}
```

* `ApplicationContextEvent` 是定义事件的抽象类，所有的事件包括**关闭、刷新，以及用户自己实现的事件**，都需要继承这个类。
* `ContextClosedEvent`、`ContextRefreshedEvent`，分别是 Spring 框架自己实现的两个事件类，可以用于监听**刷新**和**关闭**动作。


----

### 3. 事件监听器

```java
public interface ApplicationListener<E extends ApplicationEvent> extends EventListener {

    /**
     * Handle an application event.
     * @param event the event to respond to
     */
    void onApplicationEvent(E event);
}
```

* 继承 `java.util.EventListener` 定义具备事件监听功能的 `ApplicationListener`，同时定义 泛型 `<E extends ApplicationEvent>` 保证监听 Spring 事件

---

### 4. 事件广播器

```java
public interface ApplicationEventMulticaster {

    /**
     * Add a listener to be notified of all events.
     * @param listener the listener to add
     */
    void addApplicationListener(ApplicationListener<?> listener);

    /**
     * Remove a listener from the notification list.
     * @param listener the listener to remove
     */
    void removeApplicationListener(ApplicationListener<?> listener);

    /**
     * Multicast the given application event to appropriate listeners.
     * @param event the event to multicast
     */
    void multicastEvent(ApplicationEvent event);

}
```

* 在事件广播器中定义了**添加监听**和**删除监听**的方法以及一个**广播事件**的方法 `multicastEvent` 最终推送时间消息也会经过这个接口方法来处理谁该接收事件。


```java
public abstract class AbstractApplicationEventMulticaster implements ApplicationEventMulticaster, BeanFactoryAware {
    public final Set<ApplicationListener<ApplicationEvent>> applicationListeners = new LinkedHashSet<>();

    private BeanFactory beanFactory;

    @Override
    public void addApplicationListener(ApplicationListener<?> listener) {
        applicationListeners.add((ApplicationListener<ApplicationEvent>) listener);
    }

    @Override
    public void removeApplicationListener(ApplicationListener<?> listener) {
        applicationListeners.remove(listener);
    }

    @Override
    public void setBeanFactory(BeanFactory beanFactory) {
        this.beanFactory = beanFactory;
    }

    /**
     * Return a Collection of ApplicationListeners matching the given
     * event type. Non-matching listeners get excluded early.
     * @param event the event to be propagated. Allows for excluding
     * non-matching listeners early, based on cached matching information.
     * @return a Collection of ApplicationListeners
     * @see ApplicationListener
     */
    protected Collection<ApplicationListener> getApplicationListeners(ApplicationEvent event) {
        LinkedList<ApplicationListener> allListeners = new LinkedList<>();
        for (ApplicationListener<ApplicationEvent> listener : applicationListeners) {
            if (supportsEvent(listener, event)) allListeners.add(listener);
        }
        return allListeners;
    }

    protected boolean supportsEvent(ApplicationListener<ApplicationEvent> applicationListener, ApplicationEvent event) {
        Class<? extends ApplicationListener> listenerClass = applicationListener.getClass();

        // 按照 CglibSubclassingInstantiationStrategy、SimpleInstantiationStrategy 不同的实例化类型，需要判断后获取目标 class
        Class<?> targetClass = ClassUtils.isCglibProxyClass(listenerClass) ? listenerClass.getSuperclass() : listenerClass;
        Type genericInterface = targetClass.getGenericInterfaces()[0];

        Type actualTypeArgument = ((ParameterizedType) genericInterface).getActualTypeArguments()[0];
        String className = actualTypeArgument.getTypeName();
        Class<?> eventClassName;
        try {
            eventClassName = Class.forName(className);
        } catch (ClassNotFoundException e) {
            throw new BeansException("wrong event class name: " + className);
        }
        // 判定此 eventClassName 对象所表示的类或接口与指定的 event.getClass() 参数所表示的类或接口是否相同，或是否是其超类或超接口。
        // isAssignableFrom是用来判断子类和父类的关系的，或者接口的实现类和接口的关系的，默认所有的类的终极父类都是Object。
        // 如果A.isAssignableFrom(B)结果是true，证明B可以转换成为A,也就是A可以由B转换而来。即 A 是 B 的父类或本身
        return eventClassName.isAssignableFrom(event.getClass());
    }
}
```

* `AbstractApplicationEventMulticaster` 是对事件广播器的公用方法提取，在这个类中可以实现一些基本功能，避免所有直接实现接口放还需要处理细节。
* 除了像 `addApplicationListener`、`removeApplicationListener`，这样的通用方法，这里这个类中主要是对 `getApplicationListeners` 和 `supportsEvent` 的处理。
* `getApplicationListeners` 方法主要是摘取符合广播事件中的监听处理器，具体过滤动作在 `supportsEvent` 方法中。
* 在 `supportsEvent` 方法中，主要包括对`Cglib`、`Simple`不同实例化需要获取目标Class，**Cglib代理类需要获取父类的Class**，**普通实例化的不需要**。接下来就是通过提取接口和对应的 `ParameterizedType` 和 `eventClassName`，方便最后确认是否为子类和父类的关系，以此证明此事件归这个符合的类处理。

---

### 5. 事件发布者的定义和实现

```java
public interface ApplicationEventPublisher {

    /**
     * Notify all listeners registered with this application of an application
     * event. Events may be framework events (such as RequestHandledEvent)
     * or application-specific events.
     * @param event the event to publish
     */
    void publishEvent(ApplicationEvent event);

}
```

* `ApplicationEventPublisher` 是整个一个事件的发布接口，所有的事件都需要从这个接口发布出去。


```java
public abstract class AbstractApplicationContext extends DefaultResourceLoader implements ConfigurableApplicationContext {

    public static final String APPLICATION_EVENT_MULTICASTER_BEAN_NAME = "applicationEventMulticaster";

    private ApplicationEventMulticaster applicationEventMulticaster;

    @Override
    public void refresh() throws BeansException {

        // 6. 初始化事件发布者
        initApplicationEventMulticaster();

        // 7. 注册事件监听器
        registerListeners();

        // 9. 发布容器刷新完成事件
        finishRefresh();
    }

    private void initApplicationEventMulticaster() {
        ConfigurableListableBeanFactory beanFactory = getBeanFactory();
        applicationEventMulticaster = new SimpleApplicationEventMulticaster(beanFactory);
        beanFactory.registerSingleton(APPLICATION_EVENT_MULTICASTER_BEAN_NAME, applicationEventMulticaster);
    }

    private void registerListeners() {
        Collection<ApplicationListener> applicationListeners = getBeansOfType(ApplicationListener.class).values();
        for (ApplicationListener listener : applicationListeners) {
            applicationEventMulticaster.addApplicationListener(listener);
        }
    }

    private void finishRefresh() {
        publishEvent(new ContextRefreshedEvent(this));
    }

    @Override
    public void publishEvent(ApplicationEvent event) {
        applicationEventMulticaster.multicastEvent(event);
    }

    @Override
    public void close() {
        // 发布容器关闭事件
        publishEvent(new ContextClosedEvent(this));

        // 执行销毁单例bean的销毁方法
        getBeanFactory().destroySingletons();
    }

}
```

* 在抽象应用上下文 `AbstractApplicationContext#refresh` 中，主要新增了 **初始化事件发布者、注册事件监听器、发布容器刷新完成事件**，三个方法用于处理事件操作。
* 初始化事件发布者(`initApplicationEventMulticaster`)，主要用于实例化一个 `SimpleApplicationEventMulticaster`，这是一个事件广播器。
* 注册事件监听器(`registerListeners`)，通过 `getBeansOfType` 方法获取到所有从 spring.xml 中加载到的事件配置 Bean 对象。
* 发布容器刷新完成事件(`finishRefresh`)，发布了第一个服务器启动完成后的事件，这个事件通过 `publishEvent` 发布出去，其实也就是调用了 `applicationEventMulticaster.multicastEvent(event);` 方法。
* 最后是一个 `close` 方法中，新增加了发布一个容器关闭事件。`publishEvent(new ContextClosedEvent(this));`


## 4. 测试

### 1. 创建一个事件和监听器

```java
public class CustomEvent extends ApplicationContextEvent {

    private Long id;
    private String message;

    /**
     * Constructs a prototypical Event.
     *
     * @param source The object on which the Event initially occurred.
     * @throws IllegalArgumentException if source is null.
     */
    public CustomEvent(Object source, Long id, String message) {
        super(source);
        this.id = id;
        this.message = message;
    }

    // ...get/set
}
```

* 创建一个自定义事件，在事件类的构造函数中可以添加自己的想要的入参信息。这个事件类最终会被完成的拿到监听里，所以你添加的属性都会被获得到。

```java
public class CustomEventListener implements ApplicationListener<CustomEvent> {

    @Override
    public void onApplicationEvent(CustomEvent event) {
        System.out.println("收到：" + event.getSource() + "消息;时间：" + new Date());
        System.out.println("消息：" + event.getId() + ":" + event.getMessage());
    }

}
```

* 这个是一个用于监听 `CustomEvent` 事件的监听器，这里你可以处理自己想要的操作，比如一些用户注册后发送优惠券和短信通知等。
* 另外是关于 `ContextRefreshedEventListener implements ApplicationListener<ContextRefreshedEvent>`、`ContextClosedEventListener implements ApplicationListener<ContextClosedEvent>` 监听器，这里就不演示了，可以参考下源码。

---

### 2. 配置文件

```xml
<?xml version="1.0" encoding="UTF-8"?>
<beans>

    <bean class="test.event.ContextRefreshedEventListener"/>

    <bean class="test.event.CustomEventListener"/>

    <bean class="test.event.ContextClosedEventListener"/>

</beans>
```

----

### 3. 单元测试

```java
public class ApiTest {

    @Test
    public void test_event() {
        ClassPathXmlApplicationContext applicationContext = new ClassPathXmlApplicationContext("classpath:spring.xml");
        applicationContext.publishEvent(new CustomEvent(applicationContext, 1019129009086763L, "成功了！"));

        applicationContext.registerShutdownHook();
    }

}
```

* 通过使用 applicationContext 新增加的发布事件接口方法，发布一个自定义事件 CustomEvent，并透传了相应的参数信息。

**测试结果**

```title="result"
刷新事件：test.event.ContextRefreshedEventListener$$EnhancerByCGLIB$$6fbf3f99
收到：com.iflove.simplespring.context.support.ClassPathXmlApplicationContext@6833ce2c消息;时间：Mon Nov 25 20:23:05 CST 2024
消息：1019129009086763:成功了！
```


## 参考资料

[https://mp.weixin.qq.com/s/wf5XiY4AjFETLQZxEwcCEQ](https://mp.weixin.qq.com/s/wf5XiY4AjFETLQZxEwcCEQ)