---
title: Volatile与指令重排
authors: [cangjingyue]
tags: 
    - java
    - JUC
categories:
  - java
---

# Volatile与指令重排

## 1. 引入

```java
public class VolatileTest {
    static boolean flag = false;

    public static void main(String[] args) {
        new Thread(() -> {
            while (!flag) {
            }
            log.debug("修改成功");
        }).start();

        Thread.sleep(1000);
        log.debug("修改 flag");
        flag = true;
    }
}
```

这个例子很好理解， `main` 函数里启动一个线程，其 `run` 方法是一个以 flag 为标志位的无限循环。如果 flag 为 true 则跳出循环。

当 `main` 执行到最后一行的时候，flag 被置为 true，按逻辑分析此时线程该结束，即整个程序执行完毕。

执行一下看看是什么结果？结果是令人惊讶的，程序始终也不会结束。`main`是肯定结束了的，其原因就是线程的run方法未结束，**即run方法中的flag仍然为false**。

把第3行加上volatile修饰符，即

```java
static volatile boolean flag = false;
```

再执行一遍看看？结果是程序正常退出，volatile生效了。

我们再修改一下。去掉volatile关键字，恢复到起始的例子，然后把`while(!flag){}`改为`while(!flag){System.out.println(1);}`，再执行一下看看。按分析，没有volatile关键字的时候，程序不会执行结束，虽然加上了打印语句，但没有做任何的关键字/逻辑的修改，应该程序也不会结束才对，但执行结果却是：**程序正常结束**。

有了这些感性认识，我们再来分析volatile的语义以及它的作用。

## 2. volatile 特性

volatile 是 Java 虚拟机提供的**轻量级**的同步机制（三大特性）

- 保证可见性
- 不保证原子性
- 保证有序性（禁止指令重排）

性能：volatile 修饰的变量进行读操作与普通变量几乎没什么差别，但是写操作相对慢一些，因为需要在本地代码中插入很多内存屏障来保证指令不会发生乱序执行，但是开销比锁要小

synchronized 无法禁止指令重排和处理器优化，为什么可以保证有序性可见性

- 加了锁之后，只能有一个线程获得到了锁，获得不到锁的线程就要阻塞，所以同一时间只有一个线程执行，相当于单线程，由于数据依赖性的存在，单线程的指令重排是没有问题的
- 线程加锁前，将**清空工作内存**中共享变量的值，使用共享变量时需要从主内存中重新读取最新的值；线程解锁前，必须把共享变量的最新值**刷新到主内存**中

### 2.1 可见性

volatile的第一条语义是保证线程间变量的**可见性**，简单地说就是当线程A对变量X进行了修改后，在线程A后面执行的其他线程能看到变量X的变动，更详细地说是要符合以下两个规则：

- **线程对变量进行修改之后，要立刻回写到主内存。**
- **线程对变量读取的时候，要从主内存中读，而不是缓存。**

要详细地解释这个问题，就不得不提一下**Java的内存模型(Java Memory Model,简称JMM)**

Java 内存模型是 Java Memory Model（JMM），本身是一种**抽象的概念**，实际上并不存在，描述的是一组规则或规范，通过这组规范定义了程序中各个变量（包括实例字段，静态字段和构成数组对象的元素）的访问方式

JMM 作用：

- 屏蔽各种硬件和操作系统的内存访问差异，实现让 Java 程序在各种平台下都能达到一致的内存访问效果
- 规定了线程和内存之间的一些关系

根据 JMM 的设计，系统存在一个主内存（Main Memory），Java 中所有变量都存储在主存中，对于所有线程都是共享的；每条线程都有自己的工作内存（Working Memory），各线程的工作内存间彼此独立、互不可见，工作内存中保存的是主存中某些**变量的拷贝**，线程对所有变量的操作都是先对变量进行拷贝，然后在工作内存中进行，不能直接操作主内存中的变量；线程之间无法相互直接访问，线程间的通信（传递）必须通过主内存来完成。

在线程启动的时候，虚拟机为每个内存分配一块工作内存，不仅包含了线程内部定义的局部变量，也包含了线程所需要使用的共享变量(非线程内构造的对象)的副本，即为了提高执行效率，读取副本比直接读取主内存更快(这里可以简单地将主内存理解为虚拟机中的堆，而工作内存理解为栈(或称为虚拟机栈)，栈是连续的小空间、顺序入栈出栈，而堆是不连续的大空间，所以在栈中寻址的速度比堆要快很多)

![image.png](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/picgo/20250305133753.png)

对于共享普通变量来说，约定了变量在工作内存中发生变化了之后，必须要回写到主内存(**迟早要回写但并非马上回写**)，但对于**volatile变量**则要求工作内存中发生变化之后，必须**马上**回写到主内存，而线程读取**volatile变量**的时候，必须**马上**到主内存中去取最新值而不是读取本地工作内存的副本，此规则保证了前面所说的“当线程A对变量X进行了修改后，在线程A后面执行的其他线程能看到变量X的变动”。

### 2.2 不保证原子性

上面提到**volatile**保证了线程间共享变量的**及时可见性**，但整个过程并没有保证同步，这是与volatile的使命有关的，创造它的背景就是在某些情况下可以代替synchronized实现可见性的目的，规避synchronized带来的线程挂起、调度的开销。如果volatile也能保证同步，那么它就是个锁，可以完全取代synchronized了。从这点看，volatile不可能保证同步，也正基于上面的原因，随着synchronized性能逐渐提高，volatile逐渐退出历史舞台。

为什么volatile不能保证原子性？以下面这个例子为例。

```java
volatile i = 0;
new Thread(() -> {i++});
new Thread(() -> {i--});
```

i++虽然仅为 1 行代码，但是其反编译为字节码之后本质上是 3 条指令，包括**读取、操作、赋值**三个操作，所以并不是一个原子操作

```java
0: iconst_1			// 当int取值 -1~5 时，JVM采用iconst指令将常量压入栈中
1: istore_1			// 将操作数栈顶数据弹出，存入局部变量表的 slot 1
2: iinc		1, 1	
```

下面是两个线程的操作顺序 

![image.png](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/picgo/20250305140953.png)

假如说线程A在做了i+1，但未赋值的时候，线程B就开始读取i，那么当线程A赋值i=1，并回写到主内存，而此时线程B已经不再需要i的值了，而是直接交给处理器去做-1的操作，于是当线程B执行完并回写到主内存，i的值为-1，而不是预期的 0。也就是说，volatile缩短了普通变量在不同线程之间执行的时间差，但仍然存有漏洞，依然不能保证原子性。

这里必须要提的是，之前所说的 ***“各线程的工作内存间彼此独立、互不可见，在线程启动的时候，虚拟机为每个内存分配一块工作内存，不仅包含了线程内部定义的局部变量，也包含了线程所需要使用的共享变量(非线程内构造的对象)的副本，即为了提高执行效率”*** 并不准确。

如今的volatile的例子已经是很难重现，如本文开头时只有在while死循环时才体现出volatile的作用，哪怕只是加了 `System.out.println(1)` 这么一小段，普通变量也能达到volatile的效果，这是什么原因呢？

**原来只有在对变量读取频率很高的情况下，虚拟机才不会及时回写主内存，而当频率没有达到虚拟机认为的高频率时，普通变量和volatile是同样的处理逻辑**。

如在每个循环中执行 `System.out.println(1) ` 加大了读取变量的时间间隔，使虚拟机认为读取频率并不那么高，所以实现了和 volatile 相同的效果。volatile的效果在jdk1.2及之前很容易重现，但随着虚拟机的不断优化，如今的普通变量的可见性已经不是那么严重的问题了，这也是volatile如今确实不太有使用场景的原因吧。

### 2.3 有序性 (禁止指令重排)

volatile 修饰的变量，可以禁用指令重排

#### 指令重排实例

- example 1：

  ```java
  public void mySort() {
  	int x = 11;	//语句1
  	int y = 12;	//语句2  谁先执行效果一样
  	x = x + 5;	//语句3
  	y = x * x;	//语句4
  }
  ```

  执行顺序是：1 2 3 4、2 1 3 4、1 3 2 4

  指令重排也有限制不会出现：4321，语句 4 需要依赖于 y 以及 x 的申明，因为存在数据依赖，无法首先执行

---

- example 2：

  ```java
  int num = 0;
  boolean ready = false;
  // 线程1 执行此方法
  public void actor1(I_Result r) {
      if(ready) {
      	r.r1 = num + num;
      } else {
      	r.r1 = 1;
      }
  }
  // 线程2 执行此方法
  public void actor2(I_Result r) {
  	num = 2;
  	ready = true;
  }
  ```

  情况一：线程 1 先执行，ready = false，结果为 r.r1 = 1

  情况二：线程 2 先执行 num = 2，但还没执行 ready = true，线程 1 执行，结果为 r.r1 = 1

  情况三：线程 2 先执行 ready = true，线程 1 执行，进入 if 分支结果为 r.r1 = 4

  情况四：线程 2 执行 ready = true，切换到线程 1，进入 if 分支为 r.r1 = 0，再切回线程 2 执行 num = 2，发生指令重排

---

#### 什么是指令重排序？

有两个层面：

- 在虚拟机层面，为了尽可能减少内存操作速度远慢于CPU运行速度所带来的CPU空置的影响，虚拟机会按照自己的一些规则(这规则后面再叙述)将程序编写顺序打乱——即写在后面的代码在时间顺序上可能会先执行，而写在前面的代码会后执行——以尽可能充分地利用CPU。拿上面的例子来说：假如不是 `num = 2` 的操作，而是 ` num = new byte[1024*1024]` (分配1M空间)，那么它会运行地很慢，此时CPU是等待其执行结束呢，还是先执行下面那句 `flag=true` 呢？显然，先执行 `flag=true` 可以提前使用CPU，加快整体效率，当然这样的前提是不会产生错误。显然这里有两种情况：后面的代码先于前面的代码**开始**执行；前面的代码先开始执行，但当效率较慢的时候，后面的代码开始执行并先于前面的代码执行结束。不管谁先开始，总之后面的代码在一些情况下存在先结束的可能。
- 在硬件层面，CPU会将接收到的一批指令按照其规则重排序，同样是基于CPU速度比缓存速度快的原因，和上一点的目的类似，只是硬件处理的话，每次只能在接收到的有限指令范围内重排序，而虚拟机可以在更大层面、更多指令范围内重排序。

---

#### 底层原理

使用 volatile 修饰的共享变量，底层通过汇编 `lock` 前缀指令进行缓存锁定，在线程修改完共享变量后写回主存，其他的 CPU 核心上运行的线程通过 CPU 总线嗅探机制会修改其共享变量为失效状态，读取时会重新从主内存中读取最新的数据

lock 前缀指令就相当于内存屏障，Memory Barrier（Memory Fence）

- **对 volatile 变量的写指令后会加入写屏障**
- **对 volatile 变量的读指令前会加入读屏障**

内存屏障有三个作用：

- **确保对内存的读-改-写操作原子执行**
- **阻止屏障两侧的指令重排序**
- **强制把缓存中的脏数据写回主内存，让缓存行中相应的数据失效**

#### 内存屏障

**1. 保证可见性**

- 写屏障（sfence，Store Barrier）保证在该屏障之前的，对共享变量的改动，都同步到主存当中

  ```java
  public void actor2(I_Result r) {
      num = 2;
      ready = true; // ready 是 volatile 赋值带写屏障
      // 写屏障
  }
  ```

- 读屏障（lfence，Load Barrier）保证在该屏障之后的，对共享变量的读取，从主存刷新变量值，加载的是主存中最新数据

  ```java
  public void actor1(I_Result r) {
      // 读屏障
      // ready 是 volatile 读取值带读屏障
      if(ready) {
      	r.r1 = num + num;
      } else {
      	r.r1 = 1;
      }
  }
  ```

![image.png](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/picgo/20250305144050.png)

- 全能屏障：mfence（modify/mix Barrier），兼具 sfence 和 lfence 的功能

**2. 保证有序性**

- 写屏障会确保指令重排序时，不会将写屏障之前的代码排在写屏障之后
- 读屏障会确保指令重排序时，不会将读屏障之后的代码排在读屏障之前

**3. 不能解决指令交错**

- 写屏障仅仅是保证之后的读能够读到最新的结果，但不能保证其他线程的读跑到写屏障之前
- 有序性的保证也只是保证了本线程内相关代码不被重排序

## 3. volatile 应用场景

### 3.1 双端检锁

**Double-Checked Locking：双端检锁机制**

DCL（双端检锁）机制不一定是线程安全的，原因是有**指令重排**的存在，加入 volatile 可以禁止指令重排，详细原因看下文。

```java
public final class Singleton {
    private Singleton() { }
    private static Singleton INSTANCE = null;
    
    public static Singleton getInstance() {
        if(INSTANCE == null) { // t2，这里的判断不是线程安全的
            // 首次访问会同步，而之后的使用没有 synchronized
            synchronized(Singleton.class) {
                // 这里是线程安全的判断，防止其他线程在当前线程等待锁的期间完成了初始化
                if (INSTANCE == null) { 
                    INSTANCE = new Singleton();
                }
            }
        }
        return INSTANCE;
    }
}
```

不锁 INSTANCE 的原因：

- INSTANCE 要重新赋值
- INSTANCE 是 null，线程加锁之前需要获取对象的引用，设置对象头，null 没有引用

实现特点：

- 懒惰初始化
- 首次使用 getInstance() 才使用 synchronized 加锁，后续使用时无需加锁
- 第一个 if 使用了 INSTANCE 变量，是在同步块之外，但在多线程环境下会产生问题

---

### 3.2 DCL 问题

getInstance 方法对应的字节码为：

```java
0: 	getstatic 		#2 		// Field INSTANCE:Ltest/Singleton;
3: 	ifnonnull 		37
6: 	ldc 			#3 		// class test/Singleton
8: 	dup
9: 	astore_0
10: monitorenter
11: getstatic 		#2 		// Field INSTANCE:Ltest/Singleton;
14: ifnonnull 27
17: new 			#3 		// class test/Singleton
20: dup
21: invokespecial 	#4 		// Method "<init>":()V
24: putstatic 		#2 		// Field INSTANCE:Ltest/Singleton;
27: aload_0
28: monitorexit
29: goto 37
32: astore_1
33: aload_0
34: monitorexit
35: aload_1
36: athrow
37: getstatic 		#2 		// Field INSTANCE:Ltest/Singleton;
40: areturn
```

- 17 表示创建对象，将对象引用入栈
- 20 表示复制一份对象引用，引用地址
- 21 表示利用一个对象引用，调用构造方法初始化对象
- 24 表示利用一个对象引用，赋值给 static INSTANCE

**步骤 21 和 24 之间不存在数据依赖关系**，而且无论重排前后，程序的执行结果在单线程中并没有改变，因此这种重排优化是允许的

- 关键在于 0:getstatic 这行代码在 monitor 控制之外，可以越过 monitor 读取 INSTANCE 变量的值
- 当其他线程访问 INSTANCE 不为 null 时，由于 INSTANCE 实例未必已初始化，那么 t2 拿到的是将是一个未初始化完毕的单例返回，这就造成了线程安全的问题

![image.png](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/picgo/20250305150743.png)

### 3.3 解决办法

指令重排只会保证串行语义的执行一致性（单线程），但并不会关系多线程间的语义一致性

引入 volatile，来保证禁止出现指令重排的问题，从而保证单例模式的线程安全性：

```java
private static volatile SingletonDemo INSTANCE = null;
```

引入 volatile 后，字节码层面如下所示：

```java
// ---------------------------------> 加入对 INSTANCE 变量的读屏障
0: 	getstatic 		#2 		// Field INSTANCE:Ltest/Singleton;
3: 	ifnonnull 		37
6: 	ldc 			#3 		// class test/Singleton
8: 	dup
9: 	astore_0
10: monitorenter // ----------------> 保证原子性、可见性
11: getstatic 		#2 		// Field INSTANCE:Ltest/Singleton;
14: ifnonnull 27
17: new 			#3 		// class test/Singleton
20: dup
21: invokespecial 	#4 		// Method "<init>":()V
24: putstatic 		#2 		// Field INSTANCE:Ltest/Singleton;
// ---------------------------------> 加入对 INSTANCE 变量的写屏障
27: aload_0
28: monitorexit // ----------------> 保证原子性、可见性
29: goto 37
32: astore_1
33: aload_0
34: monitorexit
35: aload_1
36: athrow
37: getstatic 		#2 		// Field INSTANCE:Ltest/Singleton;
40: areturn
```

最终效果如下图所示

![image.png](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/picgo/20250305151444.png)
