---
title: Spring MVC
authors: [cangjingyue]
tags: 
    - spring
    - java
categories:
  - java
---

# Spring MVC

!!!注意
    文章中的代码大部分为我的项目 Simple-Spring 代码实现，非纯源码


## SpringMVC原理

![](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/01/19/17372249274778.jpg)

根据上图，我们可以得知Spring MVC的工作流程如下：

1. 用户（客户端，即浏览器）发送请求至前端控制器（DispatcherServlet）

2. 前端控制器收到请求后调⽤处理器映射器（HandlerMapping）

3. 处理器映射器根据请求Url找到具体的处理器（Handler，也叫后端控制器），生成处理器对象及处理器拦截器（如果有）一并返回给前端控制器

4. 前端控制器收到处理器对象及处理器拦截器（如果有）后调用处理器适配器（HandlerAdapter）去调用处理器Handler

5. 处理器适配器执行处理器

6. 处理器执行完后给处理器适配器返回ModelAndView

7. 处理器适配器将ModelAndView（ModelAndView是SpringMVC框架的⼀个底层对象，包括 Model 和 View）返回给前端控制器

8. 前端控制器接收到ModelAndView后，请求视图解析器（ViewResolver）去进⾏视图解析，根据逻辑视图名来解析真正的视图

9. 视图解析器将解析完的View返回给前端控制器

10. 前端控制器进⾏视图渲染，就是将模型数据（在 ModelAndView 对象中）填充到 request 域

11. 前端控制器向⽤户响应结果

## 动态注册Web组件

通常来说，要启动一个Web服务器，需要静态地在项目路径下配置 `webapp/WEB-INF/web.xml` 文件

那么 Spring 是怎么做到不使用`web.xml`，而是通过 Java 注解方式来动态地实现 Web 和 Mvc的呢？

先给出答案，可以通过以下两种方式动态配置

### **实现 WebApplicationInitializer 接口**

```java
public class WebInitializer implements WebApplicationInitializer{
@Override
public void onStartup(ServletContext servletContext) throws ServletException {}
}
```

---

### **继承 AbstractAnnotationConfigDispatcherServletInitializer**


```java
public class WebMvcInitializer extends AbstractAnnotationConfigDispatcherServletInitializer {
 
}
```

---

### **容器启动**

上述两种方法仅仅是给出了动态配置，而导入该配置的具体位置在 `org.springframework.web.SpringServletContainerInitializer#onStartup`  方法，**该方法即为 Web容器初始化并启动 的源头**。

```java
@HandlesTypes({WebApplicationInitializer.class})
public class SpringServletContainerInitializer implements ServletContainerInitializer {
    public void onStartup(Set<Class<?>> webAppInitializerClasses, ServletContext servletContext) throws ServletException {
        ...
    }
}     
```

----

#### **ServletContainerInitializer**

`ServletContainerInitializer` 是 Servlet 3.0 规范中引入的接口，用于在 Web 应用启动时动态发现和注册 Servlet、Filter 和 Listener。该接口的作用是在 Web 容器启动过程中接收符合特定条件的类集合，并可以基于这些类执行一些自定义的操作。

接口定义如下：

```java
/**
 * ServletContainerInitializers (SCIs) are registered via an entry in the
 * file META-INF/services/javax.servlet.ServletContainerInitializer that must be
 * included in the JAR file that contains the SCI implementation.
 * <p>
 * SCI processing is performed regardless of the setting of metadata-complete.
 * SCI processing can be controlled per JAR file via fragment ordering. If
 * absolute ordering is defined, then only the JARs included in the ordering
 * will be processed for SCIs. To disable SCI processing completely, an empty
 * absolute ordering may be defined.
 * <p>
 * SCIs register an interest in annotations (class, method or field) and/or
 * types via the {@link javax.servlet.annotation.HandlesTypes} annotation which
 * is added to the class.
 *
 * @since Servlet 3.0
 */
public interface ServletContainerInitializer {

    /**
     * Receives notification during startup of a web application of the classes
     * within the web application that matched the criteria defined via the
     * {@link javax.servlet.annotation.HandlesTypes} annotation.
     *
     * @param c     The (possibly null) set of classes that met the specified
     *              criteria
     * @param ctx   The ServletContext of the web application in which the
     *              classes were discovered
     *
     * @throws ServletException If an error occurs
     */
    void onStartup(Set<Class<?>> c, ServletContext ctx) throws ServletException;
}
```

实现了 `ServletContainerInitializer` 接口的类必须在一个 JAR 包中的 `META-INF/services/javax.servlet.ServletContainerInitialize`r 文件中进行注册。该文件的内容应该包含实现类的全限定名，例如：

```
org.springframework.web.SpringServletContainerInitializer
```

这种注册机制利用了 **JDK 的 SPI（Service Provider Interface）机制**，容器启动时会自动加载这个文件，从中读取并加载相应的初始化类。


---



为了让 `ServletContainerInitializer` 能够接收到符合条件的类，必须使用 `@HandlesTypes` 注解来标明该类需要处理的类型。

`@HandlesTypes` 注解的 `value` 属性接收一个类数组，指定哪些类型的类会被注入到 `onStartup` 方法中。

```java
@HandlesTypes
@Target({ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface HandlesTypes {
    Class[] value();
}   
```

在 Spring 源码中导入的是动态配置类 `WebApplicationInitializer`

```java
@HandlesTypes(WebApplicationInitializer.class)
```

---


Servlet 3.0+  容器会自动去扫描 `classpath` 下所有实现了 `WebApplicationInitializer` 接口的类，如果没有找到相关类，那么 `An INFO-level log message will be issued notifying the user`，会有一条INFO级别 的日志。

如果找到了多个实现类，那么都会被实例化，如果实现了`org.springframework.core.Ordered` 接口或者添加了 `@Order` 注解，那么就按照顺序来。

```java
@Override
public void onStartup(@Nullable Set<Class<?>> webAppInitializerClasses, ServletContext servletContext)
		throws ServletException {

	List<WebApplicationInitializer> initializers = Collections.emptyList();

	if (webAppInitializerClasses != null) {
		initializers = new ArrayList<>(webAppInitializerClasses.size());
		for (Class<?> waiClass : webAppInitializerClasses) {
			// Be defensive: Some servlet containers provide us with invalid classes,
			// no matter what @HandlesTypes says...
			if (!waiClass.isInterface() && !Modifier.isAbstract(waiClass.getModifiers()) &&
					WebApplicationInitializer.class.isAssignableFrom(waiClass)) {
				try {
					initializers.add((WebApplicationInitializer)
							ReflectionUtils.accessibleConstructor(waiClass).newInstance());
				}
				catch (Throwable ex) {
					throw new ServletException("Failed to instantiate WebApplicationInitializer class", ex);
				}
			}
		}
	}

	if (initializers.isEmpty()) {
		servletContext.log("No Spring WebApplicationInitializer types detected on classpath");
		return;
	}

	servletContext.log(initializers.size() + " Spring WebApplicationInitializers detected on classpath");
	AnnotationAwareOrderComparator.sort(initializers);
	for (WebApplicationInitializer initializer : initializers) {
		initializer.onStartup(servletContext);
	}
}
```





## 初始化

Spring MVC 的核心是 DispatcherServlet，初始化也是围绕其展开的。类图如下：

<img src="https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/01/11/dispatcherservlet.png" style="height:500px; display: block; margin: auto;">


Servlet标准定义了init方法是其生命周期的初始化方法。

`com.iflove.simplespring.webmvc.HttpServletBean#init`

```java
@Override
public final void init() throws ServletException {
    // 源码里面设置了 ServletConfigPropertyValues
    // 暂时不做实现

    // Let subclasses do whatever initialization they like.
    initServletBean();
}
```

主要逻辑一目了然。注意**源码中setPropertyValues方法会导致对DispatcherServlet相关setter方法的调用，所以当进行容器初始化时从init-param中读取的参数已被设置到DispatcherServlet的相关字段(Field)中，项目代码中并未实现**。

---

### **容器初始化**


`com.iflove.simplespring.webmvc.FrameworkServlet#initServletBean`

```java
@Override
protected void initServletBean() throws ServletException {
    logger.info("Initializing Spring " + getClass().getSimpleName() + " '" + getServletName() + "'");
    logger.info("Initializing Servlet '" + getServletName() + "'");

    long startTime = System.currentTimeMillis();

    // 初始化 Web IOC 容器
    this.webApplicationContext = initWebApplicationContext();
    // 默认空实现，且无子类重写
    initFrameworkServlet();

    logger.info("Completed initialization in " + (System.currentTimeMillis() - startTime) + " ms");
}
```

`com.iflove.simplespring.webmvc.FrameworkServlet#initWebApplicationContext`


```java
protected WebApplicationContext initWebApplicationContext() {

    WebApplicationContext rootContext = WebApplicationContextUtils.getWebApplicationContext(getServletContext());
    WebApplicationContext wac = this.webApplicationContext;

    if (wac instanceof ConfigurableWebApplicationContext) {
        ConfigurableWebApplicationContext cwac = (ConfigurableWebApplicationContext) wac;
        if (cwac.getParent() == null) {
            cwac.setParent(rootContext);
        }
        // 配置上下文并刷新
        configureAndRefreshWebApplicationContext(cwac);
    } else if (wac == null) {
        // 寻找 IOC 容器
        wac = findWebApplicationContext();
    }

    if (wac == null) {
        // 创建新的 IOC 容器
        wac = createWebApplicationContext(rootContext);
    }

    // MVC 初始化 (由 DispatcherServlet 实现)
    onRefresh(wac);

    // 将 WebApplicationContext 实例放入 Servlet 上下文中共享
    String attrName = getServletContextAttributeName();
    getServletContext().setAttribute(attrName, wac);

    return wac;
}
```

下面分部分解读

---


#### **根容器查找**

spring-mvc支持Spring容器与MVC容器共存，此时，**Spring容器即根容器，mvc容器将根容器视为父容器**。

根据Servlet规范，各组件的加载 顺序如下:

`listener -> filter -> servlet`

`com.iflove.simplespring.webmvc.context.support.WebApplicationContextUtils#getWebApplicationContext(javax.servlet.ServletContext)`

```java
String ROOT_WEB_APPLICATION_CONTEXT_ATTRIBUTE = WebApplicationContext.class.getName() + ".ROOT";
public static WebApplicationContext getWebApplicationContext(ServletContext sc) {
    return getWebApplicationContext(sc, WebApplicationContext.ROOT_WEB_APPLICATION_CONTEXT_ATTRIBUTE);
}
```

两参数方法:

`com.iflove.simplespring.webmvc.context.support.WebApplicationContextUtils#getWebApplicationContext(javax.servlet.ServletContext, java.lang.String)`

```java
public static WebApplicationContext getWebApplicationContext(ServletContext sc, String attrName) {
    Object attr = sc.getAttribute(attrName);
    if (attr == null) {
        return null;
    }
    return (WebApplicationContext) attr;
}
```


可以得出结论:

**如果Spring根容器存在，那么它被保存在ServletContext中，其key为`WebApplicationContext.class.getName() + ".ROOT"`。**

---

#### **容器创建**

`com.iflove.simplespring.webmvc.FrameworkServlet#createWebApplicationContext`

```java
protected WebApplicationContext createWebApplicationContext(ApplicationContext parent) {
    // 创建一个新的 IOC 容器
    ConfigurableWebApplicationContext wac = new AnnotationConfigWebApplicationContext();
    // 设置父容器
    wac.setParent(parent);
    // 配置上下文并刷新
    configureAndRefreshWebApplicationContext(wac);
    return wac;
}
```

注意：这里创建新的IOC容器默认为 `AnnotationConfigWebApplicationContext`，而 Spring 源码中为 `XmlWebApplicationContext`


`configureAndRefreshWebApplicationContext`主要作用即配置servlet上下文并刷新容器

核心源码:

`com.iflove.simplespring.webmvc.FrameworkServlet#configureAndRefreshWebApplicationContext`

```java
protected void configureAndRefreshWebApplicationContext(ConfigurableWebApplicationContext wac) {
    // 配置 servlet 上下文
    wac.setServletContext(getServletContext());
    wac.setServletConfig(getServletConfig());
    // 刷新容器
    wac.refresh();
}
```

---

### **MVC初始化**

入口位于`DispatcherServlet`的`initStrategies`方法(经由`onRefresh`调用):

```java
/**
 * mvc 初始化(核心方法)
 *
 * @param context the current WebApplicationContext
 */
@Override
protected void onRefresh(ApplicationContext context) {
    initStrategies(context);
}

protected void initStrategies(ApplicationContext context) {
    // 初始化文件上传解析器（MultipartResolver）
    // 用于解析包含文件上传的 multipart 请求。Spring 提供了标准实现，如
    // CommonsMultipartResolver（基于 Apache Commons FileUpload）和
    // StandardServletMultipartResolver（基于 Servlet 3.0 标准）。
    // 如果需要支持文件上传功能，则必须配置此解析器。
    // initMultipartResolver(context);

    // 初始化区域解析器（LocaleResolver）
    // 用于解析请求的区域信息（Locale），以便在国际化应用中提供正确的语言和格式。
    // 常见的实现包括 CookieLocaleResolver 和 SessionLocaleResolver，
    // 它们分别基于 Cookie 或 Session 存储和解析区域信息。
    // initLocaleResolver(context);

    // 初始化主题解析器（ThemeResolver）
    // 用于支持 Spring MVC 的主题功能。主题通常用来改变应用程序的视觉外观，比如 CSS 样式。
    // 常见实现包括 FixedThemeResolver 和 CookieThemeResolver，
    // 它们分别支持固定主题和基于 Cookie 的动态主题切换。
    // initThemeResolver(context);

    // 初始化请求 URL 映射器（HandlerMapping）
    // 用于将请求 URL 映射到对应的处理器（Handler）。
    // Spring MVC 提供了多种 HandlerMapping 实现，如
    // - RequestMappingHandlerMapping：基于 @RequestMapping 注解的映射。
    // - SimpleUrlHandlerMapping：基于 XML 或 Java 配置的静态映射。
    // DispatcherServlet 会从 HandlerMapping 中找到与请求匹配的处理器。
    initHandlerMappings(context);

    // 初始化请求适配器（HandlerAdapter）
    // 用于将请求的处理委派给具体的处理器（Handler）。
    // HandlerAdapter 通过多态支持不同类型的处理器，例如：
    // - HttpRequestHandlerAdapter：支持实现 HttpRequestHandler 接口的处理器。
    // - SimpleControllerHandlerAdapter：支持实现 Controller 接口的处理器。
    // - RequestMappingHandlerAdapter：支持基于 @RequestMapping 的处理器方法。
    // DispatcherServlet 会根据匹配的处理器选择适当的适配器执行请求。
    initHandlerAdapters(context);

    // 初始化异常处理器（HandlerExceptionResolver）
    // 用于捕获和处理请求过程中抛出的异常。
    // Spring MVC 提供默认实现，如：
    // - ExceptionHandlerExceptionResolver：支持 @ExceptionHandler 注解。
    // - ResponseStatusExceptionResolver：支持 @ResponseStatus 注解。
    // - DefaultHandlerExceptionResolver：处理 Spring 内部标准异常。
    // 如果没有匹配的异常处理器，异常将被容器默认的错误页面处理。
    // initHandlerExceptionResolvers(context);

    // 初始化请求到视图名称的转换器（RequestToViewNameTranslator）
    // 用于在没有显式指定视图名称的情况下，从请求路径推断视图名称。
    // 默认实现是 DefaultRequestToViewNameTranslator，它会从 URL 中提取路径作为视图名称。
    // 例如：请求 `/user/profile` 会解析为视图名称 `user/profile`。
    // initRequestToViewNameTranslator(context);

    // 初始化视图解析器（ViewResolver）
    // 用于将视图名称解析为具体的视图对象（View），比如 JSP、Thymeleaf 或 Freemarker。
    // 常见的实现包括：InternalResourceViewResolver、ThymeleafViewResolver。
    // DispatcherServlet 根据解析后的视图对象渲染响应。
    // initViewResolvers(context);

    // 初始化 Flash 属性管理器（FlashMapManager）
    // 用于在请求重定向时，存储和传递临时属性（Flash 属性）。
    // Spring 提供默认实现：DefaultFlashMapManager，基于 Session 存储 Flash 属性。
    // Flash 属性通常用于传递一次性的用户反馈消息，例如表单提交后的成功提示。
    // initFlashMapManager(context);
}
```

源码中 MVC初始化 存在多个init方法，为了简化代码，仅给出2个核心实现

显然，这里就是spring-mvc的核心了。

---

#### **HandlerMapping检查**

initHandlerMappings方法用于确保容器中**至少含有一个HandlerMapping对象**。

如果没有开启注解驱动，那么将会使用默认的`HandlerMapping`，相关代码:

`com.iflove.simplespring.webmvc.DispatcherServlet#initHandlerMappings`

```java
private void initHandlerMappings(ApplicationContext context) {
    //从容器中拿
    final Map<String, HandlerMapping> map = BeanFactoryUtils.beansOfTypeIncludingAncestors(context, HandlerMapping.class, true, false);
    if (!ObjectUtils.isEmpty(map)) {
        this.handlerMappings = new ArrayList<>(map.values());
    } else {
        //没有则从默认配置文件中拿
        this.handlerMappings.addAll(getDefaultStrategies(context, HandlerMapping.class));
    }
    this.handlerMappings.sort(Comparator.comparingInt(Ordered::getOrder));
}
```

默认的策略由`DispatcherServlet.properties`决定，**在 Spring 源码中是`BeanNameUrlHandlerMapping`、`RequestMappingHandlerMapping`、`RouterFunctionMapping`，而 Simple-Spring 中为`RequestMappingHandlerMapping`**。

`DispatcherServlet.properties`具体配置如下：

`src/main/resources/com/iflove/simplespring/webmvc/DispatcherServlet.properties`

注意：`DispatcherServlet.properties`如果放在`resources` 需要与 `DispatcherServlet.java` 的路径一致

```
com.iflove.simplespring.webmvc.HandlerMapping=com.iflove.simplespring.webmvc.handler.RequestMappingHandlerMapping
com.iflove.simplespring.webmvc.HandlerAdapter=com.iflove.simplespring.webmvc.adapter.RequestMappingHandlerMethodAdapter
```

继续跟踪 `getDefaultStrategies(...)` 方法代码：

1. 首先根据已定义的 `DEFAULT_STRATEGIES_PATH`，获得指定默认策略配置文件的路径
2. 加载配置文件，并获得对应的策略类名
3. 通过 Spring 上下文创建并初始化策略类

`com.iflove.simplespring.webmvc.DispatcherServlet#getDefaultStrategies`


```java
/**
 * 与 DispatcherServlet 类相关的类路径资源的名称，用于定义 DispatcherServlet 的默认策略名称
 * 注意：路径应保持一致
 */
private static final String DEFAULT_STRATEGIES_PATH = "DispatcherServlet.properties";

protected <T> List<T> getDefaultStrategies(ApplicationContext context, Class<T> strategyInterface) {
    if (defaultStrategies == null) {
        try {
            // Load default strategy implementations from properties file.
            // This is currently strictly internal and not meant to be customized
            // by application developers.
            ClassPathResource resource = new ClassPathResource(DEFAULT_STRATEGIES_PATH, DispatcherServlet.class);
            defaultStrategies = PropertiesLoaderUtils.loadProperties(resource);
        } catch (IOException ex) {
            throw new IllegalStateException("Could not load '" + DEFAULT_STRATEGIES_PATH + "': " + ex.getMessage());
        }
    }

    String key = strategyInterface.getName();
    String value = defaultStrategies.getProperty(key);
    if (value != null) {
        String[] classNames = StringUtils.commaDelimitedListToStringArray(value);
        List<T> strategies = new ArrayList<>(classNames.length);
        for (String className : classNames) {
            try {
                Class<?> clazz = ClassUtils.forName(className, DispatcherServlet.class.getClassLoader());
                Object strategy = createDefaultStrategy(context, clazz);
                strategies.add((T) strategy);
            } catch (ClassNotFoundException ex) {
                throw new BeanInitializationException(
                        "Could not find DispatcherServlet's default strategy class [" + className +
                                "] for interface [" + key + "]", ex);
            } catch (LinkageError err) {
                throw new BeanInitializationException(
                        "Unresolvable class definition for DispatcherServlet's default strategy class [" +
                                className + "] for interface [" + key + "]", err);
            }
        }
        return strategies;
    } else {
        return Collections.emptyList();
    }
}

protected Object createDefaultStrategy(ApplicationContext context, Class<?> clazz) {
    return context.getAutowireCapableBeanFactory().createBean(clazz);
}
```

---


#### **HandlerAdapter检查**

套路和上面完全一样，**Spring默认使用`HttpRequestHandlerAdapter`、`SimpleControllerHandlerAdapter`、`RequestMappingHandlerAdapter`、`HandlerFunctionAdapter`，Simple-Spring中使用`RequestMappingHandlerMethodAdapter`**。

btw, Spring的`DispatcherServlet.properties`在`org/springframework/web/servlet/DispatcherServlet.properties`


----


### **HandlerMapping初始化**

此接口用以根据请求的URL寻找合适的处理器，下面以`RequestMappingHandlerMapping`位代表进行说明。


#### **RequestMappingHandlerMapping**

此实现根据`@Controller`和`@RequestMapping`注解完成解析。类图(忽略部分接口):

![HandlerMapping](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/01/19/handlermapping.png)


初始化的入口位于`AbstractHandlerMapping`的`afterPropertiesSet`方法和`initApplicationContext`方法，`afterPropertiesSet`调用了`initHandlerMethods`:

`com.iflove.simplespring.webmvc.handler.AbstractHandlerMapping#afterPropertiesSet`

```java
@Override
public void afterPropertiesSet() throws Exception {
    initHandlerMethod();
}
```

`com.iflove.simplespring.webmvc.handler.AbstractHandlerMapping#initHandlerMethod`

```java
/**
 * 初始化处理器方法
 */
private void initHandlerMethod() throws Exception {
    // from Yusiheng
    //获取所有bean
    final ApplicationContext context = obtainApplicationContext();
    String[] names = BeanFactoryUtils.beanNamesForTypeIncludingAncestors(context, Object.class);
    for (String name : names) {
        //拿到当前class
        Class type = null;
        try {
            type = context.getType(name);
        } catch (Exception e) {
            e.printStackTrace();
        }
        //判断是否是一个handler -> 交给子类
        if (type != null && isHandler(type)) {
            //找到bean当中的HandlerMethod -> 交给子类
            detectHandlerMethod(name);
        }
    }
}
```


`detectHandlerMethods`方法将反射遍历类中所有的`public`方法，如果方法上含有`@RequestMapping`注解，那么将方法上的路径与类上的基础路径(如果有)进行合并，之后将映射(匹配关系)注册到`MappingRegistry`中。

注意，**类上的@RequestMapping注解只能作为基路径存在，也就是说，如果类里面没有任何的方法级@RequestMapping注解，那么类上的注解是没有意义的**。这一点可以从实验和源码上得到证实。

下面我们关注一下 Spring 源码中映射关系是如何保存(注册)的。

内部类`AbstractHandlerMethodMapping.MappingRegistry`是映射的载体，类图:

![MappingRegistry](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/01/19/mappingregistry.png)

其register方法简略版源码:

```java
public void register(T mapping, Object handler, Method method) {
    //包装bean和方法
    HandlerMethod handlerMethod = createHandlerMethod(handler, method);
    this.mappingLookup.put(mapping, handlerMethod);
    List<String> directUrls = getDirectUrls(mapping);
    for (String url : directUrls) {
        this.urlLookup.add(url, mapping);
    }
    String name = null;
    if (getNamingStrategy() != null) {
        name = getNamingStrategy().getName(handlerMethod, mapping);
        addMappingName(name, handlerMethod);
    }
    CorsConfiguration corsConfig = initCorsConfiguration(handler, method, mapping);
    if (corsConfig != null) {
        this.corsLookup.put(handlerMethod, corsConfig);
    }
    this.registry.put(mapping, new MappingRegistration<T>(mapping, handlerMethod, directUrls, name));
}
```

`mapping`其实是一个`RequestMappingInfo`对象，可以将其看做是 **@RequestMapping注解各种属性的一个封装**。最终由`RequestMappingInfo.createRequestMappingInfo`方法创建，源码:

```java
protected RequestMappingInfo createRequestMappingInfo(
        RequestMapping requestMapping, RequestCondition<?> customCondition) {
    return RequestMappingInfo
            .paths(resolveEmbeddedValuesInPatterns(requestMapping.path()))
            .methods(requestMapping.method())
            .params(requestMapping.params())
            .headers(requestMapping.headers())
            .consumes(requestMapping.consumes())
            .produces(requestMapping.produces())
            .mappingName(requestMapping.name())
            .customCondition(customCondition)
            .options(this.config)
            .build();
}
```

这就很明显了，具体每种属性什么意义可以参考`@RequestMapping`源码。

`register`方法中`urlLookup`其实就是将`paths`属性中的每个`path`都与处理器做映射。

`getNamingStrategy`方法得到的是一个`HandlerMethodMappingNamingStrategy`接口的实例，此接口用以根据`HandlerMethod`得到一个名字，类图:

![HandlerMethodMappingNamingStrategy](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/01/19/handlermethodmappingnamingstrategy.png)


比如对于我们的控制器, `SimpleController.echo`方法，最终得到的名字将是`SC#echo`。


<br>

以上是对Spring源码中如何保存(注册)映射关系的解读，而在`Simple-Spring`中实现的方法非常简单。


首先是 `detectHandlerMethod` 方法，类似于 Spring 源码的实现，不过多赘述

`com.iflove.simplespring.webmvc.handler.RequestMappingHandlerMapping#detectHandlerMethod`


```java
@Override
protected void detectHandlerMethod(String name) throws Exception {
    // from Yusiheng
    // 获取当前类
    final ApplicationContext context = obtainApplicationContext();
    final Class<?> type = context.getType(name);
    // 获取当前类下的所有方法
    final Method[] methods = type.getDeclaredMethods();
    List<HandlerMethod> handlerMethods = new ArrayList<>();
    // 获得类上的路径
    String path = "";
    if (AnnotatedElementUtils.hasAnnotation(type, RequestMapping.class)) {
        final RequestMapping requestMapping = AnnotatedElementUtils.findMergedAnnotation(type, RequestMapping.class);
        final String value = requestMapping.value();
        path = value.equals("") ? "" : value;
    }

    final Object bean = context.getBean(name);

    for (Method method : methods) {
        // 获取方法上是否存在RequestMapping注解
        if (AnnotatedElementUtils.hasAnnotation(method, RequestMapping.class)) {
            // 收集
            final HandlerMethod handlerMethod = new HandlerMethod(bean, method);
            // 获得方法上的路径
            final RequestMapping requestMapping = AnnotatedElementUtils.findMergedAnnotation(method, RequestMapping.class);
            final String value = requestMapping.value();
            String childPath = value.equals("") ? "" : value;
            handlerMethod.setRequestMethods(requestMapping.requestMethod());
            // 拼接路径
            handlerMethod.setPath(path + childPath);

            handlerMethods.add(handlerMethod);
        }
    }
    // 注册HandlerMethod
    if (!ObjectUtils.isEmpty(handlerMethods)) {
        for (HandlerMethod handlerMethod : handlerMethods) {
            register(handlerMethod);
        }
    }
}
```

重点在于 `register` 方法，对于路径映射的注册，通过 `HashMap` 做简单实现，它的键是请求路径（String 类型），值是一个 `Set<HandlerMethod>`，表示在该路径下可能匹配的多个 `HandlerMethod`（处理方法）

如果路径包含 `{}`，即带有路径参数的占位符，例如 `/user/{id}`，则将 `{}` 中的内容替换成正则表达式 `(\w+)`，以支持路径参数的匹配。

* 替换后的路径会用于后续的路径匹配。
* 如果路径没有路径参数，直接注册该路径和对应的 HandlerMethod。


`com.iflove.simplespring.webmvc.handler.AbstractHandlerMapping#register(com.iflove.simplespring.webmvc.handler.HandlerMethod)`

```java
// 路径映射表，每个路径对应多个 HandlerMethod
private final Map<String, Set<HandlerMethod>> mappingRegistry = new HashMap<>();

public void register(HandlerMethod handlerMethod) {
    // 获取请求路径
    String path = handlerMethod.getPath();
    if (path.contains("{") && path.contains("}")) {
        // 路径替换
        path = path.replaceAll("\\{\\w+}", "(\\\\w+)");
        // 存在，可能请求类型一样
        register(path, handlerMethod);
    } else {
        // 根据请求路径的不同分别保存HandlerMethod
        register(path, handlerMethod);
    }
}

public void register(String path, HandlerMethod handlerMethod) {
    // 注册处理器
    mappingRegistry.computeIfAbsent(path, k -> new HashSet<>()).add(handlerMethod);
}
```


----


### **HandlerAdapter初始化**

同样，以RequestMappingHandlerAdapter为例进行说明，类图:

![RequestMappingHandlerMethodAdapter](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/01/19/requestmappinghandlermethodadapter.png)


显然，入口在实现了`InitializingBean`的`afterPropertiesSet`方法:


`com.iflove.simplespring.webmvc.adapter.RequestMappingHandlerMethodAdapter#afterPropertiesSet`


```java
/**
 * 初始化基础组件
 */
@Override
public void afterPropertiesSet() throws Exception {
    resolverComposite.addResolvers(getDefaultArgumentResolver());
    returnValueHandlerComposite.addMethodReturnValueHandlers(getDefaultMethodReturnValueHandler());
}
```


---


#### **参数解析器**

参数解析器，负责从request中解析、得到Controller方法所需的参数。

![diagram](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/01/19/diagram1.png)


`com.iflove.simplespring.webmvc.adapter.RequestMappingHandlerMethodAdapter#getDefaultArgumentResolver`

```java
/**
 * 初始化参数解析器
 */
public List<HandlerMethodArgumentResolver> getDefaultArgumentResolver() {
    final List<HandlerMethodArgumentResolver> resolvers = new ArrayList<>();
    resolvers.add(new PathVariableMethodArgumentResolver());
    resolvers.add(new PathVariableMapMethodArgumentResolver());
    resolvers.add(new RequestCookieMethodArgumentResolver());
    resolvers.add(new RequestHeaderMethodArgumentResolver());
    resolvers.add(new RequestHeaderMapMethodArgumentResolver());
    resolvers.add(new RequestPartMethodArgumentResolver());
    resolvers.add(new RequestParamMethodArgumentResolver());
    resolvers.add(new RequestParamMapMethodArgumentResolver());
    resolvers.add(new RequestRequestBodyMethodArgumentResolver());
    resolvers.add(new ServletRequestMethodArgumentResolver());
    resolvers.add(new ServletResponseMethodArgumentResolver());
    return resolvers;
}
```


----

#### **返回结果解析器**

`HandlerMethodReturnValueHandler`接口用以处理方法调用(Controller方法)的返回值，类图:

![HandlerMethodReturnValueHandler](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2025/01/19/handlermethodreturnvaluehandler.png)





## 请求执行流程


### **1. Service**

首先请求进入到 `FrameworkServlet` 重写的 `Service` 方法中，此处有一个判断逻辑

- 如果请求类型为 `GET, POST, DELETE, PUT` 等常见 `Http` 方法，走 `super.service` 处理
- 否则走自定义 `processRequest` 方法


`com.iflove.simplespring.webmvc.FrameworkServlet#service`

```java
/**
 * 拦截请求，根据请求类型判断去向
 * @param request Http 请求
 * @param response Http 响应
 * @throws ServletException ServletException
 * @throws IOException IOException
 */
@Override
protected void service(HttpServletRequest request, HttpServletResponse response)
        throws ServletException, IOException {

    // 如果请求类型为 GET, POST, DELETE, PUT 等常见 Http 方法，走 super.service 处理 
    if (HTTP_SERVLET_METHODS.contains(request.getMethod())) {
        super.service(request, response);
    }
    else {
        processRequest(request, response);
    }
}
```

而进入到 `super.service` 方法中的请求最终同样回到自定义的 `processRequest` 方法中，接下来通过源码对此进行解释

`javax.servlet.http.HttpServlet#service(javax.servlet.http.HttpServletRequest, javax.servlet.http.HttpServletResponse)`

```java
protected void service(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
    String method = req.getMethod();
    long lastModified;
    if (method.equals("GET")) {
        lastModified = this.getLastModified(req);
        if (lastModified == -1L) {
            this.doGet(req, resp);
        } else {
            long ifModifiedSince;
            try {
                ifModifiedSince = req.getDateHeader("If-Modified-Since");
            } catch (IllegalArgumentException var9) {
                ifModifiedSince = -1L;
            }

            if (ifModifiedSince < lastModified / 1000L * 1000L) {
                this.maybeSetLastModified(resp, lastModified);
                this.doGet(req, resp);
            } else {
                resp.setStatus(304);
            }
        }
    } else if (method.equals("HEAD")) {
        lastModified = this.getLastModified(req);
        this.maybeSetLastModified(resp, lastModified);
        this.doHead(req, resp);
    } else if (method.equals("POST")) {
        this.doPost(req, resp);
    } else if (method.equals("PUT")) {
        this.doPut(req, resp);
    } else if (method.equals("DELETE")) {
        this.doDelete(req, resp);
    } else if (method.equals("OPTIONS")) {
        this.doOptions(req, resp);
    } else if (method.equals("TRACE")) {
        this.doTrace(req, resp);
    } else {
        String errMsg = lStrings.getString("http.method_not_implemented");
        Object[] errArgs = new Object[]{method};
        errMsg = MessageFormat.format(errMsg, errArgs);
        resp.sendError(501, errMsg);
    }

}
```

可以看到在 `super.service` 方法中根据请求类型进入到各自的 `do**` 方法中，而 请求的 `do**` 方法又被 `FrameworkServlet` 重写, 且方法体均为 `processRequest(request, response);`，已 `doGet` 方法为例

PS: 源码重写的 `doOptions` 和 `doTrace` 有些不一样的内容，但不常用，故不做实现

`com.iflove.simplespring.webmvc.FrameworkServlet#doGet`

```java
/**
 * Delegate GET requests to processRequest/doService.
 * <p>Will also be invoked by HttpServlet's default implementation of {@code doHead},
 * with a {@code NoBodyResponse} that just captures the content length.
 * @see #doHead
 */
@Override
protected final void doGet(HttpServletRequest request, HttpServletResponse response)
        throws ServletException, IOException {
    processRequest(request, response);
}
```

---


### **2. processRequest**

`processRequest` 是 `FrameworkServlet` 中的核心方法，**用于接收并初始化 HTTP 请求处理的上下文环境**。

主要做了以下操作：

1. 记录开始时间
2. 设置请求上下文
    * 使用 `LocaleContextHolder` 和 `RequestContextHolder` 设置本地化上下文和请求上下文
    * 通过 `buildLocaleContext` 和 `buildRequestAttributes` 方法为当前线程创建 `LocaleContext` 和 `ServletRequestAttributes`
3. 初始化异步管理器
4. 调用 `doService` 方法
5. 异常处理
6. 清理上下文
7. 日志记录和事件发布

`com.iflove.simplespring.webmvc.FrameworkServlet#processRequest`

```java
/**
 * 处理 Http 请求
 * @param request Http 请求
 * @param response Http 响应
 */
protected final void processRequest(HttpServletRequest request, HttpServletResponse response)
        throws ServletException, IOException {
        
    // 记录开始时间，设置请求上下文，初始化异步管理器
    /*
    long startTime = System.currentTimeMillis();
    Throwable failureCause = null;

    LocaleContext previousLocaleContext = LocaleContextHolder.getLocaleContext();
    LocaleContext localeContext = buildLocaleContext(request);

    RequestAttributes previousAttributes = RequestContextHolder.getRequestAttributes();
    ServletRequestAttributes requestAttributes = buildRequestAttributes(request, response, previousAttributes);

    WebAsyncManager asyncManager = WebAsyncUtils.getAsyncManager(request);
    asyncManager.registerCallableInterceptor(org.springframework.web.servlet.FrameworkServlet.class.getName(), new org.springframework.web.servlet.FrameworkServlet.RequestBindingInterceptor());

    initContextHolders(request, localeContext, requestAttributes);
    */

    try {
        doService(request, response);
    }
    catch (ServletException | IOException ex) {
        throw ex;
    }
    catch (Throwable ex) {
        throw new ServletException("Request processing failed: " + ex, ex);
    }

    // 清理上下文，日志记录和事件发布 
    /*
    finally {
        resetContextHolders(request, previousLocaleContext, previousAttributes);
        if (requestAttributes != null) {
            requestAttributes.requestCompleted();
        }
        logResult(request, response, failureCause, asyncManager);
        publishRequestHandledEvent(request, response, startTime, failureCause);
    }
    */
}
```

---


### **3. doService**

`doService` 是 `processRequest` 的子流程，用于封装更多的细节逻辑，**包括为请求分发创建上下文环境，并调用核心分发方法 `doDispatch`**。

主要做了以下操作：

1. 日志记录
2. 请求包含支持
3. 添加框架级对象
    * 将 Web 应用上下文、语言环境解析器（LocaleResolver）、主题解析器等对象添加到请求中，供后续处理使用。
4. 解析闪存消息
5. 路径解析
6. 调用 `doDispatch`，进行核心的请求分发逻辑

`com.iflove.simplespring.webmvc.DispatcherServlet#doService`

```java
/**
 * 暴露特定于 DispatcherServlet 的请求属性，并将实际的请求分派委托给 {@link #doDispatch} 方法
 */
@Override
protected void doService(HttpServletRequest request, HttpServletResponse response) throws Exception {
    // 日志记录，请求包含支持，添加框架级对象，解析闪存信息，路径解析
    /*
    logRequest(request);

	// Keep a snapshot of the request attributes in case of an include,
	// to be able to restore the original attributes after the include.
	Map<String, Object> attributesSnapshot = null;
	if (WebUtils.isIncludeRequest(request)) {
		attributesSnapshot = new HashMap<>();
		Enumeration<?> attrNames = request.getAttributeNames();
		while (attrNames.hasMoreElements()) {
			String attrName = (String) attrNames.nextElement();
			if (this.cleanupAfterInclude || attrName.startsWith(DEFAULT_STRATEGIES_PREFIX)) {
				attributesSnapshot.put(attrName, request.getAttribute(attrName));
			}
		}
	}

	// Make framework objects available to handlers and view objects.
	request.setAttribute(WEB_APPLICATION_CONTEXT_ATTRIBUTE, getWebApplicationContext());
	request.setAttribute(LOCALE_RESOLVER_ATTRIBUTE, this.localeResolver);
	request.setAttribute(THEME_RESOLVER_ATTRIBUTE, this.themeResolver);
	request.setAttribute(THEME_SOURCE_ATTRIBUTE, getThemeSource());

	if (this.flashMapManager != null) {
		FlashMap inputFlashMap = this.flashMapManager.retrieveAndUpdate(request, response);
		if (inputFlashMap != null) {
			request.setAttribute(INPUT_FLASH_MAP_ATTRIBUTE, Collections.unmodifiableMap(inputFlashMap));
		}
		request.setAttribute(OUTPUT_FLASH_MAP_ATTRIBUTE, new FlashMap());
		request.setAttribute(FLASH_MAP_MANAGER_ATTRIBUTE, this.flashMapManager);
	}

	RequestPath previousRequestPath = null;
	if (this.parseRequestPath) {
		previousRequestPath = (RequestPath) request.getAttribute(ServletRequestPathUtils.PATH_ATTRIBUTE);
		ServletRequestPathUtils.parseAndCache(request);
	}
    */
    
    // 设置 Web 应用上下文 
    request.setAttribute(WEB_APPLICATION_CONTEXT_ATTRIBUTE, getWebApplicationContext());
    
    // 核心请求分发逻辑 
    doDispatch(request, response);

    /*
	finally {
		if (!WebAsyncUtils.getAsyncManager(request).isConcurrentHandlingStarted()) {
			// Restore the original attribute snapshot, in case of an include.
			if (attributesSnapshot != null) {
				restoreAttributesAfterInclude(request, attributesSnapshot);
			}
		}
		if (this.parseRequestPath) {
			ServletRequestPathUtils.setParsedRequestPath(previousRequestPath, request);
		}
	}
     */
}
```


---

### **4. 请求分发 doDispatch**

`doDispatch` 是 `Spring MVC` 的请求分发核心逻辑，负责将请求分配给合适的处理器（Handler）并执行。


`com.iflove.simplespring.webmvc.DispatcherServlet#doDispatch`

```java
/**
 * 处理实际的分派到处理器的过程。
 *
 * <p>处理器将通过按顺序应用 servlet 的 HandlerMappings 来获取。
 * HandlerAdapter 将通过查询 servlet 安装的 HandlerAdapters 来找到第一个支持该处理器类的适配器。
 * <p>所有的 HTTP 方法都由该方法处理。具体哪些方法是可接受的，由 HandlerAdapters 或处理器本身决定
 *
 * @param req  current HTTP request
 * @param resp current HTTP response
 * @throws Exception in case of any kind of processing failure
 */
protected void doDispatch(HttpServletRequest req, HttpServletResponse resp) throws Exception {

    Exception ex = null;
    HandlerExecutionChain handlerExecutionChain = null;
    try {
        handlerExecutionChain = getHandler(req);
        //handlerMethod找不到则返回404
        if (ObjectUtils.isEmpty(handlerExecutionChain)) {
            resp.sendError(HttpServletResponse.SC_NOT_FOUND);
            return;
        }

        handlerExecutionChain.afterCompletion(req, resp, handlerExecutionChain.getHandlerMethod(), ex);

        // 获得适配器
        HandlerAdapter ha = getHandlerAdapter(handlerExecutionChain.getHandlerMethod());
        if (!handlerExecutionChain.applyPreInterceptor(req, resp)) {
            return;
        }
        ha.handle(req, resp, handlerExecutionChain.getHandlerMethod());
        handlerExecutionChain.applyPostInterceptor(req, resp);
    } catch (Exception e) {
        ex = e;
    }
    try {
        processDispatchResult(req, resp, handlerExecutionChain, ex);
    } catch (Exception e) {
        throw new ServletException(e.getMessage());
    }
}
```


---

### **5. 处理器查找 getHandler**

查找对应的处理器 `handler`，并与 `HandlerInterceptor` 组装为处理器链返回。

`com.iflove.simplespring.webmvc.DispatcherServlet#getHandler`

```java
/**
 * Return the HandlerExecutionChain for this request.
 * <p>Tries all handler mappings in order.
 *
 * @param request current HTTP request
 * @return the HandlerExecutionChain, or {@code null} if no handler could be found
 */
@Nullable
protected HandlerExecutionChain getHandler(HttpServletRequest request) throws Exception {
    if (this.handlerMappings != null) {
        for (HandlerMapping mapping : this.handlerMappings) {
            HandlerExecutionChain handler = mapping.getHandler(request);
            if (handler != null) {
                return handler;
            }
        }
    }
    return null;
}
```



---


### **6. 适配器查找 getHandlerAdapter**

根据 `handler` 查找支持的适配器

`com.iflove.simplespring.webmvc.DispatcherServlet#getHandlerAdapter`

```java
/**
 * Return the HandlerAdapter for this handler object.
 *
 * @param handler the handler object to find an adapter for
 * @throws ServletException if no HandlerAdapter can be found for the handler. This is a fatal error.
 */
protected HandlerAdapter getHandlerAdapter(HandlerMethod handler) throws ServletException {
    if (this.handlerAdapters != null) {
        for (HandlerAdapter adapter : this.handlerAdapters) {
            if (adapter.support(handler)) {
                return adapter;
            }
        }
    }
    throw new ServletException("No adapter for handler [" + handler +
            "]: The DispatcherServlet configuration needs to include a HandlerAdapter that supports this handler");
}
```

---


### **7. 请求处理 ha.handle(...)**

在请求处理前后分别进行拦截器的前置处理与后置处理。

```java
if (!handlerExecutionChain.applyPreInterceptor(req, resp)) {
    return;
}
ha.handle(req, resp, handlerExecutionChain.getHandlerMethod());
handlerExecutionChain.applyPostInterceptor(req, resp);
```

`com.iflove.simplespring.webmvc.adapter.RequestMappingHandlerMethodAdapter#handle`

```java
/**
 * 处理请求，执行方法就在这内部
 */
@Override
public void handle(HttpServletRequest req, HttpServletResponse res, HandlerMethod handler) throws Exception {
    final WebServletRequest webServletRequest = new WebServletRequest(req, res);
    // 需要将 HandlerMethod执行，创建一个类来包装
    final ServletInvocableHandlerMethod invocableMethod = new ServletInvocableHandlerMethod();
    // 获取到初始化的组件
    invocableMethod.setHandlerMethod(handler);
    invocableMethod.setConversionService(conversionService);
    invocableMethod.setResolverComposite(resolverComposite);
    invocableMethod.setReturnValueHandlerComposite(returnValueHandlerComposite);
    // 执行方法逻辑
    invocableMethod.invokeAndHandle(webServletRequest, handler);
}
```



