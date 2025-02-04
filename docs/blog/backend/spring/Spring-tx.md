---
title: Spring 事务
authors: [cangjingyue]
tags: 
    - spring
    - java
categories:
  - java
---

# Spring 事务

## 事务ACID

- **原子性**： **一个事务（transaction）中的所有操作，要么全部完成，要么全部不完成**，不会结束在中间某个环节。事务在执行过程中发生错误，会被回滚（Rollback）到事务开始前的状态，就像这个事务从来没有执行过一样。
- **一致性**： 在事务开始之前和事务结束以后，数据库的**完整性**没有被破坏。这表示写入的资料必须完全符合所有的预设规则，这包含资料的精确度、串联性以及后续数据库可以自发性地完成预定的工作。
- **隔离性**： 数据库允许多个并发事务同时对其数据进行读写和修改的能力，隔离性可以防止多个事务并发执行时由于交叉执行而导致数据的不一致。事务隔离分为不同级别，包括**读未提交（Read uncommitted）、读提交（read committed）、可重复读（repeatable read）和串行化（Serializable）。**
- **持久性**： 事务处理结束后，对数据的修改就是**永久**的，即便系统故障也不会丢失。

## 事务隔离级别

### **1. 读未提交**

- **ISOLATION_READ_UNCOMMITTED（读未提交）**：其他事务会读取当前事务尚未更改的提交（相当于读取的是这个事务暂时缓存的内容，并不是数据库中的内容）

首先是**读未提交**级别，此级别属于最低级别，相当于各个事务共享一个缓存区域，任何事务的操作都在这里进行。那么它会导致以下问题：

![Pasted image 20240820004523](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2024/12/28/pasted-image-20240820004523.png)

也就是说，事务A最后得到的实际上是一个毫无意义的数据（事务B已经回滚了）我们称此数据为 ***"脏数据"*** ，这种现象称为**脏读**

---

### **2. 读已提交**

- **ISOLATION_READ_COMMITTED（读已提交）**：其他事务会读取当前事务已经提交的数据（也就是直接读取数据库中已经发生更改的内容）

我们接着来看`读已提交`级别，事务只能读取其他事务已经提交的内容，相当于直接从数据中读取数据，这样就可以避免**脏读**问题了，但是它还是存在以下问题：

![Pasted image 20240820004721](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2024/12/28/pasted-image-20240820004721.png)

这正是我们前面例子中提到的问题，虽然它避免了脏读问题，但是如果事件B修改并提交了数据，那么实际上事务A之前读取到的数据依然不是最新的数据，直接导致两次读取的数据**不一致**，这种现象称为**虚读**也可以称为**不可重复读**

---

### **3. 可重复读**

- **ISOLATION_REPEATABLE_READ（可重复读）**：其他事务会读取当前事务已经提交的数据并且其他事务执行过程中不允许再进行数据修改（注意这里仅仅是不允许修改数据）

因此，下一个隔离级别**可重复读**就能够解决这样的问题（MySQL的默认隔离级别），它规定在其他事务执行时，不允许修改数据，这样，就可以有效地避免不可重复读的问题，但是这样就一定安全了吗？这里仅仅是**禁止了事务执行过程中的UPDATE操作，但是它并没有禁止INSERT这类操作**，因此，如果事务A执行过程中事务B插入了新的数据，那么A这时是毫不知情的，比如：

![Pasted image 20240820004951](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2024/12/28/pasted-image-20240820004951.png)

两个人**同时**报名一个活动，两个报名的事务**同时**在进行，但是他们一开始读取到的人数都是**5**，而这时，它们都会认为报名成功后人数应该变成**6**，而正常情况下应该是**7**，因此这个时候就发生了数据的**幻读**现象。

---

### **4. 串行化**

要解决上述种种问题，只能使用最后一种隔离级别**串行化**来实现了，**每个事务不能同时进行**，直接避免所有并发问题，简单粗暴，但是效率爆减，并不推荐。

---

### **5. 小结**

最后总结三种情况：

- **脏读**：读取到了被回滚的数据，它毫无意义。
- **虚读（不可重复读）**：由于其他事务更新数据，两次读取的数据不一致。
- **幻读**：由于其他事务执行插入删除操作，而又无法感知到表中记录条数发生变化，当下次再读取时会莫名其妙多出或缺失数据，就像产生幻觉一样。

*（对于虚读和幻读的区分：虚读是某个数据前后读取不一致，幻读是整个表的记录数量前后读取不一致)*

最后这张图，请务必记在你的脑海，记在你的心中：

<img src="https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2024/12/28/17353763265466.jpg" style="height:200px; display: block; margin: auto;">

## 事务的传播行为

### 概述

当一个 `service` 中调用了另一个 `service` 的方法，此时 `bservice` 的事务传播到了 `aservice` 中，这样就产生了事务的传播：

```java
@Service
public class AService {

    @Autowired
    private BService bService;
    
    public void order() {
        xxx();
        bService().yyy();
        zzz();
    }
}    
```

因为两个 `service` 都存在事务，那么生成的sql语句可能如下：

```sql
BEGIN;
    update xxx;
    --- 事务分界线 ---
        begin;
            update yyy;
        commit;
    ----------------
    update zzz;
commit;    
```

显然，这里的事务逻辑存在问题，当第二个 `begin` 执行完毕后，会隐式地将第一个事务提交，从而导致 `AService` 的部分事务提交。  
所以当 `B事务` 传播到 `A事务` 中时 `B 事务` 需要做一下微调，微调的结果如下述几种情况：

#### **1. 当AService存在事务**

**第一种情况：融入A事务 (即B事务合并入A事务)** 

形成的sql如下：

```sql
BEGIN;
    update xxx;
    --- 事务分界线 ---
        update yyy;
    ----------------
    update zzz;
commit;   
```

<br/> 

**第二种情况：挂起A事务，让B事务独立于A事务运行。**

当两个事务需要**各自独立维护自身事务**，单个事务无法独立完成，B事务启动时可以暂时将A事务挂起，即阻塞A，且不向A发送sql，使得其无法提交，而B开启一个新的事务，B执行完毕后A继续。

<img src="https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2024/12/28/untitled-diagramdrawio1.png" style="height:400px; display: block; margin: auto;">

---

#### **2. 当AService无事务**

**第一种情况：B事务以事务的方式运行**

```sql
select xxx;
    --- 分界线 ---
    begin;
        update yyy;
    commit;
    -------------
select zzz;    
```

<br/>

**第二种情况：B事务以无事务的方式运行**

```sql
select xxx;
    --- 分界线 ---
    select yyy;
    -------------
select zzz;    
```

----

#### **3. 嵌套事务**

通过设置保存点，将内部的事务转化为 **设置保存点** 和 **回滚至保存点**，实现类似两个事务的操作。

```sql
begin;
    update xxx;
    savepoint a;
        update yyy;
        --- 若报错，回滚至保存点a
    rollback to a;
    --- 后续事务不受影响
    update zzz;
commit;    
```

嵌套过程如下：

1. 内部 `SAVEPOINT a` 后的代码如果报错则直接回滚到保存点
2. 整个事务的提交不收内部 **伪事务** 的影响。

### 传播行为

1. **PROPAGATION_REQUIRED**：表示当前方法必须运行在事务中。如果当前事务存在，方法将会在该事务中运行。否则，会启动一个新的事务。REQUIRED 表示需要，即 B事务无论如何都要有事务。
2. **PROPAGATION_SUPPORTS**：表示当前方法不需要事务上下文。但是如果存在当前事务的话，那么该方法会在这个事务中运行
3. **PROPAGATION_MANDATORY**：(强制性的) 表示该方法必须在事务中运行。如果当前事务不存在，则会抛出一个异常。
4. **PROPAGATION_REQUIRES_NEW**：(需要一个新事务) 表示当前方法必须运行在它自己的事务中。一个新的事务将被启动。如果存在当前事务，在该方法执行期间，当前事务会被挂起。
5. **PROPAGATION_NOT_SUPPORTED**：(不支持事务) 表示该方法不应该运行在事务中。如果存在当前事务，在该方法运行期间，当前事务将被挂起。
6. **PROPAGATION_NEVER**：(不会运行在有事务的环境) 表示当前方法不应该运行在事务上下文中，如果当前有一个事务正在运行，则会抛出异常
7. **PROPAGATION_NESTED**：(嵌套的) 表示如果当前已经存在一个事务，那么该方法将会在嵌套事务中运行。嵌套的事务可以独立于当前事务进行独立地提交或回滚，如果当前事务不存在，那么其行为与 REQUIRED 一样。注意不同数据库对这种传播行为的支持是有所差异的。可以参考资源管理器的文档来确认它们是否支持嵌套事务。

## Spring事务管理

spring提供了如下几个核心的组件，用于进行事务管理：

1. **PlatformTransactionManager**
    - 是事务管理的核心接口，负责开启、提交、回滚事务。
2. **TransactionDefinition** ：
    - 该接口允许开发者定制事务的各种属性，如隔离级别、传播行为、超时时间以及是否只读。
3. **TransactionStatus**：
    - 该接口用于记录事务执行过程中的状态。它包含了一些关键信息，例如是否处于活动状态、是否可以提交、是否需要回滚，挂起的资源等。
    - 通过检查事务状态，事务管理器可以决定是否继续执行事务操作。
4. **TransactionSynchronizationManager**
    - 该组件为 `Spring` 提供了一种统一和灵活的方式来定义和配置事务的各种属性，使开发者能够根据不同的业务需求调整事务的行为。
5. **TransactionSynchronization**  
该接口用于在事务处理过程中实现同步回调：
    - `TransactionSynchronization` 接口为 `Spring` 事务提供了灵活的扩展机制。
    - 通过注册到 `TransactionSynchronizationManager`，您可以在事务提交、回滚或完成后执行相应的逻辑。
    - 这对于日志记录、资源清理、缓存刷新等任务非常有用。
    - 根据业务需求，您可以自定义实现，以满足特定的事务处理需求。
6. **TransactionSynchronization** 接口维护了一个事务同步状态：

```java
public interface TransactionSynchronization extends Ordered, Flushable {

	// 事务提交状态
	int STATUS_COMMITTED = 0;

	// 事务回滚状态
	int STATUS_ROLLED_BACK = 1;

	// 事务状态未知
	int STATUS_UNKNOWN = 2;


	// 返回此事务同步的执行顺序。
	@Override
	default int getOrder() {
		return Ordered.LOWEST_PRECEDENCE;
	}

	// 暂停当前事务，用于挂起线程，本质是将当前的线程与当前事务解绑
	default void suspend() {}

	//恢复当前事务，将已经暂停的事务与当前的线程重新绑定
	default void resume() {}

	// 如果适用，将底层会话刷新到数据存储:
	@Override
	default void flush() {
	}

	// 在事务提交之前调用(在"beforeCompletion"之前)。
    // 此回调并不意味着事务将实际提交。在调用此方法之后，仍然可以发生回滚决策。
    // 此回调是为了执行仅在提交仍有机会发生时才相关的工作，例如将SQL语句刷新到数据库。
	default void beforeCommit(boolean readOnly) {}

	// 在事务提交/回滚之前调用。可以在事务完成之前执行资源清理。
	default void beforeCompletion() {
	}

	// 事务提交后调用。可以在主事务成功提交后立即执行进一步的操作。
    // 例如，在主事务成功提交后，可以提交进一步的操作，如确认消息或电子邮件。
	default void afterCommit() {
	}

	// 在事务提交/回滚后调用。可以在事务完成后执行资源清理。
	default void afterCompletion(int status) { }

}
```

## 核心接口 PlatformTransactionManager

### 继承关系与方法基本概览

继承关系如下图所示：

<img src="https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/01/05/platformtransactionmanager.png" style="height:750px; display: block; margin: auto;">

- PlatformTransactionManager
  - 这是一个比较重要的接口。定义了获取事务状态、事务提交、事务回滚等方法

  ```java
  TransactionStatus getTransaction(@Nullable TransactionDefinition definition)
  
  void commit(TransactionStatus status)
  
  void rollback(TransactionStatus status)
  ```

- AbstractPlatformTransactionManager
  - 事务管理的抽象实现类。采用同样的套路定义了事务的操作流程，分别是**获取事务，事务提交，事务回滚**。这三个步骤在不同的数据源上操作又有区别，所以该抽象类同时定义了需要子类去实际执行的抽象方法。
  - ```java
    TransactionStatus getTransaction(@Nullable TransactionDefinition definition)
    ```

    获取事务的方法：

    - 根据当前是否已经有事务，如果有，根据定义的事务传播行为返回一个事务
    - 如果没有根据事务的定义返回一个事务
  - ```java
    void commit(TransactionStatus status)
    ```

    根据事务的状态，准备进行事务的提交操作，真正的提交交给`doRollback(DefaultTransactionStatus status)`

  - ```java
    void rollback(TransactionStatus status)
    ```

    开始准备进行事务回滚

  - ```java
    abstract Object doGetTransaction()
    ```

    为当前的事务状态返回一个事务对象。得到该对象后在交给其他模版方法去处理

  - ```java
    Object doSuspend(Object transaction)
    ```

    挂起指定的事务

  - ```java
    abstract void doBegin(Object transaction, TransactionDefinition definition)
    ```

    根据给定的事务定义开始一个新事务，在此之前要么没有事务，要么存在的事务已被挂起。所以可以放心大胆的开始一个新事务。

  - ```java
    abstract void doCommit(DefaultTransactionStatus status)
    ```

    对于给定的事务进行提交操作

  - ```java
    abstract void doRollback(DefaultTransactionStatus status)
    ```

    对于指定的事务执行回滚操作

---

### 获取事务对象

抽象类`AbstractPlatformTransactionManager`的核心方法实现：

```java
// 核心的方法：获取事务对象
@Override
public final TransactionStatus getTransaction(@Nullable TransactionDefinition definition) throws TransactionException {

    // 如果有给定的事务配置，使用默认的事务配置（隔离级别，传播行为等）
    TransactionDefinition def = (definition != null ? definition : TransactionDefinition.withDefaults());

    // 获取一个事务或创建一个新的事务，但事务中的连接资源是从当前线程的绑定资源中查找
    Object transaction = doGetTransaction();
    boolean debugEnabled = logger.isDebugEnabled();

    // 现有事务被发现
    if (isExistingTransaction(transaction)) {
        // 检查传播行为，根据传播行为创建内部事务
        // 如：REQUIRES_NEW 就会挂起外部事务，开启新事物返回
        return handleExistingTransaction(def, transaction, debugEnabled);
    }

    // 检查新事务的定义设置。
    if (def.getTimeout() < TransactionDefinition.TIMEOUT_DEFAULT) {
        throw new InvalidTimeoutException("Invalid transaction timeout", def.getTimeout());
    }

    // 没有发现现有事务->检查传播行为，继续执行
    // PROPAGATION_MANDATORY该方法必须在事务中运行，如果当前事务不存在，则会抛出一个异常
    if (def.getPropagationBehavior() == TransactionDefinition.PROPAGATION_MANDATORY) {
        throw new IllegalTransactionStateException("No existing transaction found for transaction marked with propagation 'mandatory'");
    }
    // NESTED，REQUIRED ，REQUIRES_NEW 就会开启事务
    else if (def.getPropagationBehavior() == TransactionDefinition.PROPAGATION_REQUIRED        ||def.getPropagationBehavior() == TransactionDefinition.PROPAGATION_REQUIRES_NEW 
       ||def.getPropagationBehavior() == TransactionDefinition.PROPAGATION_NESTED) {
        SuspendedResourcesHolder suspendedResources = suspend(null);
        if (debugEnabled) {
            logger.debug("Creating new transaction with name [" + def.getName() + "]: " + def);
        }
        try {
            // 直接启动事务
            return startTransaction(def, transaction, debugEnabled, suspendedResources);
        }
        catch (RuntimeException | Error ex) {
            resume(null, suspendedResources);
            throw ex;
        }
    }
    else {
        // 剩下的传播行为
        // SUPPORTS NOT_SUPPORTED   NEVER
        // 创建“空”事务:没有实际事务（不会将connection的autocommitted设置为false）
        if (def.getIsolationLevel() != TransactionDefinition.ISOLATION_DEFAULT && logger.isWarnEnabled()) {
            logger.warn("Custom isolation level specified but no actual transaction initiated; " + "isolation level will effectively be ignored: " + def);
        }
        boolean newSynchronization = (getTransactionSynchronization() == SYNCHRONIZATION_ALWAYS);
        return prepareTransactionStatus(def, null, true, newSynchronization, debugEnabled, null);
    }
}
```

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/01/05/17360072556113.jpg)

首先通过 `doGetTransaction` 方法尝试获取当前的事务

**1.** 如果当前存在事务 `isExistingTransaction(transaction)`

进入 `handleExistingTransaction(def, transaction, debugEnabled)` 方法，处理对应的事务传播行为

```java
@Override
protected boolean isExistingTransaction(Object transaction) {
    DataSourceTransactionObject txObject = (DataSourceTransactionObject) transaction;
    return (txObject.hasConnectionHolder() && txObject.getConnectionHolder().isTransactionActive());
}
```

处理当外部存在事务时的状态：

```java
private TransactionStatus handleExistingTransaction(
    TransactionDefinition definition, Object transaction, boolean debugEnabled)
    throws TransactionException {

    // 如果是never，因为存在外界事务所以直接抛异常
    if (definition.getPropagationBehavior() == TransactionDefinition.PROPAGATION_NEVER) {
        throw new IllegalTransactionStateException(
            "Existing transaction found for transaction marked with propagation 'never'");
    }
    // NOT_SUPPORTED表示该方法不应该运行在事务中。如果存在当前事务，在该方法运行期间，当前事务将被挂起
    if (definition.getPropagationBehavior() == TransactionDefinition.PROPAGATION_NOT_SUPPORTED) {
        if (debugEnabled) {
            logger.debug("Suspending current transaction");
        }
        // 挂起外部事务
        Object suspendedResources = suspend(transaction);
        // 设置同步器
        boolean newSynchronization = (getTransactionSynchronization() == SYNCHRONIZATION_ALWAYS);
        // 该方法不会真实的创建事务
        // 新创建的TransactionStatus会持有已经挂起的连接资源
        return prepareTransactionStatus(
            definition, null, false, newSynchronization, debugEnabled, suspendedResources);
    }
     // REQUIRES_NEW
    if (definition.getPropagationBehavior() == TransactionDefinition.PROPAGATION_REQUIRES_NEW) {
        if (debugEnabled) {
            logger.debug("Suspending current transaction, creating new transaction with name [" +
                         definition.getName() + "]");
        }
        SuspendedResourcesHolder suspendedResources = suspend(transaction);
        try {
            // 挂起外部事务，开启新的事务，新的事务中也会持有已经挂起的连接资源
            return startTransaction(definition, transaction, debugEnabled, suspendedResources);
        }
        catch (RuntimeException | Error beginEx) {
            resumeAfterBeginException(transaction, suspendedResources, beginEx);
            throw beginEx;
        }
    }
     //NESTED 嵌套事务
    if (definition.getPropagationBehavior() == TransactionDefinition.PROPAGATION_NESTED) {
        if (!isNestedTransactionAllowed()) {
            throw new NestedTransactionNotSupportedException(
                "Transaction manager does not allow nested transactions by default - " + "specify 'nestedTransactionAllowed' property with value 'true'");
        }
        if (debugEnabled) {
            logger.debug("Creating nested transaction with name [" + definition.getName() + "]");
        }
        // 通过使用savepoint来生成嵌套事务（mysql）
        if (useSavepointForNestedTransaction()) {
            DefaultTransactionStatus status =
                prepareTransactionStatus(definition, transaction, false, false, debugEnabled, null);
            // 创建保存点
            status.createAndHoldSavepoint();
            return status;
        } else {
            
            return startTransaction(definition, transaction, debugEnabled, null);
        }
    }

    // 其他REQUIRED，SUPPORTS，MANDATORY，融入事务，不存在事务同步
    // 因为外界有事务，此次开一个空事务即可
    boolean newSynchronization = (getTransactionSynchronization() != SYNCHRONIZATION_NEVER);
    return prepareTransactionStatus(definition, transaction, false, newSynchronization, debugEnabled, null);
}
```

**2.** 当前不存在事务，则在当前方法内处理外部无事务的传播行为

## @Transactional 注解

```java
public @interface Transactional {
    @AliasFor("transactionManager")
    String value() default "";
    
    // 事务管理器、暂时先忽略它，我们也不会去修改这个参数的值
    @AliasFor("value")
    String transactionManager() default "";

    String[] label() default {};
    
    // 事务传播行为
    Propagation propagation() default Propagation.REQUIRED;
    
    // 事务隔离级别
    Isolation isolation() default Isolation.DEFAULT;
    
    // 事务超时时间 -1，为永久不超时， 单位是秒
    int timeout() default -1;
    
    // 事务超时时间，可以设置单位，比如 timeoutString = "30s"
    String timeoutString() default "";
    
    // 是否只读事务
    boolean readOnly() default false;
    
    // 对哪些异常进行回滚
    Class<? extends Throwable>[] rollbackFor() default {};
    
    // 对哪些异常进行回滚【异常全限定名】
    String[] rollbackForClassName() default {};
    
    // 对哪些异常不回滚
    Class<? extends Throwable>[] noRollbackFor() default {};
    
    // 对哪些异常不回滚【异常全限定名】
    String[] noRollbackForClassName() default {};
}
```

`rollbackFor` 和 `rollbackForClassName` 的区别，直接来看使用方式。 

最好使用 `rollbackFor` 可以在编译的时候直接帮助检查是否出错。

```java
@Transactional(rollbackFor = Exception.class, rollbackForClassName = {"java.lang.Exception"})
```

!!!注意  
    在使用 `@Transactional` 注解的时候，一定要设置`rollbackFor`的值，默认情况下是**不回滚的检查类异常**，比如 `IOException`、`SQLException` 等。

## Spring 事务管理与传播行为实践

有以下约定：

**定义两个事务方法A和B，在A里面调用B。且A事务的定义如下不会改变，B事务的传播行为可能会变。**

```java
@Transactional(rollbackFor = Exception.class)
public void A() {
    userMapper.insertUser("A",1);
    sqlTestService.B();
}

public void B() {
    userMapper.insertUser("B",2);
}
```

---

### 嵌套事务

修改B事务的传播行为，让它生成嵌套事务

```java
@Transactional(rollbackFor = Exception.class, propagation = Propagation.NESTED)
```

嵌套事务和父事务是有关联的，当A事务回滚的时候，B事务一定回滚。

当B事务异常回滚的时候，要判断在A里面是否try了B事务，如果try就A不会回滚，只是B回滚。

---

### 挂起事务

修改B事务的传播行为，让它生成新事务，挂起A事务

```java
@Transactional(rollbackFor = Exception.class, propagation = Propagation.REQUIRES_NEW)
```

---

### 融入事务

修改B事务的传播行为，让它融入当前事务

```java
@Transactional(rollbackFor = Exception.class, propagation = Propagation.REQUIRED)

@Transactional(rollbackFor = Exception.class, propagation = Propagation.SUPPORTS)
```

既然说是融入当前事务，那其实本质上还是一个事务，不管怎么样的异常，也不管如何处理异常，**A、B方法都是一起提交、或一起回滚**。

---

### 执行结果汇总

排列组合结果如下：

<img src="https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/01/04/17360051325588.jpg" style="height:500px; display: block; margin: auto;">
