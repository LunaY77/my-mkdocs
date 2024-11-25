---
title: 9. 关于Bean对象作用域以及FactoryBean的实现和使用
authors: [cangjingyue]
tags: 
    - spring
categories:
  - 手写spring
---

# 关于Bean对象作用域以及FactoryBean的实现和使用


## 1. 目标

交给 Spring 管理的 Bean 对象，一定就是我们用类创建出来的 Bean 吗？创建出来的 Bean 就永远是**单例**的吗，没有可能是**原型**模式吗？

在集合 Spring 框架下，我们使用的 MyBatis 框架中，它的核心作用是可以满足用户不需要实现 Dao 接口类，就可以通过 xml 或者注解配置的方式完成对数据库执行 CRUD 操作，那么在实现这样的 ORM 框架中，是怎么把一个数据库操作的 Bean 对象交给 Spring 管理的呢。

因为我们在使用 Spring、MyBatis 框架的时候都可以知道，并没有手动的去创建任何操作数据库的 Bean 对象，有的仅仅是一个接口定义，而这个接口定义竟然可以被注入到其他需要使用 Dao 的属性中去了，那么这一过程最核心待解决的问题，就是**需要完成把复杂且以代理方式动态变化的对象，注册到 Spring 容器中**。而为了满足这样的一个扩展组件开发的需求，就需要我们在现有手写的 Spring 框架中，添加这一能力。


## 2. 设计


关于提供一个能让使用者定义复杂的 Bean 对象，功能点非常不错，意义也非常大，因为这样做了之后 Spring 的生态种子孵化箱就此提供了，谁家的框架都可以在此标准上完成自己服务的接入。

但这样的功能逻辑设计上并不复杂，因为整个 Spring 框架在开发的过程中就已经提供了各项扩展能力的接茬，你只需要在合适的位置提供一个接茬的处理接口调用和相应的功能逻辑实现即可，像这里的目标实现就是对外提供一个可以二次从 FactoryBean 的 getObject 方法中获取对象的功能即可，这样所有实现此接口的对象类，就可以扩充自己的对象功能了。MyBatis 就是实现了一个 MapperFactoryBean 类，在 getObject 方法中提供 SqlSession 对执行 CRUD 方法的操作 整体设计结构如下图：

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2024/11/25/17324944964557.jpg)

* 整个的实现过程包括了两部分，一个解决单例还是原型对象，另外一个处理 `FactoryBean` 类型对象创建过程中关于获取具体调用对象的 `getObject` 操作。
* `SCOPE_SINGLETON`、`SCOPE_PROTOTYPE`，对象类型的创建获取方式，主要区分在于 `AbstractAutowireCapableBeanFactory#createBean` 创建完成对象后是否放入到内存中，如果不放入则每次获取都会重新创建。
* `createBean` 执行**对象创建**、**属性填充**、**依赖加载**、**前置后置处理**、**初始化**等操作后，就要开始做执行判断整个对象是否是一个 `FactoryBean` 对象，如果是这样的对象，就需要再继续执行获取 `FactoryBean`  具体对象中的 `getObject` 对象了。整个 getBean 过程中都会新增一个单例类型的判断`factory.isSingleton()`，用于决定是否使用内存存放对象信息。



## 3. 实现

### 1. 工程结构

``` bash
simple-spring-09
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
    │   │               │   ├── ConfigurableApplicationContext.java
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
        │           ├── IUserDao.java
        │           ├── ProxyBeanFactory.java
        │           └── UserService.java
        └── resources
            └── spring.xml
```

---

Spring 单例、原型以及 FactoryBean 功能实现类关系：

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2024/11/25/17325013926887.jpg)

* 以上整个类关系图展示的就是添加 Bean 的实例化是单例还是原型模式以及 FactoryBean 的实现。
* 其实整个实现的过程并不复杂，只是在现有的 `AbstractAutowireCapableBeanFactory` 类以及继承的抽象类 `AbstractBeanFactory` 中进行扩展。
* 不过这次我们把 `AbstractBeanFactory` 继承的 `DefaultSingletonBeanRegistry` 类，中间加了一层 `FactoryBeanRegistrySupport`，这个类在 Spring 框架中主要是处理关于 `FactoryBean` 注册的支撑操作。


### 2. Bean的作用范围定义和xml解析

```java
public class BeanDefinition {
    String SCOPE_SINGLETON = ConfigurableBeanFactory.SCOPE_SINGLETON;

    String SCOPE_PROTOTYPE = ConfigurableBeanFactory.SCOPE_PROTOTYPE;

    /**
     * beanclass
     */
    private Class beanClass;

    /**
     * bean 属性注入信息
     */
    private PropertyValues propertyValues;

    /**
     * 初始化方法名
     */
    private String initMethodName;

    /**
     * 销毁方法名
     */
    private String destroyMethodName;

    /**
     * 实例化模式
     */
    private String scope = SCOPE_SINGLETON;

    /**
     * 单例
     */
    private boolean singleton = true;

    /**
     * 原型
     */
    private boolean prototype = false;
    
    public void setScope(String scope) {
        scope = scope;
        singleton = SCOPE_SINGLETON.equals(scope);
        prototype = SCOPE_PROTOTYPE.equals(scope);
    }   
    
    public boolean isSingleton() {
        return singleton;
    }

    public boolean isPrototype() {
        return prototype;
    }
    
    // ...
}    
```

* `singleton`、`prototype`，是本次在 `BeanDefinition` 类中新增加的两个属性信息，用于把从 **spring.xml** 中解析到的 Bean **对象作用范围**填充到属性中。

----

```java
public class XmlBeanDefinitionReader extends AbstractBeanDefinitionReader {

    protected void doLoadBeanDefinitions(InputStream inputStream) throws ClassNotFoundException {
      
        for (int i = 0; i < childNodes.getLength(); i++) {
            // 判断元素
            if (!(childNodes.item(i) instanceof Element)) continue;
            // 判断对象
            if (!"bean".equals(childNodes.item(i).getNodeName())) continue;

            // 解析标签
            Element bean = (Element) childNodes.item(i);
            String id = bean.getAttribute("id");
            String name = bean.getAttribute("name");
            String className = bean.getAttribute("class");
            String initMethod = bean.getAttribute("init-method");
            String destroyMethodName = bean.getAttribute("destroy-method");
            String beanScope = bean.getAttribute("scope");

            // 获取 Class，方便获取类中的名称
            Class<?> clazz = Class.forName(className);
            // 优先级 id > name
            String beanName = StrUtil.isNotEmpty(id) ? id : name;
            if (StrUtil.isEmpty(beanName)) {
                beanName = StrUtil.lowerFirst(clazz.getSimpleName());
            }

            // 定义Bean
            BeanDefinition beanDefinition = new BeanDefinition(clazz);
            beanDefinition.setInitMethodName(initMethod);
            beanDefinition.setDestroyMethodName(destroyMethodName);

            if (StrUtil.isNotEmpty(beanScope)) {
                beanDefinition.setScope(beanScope);
            }
            
            // ...
            
            // 注册 BeanDefinition
            getRegistry().registerBeanDefinition(beanName, beanDefinition);
        }
    }

}
```

在解析 XML 处理类 `XmlBeanDefinitionReader` 中，新增加了关于 Bean 对象配置中 `scope` 的解析，并把这个属性信息填充到 Bean 定义中。`beanDefinition.setScope(beanScope)`

---

### 3. 创建和修改对象时候判断单例和原型模式

```java
public abstract class AbstractAutowireCapableBeanFactory extends AbstractBeanFactory implements AutowireCapableBeanFactory {

    private InstantiationStrategy instantiationStrategy = new CglibSubclassingInstantiationStrategy();

    @Override
    protected Object createBean(String beanName, BeanDefinition beanDefinition, Object[] args) throws BeansException {
        Object bean = null;
        try {
            bean = createBeanInstance(beanDefinition, beanName, args);
            // 给 Bean 填充属性
            applyPropertyValues(beanName, bean, beanDefinition);
            // 执行 Bean 的初始化方法和 BeanPostProcessor 的前置和后置处理方法
            bean = initializeBean(beanName, bean, beanDefinition);
        } catch (Exception e) {
            throw new BeansException("Instantiation of bean failed", e);
        }

        // 注册实现了 DisposableBean 接口的 Bean 对象
        registerDisposableBeanIfNecessary(beanName, bean, beanDefinition);

        // 判断 SCOPE_SINGLETON、SCOPE_PROTOTYPE
        if (beanDefinition.isSingleton()) {
            addSingleton(beanName, bean);
        }
        return bean;
    }

    protected void registerDisposableBeanIfNecessary(String beanName, Object bean, BeanDefinition beanDefinition) {
        // 非 Singleton 类型的 Bean 不执行销毁方法
        if (!beanDefinition.isSingleton()) return;

        if (bean instanceof DisposableBean || StrUtil.isNotEmpty(beanDefinition.getDestroyMethodName())) {
            registerDisposableBean(beanName, new DisposableBeanAdapter(bean, beanName, beanDefinition));
        }
    }
    
    // ... 其他功能
}
```

* 单例模式和原型模式的区别就在于**是否存放到内存**中，如果是原型模式那么就不会存放到内存中，每次获取都重新创建对象，另外非 Singleton 类型的 Bean 不需要执行销毁方法。
* 所以这里的代码会有两处修改，一处是 `createBean` 中判断是否添加到 `addSingleton(beanName, bean);`，另外一处是 `registerDisposableBeanIfNecessary` 销毁注册中的判断 `if (!beanDefinition.isSingleton()) return;`。

---

### 4. 定义 FactoryBean 接口

```java
public interface FactoryBean<T> {

    T getObject() throws Exception;

    Class<?> getObjectType();

    boolean isSingleton();

}
```

* FactoryBean 中需要提供3个方法，**获取对象**、**对象类型**，以及**是否是单例对象**，如果是单例对象依然会被放到内存中。

---

### 5. 实现一个 FactoryBean 注册服务

```java
public abstract class FactoryBeanRegistrySupport extends DefaultSingletonBeanRegistry {
    /**
     * Cache of singleton objects created by FactoryBeans: FactoryBean name --> object
     */
    private final Map<String, Object> factoryBeanObjectCache = new ConcurrentHashMap<>();

    /**
     * 从缓存中获取 FactoryBean 代理对象
     * @param beanName beanName
     * @return 缓存中的代理对象
     */
    protected Object getCachedObjectForFactoryBean(String beanName) {
        Object object = this.factoryBeanObjectCache.get(beanName);
        return (object != NULL_OBJECT ? object : null);
    }

    /**
     * 获取 FactoryBean 代理对象
     * @param factoryBean FactoryBean
     * @param beanName BeanName
     * @return FactoryBean 代理对象
     */
    protected Object getObjectFromFactoryBean(FactoryBean factoryBean, String beanName) {
        // 单例
        if (factoryBean.isSingleton()) {
            Object object = this.factoryBeanObjectCache.get(beanName);
            // 缓存未命中
            if (object == null) {
                // FactoryBean getObject
                object = doGetObjectFromFactoryBean(factoryBean, beanName);
                // 存入缓存
                this.factoryBeanObjectCache.put(beanName, (object != null ? object : NULL_OBJECT));
            }
            return (object != null ? object : NULL_OBJECT);
        } else {
            // 原型对象不做缓存
            return doGetObjectFromFactoryBean(factoryBean, beanName);
        }
    }

    /**
     * 获取 FactoryBean 代理对象
     * @param factoryBean FactoryBean
     * @param beanName BeanName
     * @return FactoryBean 代理对象
     */
    private Object doGetObjectFromFactoryBean(final FactoryBean factoryBean, final String beanName) {
        try {
            return factoryBean.getObject();
        } catch (Exception e) {
            throw new BeansException("FactoryBean threw exception on object[" + beanName + "] creation", e);
        }
    }
}
```

* `FactoryBeanRegistrySupport` 类主要处理的就是关于 `FactoryBean` 此类对象的注册操作，之所以放到这样一个单独的类里，就是希望做到不同领域模块下只负责各自需要完成的功能，避免因为扩展导致类膨胀到难以维护。
* 同样这里也定义了**缓存**操作 `factoryBeanObjectCache`，用于**存放单例类型的对象**，避免重复创建。在日常使用用，基本也都是创建的单例对象
* `doGetObjectFromFactoryBean` 是具体的获取 `FactoryBean#getObject()` 方法，因为既有缓存的处理也有对象的获取，所以额外提供了 `getObjectFromFactoryBean` 进行逻辑包装，这部分的操作方式是不和你日常做的业务逻辑开发非常相似。**从Redis取数据，如果为空就从数据库获取并写入Redis**


---

### 6. 扩展 AbstractBeanFactory 创建对象逻辑

```java
public abstract class AbstractBeanFactory extends FactoryBeanRegistrySupport implements ConfigurableBeanFactory {

    protected <T> T doGetBean(final String name, final Object[] args) {
        Object sharedInstance = getSingleton(name);
        if (sharedInstance != null) {
            // 如果是 FactoryBean，则需要调用 FactoryBean#getObject
            return (T) getObjectForBeanInstance(sharedInstance, name);
        }

        BeanDefinition beanDefinition = getBeanDefinition(name);
        Object bean = createBean(name, beanDefinition, args);
        return (T) getObjectForBeanInstance(bean, name);
    }  
   
    private Object getObjectForBeanInstance(Object beanInstance, String beanName) {
        if (!(beanInstance instanceof FactoryBean)) {
            return beanInstance;
        }

        Object object = getCachedObjectForFactoryBean(beanName);

        if (object == null) {
            FactoryBean<?> factoryBean = (FactoryBean<?>) beanInstance;
            object = getObjectFromFactoryBean(factoryBean, beanName);
        }

        return object;
    }
        
    // ...
}
```

* 首先这里把 `AbstractBeanFactory` 原来继承的 `DefaultSingletonBeanRegistry`，修改为继承 `FactoryBeanRegistrySupport`。因为需要扩展出创建 `FactoryBean` 对象的能力，所以这就想一个链条服务上，截出一个段来处理额外的服务，并把链条再链接上。
* 此处新增加的功能主要是在 `doGetBean` 方法中，添加了调用 `(T) getObjectForBeanInstance(sharedInstance, name)` 对获取 `FactoryBean` 的操作。
* 在 `getObjectForBeanInstance` 方法中做具体的 `instanceof` 判断，另外还会从 `FactoryBean` 的缓存中获取对象，如果不存在则调用 `FactoryBeanRegistrySupport#getObjectFromFactoryBean`，执行具体的操作。



## 4. 测试


### 1. 测试bean

```java
public interface IUserDao {

    String queryUserName(String uId);

}
```
* 这个章节我们删掉 UserDao，定义一个 IUserDao 接口，之所这样做是为了通过 FactoryBean 做一个自定义对象的代理操作。

```java
public class UserService {

    private String uId;
    private String company;
    private String location;
    private IUserDao userDao;

    public String queryUserInfo() {
        return userDao.queryUserName(uId) + "," + company + "," + location;
    }

    // ...get/set
}
```

* 在 UserService 新修改了一个原有 UserDao 属性为 IUserDao，后面我们会给这个属性注入代理对象。

----

### 2. 定义 FactoryBean 对象

```java
public class ProxyBeanFactory implements FactoryBean<IUserDao> {

    @Override
    public IUserDao getObject() throws Exception {
        InvocationHandler handler = (proxy, method, args) -> {

            // 添加排除方法
            if ("toString".equals(method.getName())) return this.toString();
            
            Map<String, String> hashMap = new HashMap<>();
            hashMap.put("10001", "苍镜月");
            
            return "你被代理了 " + method.getName() + "：" + hashMap.get(args[0].toString());
        };
        return (IUserDao) Proxy.newProxyInstance(Thread.currentThread().getContextClassLoader(), new Class[]{IUserDao.class}, handler);
    }

    @Override
    public Class<?> getObjectType() {
        return IUserDao.class;
    }

    @Override
    public boolean isSingleton() {
        return true;
    }

}
```

* 这是一个实现接口 `FactoryBean` 的代理类 `ProxyBeanFactory` 名称，主要是模拟了 UserDao 的原有功能，类似于 MyBatis 框架中的代理操作。
* `getObject()` 中提供的就是一个 `InvocationHandler` 的代理对象，当有方法调用的时候，则执行代理对象的功能。

---

### 3. 配置文件

```java
<?xml version="1.0" encoding="UTF-8"?>
<beans>

    <bean id="userService" class="test.bean.UserService" scope="prototype">
        <property name="uId" value="10001"/>
        <property name="company" value="腾讯"/>
        <property name="location" value="深圳"/>
        <property name="userDao" ref="proxyUserDao"/>
    </bean>

    <bean id="proxyUserDao" class="test.bean.ProxyBeanFactory"/>

</beans>
```

---

### 4. 单元测试（原型模式）

```java
@Test
public void test_prototype() {
    // 1.初始化 BeanFactory
    ClassPathXmlApplicationContext applicationContext = new ClassPathXmlApplicationContext("classpath:spring.xml");
    applicationContext.registerShutdownHook();   

    // 2. 获取Bean对象调用方法
    UserService userService01 = applicationContext.getBean("userService", UserService.class);
    UserService userService02 = applicationContext.getBean("userService", UserService.class);
    
    // 3. 配置 scope="prototype/singleton"
    System.out.println(userService01);
    System.out.println(userService02);    

    // 4. 打印十六进制哈希
    System.out.println(userService01 + " 十六进制哈希：" + Integer.toHexString(userService01.hashCode()));
    System.out.println(ClassLayout.parseInstance(userService01).toPrintable());

}
```

* 在 spring.xml 配置文件中，设置了 scope="prototype" 这样就每次获取到的对象都应该是一个新的对象。
* 这里判断对象是否为一个会看到打印的类对象的哈希值，所以我们把十六进制哈希打印出来。


```bash title="result"
test.bean.UserService$$EnhancerByCGLIB$$44974b60@6b419da
test.bean.UserService$$EnhancerByCGLIB$$44974b60@3b2da18f
test.bean.UserService$$EnhancerByCGLIB$$44974b60@6b419da 十六进制哈希：6b419da
# WARNING: Unable to attach Serviceability Agent. You can try again with escalated privileges. Two options: a) use -Djol.tryWithSudo=true to try with sudo; b) echo 0 | sudo tee /proc/sys/kernel/yama/ptrace_scope
test.bean.UserService$$EnhancerByCGLIB$$44974b60 object internals:
 OFFSET  SIZE                      TYPE DESCRIPTION                                               VALUE
      0     4                           (object header)                                           01 da 19 b4 (00000001 11011010 00011001 10110100) (-1273374207)
      4     4                           (object header)                                           06 00 00 00 (00000110 00000000 00000000 00000000) (6)
      8     4                           (object header)                                           80 de 19 00 (10000000 11011110 00011001 00000000) (1695360)
     12     4          java.lang.String UserService.uId                                           (object)
     16     4          java.lang.String UserService.company                                       (object)
     20     4          java.lang.String UserService.location                                      (object)
     24     4        test.bean.IUserDao UserService.userDao                                       (object)
     28     1                   boolean UserService$$EnhancerByCGLIB$$44974b60.CGLIB$BOUND        true
     29     3                           (alignment/padding gap)                                  
     32     4   net.sf.cglib.proxy.NoOp UserService$$EnhancerByCGLIB$$44974b60.CGLIB$CALLBACK_0   (object)
     36     4                           (loss due to the next object alignment)
Instance size: 40 bytes
Space losses: 3 bytes internal + 4 bytes external = 7 bytes total


```

* 对象后面的这一小段字符串就是16进制哈希值，在对象头哈希值存放的结果上看，也有对应的数值。只不过这个结果是倒过来的。
* 另外可以看到 44974b60@6b419da、44974b60@3b2da18f，这两个对象的结尾16进制哈希值并不一样，所以我们的原型模式是生效的。


---

### 6. 单元测试（代理对象）

```java
@Test
public void test_factory_bean() {
    // 1.初始化 BeanFactory
    ClassPathXmlApplicationContext applicationContext = new ClassPathXmlApplicationContext("classpath:spring.xml");
    applicationContext.registerShutdownHook(); 

    // 2. 调用代理方法
    UserService userService = applicationContext.getBean("userService", UserService.class);
    System.out.println("测试结果：" + userService.queryUserInfo());
}
```

测试结果

```bash
测试结果：你被代理了 queryUserName：苍镜月,腾讯,深圳

Process finished with exit code 0
```


## 参考资料

[https://mp.weixin.qq.com/s/npVKYqHVTDgYWa2Jq8PB-A](https://mp.weixin.qq.com/s/npVKYqHVTDgYWa2Jq8PB-A)