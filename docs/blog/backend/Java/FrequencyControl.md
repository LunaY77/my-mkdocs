---
title: Frequency-Control-Starter
authors: [cangjingyue]
tags: 
    - java
categories:
  - java
---

# Frequency-Control-Starter

## 1. 项目简介

本项目为一个基于 **SpringBoot + Redis** 实现的频率控制组件

github仓库地址：[Frequency-Control-Spring-Boot-Starter](https://github.com/LunaY77/Frequency-Control-Spring-Boot-Starter)

## 2. 项目亮点

1. 使用 **lua脚本** 保证redis的频率计数的 **原子性**
2. 允许某个接口拥有多种**频控策略**（如允许5s内3次、30秒内10次）
3. 允许某个接口拥有多种**频控算法**（如固定窗口 + 滑动窗口）
4. 实现**核心配置类**，允许用户通过配置文件**自定义**默认频控时间范围、频控时间单位、单位频控时间范围内最大访问次数
5. 可通过配置文件的参数**指定替换限流算法**
6. 实现**SPI**机制，允许用户**自定义**实现限流算法
7. 采用**策略模式+模版方法模式+工厂模式**，抽象限流策略服务，实现**固定窗口、滑动窗口、令牌桶**等限流算法策略

## 3. 频控属性核心配置

在频控属性配置方面，实现能够通过在 `application.properties` 或 `application.yml` 中设置相关参数，可以灵活调整**限流策略、窗口大小、目标对象、频率限制和时间单位**，以适应特定场景。

### 3.1 配置项概览

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2024/11/17/17318134711509.jpg)

### 3.2 效果展示

同时我配置了 `spring-configuration-metadata.json` 文件，实现配置信息的自动提示、补全功能

1. 自动提示  
![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2024/11/17/17318122861454.jpg)

3. 自动补全  
![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2024/11/17/17318122934815.jpg)

## 4. 频控注解及切面实现

### 4.1 频控注解

定义如下频控注解，包含**频控算法**及**相关算法配置**等属性

``` java
@Repeatable(FrequencyControlContainer.class) // 可重复
@Retention(RetentionPolicy.RUNTIME)// 运行时生效
@Target(ElementType.METHOD)//作用在方法上
public @interface FrequencyControl {
 
    FrequencyControlStrategyEnum strategy() default FrequencyControlStrategyEnum.TOTAL_COUNT_WITH_IN_FIX_TIME;
 
    int windowSize() default -1;
  
    int period() default -1;

    String prefixKey() default "";

    FrequencyControlTargetEnum target() default FrequencyControlTargetEnum.EL;

    String spEl() default "";

    int time() default -1;

    TimeUnit unit() default TimeUnit.SECONDS;

    int count() default -1;

    long capacity() default -1; 

    double refillRate() default -1; 
}
```

注意到：注解属性默认值大部分设置为 **-1** 或 **空字符串**

原因在于：

  1. 注解属性**不可变**，无法通过 `Properties` 动态配置，所以采用 **-1 或 空字符串** 表示采用默认值
  2. 基于上一点，那么如果注解属性不为 **-1 或 空字符串**，则在切面执行时表示**不使用**默认值

### 4.2 可重复注解

同时，为了实现一个接口可以拥有**多种**频控策略或频控算法，需要实现注解可重复使用  
参考 [Java8新特性(六)重复注解与类型注解](https://blog.csdn.net/weixin_43833851/article/details/129677389)，定义容器注解类：

``` java
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface FrequencyControlContainer {
    // 可重复注解
    FrequencyControl[] value();
}
```

### 4.3 切面实现

核心方法：

``` java
@Around("@annotation(com.iflove.starter.frequencycontrol.annotation.FrequencyControl)||@annotation(com.iflove.starter.frequencycontrol.annotation.FrequencyControlContainer)")
public Object around(ProceedingJoinPoint joinPoint) throws Throwable {
    Method method = ((MethodSignature) joinPoint.getSignature()).getMethod();
    FrequencyControl[] annotationsByType = method.getAnnotationsByType(FrequencyControl.class);
    // 实现注解配置的动态替换
    List<FrequencyControlConfig> frequencyControlConfigs = injectPropertiesToAnnotations(annotationsByType);

    Map<String, FrequencyControlConfig> keyMap = new HashMap<>();

    for (int i = 0; i < frequencyControlConfigs.size(); i++) {
        FrequencyControlConfig config = frequencyControlConfigs.get(i);
        // 默认为方法限定名 + 注解排名（可能多个）
        String prefix = StrUtil.isBlank(config.getPrefixKey()) ? method.toGenericString() + ":index:" + i : config.getPrefixKey();
        String key = "";
        switch (config.getTarget()) {
            case EL -> key = SPELUtils.parseSPEL(method, joinPoint.getArgs(), config.getSpEl());
            case IP -> key = UserContext.getIp();
            case UID -> key = UserContext.getUserId();
        }
        // 存入keyMap
        keyMap.put(prefix + ":" + key, config);
    }
    // 根据策略分组
    Map<FrequencyControlStrategyEnum, Map<String, FrequencyControlConfig>> configMapByStrategy = keyMap.entrySet().stream()
            .collect(Collectors.groupingBy(
                    entry -> entry.getValue().getStrategy(),
                    Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue)
            ));

    Map<String, FrequencyControlConfig> configMap;
    // 固定窗口
    if ((configMap = configMapByStrategy.get(FrequencyControlStrategyEnum.TOTAL_COUNT_WITH_IN_FIX_TIME)) != null) {
        List<FixedWindowDTO> frequencyControlDTOS = configMap.entrySet().stream().map(entrySet -> buildFixedWindowDTO(entrySet.getKey(), entrySet.getValue())).collect(Collectors.toList());
        FrequencyControlUtil.executeWithFrequencyControlList(FrequencyControlStrategyEnum.TOTAL_COUNT_WITH_IN_FIX_TIME, frequencyControlDTOS);
    }
    // 滑动窗口
    if ((configMap = configMapByStrategy.get(FrequencyControlStrategyEnum.SLIDING_WINDOW)) != null) {
        List<SlidingWindowDTO> frequencyControlDTOS = configMap.entrySet().stream().map(entrySet -> buildSlidingWindowDTO(entrySet.getKey(), entrySet.getValue())).collect(Collectors.toList());
        FrequencyControlUtil.executeWithFrequencyControlList(FrequencyControlStrategyEnum.SLIDING_WINDOW, frequencyControlDTOS);
    }
    // 令牌桶
    if ((configMap = configMapByStrategy.get(FrequencyControlStrategyEnum.TOKEN_BUCKET)) != null) {
        List<TokenBucketDTO> frequencyControlDTOS = configMap.entrySet().stream().map(entrySet -> buildTokenBucketDTO(entrySet.getKey(), entrySet.getValue())).collect(Collectors.toList());
        FrequencyControlUtil.executeWithFrequencyControlList(FrequencyControlStrategyEnum.TOKEN_BUCKET, frequencyControlDTOS);
    }
    return joinPoint.proceed();
}
```

## 5. 常见的限流算法及相关实现

### 5.1 抽象限流策略

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2024/11/17/17318125075744.jpg)

重点关注以下3个方法：

#### 1. **#executeWithFrequencyControlMap**

``` java
/**
 * 执行限流策略
 *
 * @param frequencyControlMap   定义的注解频控
 *                              Map中的Key-{@link K#getKey()}-对应redis的单个频控的Key
 *                              Map中的Value-对应redis的单个频控的Key限制的Value
 */
private void executeWithFrequencyControlMap(Map<String, K> frequencyControlMap) {
    // 判断：是否达到限流阈值
    if (reachRateLimit(frequencyControlMap)) {
        throw new FrequencyControlException((String) null);
    }
    // 增加限流统计
    addFrequencyControlStatisticsCount(frequencyControlMap);
}
```

功能：**执行限流策略，通过指定的频控配置判断是否达到限流阈值，并在未达到限流阈值时增加频控统计计数**

---

#### 2. **#reachRateLimit**

``` java
/**
 * 是否达到限流阈值 (子类实现)
 *
 * @param frequencyControlMap 定义的注解频控
 *                            Map中的Key-{@link K#getKey()}-对应redis的单个频控的Key
 *                            Map中的Value-对应redis的单个频控的Key限制的Value
 * @return true-方法被限流 false-方法没有被限流
 */
protected abstract boolean reachRateLimit(Map<String, K> frequencyControlMap);
```

功能：**判断是否达到限流阈值，交给子类实现**

---

#### 3. **#addFrequencyControlStatisticsCount**

```java
/**
 * 增加限流统计次数 (子类实现)
 *
 * @param frequencyControlMap 定义的注解频控
 *                            Map中的Key-{@link K#getKey()}-对应redis的单个频控的Key
 *                            Map中的Value-对应redis的单个频控的Key限制的Value
 */
protected abstract void addFrequencyControlStatisticsCount(Map<String, K> frequencyControlMap);
```

功能：**增加限流统计次数，交给子类实现**

---

### 5.2 固定窗口

#### 1. 基本介绍

固定时间窗口（Fixed Window Rate Limiting Algorithm）（也叫计数器）是最常见的限流算法之一。它划分了多块固定的时间窗口，并且限制了每块窗口的最大请求数量。

<img src="https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2024/11/17/17318127687313.jpg" style="height:250px; display: block; margin: auto;">

如果将时间**每秒作为一个时间窗口**，设置每个时间窗口不能超过**4个请求**。这时候会发现固定窗口有个很严重的问题，就是**临界点**问题。当切换窗口的时候，所有计数将会重新计数，就会出现短短**0.5秒内达到6个请求**的情况。

- 优点：
    - 固定窗口算法非常简单，**易于实现和理解**。
- 缺点：
    - 存在明显的**临界**问题，如果请求集中在两个窗口之间。那么请求次数可能会超过我们的预期，最高达到**预期的两倍**。

#### 2. 适用场景

固定窗口实现起来简单方便，这就是它最大优点。要命的就是它的**临界**问题。只要平常流量相对**均匀分布**，或者我们能够接受限流准确度没那么严格，那么固定窗口是个很不错的方案。

#### 3. 代码实现

代码位置：`com.iflove.starter.frequencycontrol.service.frequencycontrol.strategy.TotalCountWithInFixTimeFrequencyController`

核心代码：

```java
@Override
protected boolean reachRateLimit(Map<String, FixedWindowDTO> frequencyControlMap) {
    // 批量获取
    List<String> frequencyKeys = new ArrayList<>(frequencyControlMap.keySet());
    List<Integer> countList = RedisUtil.mget(frequencyKeys, Integer.class);
    for (int i = 0; i < frequencyKeys.size(); i++) {
        String key = frequencyKeys.get(i);
        Integer count = countList.get(i);
        int frequencyControlCountLimit = frequencyControlMap.get(key).getCount();
        // 判断：到达限流阈值
        if (Objects.nonNull(count) && count >= frequencyControlCountLimit) {
            log.warn("frequenctControl limit key:{}, count:{}", key, count);
            return true;
        }
    }
    return false;
}

@Override
protected void addFrequencyControlStatisticsCount(Map<String, FixedWindowDTO> frequencyControlMap) {
    frequencyControlMap.forEach((k, v) -> RedisUtil.inc(k, v.getTime(), v.getUnit()));
}
```

---

- `#reachRateLimit`

    功能：**判断是否达到限流阈值**

    1. **批量获取**：将所有限流键提取为 `List`，并使用 `RedisUtil.mget` 方法从 `Redis` 中批量获取这些键的计数值。
    2. **遍历并检查**：遍历每个键的计数值，检查其是否达到限流阈值。
    3. **限流判断**：如果某个键的计数值达到或超过限流阈值，记录日志，并返回 `true` 表示已限流。否则，继续遍历。
    4. **返回结果**：如果所有键都未达到限流阈值，返回 `false` 表示未限流。

- `#addFrequencyControlStatisticsCount`

    功能：**增加每个限流键的计数，并设置键的过期时间。**

    1. **计数递增**：遍历 `frequencyControlMap`，对每个限流键调用 `RedisUtil.inc` 方法，增加计数并设置过期时间。
    2. **设置过期时间**：`RedisUtil.inc` 接收一个时间和单位参数，用于设置 `Redis` 键的过期时间，以确保计数在窗口结束后重置。

---

`RedisUtil.inc` 方法底层调用 `lua` 脚本保证原子性，`lua`代码如下：

```lua
local key, ttl = KEYS[1], ARGV[1]

if redis.call('EXISTS', key) == 0 then
    redis.call('SETEX', key, ttl, 1)
    return 1
else
    return tonumber(redis.call('INCR', key))
end
```

---

### 5.3 滑动窗口

#### 1. 基本介绍

为了解决固定窗口更换窗口时的**临界点**问题。因此出现了**滑动窗口**，这样一直都只用一个滑动窗口，只不过这个窗口会不断向前滑动。

滑动窗口将时间分为**多个小粒度的区间**。并且统计窗口会不断的移除最早的格子，加入新的格子。所有的计数只会统计窗口内的值。

<img src="https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2024/11/17/17318138852016.jpg" style="height:300px; display: block; margin: auto;">

假设时间粒度为**0.25s每格**，最大请求数量**4个每秒**。

红色的球就是被限流的请求。随着时间的不断增加，**每0.25s**，时间窗口就会往前**滑动一小格**，每次都会统计时间窗口内的请求**不能超过4个**。

- 优点：
    - **平滑**，相比起固定窗口，滑动窗口解决了临界问题。滑动窗口的精度更高，能让请求更加的平滑。
    - **状态性**，是缺点，也是优点。保存了所有请求的原始状态，方便统计。
  
- 缺点：
    - **状态性**，滑动窗口算法需要维护窗口内的请求信息，并且这些请求不是单纯的数值，它们和最小格子挂钩，这可能会导致一定的状态存储开销，尤其对于大规模的系统。

#### 2. 适用场景

选择场景前，依然要了解它的优缺点，才知道怎么去适配场景。滑动窗口最大`优点`是**平滑**。能够允许**偶尔突发**的请求，但是会**限制**窗口内的总次数，适合需要保证平均速率的场景。`缺点`是他需要保存窗口内**每个请求**的时间分布状态，比较占用内存。正是因为这样的状态。滑动窗口最好是用于全局的限流。如果用于用户级别的限流，那就会为每一个用户都创建一个滑动窗口，比较消耗内存。

- **api限流**

针对接口限流，我们一般会通过压测预估接口的qps。了解了这个之后。就可以对接口进行最大qps90%的速率限制。这时候就可以用滑动窗口限流。他可以平滑的保证每秒的请求量不超过我们配置的最大qps。

- **sentinel限流框架底层**

正是由于滑动窗口的状态特性。他能保存每一个请求的时间分布这类原始信息。我们可以很容易的统计出1s，5s，10s内的请求数量，成功数量，限流数量。sentinel底层正是用滑动窗口来实现这些状态的记录与限流。

#### 3. 代码实现

代码位置：  
`com.iflove.starter.frequencycontrol.service.frequencycontrol.strategy.SlidingWindowFrequencyController`

核心代码：

``` java
@Override
protected boolean reachRateLimit(Map<String, SlidingWindowDTO> frequencyControlMap) {
    List<String> frequencyKeys = new ArrayList<>(frequencyControlMap.keySet());
    for (String key : frequencyKeys) {
        SlidingWindowDTO dto = frequencyControlMap.get(key);
        // 获取滑动窗口内计数
        Long count = RedisUtil.zCard(dto.getKey());
        int frequencyControlCountLimit = dto.getCount();
        // 判断：到达限流阈值
        if (Objects.nonNull(count) && count >= frequencyControlCountLimit) {
            log.warn("frequenctControl limit key:{}, count:{}", key, count);
            return true;
        }
    }
    return false;
}

@Override
protected void addFrequencyControlStatisticsCount(Map<String, SlidingWindowDTO> frequencyControlMap) {
    List<String> frequencyKeys = new ArrayList<>(frequencyControlMap.keySet());
    for (String key : frequencyKeys) {
        SlidingWindowDTO dto = frequencyControlMap.get(key);
        // 计算最小窗口周期，转换为毫秒级别
        long period = dto.getUnit().toMillis(dto.getPeriod());
        long current = System.currentTimeMillis();
        // 计算窗口大小，也是过期时间
        long length = period * dto.getWindowSize();
        long start = current - length;
        // 添加当前时间，同时删除窗口大小外的旧数据
        RedisUtil.zAddAndExpire(key, start, length, current);
    }
}
```

---

具体实现方面：我选择`Redis`的 `Zset` 数据结构 **实现** 滑动窗口，可以根据时间范围精确地做范围筛选

- `#reachRateLimit`

    功能：**判断是否达到限流阈值**

    1. **批量获取**：将所有限流键提取为 `List`，并使用 `RedisUtil.mget `方法从 `Redis` 中批量获取这些键的计数值。
    2. **获取计数**：遍历 `frequencyControlMap` 中的限流键，并使用 `Redis` 的 `zCard` 方法获取每个键对应的滑动窗口内计数值。
    3. **限流判断**：对每个键的计数值进行限流检查，若达到或超过设定阈值，则记录日志并返回 `true` 表示限流。
    4. **返回结果**：如果所有键都未达到限流阈值，返回 `false` 表示未限流。

- `#addFrequencyControlStatisticsCount`

    功能：**增加每个限流键的计数，并设置键的过期时间。**

---

滑动窗口相关实现相对复杂，首先来看`滑动窗口实体类(SlidingWindowDTO)`是如何定义的   

``` java
public class SlidingWindowDTO extends FrequencyControlDTO {
    /**
     * 窗口大小，默认 10 s
     */
    private int windowSize;
    /**
     * 窗口最小周期 1s (窗口大小是 10s， 1s一个小格子，-共10个格子)
     */
    private int period;
}
```    

定义方面，首先继承了频控基类 `FrequencyControlDTO` ，定义了频控的一些基本属性

```java
public class FrequencyControlDTO {
    /**
     * 代表频控的Key 如果target为Key的话 这里要传值用于构建redis的Key target为Ip或者UID的话会从上下文取值 Key字段无需传值
     */
    private String key;

    /**
     * 频控时间单位，默认秒
     *
     * @return 单位
     */
    private TimeUnit unit;

    /**
     * 单位时间内最大访问次数
     *
     * @return 次数
     */
    private Integer count;
}
```

而子类实现上定义了 滑动窗口特有的属性：`windowSize` 和 `period`

  - `windowSize` 表示 **滑动窗口总大小(数据范围)** ，同时也代表着Redis存储的**过期时间**
  - `period` 表示**窗口最小周期**，代表**时间粒度大小**

---

重点关注方法中的滑动窗口计算逻辑：

```java
SlidingWindowDTO dto = frequencyControlMap.get(key);
 // 计算最小窗口周期，转换为毫秒级别
long period = dto.getUnit().toMillis(dto.getPeriod());
long current = System.currentTimeMillis();
// 计算窗口大小，也是过期时间
long length = period * dto.getWindowSize();
long start = current - length;
// 添加当前时间，同时删除窗口大小外的旧数据
RedisUtil.zAddAndExpire(key, start, length, current);
```

**核心思想**是：每次请求都添加一个当前时间戳到 Redis 的有序集合中，同时删除窗口范围之外的旧数据，以保持计数数据只反映当前滑动窗口内的请求数。

---

再来看Redis中是如何实现的：

```java
public static void zAddAndExpire(String key, long startTime, long expireTime, long currentTime) {
    // 添加当前时间
    template.opsForZSet().add(key, String.valueOf(currentTime), currentTime);
    // 删除周期之前的数据
    template.opsForZSet().removeRangeByScore(key, 0, startTime);
    // 过期时间窗口长度+时间间隔
    template.expire(key, expireTime, TimeUnit.MICROSECONDS);
}
```

做了以下操作：

1. **添加当前时间戳**：记录当前请求的时间。
2. **删除旧数据**：只保留当前滑动窗口内的时间戳数据，保证限流判断的准确性。
3. **设置过期时间**：控制集合的生存时间，以便在没有新请求时自动清除数据，节省 Redis 内存。

---

### 5.4 漏桶算法

#### 1. 基本介绍

漏桶算法正如其名，可以想象就是一个底部破了洞的桶，无论你以什么样的**不确定频率**去添加水。水都会从底部以**固定的频率**流出，其余的水蓄在漏桶中，直到漏桶满了被丢弃。

> 比如期望1S内最多处理4次请求，那么流出速度就是每0.25S一个请求.并且漏桶最大容量为10个请求。

<img src="https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2024/11/17/17318145134372.jpg" style="height:400px; display: block; margin: auto;">

不规则的请求随意的投递到我们的桶里，然后会有固定的频率去消费它，如果超过桶的最大容量10，那么请求将会被丢弃。  
漏桶限流算法最大的特点就是**流量整型**。让不规则的请求频率，转为规则的频率进行消费。

- 优点：
    - 可以严格限制请求的处理速度，避免瞬间请求过多导致系统崩溃或者雪崩。
- 缺点：
    - 需要对请求进行缓存，会增加服务器的内存消耗。
    - 面对突发流量的时候，优点同时也会是缺点。无法适应瞬时的突增流量

#### 2. 不适合场景

漏桶算法不太适合C端接口的限流。因为对于都到了限流的场景了。并发已经比较高了。我们希望的是超过限制的请求，立马就给他快速失败返回了，而不是停在桶里休眠等待响应。这样整体的响应时间会很高，同时还占用的请求连接池。

**故不对漏桶算法做代码实现**

---

### 5.5 令牌桶

#### 1. 基本介绍

令牌桶算法维护一个**固定容量**的令牌桶，每秒钟会向令牌桶中**放入一定数量的令牌**。每一个请求都需要**消耗一个令牌**才能放行。你会发现他和漏桶算法很像，都有个容量固定的桶。

  - 一个是匀速流出请求，一个是匀速放入令牌。
  - 一个积累的是请求，一个积累的是可放行的令牌。

> 比如期望1S内最多处理4次请求，那么令牌放入速度就是每0.25S一个令牌.并且桶最大容量为10个令牌。

在请求很多的情况下，他其实和漏桶算法的效果是一样的。最大的差别就是在请求不多的时候，它能存储令牌，用来**应对突增流量**。

- 优点：
      
    - **精度高**：令牌桶算法可以根据实际情况动态调整生成令牌的速率，可以实现较高精度的限流。
    - **弹性好**：相比漏桶算法，令牌桶算法可以处理突发流量，可以在短时间内提供更多的处理能力，以处理突发流量。
    - **无状态性**：相较于滑动窗口算法等需要维护状态信息的算法，令牌桶算法不需要持续维护大量的状态信息，使其更具扩展性和高效性。
  
- 缺点：
    - **实现复杂**：令牌桶算法需要在固定的时间间隔内生成令牌，需要开启一个线程。当然也可以用特殊手段不需要线程，但是实现就更加复杂。
    - **需要预热**：在刚启动时，桶中可能没有足够的令牌，这时候退化成了一个没桶的漏桶，很可能在一开始对请求产生较大的限制。

#### 2. 适用场景

相比起漏桶，令牌桶算法更加适合**应对突发的流量**。流量达到极限后，就会退化成没桶的漏桶，速率变成了严格控制。适用于流量整体平滑的情况下，同时也可以满足一定的突发流程场景

他的一个很大的`缺点`，就是他的**预热问题**。刚创建的令牌桶，这时候没有令牌，请求刚进来，又由于它没有桶，直接就把请求丢弃了。

#### 3. 代码实现

代码位置：  
`com.iflove.starter.frequencycontrol.service.frequencycontrol.strategy.TokenBucketFrequencyController`

核心代码：

```java
@Override
protected boolean reachRateLimit(Map<String, TokenBucketDTO> frequencyControlMap) {
    List<String> frequencyKeys = new ArrayList<>(frequencyControlMap.keySet());
    for (String key : frequencyKeys) {
        // 尝试获取1个令牌(不扣减)，如果失败，说明令牌为空，需要限流
        if (!tokenBucketManager.tryAcquire(key, 1)) {
            return true;
        }
    }
    return false;
}

@Override
protected void addFrequencyControlStatisticsCount(Map<String, TokenBucketDTO> frequencyControlMap) {
    List<String> frequencyKeys = new ArrayList<>(frequencyControlMap.keySet());
    for (String key : frequencyKeys) {
        TokenBucketDTO dto = frequencyControlMap.get(key);
        // 创建令牌桶，如果不存在
        tokenBucketManager.createTokenBucket(key, dto.getCapacity(), dto.getRate());
        // 扣减一个令牌
        tokenBucketManager.deductionToken(key, 1);
    }
}
```

---

- `#reachRateLimit`

    功能：**判断是否达到限流阈值**

    1. **获取频率控制键列表**：将 `frequencyControlMap` 的键存入 `frequencyKeys` 列表中。
    2. **逐个检查令牌桶**：
        - 遍历每个频率控制键 `key`。
        - 调用 `tokenBucketManager.tryAcquire(key, 1)` 尝试获取一个令牌，不扣减桶中已有的令牌。
        - 如果返回 `false`，表示当前令牌桶为空，需要进行限流，于是直接返回 `true`。
    3. **没有达到限流**：如果所有键的令牌桶中均有足够的令牌，则返回 `false`。

- `#addFrequencyControlStatisticsCount`

    功能：**增加每个限流键的计数。**

    1. 遍历 `frequencyKeys` 中的每个 **key**。
    2. 获取令牌桶配置信息 `dto`，包括桶的容量和令牌填充速率。 
    3. 调用 `tokenBucketManager.createTokenBucket(key, dto.getCapacity(), dto.getRate())` 创建令牌桶（如果不存在）。
    4. 扣减一个令牌，通过 `deductionToken(key, 1)` 表示请求消耗了一个令牌。

底层使用 `ConcurrentHashMap` 实现 **key** 和 **令牌桶** 的存储

相关代码实现于：`com.iflove.starter.frequencycontrol.manager.TokenBucketManager`
