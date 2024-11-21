---
title: 5. 设计与实现资源加载器，从Spring.xml解析和注册Bean对象
authors: [cangjingyue]
tags: 
    - spring
categories:
  - 手写spring
---


# 设计与实现资源加载器，从Spring.xml解析和注册Bean对象 

## 1. 目标

在完成 Spring 的框架雏形后，现在我们可以通过单元测试进行手动操作 Bean 对象的定义、注册和属性填充，以及最终获取对象调用方法。但这里会有一个问题，就是如果实际使用这个 Spring 框架，是不太可能让用户通过手动方式创建的，而是最好能通过配置文件的方式简化创建过程。

接下来我们就需要在现有的 Spring 框架中，添加能解决 Spring 配置的读取、解析、注册Bean的操作。


## 2. 设计

依照本章节的需求背景，我们需要在现有的 Spring 框架雏形中添加一个资源解析器，也就是能读取classpath、本地文件和云文件的配置内容。这些配置内容就是像使用 Spring 时配置的 Spring.xml 一样，里面会包括 Bean 对象的描述和属性信息。在读取配置文件信息后，接下来就是对配置文件中的 Bean 描述信息解析后进行注册操作，把 Bean 对象注册到 Spring 容器中。整体设计结构如下图：

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2024/11/21/17319292137942.jpg)

* 资源加载器属于相对独立的部分，它位于 `Spring` 框架核心包下的**IO**实现内容，主要用于处理**Class、本地和云环境**中的文件信息。
* 当资源可以加载后，接下来就是解析和注册 `Bean` 到 `Spring` 中的操作，这部分实现需要和 `DefaultListableBeanFactory` 核心类结合起来，因为你所有的解析后的注册动作，都会把 `Bean` 定义信息放入到这个类中。
* 那么在实现的时候就设计好接口的实现层级关系，包括我们需要定义出 `Bean` 定义的读取接口 `BeanDefinitionReader` 以及做好对应的实现类，在实现类中完成对 `Bean` 对象的解析和注册。


## 3. 实现

### 1. 工程结构

```
simple-spring-05
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
    │   │               │       ├── HierarchicalBeanFactory.java
    │   │               │       ├── ListableBeanFactory.java
    │   │               │       ├── config
    │   │               │       │   ├── AutowireCapableBeanFactory.java
    │   │               │       │   ├── BeanDefinition.java
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
    │   │               │       │   ├── InstantiationStrategy.java
    │   │               │       │   └── SimpleInstantiationStrategy.java
    │   │               │       └── xml
    │   │               │           └── XmlBeanDefinitionReader.java
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
            ├── important.properties
            └── spring.xml
```


-------


Spring 容器资源加载和使用类关系：

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2024/11/21/17319845776380.jpg)


* 本章节为了能把 `Bean` 的定义、注册和初始化交给 **Spring.xml** 配置化处理，那么就需要实现两大块内容，分别是：资源加载器、xml资源处理类，实现过程主要以对接口 `Resource`、`ResourceLoader` 的实现，而另外 `BeanDefinitionReader` 接口则是对资源的具体使用，将配置信息注册到 `Spring` 容器中去。
* 在 `Resource` 的资源加载器的实现中包括了，**ClassPath、系统文件、云配置文件**，这三部分与 `Spring` 源码中的设计和实现保持一致，最终在 `DefaultResourceLoader` 中做具体的调用。
* 接口：`BeanDefinitionReader`、抽象类：`AbstractBeanDefinitionReader`、实现类：`XmlBeanDefinitionReader`，这三部分内容主要是合理清晰的处理了资源读取后的注册 `Bean` 容器操作。接口管定义，抽象类处理非接口功能外的注册`Bean`组件填充，最终实现类即可只关心具体的业务实现


-------


另外本章节还参考 `Spring` 源码，做了**相应接口的集成和实现的关系**，虽然这些接口目前还并没有太大的作用，但随着框架的逐步完善，它们也会发挥作用。

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2024/11/21/17319847983626.jpg)


* **BeanFactory**，已经存在的 `Bean` 工厂接口用于获取 `Bean` 对象，这次新增加了按照类型获取 `Bean` 的方法：`<T> T getBean(String name, Class<T> requiredType)`
* **ListableBeanFactory**，是一个扩展 `Bean` 工厂接口的接口，新增加了 `getBeansOfType`、`getBeanDefinitionNames`() 方法，在 `Spring` 源码中还有其他扩展方法。
* **HierarchicalBeanFactory**，在 `Spring` 源码中它提供了可以获取父类 `BeanFactory` 方法，属于是一种扩展工厂的层次子接口。**Sub-interface implemented by bean factories that can be part of a hierarchy**.
* **AutowireCapableBeanFactory**，是一个**自动化处理**`Bean`工厂配置的接口，目前案例工程中还没有做相应的实现，后续逐步完善。
* **ConfigurableBeanFactory**，可获取 `BeanPostProcessor`、`BeanClassLoader`等的一个配置化接口。
* **ConfigurableListableBeanFactory**，提供**分析和修改Bean以及预先实例化**的操作接口，不过目前只有一个 `getBeanDefinition` 方法。


### 2. 资源加载接口定义和实现

```java
public interface Resource {

    InputStream getInputStream() throws IOException;

}
```

* 在 `Spring` 框架下创建 `core.io` 核心包，在这个包中主要用于处理资源加载流。
* 定义 `Resource` 接口，提供获取 `InputStream` 流的方法，接下来再分别实现三种不同的流文件操作：**classPath、FileSystem、URL**


-------

#### **1. ClassPath**

```java
public class ClassPathResource implements Resource {
    private final String path;

    private ClassLoader classLoader;

    public ClassPathResource(String path) {
        this(path, null);
    }

    public ClassPathResource(String path, ClassLoader classLoader) {
        this.path = path;
        this.classLoader = Objects.nonNull(classLoader) ? classLoader : ClassUtils.getDefaultClassLoader();
    }

    /**
     * 获取资源加载流
     * @return 资源加载流
     */
    @Override
    public InputStream getInputStream() throws IOException {
        InputStream inputStream = classLoader.getResourceAsStream(path);
        if (Objects.isNull(inputStream)) {
            throw new FileNotFoundException(this.path + " cannot be opened because it does not exist");
        }
        return inputStream;
    }
}
```

* 这一部分的实现是用于通过 `ClassLoader` 读取 **ClassPath** 下的文件信息，具体的读取过程主要是：`classLoader.getResourceAsStream(path)`

-------

#### **2. FileSystem**

```java
public class FileSystemResource implements Resource {
    private final File file;

    private final String path;

    public FileSystemResource(String path) {
        this.path = path;
        this.file = new File(path);
    }

    public FileSystemResource(File file) {
        this.file = file;
        this.path = file.getPath();
    }

    /**
     * 获取资源加载流
     * @return 资源加载流
     */
    @Override
    public InputStream getInputStream() throws IOException {
        return Files.newInputStream(file.toPath());
    }

    public String getPath() {
        return path;
    }
}
```

* 通过指定文件路径的方式读取文件信息



-------


#### **3. URL**

```java
public class UrlResource implements Resource {
    private final URL url;

    public UrlResource(URL url) {
        Assert.notNull(url,"URL must not be null");
        this.url = url;
    }

    /**
     * 获取资源加载流
     * @return 资源加载流
     */
    @Override
    public InputStream getInputStream() throws IOException {
        URLConnection connection = this.url.openConnection();
        try {
            return connection.getInputStream();
        } catch (IOException e) {
            if (connection instanceof HttpURLConnection){
                ((HttpURLConnection) connection).disconnect();
            }
            throw e;
        }
    }
}
```

* 通过 **HTTP** 的方式读取云服务的文件，我们也可以把配置文件放到 **GitHub** 上。


### 3. 包装资源加载器

按照资源加载的不同方式，资源加载器可以把这些方式集中到统一的类服务下进行处理，外部用户只需要传递资源地址即可，简化使用。

#### **1. 定义接口**

```java
public interface ResourceLoader {
    String CLASSPATH_URL_PRRFIX = "classpath:";

    /**
     * 定义资源获取接口
     * @param location 地址
     * @return 资源获取接口
     */
    Resource getResource(String location);
}
```

* 定义获取资源接口，里面传递 **location** 地址即可。

-----

#### **2. 实现接口**

```java
public class DefaultResourceLoader implements ResourceLoader {

    /**
     * 定义资源获取接口
     * @param location 地址
     * @return 资源获取接口
     */
    @Override
    public Resource getResource(String location) {
        Assert.notNull(location, "Location must not be null");
        // 类路径
        if (location.startsWith(CLASSPATH_URL_PRRFIX)) {
            return new ClassPathResource(location.substring(CLASSPATH_URL_PRRFIX.length()));
        } else {
            try {
                // URL解析
                URL url = new URL(location);
                return new UrlResource(url);
            } catch (MalformedURLException e) {
                // 文件路径
                return new FileSystemResource(location);
            }
        }
    }
}
```

* 在获取资源的实现中，主要是把三种不同类型的资源处理方式进行了包装，分为：判断是否为**ClassPath、URL以及文件**。
* 虽然 `DefaultResourceLoader` 类实现的过程简单，但这也是设计模式约定的具体结果，像是这里不会让外部调用放知道过多的细节，而是仅关心具体调用结果即可。


### 4. Bean定义读取接口

```java
public interface BeanDefinitionReader {
    BeanDefinitionRegistry getRegistry();

    ResourceLoader getResourceLoader();

    void loadBeanDefinitions(Resource resource) throws BeansException;

    void loadBeanDefinitions(Resource... resources) throws BeansException;

    void loadBeanDefinitions(String location) throws BeansException;
}
```

* 这是一个 ***Simple interface for bean definition readers***. 其实里面无非定义了几个方法，包括：`getRegistry()`、`getResourceLoader()`，以及**三个加载Bean定义**的方法。
* 这里需要注意 `getRegistry()`、`getResourceLoader()`，都是用于提供给后面三个方法的工具，加载和注册，这两个方法的实现会包装到抽象类中，以免污染具体的接口实现方法。


### 5. Bean定义读取抽象类实现

```java
public abstract class AbstractBeanDefinitionReader implements BeanDefinitionReader {
    private final BeanDefinitionRegistry registry;

    private ResourceLoader resourceLoader;

    protected AbstractBeanDefinitionReader(BeanDefinitionRegistry registry) {
        this(registry, new DefaultResourceLoader());
    }

    public AbstractBeanDefinitionReader(BeanDefinitionRegistry registry, ResourceLoader resourceLoader) {
        this.registry = registry;
        this.resourceLoader = resourceLoader;
    }

    @Override
    public BeanDefinitionRegistry getRegistry() {
        return registry;
    }

    @Override
    public ResourceLoader getResourceLoader() {
        return resourceLoader;
    }
}
```

* 抽象类把 `BeanDefinitionReader` 接口的前两个方法全部实现完了，并提供了构造函数，让外部的调用使用方，把**Bean定义注入类 (DefaultListableBeanFactory)**，传递进来。
* 这样在接口 `BeanDefinitionReader` 的具体实现类中，就可以把解析后的 XML 文件中的 `Bean` 信息，注册到 `Spring` 容器去了。以前我们是通过单元测试使用，调用 `BeanDefinitionRegistry` 完成`Bean`的注册，现在可以放到 `XMl` 中操作了

### 6. 解析XML处理Bean注册

```java
public class XmlBeanDefinitionReader extends AbstractBeanDefinitionReader {
    public XmlBeanDefinitionReader(BeanDefinitionRegistry registry) {
        super(registry);
    }

    public XmlBeanDefinitionReader(BeanDefinitionRegistry registry, ResourceLoader resourceLoader) {
        super(registry, resourceLoader);
    }

    @Override
    public void loadBeanDefinitions(Resource resource) throws BeansException {
        try (InputStream inputStream = resource.getInputStream()){
            doLoadBeanDefinitions(inputStream);
        } catch (IOException | ClassNotFoundException e) {
            throw new BeansException("IOException parsing XML document from " + resource, e);
        }
    }

    @Override
    public void loadBeanDefinitions(Resource... resources) throws BeansException {
        for (Resource resource : resources) {
            loadBeanDefinitions(resource);
        }
    }

    @Override
    public void loadBeanDefinitions(String location) throws BeansException {
        ResourceLoader resourceLoader = getResourceLoader();
        Resource resource = resourceLoader.getResource(location);
        loadBeanDefinitions(resource);
    }

    protected void doLoadBeanDefinitions(InputStream inputStream) throws ClassNotFoundException {
        Document doc = XmlUtil.readXML(inputStream);
        Element root = doc.getDocumentElement();
        NodeList childNodes = root.getChildNodes();

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
            // 获取 Class，方便获取类中的名称
            Class<?> clazz = Class.forName(className);
            // 优先级 id > name
            String beanName = StrUtil.isNotEmpty(id) ? id : name;
            if (StrUtil.isEmpty(beanName)) {
                beanName = StrUtil.lowerFirst(clazz.getSimpleName());
            }

            // 定义Bean
            BeanDefinition beanDefinition = new BeanDefinition(clazz);
            // 读取属性并填充
            for (int j = 0; j < bean.getChildNodes().getLength(); j++) {
                if (!(bean.getChildNodes().item(j) instanceof Element)) continue;
                if (!"property".equals(bean.getChildNodes().item(j).getNodeName())) continue;
                // 解析标签：property
                Element property = (Element) bean.getChildNodes().item(j);
                String attrName = property.getAttribute("name");
                String attrValue = property.getAttribute("value");
                String attrRef = property.getAttribute("ref");
                // 获取属性值：引入对象、值对象
                Object value = StrUtil.isNotEmpty(attrRef) ? new BeanReference(attrRef) : attrValue;
                // 创建属性信息
                PropertyValue propertyValue = new PropertyValue(attrName, value);
                beanDefinition.getPropertyValues().addPropertyValue(propertyValue);
            }
            if (getRegistry().containsBeanDefinition(beanName)) {
                throw new BeansException("Duplicate beanName[" + beanName + "] is not allowed");
            }
            // 注册 BeanDefinition
            getRegistry().registerBeanDefinition(beanName, beanDefinition);
        }
    }
}
```

-----

`XmlBeanDefinitionReader` 类最核心的内容就是对 `XML` 文件的解析，把我们本来在代码中的操作放到了通过解析 `XML` 自动注册的方式。

* `loadBeanDefinitions` 方法，处理资源加载，这里新增加了一个内部方法：`doLoadBeanDefinitions`，它主要负责解析 `xml`
* 在 `doLoadBeanDefinitions` 方法中，主要是对xml的读取 `XmlUtil.readXML(inputStream)` 和元素 `Element` 解析。在解析的过程中通过**循环**操作，以此获取 `Bean` 配置以及配置中的 **id、name、class、value、ref 信息**。
* 最终把读取出来的配置信息，创建成 `BeanDefinition` 以及 `PropertyValue`，最终把完整的 `Bean` 定义内容注册到 `Bean` 容器：`getRegistry().registerBeanDefinition(beanName, beanDefinition)`


----- 

#### **1. 解析XML**

```java
Document doc = XmlUtil.readXML(inputStream);
Element root = doc.getDocumentElement();
NodeList childNodes = root.getChildNodes();
```

1. **XmlUtil.readXML(inputStream)：**
    * 使用工具类 `XmlUtil` 解析输入流中的 `XML` 数据，生成一个 `Document` 对象。
    * `Document` 是整个 `XML` 的 `DOM` 树结构的根。

    
2. **doc.getDocumentElement()：**
    * 获取 `XML` 的根节点对象（`Element`）。
    * 对于 `Spring` 配置文件，根节点通常是 `<beans>`。

    
3.	**root.getChildNodes()：**

    * 获取根节点的**所有子节点**，包括文本节点、元素节点等。

----
    
#### **2. 判断是否为有效的 `<bean>` 节点**    

```java
if (!(childNodes.item(i) instanceof Element)) continue;
if (!"bean".equals(childNodes.item(i).getNodeName())) continue;
```

1. **childNodes.item(i) instanceof Element：**

    * 检查当前子节点是否是元素节点（`Element`）。
    * 如果不是（比如是文本节点），**跳过**。

2. **"bean".equals(childNodes.item(i).getNodeName())：**

    * 检查节点名称是否是 bean。
    * 如果不是 bean 标签，跳过。

---

#### **3. 解析 `<bean>` 标签**
    
```java
Element bean = (Element) childNodes.item(i);
String id = bean.getAttribute("id");
String name = bean.getAttribute("name");
String className = bean.getAttribute("class");
```    


1.	**Element bean = (Element) childNodes.item(i)：**
    * 将当前节点强制转换为元素节点（`Element`）。
2.	**bean.getAttribute("id")：**
    * 获取 `id` 属性值。
3.	**bean.getAttribute("name")：**
    * 获取 `name` 属性值。
4.	**bean.getAttribute("class")：**
    * 获取 `class` 属性值，用于加载对应的 `Java` 类。

    
---

#### **4. 定义Bean**   

```java
// 获取 Class，方便获取类中的名称
Class<?> clazz = Class.forName(className);
// 优先级 id > name
String beanName = StrUtil.isNotEmpty(id) ? id : name;
if (StrUtil.isEmpty(beanName)) {
    beanName = StrUtil.lowerFirst(clazz.getSimpleName());
}

// 定义Bean
BeanDefinition beanDefinition = new BeanDefinition(clazz);
``` 

1. **Class<?> clazz = Class.forName(className);**	
    * 使用 `Class.forName` 动态加载 `class` 属性指定的 `Java` 类。

    
2. **StrUtil.isNotEmpty(id) ? id : name：**

    * 如果 id 不为空，优先使用 id 作为 Bean 的名称。
    * 如果 id 为空，则尝试使用 name。

3. **StrUtil.isEmpty(beanName)：**
    
    * 如果 id 和 name 都为空，则根据**类名**生成默认 Bean 名称。
    * **clazz.getSimpleName()：**
        * 获取类的简单名称（去掉包名）。
    * **StrUtil.lowerFirst：**
        * 将首字母小写（符合 Java Bean 的命名规范）。    
 
4. **BeanDefinition beanDefinition = new BeanDefinition(clazz);**

    * 将类信息包装成 `BeanDefinition` 对象，用于保存 Bean 的元数据。
    
 
 
 ----
 
#### **5. 解析`<property>`标签**
 
```java
if (!(bean.getChildNodes().item(j) instanceof Element)) continue;
if (!"property".equals(bean.getChildNodes().item(j).getNodeName())) continue;

// 解析标签：property
Element property = (Element) bean.getChildNodes().item(j);
String attrName = property.getAttribute("name");
String attrValue = property.getAttribute("value");
String attrRef = property.getAttribute("ref");

// 获取属性值：引入对象、值对象
Object value = StrUtil.isNotEmpty(attrRef) ? new BeanReference(attrRef) : attrValue;

// 创建属性信息
PropertyValue propertyValue = new PropertyValue(attrName, value);
beanDefinition.getPropertyValues().addPropertyValue(propertyValue); 
```

1. **过滤无关节点**

    * 跳过非元素节点。
    * 跳过名称不是 property 的节点。

2. **解析属性值**
    
    * name：属性名称。
    * value：直接的值。
    * ref：引用其他 Bean。

3. **确定属性值类型**

    * 如果 ref 存在，创建一个 BeanReference 对象表示引用关系。
    * 否则使用 value 作为属性值。

4. **包装属性信息**
    
    * 使用 PropertyValue 封装属性名和属性值。
    * 添加到 BeanDefinition 的属性集合中。 

---

#### **6. 注册BeanDefinition**

```java
if (getRegistry().containsBeanDefinition(beanName)) {
    throw new BeansException("Duplicate beanName[" + beanName + "] is not allowed");
}

// 注册 BeanDefinition
getRegistry().registerBeanDefinition(beanName, beanDefinition);
```

* 如果容器中已经存在同名 Bean，抛出异常。

* 将解析完成的 BeanDefinition 注册到容器中，以便后续实例化和依赖注入。

---

## 4. 测试


### 1. 测试bean

准备测试bean


---

```java
public class UserService {

    private String uId;

    private UserDao userDao;

    public String queryUserInfo() {
        return userDao.queryUserName(uId);
    }

    ...
}
```

``` java
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

### 2. 配置文件

```xml
<?xml version="1.0" encoding="UTF-8"?>
<beans>

    <bean id="userDao" class="test.bean.UserDao"/>

    <bean id="userService" class="test.bean.UserService">
        <property name="uId" value="10001"/>
        <property name="userDao" ref="userDao"/>
    </bean>

</beans>
```

### 3. 测试案例

```java
@Test
public void test_xml() {
    // 1.初始化 BeanFactory
    DefaultListableBeanFactory beanFactory = new DefaultListableBeanFactory();

    // 2. 读取配置文件&注册Bean
    XmlBeanDefinitionReader reader = new XmlBeanDefinitionReader(beanFactory);
    reader.loadBeanDefinitions("classpath:spring.xml");

    // 3. 获取Bean对象调用方法
    UserService userService = beanFactory.getBean("userService", UserService.class);
    String result = userService.queryUserInfo();
    System.out.println("测试结果：" + result);
}
```