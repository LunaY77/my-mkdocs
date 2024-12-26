---
title: Spring AOP
authors: [cangjingyue]
tags: 
    - spring
    - java
categories:
  - java
---

# Spring AOP


**AOP** 切点表达式和使用以及基于 **JDK** 和 **CGLIB** 的动态代理类关系：

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2024/11/29/17328624708126.jpg)


`Joinpoint`，织入点，指需要执行代理操作的某个类的某个方法(仅支持方法级别的`JoinPoint`)；`Pointcut`是`JoinPoint`的表述方式，能捕获`JoinPoint`。

最常用的切点表达式是`AspectJ`的切点表达式。

* 需要匹配类，定义`ClassFilter`接口
* 匹配方法，定义`MethodMatcher`接口

`PointCut`需要同时匹配类和方法，包含`ClassFilter`和`MethodMatcher`, `AspectJExpressionPointcut`是支持`AspectJ`切点表达式的`PointCut`实现，简单实现仅支持`execution`函数。

`AdvisedSupport` 是一个核心类，用于支持和管理代理对象的配置和功能

`AdvisedSupport` 的主要功能是：

1.	存储 AOP 配置元信息：
    * 目标对象（被代理对象）。
    * 代理的接口列表。
    * 应用的拦截器链或通知（Advices）。
2.	管理代理行为：
    * 决定代理是 JDK 动态代理还是 CGLIB 动态代理。
    * 负责控制代理对象的生命周期。
3.	支持运行时动态修改：
    * 可以在运行时动态添加或移除通知（Advice）。



## JDK动态代理

`AopProxy`是获取代理对象的抽象接口，`JdkDynamicAopProxy`的基于JDK动态代理的具体实现。

`TargetSource`，被代理对象的封装。

`MethodInterceptor`，方法拦截器，是`AOP Alliance`的"公民"，顾名思义，可以拦截方法，可在被代理执行的方法前后增加代理行为。


<details>

<summary>测试代码</summary>

```java
public class AopTest {

    @Test
    public void testJdkDynamicProxy() throws Exception {
        WorldService worldService = new WorldServiceImpl();

        AdvisedSupport advisedSupport = new AdvisedSupport();
        TargetSource targetSource = new TargetSource(worldService);
        WorldServiceInterceptor methodInterceptor = new WorldServiceInterceptor();
        MethodMatcher methodMatcher = new AspectJExpressionPointcut("execution(* test.aop.bean.WorldService.explode(..))").getMethodMatcher();
        advisedSupport.setTargetSource(targetSource);
        advisedSupport.setMethodInterceptor(methodInterceptor);
        advisedSupport.setMethodMatcher(methodMatcher);

        WorldService proxy = (WorldService) new JdkDynamicAopProxy(advisedSupport).getProxy();
        proxy.explode();
    }
}
```

```java
public class WorldServiceInterceptor implements MethodInterceptor {
    @Override
    public Object invoke(MethodInvocation methodInvocation) throws Throwable {
        System.out.println("do something before the Earth explodes");
        Object res = methodInvocation.proceed();
        System.out.println("do something after the Earth explodes");
        return res;
    }
}
```

</details>



### 1. JDK动态代理源码

代码位置：`com.iflove.simplespring.aop.framework.JdkDynamicAopProxy`

```java
@Override
public Object getProxy() {
    return Proxy.newProxyInstance(Thread.currentThread().getContextClassLoader(), advised.getTargetSource().getTargetClass(), this);
}

@Override
public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
    if (advised.getMethodMatcher().matches(method, advised.getTargetSource().getTarget().getClass())) {
        // 启动代理方法 
        MethodInterceptor methodInterceptor = advised.getMethodInterceptor();
        return methodInterceptor.invoke(new ReflectiveMethodInvocation(advised.getTargetSource().getTarget(), method, args));
    }
    return method.invoke(advised.getTargetSource().getTarget(), args);
}
```

重点关注以上两个核心方法

1. `getProxy()`
    * `getProxy()` 方法用于创建代理对象，返回一个基于 Java 动态代理的代理实例。
2. `invoke()`
    * `invoke()` 方法用于处理代理对象上的方法调用，判断是否需要应用代理逻辑。如果方法匹配切面条件，则执行增强逻辑；否则直接调用目标方法。

    

### 2. 运行测试代码

在测试代码的末尾加上

```java
System.out.println(proxy.getClass());
while (true) {}
```    

保证程序始终运行

下载 **arthas** 并启动

```bash
java -jar arthas-boot.jar
```

选择对应进程

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2024/12/26/17350138436503.jpg)


输入
```bash
jad com.sun.proxy.$Proxy2
```

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2024/12/26/17350141712400.jpg)


获得代理类信息如下：

```java
/*
 * Decompiled with CFR.
 *
 * Could not load the following classes:
 *  test.aop.bean.WorldService
 */
package com.sun.proxy;

import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.lang.reflect.UndeclaredThrowableException;
import test.aop.bean.WorldService;

public final class $Proxy2
extends Proxy
implements WorldService {
    private static Method m1;
    private static Method m2;
    private static Method m0;
    private static Method m3;

    public $Proxy2(InvocationHandler invocationHandler) {
        super(invocationHandler);
    }

    static {
        try {
            m1 = Class.forName("java.lang.Object").getMethod("equals", Class.forName("java.lang.Object"));
            m2 = Class.forName("java.lang.Object").getMethod("toString", new Class[0]);
            m0 = Class.forName("java.lang.Object").getMethod("hashCode", new Class[0]);
            m3 = Class.forName("test.aop.bean.WorldService").getMethod("explode", new Class[0]);
            return;
        }
        catch (NoSuchMethodException noSuchMethodException) {
            throw new NoSuchMethodError(noSuchMethodException.getMessage());
        }
        catch (ClassNotFoundException classNotFoundException) {
            throw new NoClassDefFoundError(classNotFoundException.getMessage());
        }
    }

    public final boolean equals(Object object) {
        try {
            return (Boolean)this.h.invoke(this, m1, new Object[]{object});
        }
        catch (Error | RuntimeException throwable) {
            throw throwable;
        }
        catch (Throwable throwable) {
            throw new UndeclaredThrowableException(throwable);
        }
    }

    public final String toString() {
        try {
            return (String)this.h.invoke(this, m2, null);
        }
        catch (Error | RuntimeException throwable) {
            throw throwable;
        }
        catch (Throwable throwable) {
            throw new UndeclaredThrowableException(throwable);
        }
    }

    public final int hashCode() {
        try {
            return (Integer)this.h.invoke(this, m0, null);
        }
        catch (Error | RuntimeException throwable) {
            throw throwable;
        }
        catch (Throwable throwable) {
            throw new UndeclaredThrowableException(throwable);
        }
    }

    public final void explode() {
        try {
            this.h.invoke(this, m3, null);
            return;
        }
        catch (Error | RuntimeException throwable) {
            throw throwable;
        }
        catch (Throwable throwable) {
            throw new UndeclaredThrowableException(throwable);
        }
    }
}
```

可以看到代理类信息如下 `public final class $Proxy2 extends Proxy implements WorldService`

继承了 `Proxy`，实现了 `WorldService` 接口

上述信息印证了一个重要的概念，即：

!!!知识点
    **JDK 动态代理生成的代理类和代理对象为兄弟关系，需要一个共同的接口**



接下来看代理类实现的 `explode` 方法

```java
public final void explode() {
    try {
        this.h.invoke(this, m3, null);
        return;
    }
    catch (Error | RuntimeException throwable) {
        throw throwable;
    }
    catch (Throwable throwable) {
        throw new UndeclaredThrowableException(throwable);
    }
}
```

其他都很好理解，问题是：**这里的 `h` 是什么？**

先给出解答：**`h` 是 `InvocationHandler`**

接下来，一步一步从源码角度分析

首先，这个代理类是通过 `JdkDynamicAopProxy` 的 `getProxy` 方法获取的

定义如下

```java
@Override
public Object getProxy() {
    return Proxy.newProxyInstance(Thread.currentThread().getContextClassLoader(), advised.getTargetSource().getTargetClass(), this);
}
```

以及 `Proxy.newProxyInstance` 的方法签名

```java
public static Object newProxyInstance(ClassLoader loader,
                                          Class<?>[] interfaces,
                                          InvocationHandler h)
```

可以看到在 `getProxy` 方法中返回代理对象的最后一个参数为 `this`，即 `JdkDynamicAopProxy` 本身，而 `JdkDynamicAopProxy` 这个类实现了 `InvocationHandler` 接口，所以在动态生成的代理类中调用的 `this.h.invoke` 其实就是 `JdkDynamicAopProxy` 的 `invoke` 方法。

---


最后再来看 `invoke` 方法

```java
@Override
public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
    if (advised.getMethodMatcher().matches(method, advised.getTargetSource().getTarget().getClass())) {
        // 启动代理方法
        MethodInterceptor methodInterceptor = advised.getMethodInterceptor();
        return methodInterceptor.invoke(new ReflectiveMethodInvocation(advised.getTargetSource().getTarget(), method, args));
    }
    return method.invoke(advised.getTargetSource().getTarget(), args);
}
```

核心逻辑如下：

1.	方法匹配：
    * 调用 `advised.getMethodMatcher().matches(...)` 判断当前方法是否符合切面条件。
    * 如果匹配，执行代理逻辑；否则直接调用目标方法。
    
2.	代理逻辑：
    * 获取 `MethodInterceptor` 对象，封装了增强逻辑。
    * 调用 `MethodInterceptor.invoke(...)`，传入一个`ReflectiveMethodInvocation` 对象。
    * `ReflectiveMethodInvocation` 是 `Spring AOP` 的核心类，用于封装方法调用的上下文（目标对象、方法、参数等）。
    
3.	直接调用目标方法：
    * 如果方法不匹配代理条件，直接调用目标对象的方法，使用反射机制。



## Cglib 动态代理

与基于JDK的动态代理在运行期间为接口生成对象的代理对象不同

基于CGLIB的动态代理能在运行期间**动态构建字节码的class文件**，为类生成子类，因此被代理类**不需要继承自任何接口**。

!!!重要概念
    **cglib** 不要求目标实现接口，它生成的**代理类是目标的子类**，因此代理与目标之间是**子父**关系


<details>

<summary>测试代码</summary>

```java
private AdvisedSupport advisedSupport;

@Before
public void setup() {
    WorldService worldService = new WorldServiceImpl();

    advisedSupport = new AdvisedSupport();
    TargetSource targetSource = new TargetSource(worldService);
    WorldServiceInterceptor methodInterceptor = new WorldServiceInterceptor();
    MethodMatcher methodMatcher = new AspectJExpressionPointcut("execution(* test.aop.bean.WorldService.explode(..))").getMethodMatcher();
    advisedSupport.setTargetSource(targetSource);
    advisedSupport.setMethodInterceptor(methodInterceptor);
    advisedSupport.setMethodMatcher(methodMatcher);
}
```

```java
@Test
public void testCglibDynamicProxy1() throws Exception {
    WorldService proxy = (WorldService) new CglibAopProxy(advisedSupport).getProxy();
    proxy.explode();
}
```

```java
@Test
public void testCglibDynamicProxy2() throws Exception {
    WorldServiceImpl proxy = (WorldServiceImpl) new CglibAopProxy(advisedSupport).getProxy();
    proxy.explode();
}
```

</details>


运行上述代码均无报错，即验证了 **代理与目标之间是子父关系** 


### 1. Cglib 动态代理源码

代码位置：`com.iflove.simplespring.aop.framework.CglibAopProxy`

```java
public class CglibAopProxy implements AopProxy {

    private final AdvisedSupport advised;

    public CglibAopProxy(AdvisedSupport advised) {
        this.advised = advised;
    }

    @Override
    public Object getProxy() {
        Enhancer enhancer = new Enhancer();
        Class<?> aClass = advised.getTargetSource().getTarget().getClass();
        aClass = ClassUtils.isCglibProxyClass(aClass)? aClass.getSuperclass() : aClass;
        enhancer.setSuperclass(aClass);
        enhancer.setInterfaces(advised.getTargetSource().getTargetClass());
        enhancer.setCallback(new DynamicAdvisedInterceptor(advised));
        return enhancer.create();
    }

    private static class DynamicAdvisedInterceptor implements MethodInterceptor {

        private final AdvisedSupport advised;

        public DynamicAdvisedInterceptor(AdvisedSupport advised) {
            this.advised = advised;
        }

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

        private final MethodProxy methodProxy;

        public CglibMethodInvocation(Object target, Method method, Object[] arguments, MethodProxy methodProxy) {
            super(target, method, arguments);
            this.methodProxy = methodProxy;
        }

        @Override
        public Object proceed() throws Throwable {
            return this.methodProxy.invoke(this.target, this.arguments);
        }

    }
}
```

与 `JDK` 动态代理不同的是，`Cglib` 动态代理拥有两个特别的内部类 `DynamicAdvisedInterceptor` 和 `CglibMethodInvocation` 

 * `CglibMethodInvocation` 扩展 `ReflectiveMethodInvocation` 类以支持 `CGLIB` 代理
 * 主要是覆盖了 `invokeJoinpoint()` 方法，如果有 `MethodProxy` 对象,则通过调用 `MethodProxy#invoke` 方法，否则通过反射调用

--- 

**那么问题来了，`methodProxy` 究竟是什么？不使用 `methodProxy` 行不行？**

首先回答 ***不使用 `methodProxy` 行不行？*** 这个问题

答案是 **可以！**

如果把 `proceed` 方法中的 `methodProxy` 替换为 `method`，代理依然生效，且不会报错

**接下来，从源码角度分析 `methodProxy` 究竟是什么？**

---

### 2. CGLIB 动态代理原理与性能优化

`MethodProxy` 是 CGLIB 中一个关键的类，用于执行代理方法。它通过 ASM 字节码框架生成动态代理类，以提高方法调用的性能。与传统的反射方式相比，`MethodProxy` 能避免频繁反射操作，从而优化性能。

进入 `proceed` 方法中的 `invoke` 方法，源码如下

```java
public Object invoke(Object obj, Object[] args) throws Throwable {
    try {
        this.init();
        FastClassInfo fci = this.fastClassInfo;
        return fci.f1.invoke(fci.i1, obj, args);
    } catch (InvocationTargetException var4) {
        InvocationTargetException e = var4;
        throw e.getTargetException();
    } catch (IllegalArgumentException var5) {
        IllegalArgumentException e = var5;
        if (this.fastClassInfo.i1 < 0) {
            throw new IllegalArgumentException("Protected method: " + this.sig1);
        } else {
            throw e;
        }
    }
}
```

继续进入该方法下的 `init` 方法

```java
private void init() {
    if (this.fastClassInfo == null) {
        synchronized(this.initLock) {
            if (this.fastClassInfo == null) {
                CreateInfo ci = this.createInfo;
                FastClassInfo fci = new FastClassInfo();
                fci.f1 = helper(ci, ci.c1);
                fci.f2 = helper(ci, ci.c2);
                fci.i1 = fci.f1.getIndex(this.sig1);
                fci.i2 = fci.f2.getIndex(this.sig2);
                this.fastClassInfo = fci;
                this.createInfo = null;
            }
        }
    }

}
```

在 `init` 方法下，有两个特殊的类 `f1` 和 `f2`，这两个其实就是 `FastClass`

将源码拉到底部，可以看到 `FastClass` 定义如下：

```java
private static class FastClassInfo {
    FastClass f1;
    FastClass f2;
    int i1;
    int i2;

    private FastClassInfo() {
    }
}
```

* `F1` 表示已经创建的**代理类**，包含代理逻辑
* `F2` 表示**原始类的方法封装**，加速原生类方法调用

无论是**代理类**还是**原生的类**, 在**创建代理、执行代理内部的一些方法以及调用一些值**的时候, 如果要使用到**原生类中的方法**的话，是需要通过**反射的方式**去执行的。

可以往**极端**一点的方向思考，如果**原生类中被调用的方法非常多**的话，会导致 `java` 进行**频繁的反射**，而使用反射，又会导致 `JVM` 机制进行**反射的检查**，所以这样做是相当**牺牲性能**的。

为了解决这个问题，`Cglib` 创建了一个 `MethodProxy` 类，将**原生类中所有需要代理的方法**存入这个类中，那么在需要使用的时候，**直接执行**即可，相当于一个**缓存**的作用，好处就是可以**提高性能**。


<br/>

在 `MethodProxy` 类中还有一个特别的方法 `invokeSuper`，这个方法代表**直接调用原始类的方法**

```java
methodProxy.invokeSuper(this.target, this.arguments);
```

那么顾名思义，`invoke` 方法，就是**调用代理类的代理方法**

---

### 3. Cglib 动态代理类

类似上文获取 JDK 动态代理类的方法

在测试代码的末尾加上

```java
System.out.println(proxy.getClass());
while (true) {}
```    

保证程序始终运行

下载 **arthas** 并启动

```bash
java -jar arthas-boot.jar
```

获取**动态代理类**代码如下(有点小长)：

<details>

<summary>动态代理类</summary>

```java
/*
 * Decompiled with CFR.
 *
 * Could not load the following classes:
 *  test.aop.bean.WorldService
 *  test.aop.bean.WorldServiceImpl
 */
package test.aop.bean;

import java.lang.reflect.Method;
import net.sf.cglib.core.ReflectUtils;
import net.sf.cglib.core.Signature;
import net.sf.cglib.proxy.Callback;
import net.sf.cglib.proxy.Factory;
import net.sf.cglib.proxy.MethodInterceptor;
import net.sf.cglib.proxy.MethodProxy;
import test.aop.bean.WorldService;
import test.aop.bean.WorldServiceImpl;

public class WorldServiceImpl$$EnhancerByCGLIB$$81790592
extends WorldServiceImpl
implements WorldService,
Factory {
    private boolean CGLIB$BOUND;
    public static Object CGLIB$FACTORY_DATA;
    private static final ThreadLocal CGLIB$THREAD_CALLBACKS;
    private static final Callback[] CGLIB$STATIC_CALLBACKS;
    private MethodInterceptor CGLIB$CALLBACK_0;
    private static Object CGLIB$CALLBACK_FILTER;
    private static final Method CGLIB$explode$0$Method;
    private static final MethodProxy CGLIB$explode$0$Proxy;
    private static final Object[] CGLIB$emptyArgs;
    private static final Method CGLIB$equals$1$Method;
    private static final MethodProxy CGLIB$equals$1$Proxy;
    private static final Method CGLIB$toString$2$Method;
    private static final MethodProxy CGLIB$toString$2$Proxy;
    private static final Method CGLIB$hashCode$3$Method;
    private static final MethodProxy CGLIB$hashCode$3$Proxy;
    private static final Method CGLIB$clone$4$Method;
    private static final MethodProxy CGLIB$clone$4$Proxy;

    public WorldServiceImpl$$EnhancerByCGLIB$$81790592() {
        WorldServiceImpl$$EnhancerByCGLIB$$81790592 worldServiceImpl$$EnhancerByCGLIB$$81790592 = this;
        WorldServiceImpl$$EnhancerByCGLIB$$81790592.CGLIB$BIND_CALLBACKS(worldServiceImpl$$EnhancerByCGLIB$$81790592);
    }

    static {
        WorldServiceImpl$$EnhancerByCGLIB$$81790592.CGLIB$STATICHOOK1();
    }

    public final boolean equals(Object object) {
        MethodInterceptor methodInterceptor = this.CGLIB$CALLBACK_0;
        if (methodInterceptor == null) {
            WorldServiceImpl$$EnhancerByCGLIB$$81790592.CGLIB$BIND_CALLBACKS(this);
            methodInterceptor = this.CGLIB$CALLBACK_0;
        }
        if (methodInterceptor != null) {
            Object object2 = methodInterceptor.intercept(this, CGLIB$equals$1$Method, new Object[]{object}, CGLIB$equals$1$Proxy);
            return object2 == null ? false : (Boolean)object2;
        }
        return super.equals(object);
    }

    public final String toString() {
        MethodInterceptor methodInterceptor = this.CGLIB$CALLBACK_0;
        if (methodInterceptor == null) {
            WorldServiceImpl$$EnhancerByCGLIB$$81790592.CGLIB$BIND_CALLBACKS(this);
            methodInterceptor = this.CGLIB$CALLBACK_0;
        }
        if (methodInterceptor != null) {
            return (String)methodInterceptor.intercept(this, CGLIB$toString$2$Method, CGLIB$emptyArgs, CGLIB$toString$2$Proxy);
        }
        return super.toString();
    }

    public final int hashCode() {
        MethodInterceptor methodInterceptor = this.CGLIB$CALLBACK_0;
        if (methodInterceptor == null) {
            WorldServiceImpl$$EnhancerByCGLIB$$81790592.CGLIB$BIND_CALLBACKS(this);
            methodInterceptor = this.CGLIB$CALLBACK_0;
        }
        if (methodInterceptor != null) {
            Object object = methodInterceptor.intercept(this, CGLIB$hashCode$3$Method, CGLIB$emptyArgs, CGLIB$hashCode$3$Proxy);
            return object == null ? 0 : ((Number)object).intValue();
        }
        return super.hashCode();
    }

    protected final Object clone() throws CloneNotSupportedException {
        MethodInterceptor methodInterceptor = this.CGLIB$CALLBACK_0;
        if (methodInterceptor == null) {
            WorldServiceImpl$$EnhancerByCGLIB$$81790592.CGLIB$BIND_CALLBACKS(this);
            methodInterceptor = this.CGLIB$CALLBACK_0;
        }
        if (methodInterceptor != null) {
            return methodInterceptor.intercept(this, CGLIB$clone$4$Method, CGLIB$emptyArgs, CGLIB$clone$4$Proxy);
        }
        return super.clone();
    }

    @Override
    public Object newInstance(Callback[] callbackArray) {
        WorldServiceImpl$$EnhancerByCGLIB$$81790592.CGLIB$SET_THREAD_CALLBACKS(callbackArray);
        WorldServiceImpl$$EnhancerByCGLIB$$81790592 worldServiceImpl$$EnhancerByCGLIB$$81790592 = new WorldServiceImpl$$EnhancerByCGLIB$$81790592();
        WorldServiceImpl$$EnhancerByCGLIB$$81790592.CGLIB$SET_THREAD_CALLBACKS(null);
        return worldServiceImpl$$EnhancerByCGLIB$$81790592;
    }

    @Override
    public Object newInstance(Callback callback) {
        WorldServiceImpl$$EnhancerByCGLIB$$81790592.CGLIB$SET_THREAD_CALLBACKS(new Callback[]{callback});
        WorldServiceImpl$$EnhancerByCGLIB$$81790592 worldServiceImpl$$EnhancerByCGLIB$$81790592 = new WorldServiceImpl$$EnhancerByCGLIB$$81790592();
        WorldServiceImpl$$EnhancerByCGLIB$$81790592.CGLIB$SET_THREAD_CALLBACKS(null);
        return worldServiceImpl$$EnhancerByCGLIB$$81790592;
    }

    @Override
    public Object newInstance(Class[] classArray, Object[] objectArray, Callback[] callbackArray) {
        WorldServiceImpl$$EnhancerByCGLIB$$81790592 worldServiceImpl$$EnhancerByCGLIB$$81790592;
        WorldServiceImpl$$EnhancerByCGLIB$$81790592.CGLIB$SET_THREAD_CALLBACKS(callbackArray);
        Class[] classArray2 = classArray;
        switch (classArray.length) {
            case 0: {
                worldServiceImpl$$EnhancerByCGLIB$$81790592 = new WorldServiceImpl$$EnhancerByCGLIB$$81790592();
                break;
            }
            default: {
                throw new IllegalArgumentException("Constructor not found");
            }
        }
        WorldServiceImpl$$EnhancerByCGLIB$$81790592.CGLIB$SET_THREAD_CALLBACKS(null);
        return worldServiceImpl$$EnhancerByCGLIB$$81790592;
    }

    public final void explode() {
        MethodInterceptor methodInterceptor = this.CGLIB$CALLBACK_0;
        if (methodInterceptor == null) {
            WorldServiceImpl$$EnhancerByCGLIB$$81790592.CGLIB$BIND_CALLBACKS(this);
            methodInterceptor = this.CGLIB$CALLBACK_0;
        }
        if (methodInterceptor != null) {
            Object object = methodInterceptor.intercept(this, CGLIB$explode$0$Method, CGLIB$emptyArgs, CGLIB$explode$0$Proxy);
            return;
        }
        super.explode();
    }

    @Override
    public Callback[] getCallbacks() {
        WorldServiceImpl$$EnhancerByCGLIB$$81790592.CGLIB$BIND_CALLBACKS(this);
        WorldServiceImpl$$EnhancerByCGLIB$$81790592 worldServiceImpl$$EnhancerByCGLIB$$81790592 = this;
        return new Callback[]{this.CGLIB$CALLBACK_0};
    }

    static void CGLIB$STATICHOOK1() {
        CGLIB$THREAD_CALLBACKS = new ThreadLocal();
        CGLIB$emptyArgs = new Object[0];
        Class<?> clazz = Class.forName("test.aop.bean.WorldServiceImpl$$EnhancerByCGLIB$$81790592");
        Class<?> clazz2 = Class.forName("test.aop.bean.WorldServiceImpl");
        CGLIB$explode$0$Method = ReflectUtils.findMethods(new String[]{"explode", "()V"}, clazz2.getDeclaredMethods())[0];
        CGLIB$explode$0$Proxy = MethodProxy.create(clazz2, clazz, "()V", "explode", "CGLIB$explode$0");
        clazz2 = Class.forName("java.lang.Object");
        Method[] methodArray = ReflectUtils.findMethods(new String[]{"equals", "(Ljava/lang/Object;)Z", "toString", "()Ljava/lang/String;", "hashCode", "()I", "clone", "()Ljava/lang/Object;"}, clazz2.getDeclaredMethods());
        CGLIB$equals$1$Method = methodArray[0];
        CGLIB$equals$1$Proxy = MethodProxy.create(clazz2, clazz, "(Ljava/lang/Object;)Z", "equals", "CGLIB$equals$1");
        CGLIB$toString$2$Method = methodArray[1];
        CGLIB$toString$2$Proxy = MethodProxy.create(clazz2, clazz, "()Ljava/lang/String;", "toString", "CGLIB$toString$2");
        CGLIB$hashCode$3$Method = methodArray[2];
        CGLIB$hashCode$3$Proxy = MethodProxy.create(clazz2, clazz, "()I", "hashCode", "CGLIB$hashCode$3");
        CGLIB$clone$4$Method = methodArray[3];
        CGLIB$clone$4$Proxy = MethodProxy.create(clazz2, clazz, "()Ljava/lang/Object;", "clone", "CGLIB$clone$4");
    }

    final String CGLIB$toString$2() {
        return super.toString();
    }

    private static final void CGLIB$BIND_CALLBACKS(Object object) {
        block2: {
            Object object2;
            block3: {
                WorldServiceImpl$$EnhancerByCGLIB$$81790592 worldServiceImpl$$EnhancerByCGLIB$$81790592 = (WorldServiceImpl$$EnhancerByCGLIB$$81790592)object;
                if (worldServiceImpl$$EnhancerByCGLIB$$81790592.CGLIB$BOUND) break block2;
                worldServiceImpl$$EnhancerByCGLIB$$81790592.CGLIB$BOUND = true;
                object2 = CGLIB$THREAD_CALLBACKS.get();
                if (object2 != null) break block3;
                object2 = CGLIB$STATIC_CALLBACKS;
                if (CGLIB$STATIC_CALLBACKS == null) break block2;
            }
            worldServiceImpl$$EnhancerByCGLIB$$81790592.CGLIB$CALLBACK_0 = (MethodInterceptor)((Callback[])object2)[0];
        }
    }

    final boolean CGLIB$equals$1(Object object) {
        return super.equals(object);
    }

    final void CGLIB$explode$0() {
        super.explode();
    }

    final int CGLIB$hashCode$3() {
        return super.hashCode();
    }

    @Override
    public void setCallback(int n, Callback callback) {
        switch (n) {
            case 0: {
                this.CGLIB$CALLBACK_0 = (MethodInterceptor)callback;
                break;
            }
        }
    }

    @Override
    public void setCallbacks(Callback[] callbackArray) {
        Callback[] callbackArray2 = callbackArray;
        WorldServiceImpl$$EnhancerByCGLIB$$81790592 worldServiceImpl$$EnhancerByCGLIB$$81790592 = this;
        this.CGLIB$CALLBACK_0 = (MethodInterceptor)callbackArray[0];
    }

    public static MethodProxy CGLIB$findMethodProxy(Signature signature) {
        String string = ((Object)signature).toString();
        switch (string.hashCode()) {
            case -508378822: {
                if (!string.equals("clone()Ljava/lang/Object;")) break;
                return CGLIB$clone$4$Proxy;
            }
            case 1741417204: {
                if (!string.equals("explode()V")) break;
                return CGLIB$explode$0$Proxy;
            }
            case 1826985398: {
                if (!string.equals("equals(Ljava/lang/Object;)Z")) break;
                return CGLIB$equals$1$Proxy;
            }
            case 1913648695: {
                if (!string.equals("toString()Ljava/lang/String;")) break;
                return CGLIB$toString$2$Proxy;
            }
            case 1984935277: {
                if (!string.equals("hashCode()I")) break;
                return CGLIB$hashCode$3$Proxy;
            }
        }
        return null;
    }

    final Object CGLIB$clone$4() throws CloneNotSupportedException {
        return super.clone();
    }

    @Override
    public Callback getCallback(int n) {
        MethodInterceptor methodInterceptor;
        WorldServiceImpl$$EnhancerByCGLIB$$81790592.CGLIB$BIND_CALLBACKS(this);
        switch (n) {
            case 0: {
                methodInterceptor = this.CGLIB$CALLBACK_0;
                break;
            }
            default: {
                methodInterceptor = null;
            }
        }
        return methodInterceptor;
    }

    public static void CGLIB$SET_STATIC_CALLBACKS(Callback[] callbackArray) {
        CGLIB$STATIC_CALLBACKS = callbackArray;
    }

    public static void CGLIB$SET_THREAD_CALLBACKS(Callback[] callbackArray) {
        CGLIB$THREAD_CALLBACKS.set(callbackArray);
    }
}
```
</details>


主要关注动态代理后的 `explode` 方法做了什么？

```java
public final void explode() {
    MethodInterceptor methodInterceptor = this.CGLIB$CALLBACK_0;
    if (methodInterceptor == null) {
        WorldServiceImpl$$EnhancerByCGLIB$$81790592.CGLIB$BIND_CALLBACKS(this);
        methodInterceptor = this.CGLIB$CALLBACK_0;
    }
    if (methodInterceptor != null) {
        Object object = methodInterceptor.intercept(this, CGLIB$explode$0$Method, CGLIB$emptyArgs, CGLIB$explode$0$Proxy);
        return;
    }
    super.explode();
}
```

首先获取 `MethodInterceptor`，如果不为空，则调用 `MethodInterceptor` 的 `intercept` 方法

即 `DynamicAdvisedInterceptor` 类的 `intercept` 方法，**执行动态代理的方法**



## AOP 代理工厂


### 1. 测试代码

```java
@Test
public void testProxyFactory() {
    // 使用 JDK 动态代理
    advisedSupport.setProxyTargetClass(false);
    WorldService proxy = (WorldService) new ProxyFactory(advisedSupport).getProxy();
    proxy.explode();

    // 使用 Cglib 动态代理
    advisedSupport.setProxyTargetClass(true);
    proxy = (WorldService) new ProxyFactory(advisedSupport).getProxy();
    proxy.explode();
}
```

### 2. AOP 代理工厂代码

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
            return new CglibAopProxy(advisedSupport);
        }

        return new JdkDynamicAopProxy(advisedSupport);
    }
}
```

注意到切换 `JDK` 和 `Cglib` 动态代理之间的关键是 `AdvisedSupport` 的 `proxyTargetClass` 参数

* `proxyTargetClass` 为 `false` 代表使用 `JDK` 动态代理
* `proxyTargetClass` 为 `true` 代表使用 `Cglib` 动态代理

而 `AdvisedSupport` 的 `proxyTargetClass` 参数 **默认值** 为 `false`，即默认使用 `JDK` 动态代理 ***(不过好像现在的 spring 默认全部调用 `cglib` 了？)***



## 几种常用的Advice：BeforeAdvice/AfterAdvice/AfterReturningAdvice/ThrowsAdvice...

`Spring` 将 `AOP` 联盟中的 `Advice` 细化出各种类型的 `Advice`，常用的有`BeforeAdvice/AfterAdvice/AfterReturningAdvice/ThrowsAdvice`，我们可以通过扩展`MethodInterceptor`来实现。


测试代码

```java
public class WorldServiceBeforeAdvice implements MethodBeforeAdvice {

	@Override
	public void before(Method method, Object[] args, Object target) throws Throwable {
		System.out.println("BeforeAdvice: do something before the earth explodes");
	}
}
```


```java
@Test
public void testBeforeAdvice() throws Exception {
    //设置BeforeAdvice
    WorldServiceBeforeAdvice beforeAdvice = new WorldServiceBeforeAdvice();
    MethodBeforeAdviceInterceptor methodInterceptor = new MethodBeforeAdviceInterceptor(beforeAdvice);
    advisedSupport.setMethodInterceptor(methodInterceptor);

    WorldService proxy = (WorldService) new ProxyFactory(advisedSupport).getProxy();
    proxy.explode();
}
```

简单来说，就是通过规范 `Interceptor` 分类，根据需要的**代理时机**选择对应的 `Advice` 和 `Interceptor` 即可，相对简单，不过多赘述


## Spring AOP 拦截器链

虽然在前面我们完成了对方法的增强，但并不完美。我们的目前的代码只能支持对方法的单个增强。作为spring的核心功能如果不支持多切面的话有点太别扭了。`spring`利用了**拦截器链**来完成了对多个切面的支持。

#### ProxyFactory

让我们从 `ProxyFactory` 开始，来看一下代理对象的整个创建流程。至于为什么从 `ProxyFactory`开，这是因为代理对象最终是用 `ProxyFactory` 的 `getProxy()` 函数来获得的。

```java
public class ProxyFactory extends AdvisedSupport{


	public ProxyFactory() {
	}

	public Object getProxy() {
		return createAopProxy().getProxy();
	}

	private AopProxy createAopProxy() {
		if (this.isProxyTargetClass()||this.getTargetSource().getTargetClass().length==0) {
			return new CglibAopProxy(this);
		}
		return new JdkDynamicAopProxy(this);
	}
}
```

为了更贴合`spring`的实现，这里更改了 `ProxyFactory` 使其**继承**了 `AdvisedSupport`，正如spring源码中做的那样。

---

#### 基于JDK动态代理

`ProxyFactory` 只是简单的做了下选择，当我们**设置 `proxyTargetClass` 属性**或者**被代理对象没有接口时**会调用 `cjlib` 动态代理，否则调用 `jdk` 动态代理。二者实现并没有太大区别，这里只贴出jdk动态代理的实现。

```java
	public Object getProxy() {
		return Proxy.newProxyInstance(getClass().getClassLoader(), advised.getTargetSource().getTargetClass(), this);
	}

	@Override
	public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
		// 获取目标对象
		Object target=advised.getTargetSource().getTarget();
		Class<?> targetClass = target.getClass();
		Object retVal = null;
		// 获取拦截器链
		List<Object> chain = this.advised.getInterceptorsAndDynamicInterceptionAdvice(method, targetClass);
		if(chain==null||chain.isEmpty()){
			return method.invoke(target, args);
		}else{
			// 将拦截器统一封装成ReflectiveMethodInvocation
			MethodInvocation invocation =
					new ReflectiveMethodInvocation(proxy, target, method, args, targetClass, chain);
			// Proceed to the joinpoint through the interceptor chain.
			// 执行拦截器链
			retVal = invocation.proceed();
		}
		return retVal;
	}
```

jdk动态代理可以分为**获取拦截器链，将拦截器统一封装成 `ReflectiveMethodInvocation`，执行拦截器链**三部分。我们来逐一看一下这三部分。

---

##### 1. 获取拦截器链

首先将获取到所有与当前`method`匹配的`advice`**(增强)**，跟踪`getInterceptorsAndDynamicInterceptionAdvice`代码，我们发现`Spring AOP`也使用**缓存**进行提高性能，如果该方法已经获取过拦截器，则直接取缓存，否则通过`advisorChainFactory`获取拦截器链。

`AdvisorChainFactory`是用来获得拦截器链接口。它的一个实现类为`DefaultAdvisorChainFactory`

`AdvisedSupport#getInterceptorsAndDynamicInterceptionAdvice`：

```java
	public List<Object> getInterceptorsAndDynamicInterceptionAdvice(Method method, Class<?> targetClass) {
		Integer cacheKey=method.hashCode();
		List<Object> cached = this.methodCache.get(cacheKey);
		if (cached == null) {
			cached = this.advisorChainFactory.getInterceptorsAndDynamicInterceptionAdvice(
					this, method, targetClass);
			this.methodCache.put(cacheKey, cached);
		}
		return cached;
	}
```

<br/>

接下来，对`advisorChainFactory`获取拦截器链进行解读。


整体代码并不复杂，首先获取所有`Advisor`**(切面)**，通过`pointcutAdvisor.getPointcut().getClassFilter().matches(actualClass)`校验当前代理对象是否匹配该`Advisor`，再通过`pointcutAdvisor.getPointcut().getMethodMatcher()`校验**是否匹配**当前调用`method`。

如果通过校验，则提取`advisor`中的`interceptors`增强，添加到`interceptorList`中。

这里可能有读者会疑惑，明明是要获取`MethodInterceptor`，可`AdvisedSupport`的`getAdvice()`返回的是`Advice`**(增强)**,其实如果我们点开`MethodInterceptor`的源码，我们会发现`MethodInterceptor`继承了`Interceptor`接口，而`Interceptor`又继承了`Advice`接口。因为这里的`Advice`和`MethodInterceptor`我们都是用的`AOP`联盟的接口，所以特此说明一下。

`DefultAdvisorChainFactory#getInterceptorsAndDynamicInterceptionAdvice`

```java
public List<Object> getInterceptorsAndDynamicInterceptionAdvice(AdvisedSupport config, Method method, Class<?> targetClass) {
        Advisor[] advisors = config.getAdvisors().toArray(new Advisor[0]);
        List<Object> interceptorList = new ArrayList<>(advisors.length);
        Class<?> actualClass = (targetClass != null ? targetClass : method.getDeclaringClass());
        for (Advisor advisor : advisors) {
            if (advisor instanceof PointcutAdvisor) {
                // Add it conditionally.
                PointcutAdvisor pointcutAdvisor = (PointcutAdvisor) advisor;
                // 校验当前Advisor是否适用于当前对象
                if (pointcutAdvisor.getPointcut().getClassFilter().matches(actualClass)) {
                    MethodMatcher mm = pointcutAdvisor.getPointcut().getMethodMatcher();
                    boolean match;
                    // 校验Advisor是否应用到当前方法上
                    match = mm.matches(method,actualClass);
                    if (match) {
                        MethodInterceptor interceptor = (MethodInterceptor) advisor.getAdvice();
                            interceptorList.add(interceptor);
                    }
                }
            }
        }
        return interceptorList;
    }
```

##### 2.将拦截器封装成ReflectiveMethodInvocation

这里也是重写了`ReflectiveMethodInvocation`的实现，来支持多切面。

```java
	public ReflectiveMethodInvocation(Object proxy,Object target, Method method, Object[] arguments,Class<?> targetClass,List<Object> chain) {
		this.proxy=proxy;
		this.target = target;
		this.method = method;
		this.arguments = arguments;
		this.targetClass=targetClass;
		this.interceptorsAndDynamicMethodMatchers=chain;
	}
```



##### 3.执行拦截器链

spring能够保证**多个切面同时匹配同一方法的而不出现乱序**的关键就在下面一段代码了。

`ReflectiveMethodInvocation#proceed()`

```java
	public Object proceed() throws Throwable {
		// 初始currentInterceptorIndex为-1，每调用一次proceed就把currentInterceptorIndex+1
		if (this.currentInterceptorIndex == this.interceptorsAndDynamicMethodMatchers.size() - 1) {
			// 当调用次数 = 拦截器个数时
			// 触发当前method方法
			return method.invoke(this.target, this.arguments);
		}

		Object interceptorOrInterceptionAdvice =
				this.interceptorsAndDynamicMethodMatchers.get(++this.currentInterceptorIndex);
		// 普通拦截器，直接触发拦截器invoke方法
		return ((MethodInterceptor) interceptorOrInterceptionAdvice).invoke(this);
	}
```

我们看到，`MethodInvocation`只是简单的将拦截器链的所有拦截器一一执行，最后再触发当前的`method`方法。

这是很简单高效的方法，但问题是我们希望某些增强比如`AfterReturningAdvice`能够在方法**执行完**才被执行，这就涉及到**不同增强的执行顺序**的问题了。

而`MethodInvocation`显然没有考虑顺序的问题，一个`AfterReturningAdvice`很可能在`BeforeAdvice`之前被调用。那么该如何保证顺序问题呢？

答案是，**控制增强的调用顺序其实由每个拦截器负责**，所以我们需要分析`MethodBeforeAdviceInterceptor`和`AfterReturningAdviceInterceptor`

```java
public class MethodBeforeAdviceInterceptor implements MethodInterceptor, BeforeAdvice {

	private MethodBeforeAdvice advice;

	public MethodBeforeAdviceInterceptor() {
	}

	public MethodBeforeAdviceInterceptor(MethodBeforeAdvice advice) {
		this.advice = advice;
	}

	public void setAdvice(MethodBeforeAdvice advice) {
		this.advice = advice;
	}

	@Override
	public Object invoke(MethodInvocation mi) throws Throwable {
		this.advice.before(mi.getMethod(), mi.getArguments(), mi.getThis());
		return mi.proceed();
	}
}
```

```java
public class AfterReturningAdviceInterceptor implements MethodInterceptor, AfterAdvice {

    private AfterReturningAdvice advice;

    public AfterReturningAdviceInterceptor() {
    }

    public AfterReturningAdviceInterceptor(AfterReturningAdvice advice) {
        this.advice = advice;
    }

    @Override
    public Object invoke(MethodInvocation methodInvocation) throws Throwable {
       Object retVal = methodInvocation.proceed();
       this.advice.afterReturning(retVal, methodInvocation.getMethod(), methodInvocation.getArguments(), methodInvocation.getThis());
       return retVal;
    }
}
```

看了源码大家应该就清楚了，**拦截器链执行的顺序**正时在各个拦截器的`invoke`方法中实现的。`before`会**先执行`advice`增强方法再链式调用**，而`after`则是**先执行链式调用，再调用`advice`增强方法**，也就是一个**递归**的过程。和二叉树的遍历有些异曲同工之处。

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2024/12/26/17350539252278.jpg)


### 测试

```java
@Before
public void setup() {
    WorldService worldService = new WorldServiceImpl();
    advisedSupport = new ProxyFactory();
    //Advisor是Pointcut和Advice的组合
    String expression = "execution(* test.aop.bean.WorldService.explode(..))";
    AspectJExpressionPointcutAdvisor advisor = new AspectJExpressionPointcutAdvisor();
    advisor.setExpression(expression);
    AfterReturningAdviceInterceptor methodInterceptor = new AfterReturningAdviceInterceptor(new WorldServiceAfterReturnAdvice());
    advisor.setAdvice(methodInterceptor);
    TargetSource targetSource = new TargetSource(worldService);
    advisedSupport.setTargetSource(targetSource);
    advisedSupport.addAdvisor(advisor);
}

@Test
public void testBeforeAdvice() throws Exception {
    //设置BeforeAdvice
    String expression = "execution(* test.aop.bean.WorldService.explode(..))";
    AspectJExpressionPointcutAdvisor advisor = new AspectJExpressionPointcutAdvisor();
    advisor.setExpression(expression);
    MethodBeforeAdviceInterceptor methodInterceptor = new MethodBeforeAdviceInterceptor(new WorldServiceBeforeAdvice());
    advisor.setAdvice(methodInterceptor);
    advisedSupport.addAdvisor(advisor);
    ProxyFactory factory = (ProxyFactory) advisedSupport;
    WorldService proxy = (WorldService) factory.getProxy();
    proxy.explode();
}
```


## PointcutAdvisor：Pointcut和Advice的组合

`Advisor`是包含一个`Pointcut`和一个`Advice`的组合，`Pointcut`用于捕获`JoinPoint`，`Advice`决定在`JoinPoint`执行某种操作。实现了一个支持`aspectj`表达式的`AspectJExpressionPointcutAdvisor`。


```java
public class DynamicProxyTest {

	@Test
	public void testAdvisor() throws Exception {
		WorldService worldService = new WorldServiceImpl();

		//Advisor是Pointcut和Advice的组合
		String expression = "execution(* org.springframework.test.service.WorldService.explode(..))";
		AspectJExpressionPointcutAdvisor advisor = new AspectJExpressionPointcutAdvisor();
		advisor.setExpression(expression);
		MethodBeforeAdviceInterceptor methodInterceptor = new MethodBeforeAdviceInterceptor(new WorldServiceBeforeAdvice());
		advisor.setAdvice(methodInterceptor);

		ClassFilter classFilter = advisor.getPointcut().getClassFilter();
		if (classFilter.matches(worldService.getClass())) {
			AdvisedSupport advisedSupport = new AdvisedSupport();
			TargetSource targetSource = new TargetSource(worldService);
			advisedSupport.setTargetSource(targetSource);
			advisedSupport.setMethodInterceptor((MethodInterceptor) advisor.getAdvice());
			advisedSupport.setMethodMatcher(advisor.getPointcut().getMethodMatcher());
//			advisedSupport.setProxyTargetClass(true);   //JDK or CGLIB

			WorldService proxy = (WorldService) new ProxyFactory(advisedSupport).getProxy();
			proxy.explode();
		}
	}
}
```


## 动态代理融入Bean的生命周期

`BeanPostProcessor`处理阶段可以修改和替换`bean`，正好可以在此阶段返回**代理对象替换原对象**。不过我们引入一种特殊的`BeanPostProcessor`——`InstantiationAwareBeanPostProcessor`，如果`InstantiationAwareBeanPostProcessor`处理阶段返回代理对象，会导致**短路**，不会继续走原来的创建bean的流程，具体实现查看`AbstractAutowireCapableBeanFactory#resolveBeforeInstantiation`。

`DefaultAdvisorAutoProxyCreator`是处理横切逻辑的织入返回代理对象的`InstantiationAwareBeanPostProcessor`实现类，当对象实例化时，生成代理对象并返回。

**至此，bean的生命周期如下** 

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2024/12/26/17351281696197.jpg)



