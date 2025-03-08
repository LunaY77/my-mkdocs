---
title: Spring中@Transactional失效场景
authors: [cangjingyue]
tags: 
    - spring
    - java
categories:
  - java
---

# Spring中@Transactional失效场景

## Spring 事务基本介绍

基本介绍-> [Spring事务](./Spring-tx.md)

## 1. @Transactional应用在非 public 修饰的方法上

使用@Transactional修饰的方法，必须是public修饰、非static修饰、非final修饰的，一个不满足就会导致事务失效

![image.png](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/picgo/20250307194551.png)

因为Spring的事务是通过AOP实现的，而 AOP 无法拦截 private 方法。

我们知道 AOP 的实现有两种，分别是 JDK 动态代理和 Cglib 动态代理。JDK 动态代理是基于接口的，和代理对象为兄弟关系；Cglib 动态代理是基于继承的，和代理对象是父子关系。


> PS: 如果你使用的是新版的 idea，那么违反上述情况均会直接在编译时期报错，但是依然可以运行，请多加注意⚠️


---

### **1. public 修饰**

#### **1. 接口继承方法(@Override)**

如果一个方法继承自接口，那么一定是 public 的，事务生效

----

#### **2. 多个方法**

为了简化讨论，仅对两个方法的情况进行测试，但两个和多个本质上差别不大

***假设 A 方法为接口继承方法(一定为 public)，B 方法为实现类自定义方法，条件变量为@Transactional 注解位置、B 方法修饰符、动态代理类型。***

前置准备如下:

<details>

<summary>前置准备</summary>

表结构

```sql
create table goods  
(  
    id    int auto_increment  
        primary key,  
    price decimal(10, 2) null  
);
```

实体类

```java
@TableName(value ="goods")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Goods implements Serializable {
    /**
     * 
     */
    @TableId(value = "id", type = IdType.AUTO)
    private Integer id;

    /**
     * 
     */
    @TableField(value = "price")
    private BigDecimal price;
}
```

Mapper

```java
@Mapper
public interface GoodsMapper extends BaseMapper<Goods> {

}
```

Service

```java
@Slf4j
@Service
public class GoodsServiceImpl extends ServiceImpl<GoodsMapper, Goods>
    implements GoodsService {

    @Resource
    GoodsMapper goodsMapper;

	...
}
```

启动类

```java
@SpringBootApplication
@EnableAspectJAutoProxy(exposeProxy = true)
public class Demo1Application {

    public static void main(String[] args) {
        ConfigurableApplicationContext context = SpringApplication.run(Demo1Application.class, args);
        // 测试
        GoodsService service = context.getBean(GoodsService.class);
        service.insert(2, new BigDecimal("123"));
    }
}
```

</details>

**1. A+注解，B 不加**

测试代码

```java
@Slf4j
@Service
public class GoodsServiceImpl extends ServiceImpl<GoodsMapper, Goods>
    implements GoodsService {

    @Resource
    GoodsMapper goodsMapper;

    @Override
    @Transactional
    public void insert(Integer id, BigDecimal price) {
        doInsert(id, price);
    }

    private void doInsert(Integer id, BigDecimal price) {
        log.info("===========>{}", TransactionSynchronizationManager.getCurrentTransactionName());
        Goods goods = new Goods(id, price);
        goodsMapper.insert(goods);
        throw new RuntimeException("error");
    }
}
```

这其实跟一个方法没有本质区别，**事务生效！**

---

**2. JDK 动态代理，B+注解，A 不加**


SpringBoot 默认启用 Cglib 动态代理，如果希望使用 JDK 动态代理，需要在 XML 配置中添加如下代码，后续不再赘述，**注意是 XML, XML, XML !!! 在启动类上没用!**

```xml
spring:
  aop:
    proxy-target-class: false
```

测试代码:

```java
@Slf4j
@Service
public class GoodsServiceImpl extends ServiceImpl<GoodsMapper, Goods>
    implements GoodsService {

    @Resource
    GoodsMapper goodsMapper;

    @Override
    public void insert(Integer id, BigDecimal price) {
        ((GoodsServiceImpl) AopContext.currentProxy()).doInsert(id, price);
    }

    @Transactional
    private void doInsert(Integer id, BigDecimal price) {
        log.info("===========>{}", TransactionSynchronizationManager.getCurrentTransactionName());
        Goods goods = new Goods(id, price);
        goodsMapper.insert(goods);
        throw new RuntimeException("error");
    }
}
```

注意这里使用了 AopContext 获取代理类，并且是实现类，因为接口方法没有实现类的私有方法。

**调用的时候直接报错了，也就不存在事务失效问题了**

来看看报错信息，信息表示不能 cast，原因是 JDK 动态代理基于接口，两个实现类(兄弟关系)之间肯定不能互相 cast 的

```
Exception in thread "main" java.lang.ClassCastException: class jdk.proxy2.$Proxy57 cannot be cast to class com.example.demo.service.impl.GoodsServiceImpl (jdk.proxy2.$Proxy57 is in module jdk.proxy2 of loader 'app'; com.example.demo.service.impl.GoodsServiceImpl is in unnamed module of loader 'app')
	at com.example.demo.service.impl.GoodsServiceImpl.insert(GoodsServiceImpl.java:33)
	at java.base/jdk.internal.reflect.DirectMethodHandleAccessor.invoke(DirectMethodHandleAccessor.java:103)
	at java.base/java.lang.reflect.Method.invoke(Method.java:580)
	at org.springframework.aop.support.AopUtils.invokeJoinpointUsingReflection(AopUtils.java:355)
	at org.springframework.aop.framework.JdkDynamicAopProxy.invoke(JdkDynamicAopProxy.java:216)
	at jdk.proxy2/jdk.proxy2.$Proxy57.insert(Unknown Source)
	at com.example.demo.Demo1Application.main(Demo1Application.java:18)
```

---

**3. Cglib 动态代理，B+注解，B 修饰符为 private，A 不加**

测试代码:

```java
@Slf4j
@Service
public class GoodsServiceImpl extends ServiceImpl<GoodsMapper, Goods>
    implements GoodsService {

    @Resource
    GoodsMapper goodsMapper;

    @Override
    public void insert(Integer id, BigDecimal price) {
        ((GoodsServiceImpl) AopContext.currentProxy()).doInsert(id, price);
    }

    @Transactional
    private void doInsert(Integer id, BigDecimal price) {
        log.info("===========>{}", TransactionSynchronizationManager.getCurrentTransactionName());
        Goods goods = new Goods(id, price);
        goodsMapper.insert(goods);
        throw new RuntimeException("error");
    }
}
```

报错信息：

解读：cglib子类代理无法继承 private 方法，代理对象会直接调用父类的 private 方法，但是**Spring 只会对代理对象进行依赖注入，而不会注入原始目标对象**，导致调用 private 方法会空指针

**这个场景操作数据库的 mapper 失效了，日志信息显示获取不到事务，同样不能判定为事务失效的场景**

![image.png](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/picgo/20250308170733.png)

---

**4. Cglib 动态代理，B+注解，B 修饰符为 protected，A 不加**

测试代码和上一个场景类似，仅仅**修改 private 为 protected**，不 cv 了

**事务生效！**来看看日志信息

首先打印了事务信息，而且数据库中没有新增数据，证明了事务生效。

报错为测试代码中手动抛出，不用理会

![image.png](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/picgo/20250308170656.png)

解读：**Cglib 动态代理是基于继承的，所以 protected 方法可以被继承，并成功代理！**

---

**5. A+注解，B+注解**

这个其实跟事务传播行为有关了，下文中有详细讨论，这里不做测试

---

### **2. 非 static 修饰**

无论哪种动态代理都是基于对象的，而非基于类的，如果能够代理 static 方法，应该称其为**静态代理而非动态代理**了

---

### **3. final 修饰**

沿用测试public 修饰时的背景和代码

#### **1. JDK 动态代理**

```java
@Slf4j
@Service
public class GoodsServiceImpl extends ServiceImpl<GoodsMapper, Goods>
    implements GoodsService {

    @Resource
    GoodsMapper goodsMapper;

    @Override
    @Transactional
    public final void insert(Integer id, BigDecimal price) {
        log.info("===========>{}", TransactionSynchronizationManager.getCurrentTransactionName());
        Goods goods = new Goods(id, price);
        goodsMapper.insert(goods);
        throw new RuntimeException("error");
    }
}
```

**事务生效！网上很多人都说加 final 事务会失效，这是不准确的!!!**

![image.png](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/picgo/20250308172209.png)

原因在于，JDK 动态代理生成的代理对象，内部会有一个目标对象，调用 insert 方法时，会路由到这个目标对象中，同时他又有自己的切面逻辑保证事务生效。


#### **2. Cglib 动态代理**

测试代码不变

**出现了空指针异常**

原因是，cglib子类代理无法继承 final 方法，代理对象会直接调用父类的 final 方法，但是**Spring 只会对代理对象进行依赖注入，而不会注入原始目标对象**，导致调用 final 方法会空指针

![image.png](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/picgo/20250308172702.png)

**这个场景操作数据库的 mapper 失效了，日志信息显示获取不到事务，同样不能判定为事务失效的场景**


## 2. propagation 属性设置错误

当我们将`propagation`属性的值设置为一下几种取值就会导致事务失效：

1. `Propagation.NOT_SUPPORTED`：以非事务的方式运行，如果当前存在事务，暂停当前的事务
    
2. `Propagation.NEVER`：以非事务的方式运行，如果当前存在事务，则抛出异常

## 3. rollbackFor属性设置错误

Spring默认抛出了未检查unchecked异常（继承自 RuntimeException 的异常）或者 Error才回滚事务；其他异常不会触发回滚事务。

如果在事务中抛出其他类型的异常，但却期望 Spring 能够回滚事务，就需要指定 rollbackFor属性；若在目标方法中抛出的异常是 rollbackFor 指定的异常的子类，事务同样会回滚。

这里对**未检查异常和已检查异常的区别**做简要阐述

|   **对比项**  |   **已检查异常（Checked Exception）**    | **未检查异常（Unchecked Exception）**    |
| --- | --- | ---|
|  **继承关系**   |  继承自 Exception（但不包括 RuntimeException）    |    继承自 RuntimeException    |
|  **是否强制处理**   |  **必须** try-catch 或 throws，否则无法编译    |   **无需强制处理**，可选 try-catch     |
|   **常见异常**  |    IOException、SQLException、ClassNotFoundException、InterruptedException  |   NullPointerException、ArrayIndexOutOfBoundsException、ArithmeticException、IllegalArgumentException    |
|  **事务回滚 (@Transactional)**   |  **默认不会回滚**，需配置 rollbackFor = Exception.class    |   **默认会回滚**     |
|   **触发原因**  |  依赖外部资源（如文件、数据库、网络等）   |      代码逻辑错误   |
|  **是否可预防**   |   **大多可预防**，通过异常处理机制避免   |    **通常是程序 BUG**，应修正代码逻辑    |
|   **示例代码**  |  FileReader file = new FileReader("test.txt"); // IOException   |   int x = 1 / 0; // ArithmeticException    |

## 4. 方法调用导致@Transactional失效

> 同一个类中，A方法是非事务性方法，但是B方法是事务性方法，此时A调用B就会导致B的事务失效。

**原因**：这个和场景一的原因是类似的，**事务的实现是基于AOP的**，而AOP的实现又是基于动态代理的，而动态代理的本质就算对方法的增强，如果想要使用增强的方法（也就是想要使用事务方法），就必须是通过代理对象去触发目标对象的方法。

**解决方案：通过 `AopContext.currentProxy()` 这个API获取当前类的代理对象**

在启动类上设置 `@EnableAspectJAutoProxy (exposeProxy = true)`

`exposeProxy = true`用于控制代理对象是否应被公开给被代理对象的内部方法访问：

- `exposeProxy = true`: 当设置为**true**时，`Spring`会确保在**AOP代理对象上下文**中，通过 `AopContext.currentProxy()` 方法能够获取到**当前正在执行的代理对象**。  
这对于在被代理对象内部需要调用自身其他方法，并希望这些内部方法调用也能触发切面逻辑的情况非常有用。  
例如，一个服务类中的某个方法可能需要调用另一个**私有**或**受保护**的方法，而这两个方法都被同一个切面所增强。在这种情况下，若不暴露代理，内部方法调用将不会经过切面处理；而暴露代理后，可以通过 `AopContext.currentProxy().methodToCall()` 的方式确保内部方法调用也得到切面的拦截。

- `exposeProxy = false 或未指定（默认情况）`： 默认情况下，`Spring`不会特别暴露代理对象，因此在被代理对象内部直接通过 `this` 调用其他方法时，这些方法调用将**不会触发切面逻辑**，而是直接调用目标类的原始方法。

关于 **exposeProxy**，来看一个业务中的实际使用场景

以下是一段处理好友申请的业务逻辑

```java
/**
 * 申请好友
 * @param uid     uid
 * @param request 请求
 * @return {@link RestBean}
 */
@Transactional
@Override
@RedissonLock(key = "#uid")
public RestBean<Void> apply(Long uid, FriendApplyReq request) {
    // 不能添加自己为好友
    if (Objects.equals(uid, request.getTargetUid())) {
        return RestBean.failure(FriendErrorEnum.SELF_APPLY_FORBIDDEN);
    }
    // 判断是否存在好友关系
    UserFriend isFriend = userFriendDao.getByFriend(uid, request.getTargetUid());
    // 已经存在好友关系
    if (Objects.nonNull(isFriend)) {
        return RestBean.failure(FriendErrorEnum.ALREADY_FRIENDS);
    }
    // 判断是否存在申请记录 （我 -> 对方） 且 申请状态为 待审批
    UserApply myFriendApply = userApplyDao.getFriendApply(uid, request.getTargetUid());
    // 存在申请
    if (Objects.nonNull(myFriendApply)) {
        return RestBean.failure(FriendErrorEnum.EXISTS_FRIEND_APPLY);
    }
    // 判断是否存在申请记录 (对方 -> 我)
    UserApply friendApply = userApplyDao.getFriendApply(request.getTargetUid(), uid);
    // 如果存在，直接同意
    if (Objects.nonNull(friendApply)) {
        // 获取当前执行的对象的代理实例(确保事务正确执行)，同意申请
        ((FriendService) AopContext.currentProxy()).applyApprove(uid, new FriendApplyApproveReq(friendApply.getId()));
        return RestBean.success();
    }
    UserApply userApply = FriendAdapter.buildFriendApply(uid, request);
    userApplyDao.save(userApply);
    // 用户申请事件，向对方异步发送请求消息
    applicationEventPublisher.publishEvent(new UserApplyEvent(this, userApply));
    return RestBean.success();
}
``` 

主要关注业务中处理 **如果申请记录(对方->我)存在，则直接同意申请** 的处理逻辑 

这一行代码的核心是确保事务和其他切面逻辑（如 `@Transactional` 和 `@RedissonLock` ）在调用 `applyApprove` 方法时能够生效。

## 5. 异常捕获导致@Transactional失效

> 当一个事务方法中抛出了异常，此时该异常通过 `try...catch` 进行了捕获，此时就会导致该方法的事务注解 `@Transactional` 失效

示例：

```java
@Resource
private IBService bService;

@Service
Class AServiceImpl implements IAService{
    @Transactional
    public Result A(Student s) {
     	try {
            bService.save(s);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return Result.ok();
    }
}
```

此时会报错`org.springframework.transaction.UnexpectedRollbackException: Transaction rolled back because it has been marked as rollback-only`

**原因**：因为`bService`执行`save`方法过程中出现了异常，所以`bService`告诉事务管理器，当前事务需要被`rollback`，但是`aService`中使用`try...catch`捕获了异常，它认为**当前事务并没有发生异常**，程序是处于正常状态，于是`aService`就告诉事务管理器，当前事务需要被`commit`，结果事务管理器发现收到两个矛盾的信号，它也搞不清是该`rollback`还是该`commit`，于是就抛了个`UnexpectedRollbackException`异常。

***也就是说Spring中，事务是在方法调用时开始的，业务方法执行完毕后才执行`rollback`或`commit`操作，事务是否被回滚取决于是否抛出异常，且该异常是否满足场景三（也就是说抛出的异常是否有被`rollbackFor`指定，或`rollbackFor`指定异常的子类）。如果一定要使用`try..catch`时，一定要抛出异常（且抛出的异常必须满足场景三，一般直接抛一个运行时异常就可以了 `throw new RuntimeException()`，运行时异常是`rollbackFor`默认指定的异常），而不只是打印异常信息。***

**综上所诉**：在 `Service` 层中，方法中最好不要随便写 `try...catch` ，如果写了则一定要手动抛异常

## 6. 数据库引擎不支持事务

> 从 `MySQL 5.5.5` 开始的默认存储引擎是： `InnoDB` ，之前默认的都是： `MyISAM` 。也就是说是从 `MySQL5.5.5` 开始， `MySQL` 才支持事务

## 7. 未启用事务

xml 配置

```xml
<!--配置事务管理器-->
<bean id="transactionManager" class="org.springframework.jdbc.datasource.DataSourceTransactionManager">
	<property name="dataSource" ref="dataSourceRef"></property>
</bean>

<!--开启事务的注解驱动，将事务管理器中的环绕通知作用到连接点，连接点使用@Transactional进行标识
transaction-manager属性用于指定事务管理器，默认是transactionManager这个id名
-->
<tx:annotation-driven transaction-manager="transactionManager"/>
```

启动类配置

```java
@SpringBootApplication
@EnableTransactionManagement
public class SpringBootApplication {
	...
}
```

## 8. Bean没有纳入Spring容器管理

> Sprinｇ的事务管理核心是动态代理，不是动态代理的Bean是无法进行被Spring进行事务管理的

## 9. 事务方法启动新线程进行异步操作

`spring` 的事务是通过 `LocalThread` 来保证线程安全的，事务和当前线程绑定，此时开启新线程执行业务，这个新线程的业务就会事务失效，因为事务是基于动态代理的，要想有事务，需要被动态代理。这里提供一种解决方法，可以将新的业务单独封装成一个方法，然后改方法上添加一个 `@Transactional` ，或者将这个无法单独抽取到一个类中，将该类交给IOC容器进行管理，这样就能让新线程的业务具有事务了 
