---
title: 4. 为Bean对象注入属性和依赖Bean的功能实现
authors: [cangjingyue]
tags: 
    - spring
categories:
  - 手写spring
---

# 为Bean对象注入属性和依赖Bean的功能实现

## 1. 目标

首先我们回顾下这几章节都完成了什么，包括：实现一个容器、定义和注册Bean、实例化Bean，按照是否包含构造函数实现不同的实例化策略，那么在创建对象实例化这我们还缺少什么？其实还缺少一个关于类中是否有属性的问题，如果有类中包含属性那么在实例化的时候就需要把属性信息填充上，这样才是一个完整的对象创建。

对于属性的填充不只是 **int、Long、String**，还包括**还没有实例化的对象属性**，都需要在 Bean 创建时进行填充操作。不过这里我们暂时不会考虑 Bean 的循环依赖，否则会把整个功能实现撑大，待后续陆续先把核心功能实现后，再逐步完善


## 2. 设计

鉴于属性填充是在 `Bean` 使用 `newInstance` 或者 `Cglib` 创建后，开始补全属性信息，那么就可以在类 `AbstractAutowireCapableBeanFactory` 的 `createBean` 方法中添加补全属性方法。


![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2024/11/21/17319134233457.jpg)

* 属性填充要在类实例化创建之后，也就是需要在 `AbstractAutowireCapableBeanFactory` 的 `createBean` 方法中添加 `applyPropertyValues` 操作。
* 由于我们需要在创建`Bean`时候填充属性操作，那么就需要在 `bean` 定义 `BeanDefinition` 类中，添加 `PropertyValues` 信息。
* 另外是填充属性信息还包括了 `Bean` 的对象类型，也就是需要再定义一个 `BeanReference`，里面其实就是一个简单的 `Bean` 名称，在具体的实例化操作时进行递归创建和填充，与 `Spring` 源码实现一样。`Spring` 源码中 `BeanReference` 是一个接口


## 3. 实现

### 1. 工程结构

```
simple-spring-04
└── src
    ├── main
    │   └── java
    │       └── com
    │           └── iflove
    │               └── simplespring
    │                   ├── BeansException.java
    │                   ├── PropertyValue.java
    │                   ├── PropertyValues.java
    │                   └── factory
    │                       ├── BeanFactory.java
    │                       ├── config
    │                       │   ├── BeanDefinition.java
    │                       │   ├── BeanReference.java
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
                ├── UserDao.java
                └── UserService.java
```


![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2024/11/21/17319137623071.jpg)


* 本章节中需要新增加3个类，`BeanReference`(类引用)、`PropertyValue`(属性值)、`PropertyValues`(属性集合)，分别用于类和其他类型属性填充操作。
* 另外改动的类主要是 `AbstractAutowireCapableBeanFactory`，在 `createBean` 中补全属性填充部分。


### 2. 定义属性

``` java
public class PropertyValue {
    private final String name;

    private final Object value;

    public PropertyValue(String name, Object value) {
        this.name = name;
        this.value = value;
    }

    public Object getValue() {
        return value;
    }

    public String getName() {
        return name;
    }
}
```

```java
public class PropertyValues {
    private final List<PropertyValue> propertyValueList = new ArrayList<>();

    public void addPropertyValue(PropertyValue propertyValue) {
        this.propertyValueList.add(propertyValue);
    }

    public PropertyValue[] getPropertyValues() {
        return this.propertyValueList.toArray(new PropertyValue[0]);
    }

    public PropertyValue getPropertyValue(String propertyName) {
        for (PropertyValue pv : this.propertyValueList) {
            if (Objects.equals(pv.getName(), propertyName)) {
                return pv;
            }
        }
        return null;
    }
}
```

### 3. Bean定义补全

```java
public class BeanDefinition {
    private Class beanClass;

    private PropertyValues propertyValues;

    public BeanDefinition(Class beanClass) {
        this.beanClass = beanClass;
        this.propertyValues = new PropertyValues();
    }

    public BeanDefinition(Class beanClass, PropertyValues propertyValues) {
        this.beanClass = beanClass;
        this.propertyValues = Objects.nonNull(propertyValues) ? propertyValues : new PropertyValues();
    }

    .....
}
```

* 在 `Bean` 注册的过程中是需要传递 `Bean` 的信息，在几个前面章节的测试中都有所体现 `new BeanDefinition(UserService.class, propertyValues)`;
* 所以为了把属性一定交给 `Bean` 定义，所以这里填充了 `PropertyValues` 属性，同时把两个构造函数做了一些**简单的优化**，避免后面 for 循环时还得判断属性填充是否为空。


### 4. Bean属性填充

```java
public abstract class AbstractAutowireCapableBeanFactory extends AbstractBeanFactory{
    private InstantiationStrategy instantiationStrategy = new CglibSubclassingInstantiationStrategy();

    @Override
    protected Object createBean(String beanName, BeanDefinition beanDefinition, Object[] args) throws BeansException {
        Object bean;
        try {
            bean = createBeanInstance(beanDefinition, beanName, args);

            applyPropertyValues(beanDefinition, bean, beanName);
        } catch (Exception e) {
            throw new BeansException("Instantiation of bean failed", e);
        }
        addSingleton(beanName, bean);
        return bean;
    }

    .....
    
    public void applyPropertyValues(BeanDefinition beanDefinition, Object bean, String beanName) {
        try {
            PropertyValues propertyValues = beanDefinition.getPropertyValues();
            for (PropertyValue propertyValue : propertyValues.getPropertyValues()) {
                String name = propertyValue.getName();
                Object value = propertyValue.getValue();

                if (value instanceof BeanReference) {
                    BeanReference beanReference = (BeanReference) value;
                    value = getBean(beanReference.getBeanName());
                }

                BeanUtil.setFieldValue(bean, name, value);
            }
        } catch (Exception e) {
            throw new BeansException("Error setting property values：" + beanName);
        }
    }

    .....
}
```

<br/>

* 在 `applyPropertyValues` 中，通过获取 `beanDefinition.getPropertyValues()` 循环进行属性填充操作，如果遇到的是 `BeanReference`，那么就需要递归获取 `Bean` 实例，调用 `getBean` 方法。
* 当把依赖的 `Bean` 对象创建完成后，会递归回现在属性填充中。这里需要注意我们并没有去处理循环依赖的问题，这部分内容较大，后续补充。`BeanUtil.setFieldValue(bean, name, value)` 是 `hutool-all` 工具类中的方法


## 4. 测试

### 1. 测试Bean

```java
public class UserDao {

    private static Map<String, String> hashMap = new HashMap<>();

    static {
        hashMap.put("10001", "苍镜月");
    }

    public String queryUserName(String uId) {
        return hashMap.get(uId);
    }

}
```

```java
public class UserService {

    private String uId;

    private UserDao userDao;

    public void queryUserInfo() {
        System.out.println("查询用户信息：" + userDao.queryUserName(uId));
    }

    public String getuId() {
        return uId;
    }

    public void setuId(String uId) {
        this.uId = uId;
    }

    public UserDao getUserDao() {
        return userDao;
    }

    public void setUserDao(UserDao userDao) {
        this.userDao = userDao;
    }
}
```

### 2. 测试用例

```java
 @Test
public void test_BeanFactory() {
    // 1.初始化 BeanFactory
    DefaultListableBeanFactory beanFactory = new DefaultListableBeanFactory();

    // 2. UserDao 注册
    beanFactory.registerBeanDefinition("userDao", new BeanDefinition(UserDao.class));

    // 3. UserService 设置属性[uId、userDao]
    PropertyValues propertyValues = new PropertyValues();
    propertyValues.addPropertyValue(new PropertyValue("uId", "10001"));
    propertyValues.addPropertyValue(new PropertyValue("userDao",new BeanReference("userDao")));

    // 4. UserService 注入bean
    BeanDefinition beanDefinition = new BeanDefinition(UserService.class, propertyValues);
    beanFactory.registerBeanDefinition("userService", beanDefinition);

    // 5. UserService 获取bean
    UserService userService = (UserService) beanFactory.getBean("userService");
    userService.queryUserInfo();
}
```

* 与直接获取 `Bean` 对象不同，这次我们还需要先把 `userDao` 注入到 `Bean` 容器中。`beanFactory.registerBeanDefinition("userDao", new BeanDefinition(UserDao.class))`;
* 接下来就是属性填充的操作了，一种是普通属性 `new PropertyValue("uId", "10001")`，另外一种是对象属性 `new PropertyValue("userDao",new BeanReference("userDao"))`
* 接下来的操作就简单了，只不过是正常获取 `userService` 对象，调用方法即可。

### 3. 测试结果

```
查询用户信息：苍镜月
```

## 参考资料

[https://mp.weixin.qq.com/s/EKoMDpa4q8TMikRM2wBIzw](https://mp.weixin.qq.com/s/EKoMDpa4q8TMikRM2wBIzw)