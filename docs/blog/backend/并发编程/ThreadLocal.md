---
title: ThreadLocal
authors: [cangjingyue]
tags: 
    - java
    - JUC
categories:
  - java
---

# ThreadLocal

## 1. 简介

ThreadLocal提供线程局部变量。这些变量与正常的变量**不同**，因为每一个线程在访问ThreadLocal实例的时候（通过其get或set方法）都有**自己的、独立初始化的变量副本**。ThreadLocal实例通常是类中的私有静态字段，使用它的目的是希望将状态（例如，用户ID或事物ID）与线程关联起来。

ThreadLocal实现**每一个线程都有自己专属的本地变量副本**（自己用自己的变量不用麻烦别人，不和其他人共享，人人有份，人各一份）。主要解决了让每个线程绑定自己的值，通过使用get()和set()方法，获取默认值或将其改为当前线程所存的副本的值从而**避免了线程安全问题**。

## 2. API

[ThreadLocal - Java17中文文档 - API参考文档 - 全栈行动派](https://doc.qzxdp.cn/jdk/17/zh/api/java.base/java/lang/ThreadLocal.html)

![image.png](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/picgo/20250315141252.png)

## 3. 使用案例

需求：每一个销售自己售卖房子，最后统一汇总

```java
@Slf4j(topic = "c.ThreadLocalTest1")
public class ThreadLocalTest1 {

    public static void main(String[] args) throws InterruptedException {
        threadNew();
    }

    private static void threadNew() throws InterruptedException {
        House house = new House();
        AtomicInteger cnt = new AtomicInteger();
        for (int i = 0; i < 5; i++) {
            new Thread(() -> {
                try {
                    for (int j = 0; j < 5; j++) {
                        house.sale();
                    }
                    log.debug("{}卖出{}套房子", Thread.currentThread().getName(), house.saleCount.get());
                    cnt.addAndGet(house.saleCount.get());
                } finally {
                    house.saleCount.remove();
                }
            }, "t" + i).start();
        }

        TimeUnit.SECONDS.sleep(1);
        log.debug("共计卖出{}套房子", cnt.get());
    }
}

class House {
    ThreadLocal<Integer> saleCount = ThreadLocal.withInitial(() -> 0);

    public void sale() {
        saleCount.set(saleCount.get() + 1);
    }
}
```

如果没有 `try-finally` 在 `finally` 块中释放掉线程变量，并使用线程池，会导致内存泄漏和线程安全问题

代码演示如下:

```java
@Slf4j(topic = "c.ThreadLocalTest1")
public class ThreadLocalTest1 {

    public static void main(String[] args) throws InterruptedException {
        threadPool();
    }

    private static void threadPool() throws InterruptedException {
        ExecutorService executor = Executors.newFixedThreadPool(3);
        House house = new House();
        AtomicInteger cnt = new AtomicInteger();
        for (int i = 0; i < 5; i++) {
            executor.submit(() -> {
                // 每人卖 5 套
                for (int j = 0; j < 5; j++) {
                    house.sale();
                }
                log.debug("{}卖出{}套房子", Thread.currentThread().getName(), house.saleCount.get());
                cnt.addAndGet(house.saleCount.get());
                // 去掉 try-finally 演示内存泄漏问题
            });
        }

        TimeUnit.SECONDS.sleep(1);
        log.debug("共计卖出{}套房子", cnt.get());
        executor.shutdown();
    }
}

class House {
    ThreadLocal<Integer> saleCount = ThreadLocal.withInitial(() -> 0);

    public void sale() {
        saleCount.set(saleCount.get() + 1);
    }
}
```

结果: 发生了线程安全问题

```bash
14:31:27.723 c.ThreadLocalTest1 [main] - ===============================
14:31:27.727 c.ThreadLocalTest1 [pool-1-thread-1] - pool-1-thread-1卖出5套房子
14:31:27.727 c.ThreadLocalTest1 [pool-1-thread-2] - pool-1-thread-2卖出5套房子
14:31:27.727 c.ThreadLocalTest1 [pool-1-thread-3] - pool-1-thread-3卖出5套房子
14:31:27.727 c.ThreadLocalTest1 [pool-1-thread-2] - pool-1-thread-2卖出10套房子
14:31:27.727 c.ThreadLocalTest1 [pool-1-thread-1] - pool-1-thread-1卖出10套房子
14:31:28.729 c.ThreadLocalTest1 [main] - 共计卖出35套房子
```

## 4. 源码分析

### 4.1 类与类的关系

代码位置： `java.lang.Thread`

```java
public class Thread implements Runnable {
	...
	/* ThreadLocal values pertaining to this thread. This map is maintained
     * by the ThreadLocal class. */
    ThreadLocal.ThreadLocalMap threadLocals = null;
	...
}
```

代码位置: `java.lang.ThreadLocal.ThreadLocalMap`

```java
 static class ThreadLocalMap {
	/**
	 * The entries in this hash map extend WeakReference, using
	 * its main ref field as the key (which is always a
	 * ThreadLocal object).  Note that null keys (i.e. entry.get()
	 * == null) mean that the key is no longer referenced, so the
	 * entry can be expunged from table.  Such entries are referred to
	 * as "stale entries" in the code that follows.
	 */
	static class Entry extends WeakReference<ThreadLocal<?>> {
		/** The value associated with this ThreadLocal. */
		Object value;

		Entry(ThreadLocal<?> k, Object v) {
			super(k);
			value = v;
		}
	}
	...
}
```

关系图如下： 

![ThreadLocal.png](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/picgo/ThreadLocal.png)


---

### 4.2 get

代码位置: `java.lang.ThreadLocal#get`

```java
public T get() {
    Thread t = Thread.currentThread();  // 获取当前线程
    ThreadLocalMap map = getMap(t);     // 获取当前线程的 ThreadLocalMap
    if (map != null) {
        ThreadLocalMap.Entry e = map.getEntry(this); // 查找当前 ThreadLocal 变量的值
        if (e != null) {
            @SuppressWarnings("unchecked")
            T result = (T)e.value;
            return result;  // 如果找到，返回存储的值
        }
    }
    return setInitialValue();  // 如果未找到，则初始化一个默认值
}
```

1. **获取当前线程**，因为 ThreadLocal 变量是线程隔离的，每个线程都维护自己的 ThreadLocalMap。
2. **查找当前线程的 ThreadLocalMap**，该 map 存储了当前线程所有的 ThreadLocal 变量。
3. **如果 map 为空或没有找到该 ThreadLocal 的值**，调用 setInitialValue() 进行初始化。

---

### 4.3 set

代码位置: `java.lang.ThreadLocal#set`

```java
public void set(T value) {
    Thread t = Thread.currentThread();  // 获取当前线程
    ThreadLocalMap map = getMap(t);     // 获取当前线程的 ThreadLocalMap
    if (map != null) {
        map.set(this, value);  // 如果 ThreadLocalMap 存在，则设置值
    } else {
        createMap(t, value);   // 如果 ThreadLocalMap 不存在，则创建新的 map 并存入值
    }
}
```

1. **获取当前线程**，确保数据仅存储在当前线程的上下文中。
2. **获取当前线程的 ThreadLocalMap**：

	- **如果 map 存在**，则直接将 value 存入。
	
	- **如果 map 不存在**，说明当前线程尚未存储任何 ThreadLocal 变量，则调用 createMap() 创建并存入值。

---

### 4.4 总结

![ThreadLocal.drawio.png](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/picgo/ThreadLocal.drawio.png)


- ThreadLocal 是一个**壳子**，真正的存储结构是 ThreadLocal 里的 **ThreadLocalMap (静态内部类，用 Entry 存储)**，每个 Thread 对象维护着一个 ThreadLocalMap 的引用。
- 当调用 `ThreadLocal.set()` 方法时，本质上是往 ThreadLocalMap 中设置值，key 是 ThreadLocal 对象，值 Value 是传递进来的对象。
- 当调用 `ThreadLocal.get()` 方法时，本质上是往 ThreadLocalMap 中获取值，key 是 ThreadLocal 对象
- ThreadLocal 本身并不存储值，它只是将自己作为一个 key 来让线程从 ThreadLocalMap 获取 Value

正是因为上述原理，所以 ThreadLocal 能够实现 ***“数据隔离”*** ，获取当前线程的局部变量值，而不受其他线程影响。

## 5. ThreadLocal 内存泄漏问题

### 5.1 什么是内存泄漏？

***内存泄漏（Memory Leak）：是指程序中已动态分配的堆内存由于某种原因程序未释放或无法释放，造成系统内存的浪费，导致程序运行速度减慢甚至系统崩溃等严重后果***

---

### 5.2 什么时候内存泄漏？

**情况一：主线程和短生命周期线程**：

- 对于主线程或临时创建的线程，线程的生命周期结束后，线程的所有对象，包括 `ThreadLocalMap`，都会被回收，所以通常不会造成内存泄漏

**情况二：线程池中的线程**：

- 线程池中的线程长期存在，不会因为任务结束而被回收。如果在任务中使用了 `ThreadLocal`，但没有清理（调用 `remove()`），对应的值会一直保留在 `ThreadLocalMap` 中，导致内存泄漏。

**为什么线程池特别容易出现内存泄漏？**

1. **线程重用**：

	- 线程池中的线程不会随着任务完成而销毁， `ThreadLocalMap` 也不会自动清空。

2. **弱引用的作用有限**：

	- `ThreadLocal` 在 `ThreadLocalMap` 中是弱引用，但其值（`value`）是强引用。即使 `ThreadLocal` 被垃圾回收，`ThreadLocalMap` 的条目不会立即清除，其 `value` 仍然占用内存。

3. **任务逻辑复杂性**：
	
	- 多线程任务逻辑复杂，容易忘记清理 `ThreadLocal` 值，导致使用上一个线程的ThreadLocal值。

---

### 5.2  为什么要用弱引用？不用如何？

***弱引用：对于只有弱引用的对象而言，只要垃圾回收机制一运行，不管JVM的内存空间是否足够，都会回收该对象占用的内存。***

![image.png](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/picgo/20250315172909.png)


1. 为什么要用弱引用：

	- 当方法执行完毕后，栈帧销毁，强引用**t1**也就没有了，但此时线程的ThreadLocalMap里某个entry的Key引用还指向这个对象，若这个Key是**强引用**，就会导致**Key指向的ThreadLocal对象不能被gc回收，造成内存泄露**
	- 若这个引用时弱引用就大概率会减少内存泄漏的问题（**当然，还得考虑key为null这个坑**），使用弱引用就可以使ThreadLocal对象在方法执行完毕后顺利被回收且entry的**key引用指向为null**

2. 这里有个需要注意的问题：

	- ThreadLocalMap使用ThreadLocal的弱引用作为Key，如果一个ThreadLocal没有外部强引用引用他，那么系统gc时，这个ThreadLocal势必会被回收，这样一来，ThreadLocalMap中就会出现**Key为null的Entry**，就没有办法访问这些Key为null的Entry的value，如果当前线程迟迟不结束的话（好比正在使用线程池），这些**key为null的Entry的value就会一直存在一条强引用链**
	- 虽然弱引用，保证了Key指向的ThreadLocal对象能够被及时回收，但是v指向的value对象是需要ThreadLocalMap调用get、set时发现key为null时才会去回收整个entry、value，**因此弱引用不能100%保证内存不泄露，我们要在不使用某个ThreadLocal对象后，手动调用remove方法来删除它**，尤其是在线程池中，不仅仅是内存泄漏的问题，因为线程池中的线程是重复使用的，意味着这个线程的ThreadLocalMap对象也是重复使用的，如果我们不手动调用remove方法，那么后面的线程就有可能获取到上个线程遗留下来的value值，造成bug。

3. 清除脏Entry----key为null的entry

ThreadLocal 的 get, set, remove 方法最终都会调用 expungeStaleEntry 方法清除脏 Entry

代码位置: `java.lang.ThreadLocal.ThreadLocalMap#expungeStaleEntry`

该方法的主要功能是清除 ThreadLocalMap 中的失效条目（stale entry），同时重新哈希冲突的键值对，避免哈希表结构混乱

```java
private int expungeStaleEntry(int staleSlot) {
	Entry[] tab = table;
	int len = tab.length;

	// expunge entry at staleSlot
	tab[staleSlot].value = null;
	tab[staleSlot] = null;
	size--;

	// Rehash until we encounter null
	Entry e;
	int i;
	for (i = nextIndex(staleSlot, len);
		 (e = tab[i]) != null;
		 i = nextIndex(i, len)) {
		ThreadLocal<?> k = e.get();
		if (k == null) {
			e.value = null;
			tab[i] = null;
			size--;
		} else {
			int h = k.threadLocalHashCode & (len - 1);
			if (h != i) {
				tab[i] = null;

				// Unlike Knuth 6.4 Algorithm R, we must scan until
				// null because multiple entries could have been stale.
				while (tab[h] != null)
					h = nextIndex(h, len);
				tab[h] = e;
			}
		}
	}
	return i;
}
```


## 6. 最佳实践

- ThreadLocal一定要初始化，避免空指针异常。
- 建议把ThreadLocal修饰为static
- 用完记得手动remove


## 7. 总结

- ThreadLocal并不解决线程间共享数据的问题
- ThreadLocal适用于变量在线程间隔离且在方法间共享的场景
- ThreadLocal通过隐式的在不同线程内创建独立实例副本避免了实例线程安全的问题
- 每个线程持有一个只属于它自己的专属map并维护了ThreadLocal对象与具体实例的映射，该Map由于只被持有他的线程访问，故不存在线程安全以及锁的问题
- ThreadLocalMap的Entry对ThreadLocal的引用为弱引用。避免了ThreadLocal对象无法被回收的问题
- 都会通过expungeStaleEntry，cleanSomeSlots，replaceStaleEntry这三个方法回收键为null的Entry对象的值（即为具体实例）以及entry对象本身从而防止内存泄漏，属于安全加固的方法



