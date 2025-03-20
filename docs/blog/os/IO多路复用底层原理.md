---
title:  IO多路复用底层原理 
authors: [cangjingyue]
tags: 
    - "os"
categories:
  - "os"
---

# IO多路复用底层原理 

## 用户空间和内核空间

现在操作系统都是采用虚拟存储器，那么对32位操作系统而言，它的寻址空间（虚拟存储空间）为4G（2的32次方）。

操作系统的核心是**内核**，独立于普通的应用程序，可以访问受保护的内存空间，也有访问底层硬件设备的所有权限。为了保证用户进程不能直接操作内核（kernel），保证内核的安全，操心系统将虚拟空间划分为两部分，一部分为**内核空间**，一部分为**用户空间**。针对linux操作系统而言，**将最高的1G字节（从虚拟地址0xC0000000到0xFFFFFFFF），供内核使用，称为内核空间**，而将**较低的3G字节（从虚拟地址0x00000000到0xBFFFFFFF），供各个进程使用，称为用户空间**。

用户空间：用户代码、用户堆栈。用户程序运行在 **非特权模式（Ring 3）**，无法直接操作硬件和内核数据结构。

内核空间：内核代码、内核调度程序、进程描述符（内核堆栈、thread_info 进程描述符）。内核代码在**特权模式（Ring 0）**运行，能够访问所有硬件资源，如 **CPU 寄存器、I/O 端口、设备寄存器** 等

- 进程描述符和用户的进程是一一对应的
- SYS_API 系统调用：如 read、write，系统调用就是 0X80 中断
- 进程描述符 pd：进程从用户态切换到内核态时，需要**保存用户态时的上下文信息在 PCB 中**
- 线程上下文：用户程序基地址，程序计数器、cpu cache、寄存器等，方便程序切回用户态时恢复现场
- 内核堆栈：**系统调用函数也是要创建变量的，**这些变量在内核堆栈上分配

![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Java/IO-用户态和内核态.png)

## 进程切换

为了控制进程的执行，内核必须有能力挂起正在CPU上运行的进程，并恢复以前挂起的某个进程的执行。这种行为被称为进程切换。因此可以说，任何进程都是在操作系统内核的支持下运行的，是与内核紧密相关的。

从一个进程的运行转到另一个进程上运行，这个过程中经过下面这些变化：  

1. 保存处理机上下文，包括程序计数器和其他寄存器。  
2. 更新PCB信息。  
3. 把进程的PCB移入相应的队列，如就绪、在某事件阻塞等队列。  
4. 选择另一个进程执行，并更新其PCB。  
5. 更新内存管理的数据结构。  
6. 恢复处理机上下文。

## 进程阻塞

正在执行的进程，由于期待的某些事件未发生，如请求系统资源失败、等待某种操作的完成、新数据尚未到达或无新工作做等，则由系统自动执行阻塞原语(Block)，使自己由运行状态变为阻塞状态。可见，进程的阻塞是进程自身的一种主动行为，也因此只有处于运行态的进程（获得CPU），才可能将其转为阻塞状态。

**当进程进入阻塞状态，是不占用CPU资源的。**

## 文件描述符 fd

**文件描述符（File descriptor）** 是计算机科学中的一个术语，是一个用于表述指向文件的引用的抽象化概念。

文件描述符在形式上是一个非负整数。实际上，它是一个索引值，指向内核为每一个进程所维护的该进程打开文件的记录表。当程序打开一个现有文件或者创建一个新文件时，内核向进程返回一个文件描述符。在程序设计中，一些涉及底层的程序编写往往会围绕着文件描述符展开。但是文件描述符这一概念往往只适用于UNIX、Linux这样的操作系统。

## IO 模型

对于一个套接字上的输入操作，第一步是等待数据从网络中到达，当数据到达时被复制到内核中的某个缓冲区。第二步就是把数据从内核缓冲区复制到应用进程缓冲区

Linux 有五种 I/O 模型：

- 阻塞式 I/O
- 非阻塞式 I/O
- I/O 复用（select 和 poll）
- 信号驱动式 I/O（SIGIO）
- 异步 I/O（AIO）

五种模型对比：

- 同步 I/O 包括阻塞式 I/O、非阻塞式 I/O、I/O 复用和信号驱动 I/O ，它们的主要区别在第一个阶段，非阻塞式 I/O 、信号驱动 I/O 和异步 I/O 在第一阶段不会阻塞
- 同步 I/O：将数据从内核缓冲区复制到应用进程缓冲区的阶段（第二阶段），应用进程会阻塞
- 异步 I/O：第二阶段应用进程不会阻塞

---

### 阻塞 IO (BIO)

在linux中，默认情况下所有的socket都是blocking，一个典型的读操作流程大概是这样：

![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Java/IO模型-阻塞式IO.png)

应用进程通过系统调用 recvfrom 接收数据，会被阻塞，直到数据从内核缓冲区复制到应用进程缓冲区中才返回。阻塞不意味着整个操作系统都被阻塞，其它应用进程还可以执行，只是当前阻塞进程不消耗 CPU 时间，这种模型的 CPU 利用率会比较高

recvfrom() 用于**接收 Socket 传来的数据，并复制到应用进程的缓冲区 buf 中**，把 recvfrom() 当成系统调用

> Blocking IO的特点是在IO执行的两个阶段都被block了

---

### 非阻塞 IO (NIO)

linux下，可以通过设置socket使其变为non-blocking。当对一个non-blocking socket执行读操作时，流程是这个样子：

![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Java/IO模型-非阻塞式IO.png)

应用进程通过 recvfrom 调用不停的去和内核交互，直到内核准备好数据。如果没有准备好数据，内核返回一个错误码，过一段时间应用进程再执行 recvfrom 系统调用，在两次发送请求的时间段，进程可以进行其他任务，这种方式称为轮询（polling）

由于 CPU 要处理更多的系统调用，因此这种模型的 CPU 利用率比较低

> Nonblocking IO的特点是用户进程需要**不断的主动询问**kernel数据好了没有

---

### 信号驱动 IO (signal driven IO)

应用进程使用 sigaction 系统调用，内核立即返回，应用进程可以继续执行，等待数据阶段应用进程是非阻塞的。当内核数据准备就绪时向应用进程发送 SIGIO 信号，应用进程收到之后在信号处理程序中调用 recvfrom 将数据从内核复制到应用进程中

相比于非阻塞式 I/O 的轮询方式，信号驱动 I/O 的 CPU 利用率更高

![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Java/IO模型-信号驱动IO.png)

---

### I/O 多路复用 (IO multiplexing)

IO multiplexing就是我们说的select，poll，epoll，有些地方也称这种IO方式为event driven IO。select/epoll的好处就在于单个process就可以同时处理多个网络连接的IO。它的基本原理就是select，poll，epoll这个function会不断的轮询所负责的所有socket，当某个socket有数据到达了，就通知用户进程。

![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Java/IO模型-IO复用模型.png)

**当用户进程调用了select，那么整个进程会被block**，而同时，kernel会“监视”所有select负责的socket，当任何一个socket中的数据准备好了，select就会返回。这个时候用户进程再调用read操作，将数据从kernel拷贝到用户进程。

> 所以，I/O 多路复用的特点是通过一种机制一个进程能同时等待多个文件描述符，而这些文件描述符（套接字描述符）其中的任意一个进入读就绪状态，select()函数就可以返回。

这个图和blocking IO的图其实并没有太大的不同，事实上，还更差一些。因为这里需要使用两个system call (select 和 recvfrom)，而blocking IO只调用了一个system call (recvfrom)。但是，用select的优势在于它可以同时处理多个connection。

所以，如果处理的连接数不是很高的话，使用select/epoll的web server不一定比使用multi-threading + blocking IO的web server性能更好，可能延迟还更大。select/epoll的优势并不是对于单个连接能处理得更快，而是在于能处理更多的连接。）

在IO multiplexing Model中，实际中，对于每一个socket，一般都设置成为non-blocking，但是，如上图所示，整个用户的process其实是一直被block的。只不过process是被select这个函数block，而不是被socket IO给block。

---

### 异步 IO (AIO)

![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Java/IO模型-异步IO模型.png)

用户进程发起read操作之后，立刻就可以开始去做其它的事。而另一方面，从kernel的角度，当它受到一个asynchronous read之后，首先它会立刻返回，所以不会对用户进程产生任何block。然后，kernel会等待数据准备完成，然后将数据拷贝到用户内存，当这一切都完成之后，kernel会给用户进程发送一个signal，告诉它read操作完成了。

---

### 总结

***blocking和non-blocking的区别***

调用blocking IO会一直block住对应的进程直到操作完成，而non-blocking IO在kernel还准备数据的情况下会立刻返回。

<br>

***synchronous IO和asynchronous IO的区别***

在说明synchronous IO和asynchronous IO的区别之前，需要先给出两者的定义。POSIX的定义是这样子的：  

- A synchronous I/O operation causes the requesting process to be blocked until that I/O operation completes;  
- An asynchronous I/O operation does not cause the requesting process to be blocked;

两者的区别就在于synchronous IO做”IO operation”的时候会将process阻塞。按照这个定义，之前所述的blocking IO，non-blocking IO，IO multiplexing都属于synchronous IO。

有人会说，non-blocking IO并没有被block啊。这里有个非常“狡猾”的地方，定义中所指的”IO operation”是指真实的IO操作，就是例子中的recvfrom这个system call。non-blocking IO在执行recvfrom这个system call的时候，如果kernel的数据没有准备好，这时候不会block进程。但是，当kernel中数据准备好的时候，recvfrom会将数据从kernel拷贝到用户内存中，这个时候进程是被block了，在这段时间内，进程是被block的。

而asynchronous IO则不一样，当进程发起IO 操作之后，就直接返回再也不理睬了，直到kernel发送一个信号，告诉进程说IO完成。在这整个过程中，进程完全没有被block。

**各个IO Model的比较如图所示：**

![image.png](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/picgo/20250320134716.png)

通过上面的图片，可以发现non-blocking IO和asynchronous IO的区别还是很明显的。在non-blocking IO中，虽然进程大部分时间都不会被block，但是它仍然要求进程去主动的check，并且当数据准备完成以后，也需要进程主动的再次调用recvfrom来将数据拷贝到用户内存。而asynchronous IO则完全不同。它就像是用户进程将整个IO操作交给了他人（kernel）完成，然后他人做完后发信号通知。在此期间，用户进程不需要去检查IO操作的状态，也不需要主动的去拷贝数据。

## 多路复用

### select

#### **函数**

Socket 不是文件，只是一个标识符，但是 Unix 操作系统把所有东西都**看作**是文件，所以 Socket 说成 file descriptor，也就是 fd

select 允许应用程序监视一组文件描述符，等待一个或者多个描述符成为就绪状态，从而完成 I/O 操作。

```c
int select(int n, fd_set *readfds, fd_set *writefds, fd_set *exceptfds, struct timeval *timeout);
```

- fd_set 使用 **bitmap 数组**实现，数组大小用 FD_SETSIZE 定义，**单进程**只能监听少于 FD_SETSIZE 数量的描述符，32 位机默认是 1024 个，64 位机默认是 2048，可以对进行修改，然后重新编译内核
- fd_set 有三种类型的描述符：readset、writeset、exceptset，对应读、写、异常条件的描述符集合
- n 是监测的 socket 的最大数量
- timeout 为超时参数，调用 select 会一直**阻塞**直到有描述符的事件到达或者等待的时间超过 timeout

  ```c
  struct timeval{
      long tv_sec; 	//秒
      long tv_usec;	//微秒
  }
  ```

  - timeout == null：等待无限长的时间
  - tv_sec == 0 && tv_usec == 0：获取后直接返回，不阻塞等待
  - tv_sec != 0 || tv_usec != 0：等待指定时间
- 方法成功调用返回结果为**就绪的文件描述符个数**，出错返回结果为 -1，超时返回结果为 0

Linux 提供了一组宏为 fd_set 进行赋值操作：

```c
int FD_ZERO(fd_set *fdset);			// 将一个 fd_set 类型变量的所有值都置为 0
int FD_CLR(int fd, fd_set *fdset);	// 将一个 fd_set 类型变量的 fd 位置为 0
int FD_SET(int fd, fd_set *fdset);	// 将一个 fd_set 类型变量的 fd 位置为 1
int FD_ISSET(int fd, fd_set *fdset);// 判断 fd 位是否被置为 1
```

示例：

```c
sockfd = socket(AF_INET, SOCK_STREAM, 0);
memset(&addr, 0, sizeof(addr)));
addr.sin_family = AF_INET;
addr.sin_port = htons(2000);
addr.sin_addr.s_addr = INADDR_ANY;
bind(sockfd, (struct sockaddr*)&addr, sizeof(addr));//绑定连接
listen(sockfd, 5);//监听5个端口
for(i = 0; i < 5; i++) {
	memset(&client, e, sizeof(client));
    addrlen = sizeof(client);
	fds[i] = accept(sockfd, (struct sockaddr*)&client, &addrlen);
    //将监听的对应的文件描述符fd存入fds：[3,4,5,6,7]
    if(fds[i] > max)
		max = fds[i];
}
while(1) {
    FD_ZERO(&rset);//置为0
    for(i = 0; i < 5; i++) {
    	FD_SET(fds[i], &rset);//对应位置1 [0001 1111 00.....]
	}
	print("round again");
	select(max + 1, &rset, NULL, NULL, NULL);//监听
    
	for(i = 0; i <5; i++) {
        if(FD_ISSET(fds[i], &rset)) {//判断监听哪一个端口
            memset(buffer, 0, MAXBUF);
            read(fds[i], buffer, MAXBUF);//进入内核态读数据
            print(buffer);
        }
    }
}
```

---

#### **流程**

select 调用流程图：

![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Java/IO-select调用过程.png)

1. 使用 copy_from_user 从用户空间拷贝 fd_set 到内核空间，进程阻塞
2. 注册回调函数 _pollwait
3. 遍历所有 fd，调用其对应的 poll 方法判断当前请求是否准备就绪，对于 socket，这个 poll 方法是 sock_poll，sock_poll 根据情况会调用到 tcp_poll、udp_poll 或者 datagram_poll，以 tcp_poll 为例，其核心实现就是 _pollwait
4. _pollwait 把 **current（调用 select 的进程）**挂到设备的等待队列，不同设备有不同的等待队列，对于 tcp_poll ，其等待队列是 sk → sk_sleep（把进程挂到等待队列中并不代表进程已经睡眠），在设备收到消息（网络设备）或填写完文件数据（磁盘设备）后，会唤醒设备等待队列上睡眠的进程，这时 current 便被唤醒，进入就绪队列
5. poll 方法返回时会返回一个描述读写操作是否就绪的 mask 掩码，根据这个 mask 掩码给 fd_set 赋值
6. 如果遍历完所有的 fd，还没有返回一个可读写的 mask 掩码，则会调用 schedule_timeout 让 current 进程进入睡眠。当设备驱动发生自身资源可读写后，会唤醒其等待队列上睡眠的进程，如果超过一定的超时时间（schedule_timeout）没有其他线程唤醒，则调用 select 的进程会重新被唤醒获得 CPU，进而重新遍历 fd，判断有没有就绪的 fd
7. 把 fd_set 从内核空间拷贝到用户空间，阻塞进程继续执行

---

### poll

poll 的功能与 select 类似，也是等待一组描述符中的一个成为就绪状态

```c
int poll(struct pollfd *fds, unsigned int nfds, int timeout);
```

poll 中的描述符是 pollfd 类型的数组，pollfd 的定义如下：

```c
struct pollfd {
    int   fd;         /* file descriptor */
    short events;     /* requested events */
    short revents;    /* returned events */
};
```

select 和 poll 对比：

- select 会修改描述符，而 poll 不会
- select 的描述符类型使用数组实现，有描述符的限制；而 poll 使用**链表**实现，没有描述符数量的限制
- poll 提供了更多的事件类型，并且对描述符的重复利用上比 select 高
- select 和 poll 速度都比较慢，**每次调用**都需要将全部描述符数组 fd 从应用进程缓冲区复制到内核缓冲区，同时每次都需要在内核遍历传递进来的所有 fd ，这个开销在 fd 很多时会很大
- 几乎所有的系统都支持 select，但是只有比较新的系统支持 poll
- select 和 poll 的时间复杂度 O(n)，对 socket 进行扫描时是线性扫描，即采用轮询的方法，效率较低，因为并不知道具体是哪个 socket 具有事件，所以随着 fd 数量的增加会造成遍历速度慢的**线性下降**性能问题
- poll 还有一个特点是水平触发，如果报告了 fd 后，没有被处理，那么下次 poll 时会再次报告该 fd
- 如果一个线程对某个描述符调用了 select 或者 poll，另一个线程关闭了该描述符，会导致调用结果不确定

---

### epoll

#### **函数**

epoll 使用事件的就绪通知方式，通过 epoll_ctl() 向内核注册新的描述符或者是改变某个文件描述符的状态。已注册的描述符在内核中会被维护在一棵**红黑树**上，一旦该 fd 就绪，**内核通过 callback 回调函数将 I/O 准备好的描述符加入到一个链表中**管理，进程调用 epoll_wait() 便可以得到事件就绪的描述符

```c
int epoll_create(int size);
int epoll_ctl(int epfd, int op, int fd, struct epoll_event *event)；
int epoll_wait(int epfd, struct epoll_event * events, int maxevents, int timeout);
```

- epall_create：一个系统函数，函数将在内核空间内创建一个 epoll 数据结构，可以理解为 epoll 结构空间，返回值为 epoll 的文件描述符编号，以后有 client 连接时，向该 epoll 结构中添加监听，所以 epoll 使用一个文件描述符管理多个描述符
- epall_ctl：epoll 的事件注册函数，select 函数是调用时指定需要监听的描述符和事件，epoll 先将用户感兴趣的描述符事件注册到 epoll 空间。此函数是非阻塞函数，用来增删改 epoll 空间内的描述符，参数解释：
  - epfd：epoll 结构的进程 fd 编号，函数将依靠该编号找到对应的 epoll 结构
  - op：表示当前请求类型，有三个宏定义：
    - EPOLL_CTL_ADD：注册新的 fd 到 epfd 中
    - EPOLL_CTL_MOD：修改已经注册的 fd 的监听事件
    - EPOLL_CTI_DEL：从 epfd 中删除一个 fd
  - fd：需要监听的文件描述符，一般指 socket_fd
  - event：告诉内核对该 fd 资源感兴趣的事件，epoll_event 的结构：

    ```c
    struct epoll_event {
        _uint32_t events;	/*epoll events*/
        epoll_data_t data;	/*user data variable*/
    }
    ```

    events 可以是以下几个宏集合：EPOLLIN、EPOLOUT、EPOLLPRI、EPOLLERR、EPOLLHUP（挂断）、EPOLET（边缘触发）、EPOLLONESHOT（只监听一次，事件触发后自动清除该 fd，从 epoll 列表）

- epoll_wait：等待事件的产生，类似于 select() 调用，返回值为本次就绪的 fd 个数，直接从就绪链表获取，时间复杂度 O(1)
  - epfd：**指定感兴趣的 epoll 事件列表**
  - events：指向一个 epoll_event 结构数组，当函数返回时，内核会把就绪状态的数据拷贝到该数组
  - maxevents：标明 epoll_event 数组最多能接收的数据量，即本次操作最多能获取多少就绪数据
  - timeout：单位为毫秒
    - 0：表示立即返回，非阻塞调用
    - -1：阻塞调用，直到有用户感兴趣的事件就绪为止
    - 大于 0：阻塞调用，阻塞指定时间内如果有事件就绪则提前返回，否则等待指定时间后返回

epoll 的描述符事件有两种触发模式：LT（level trigger）和 ET（edge trigger）：

- LT 模式：当 epoll_wait() 检测到描述符事件到达时，将此事件通知进程，进程可以不立即处理该事件，下次调用 epoll_wait() 会再次通知进程，是默认的一种模式，并且同时支持 Blocking 和 No-Blocking
- ET 模式：通知之后进程必须立即处理事件，下次再调用 epoll_wait() 时不会再得到事件到达的通知。减少了 epoll 事件被重复触发的次数，因此效率要比 LT 模式高；只支持 No-Blocking，以避免由于一个 fd 的阻塞读/阻塞写操作把处理多个文件描述符的任务饥饿

```c
// 创建 epoll 描述符，每个应用程序只需要一个，用于监控所有套接字
int pollingfd = epoll_create(0xCAFE);
if ( pollingfd < 0 )// report error
// 初始化 epoll 结构
struct epoll_event ev = { 0 };

// 将连接类实例与事件相关联，可以关联任何想要的东西
ev.data.ptr = pConnection1;

// 监视输入，并且在事件发生后不自动重新准备描述符
ev.events = EPOLLIN | EPOLLONESHOT;
// 将描述符添加到监控列表中，即使另一个线程在epoll_wait中等待，描述符将被正确添加
if ( epoll_ctl( epollfd, EPOLL_CTL_ADD, pConnection1->getSocket(), &ev) != 0 )
    // report error

// 最多等待 20 个事件
struct epoll_event pevents[20];

// 等待10秒，检索20个并存入epoll_event数组
int ready = epoll_wait(pollingfd, pevents, 20, 10000);
// 检查epoll是否成功
if ( ret == -1)// report error and abort
else if ( ret == 0)// timeout; no event detected
else
{
    for (int i = 0; i < ready; i+ )
    {
        if ( pevents[i].events & EPOLLIN )
        {
            // 获取连接指针
            Connection * c = (Connection*) pevents[i].data.ptr;
            c->handleReadEvent();
         }
    }
}
```

---

#### **特点**

epoll 的特点：

- epoll 仅适用于 Linux 系统
- epoll 使用**一个文件描述符管理多个描述符**，将用户关心的文件描述符的事件存放到内核的一个事件表（个人理解成哑元节点）
- 没有最大描述符数量（并发连接）的限制，打开 fd 的上限远大于1024（1G 内存能监听约 10 万个端口）
- epoll 的时间复杂度 O(1)，epoll 理解为 event poll，不同于忙轮询和无差别轮询，调用 epoll_wait **只是轮询就绪链表**。当监听列表有设备就绪时调用回调函数，把就绪 fd 放入就绪链表中，并唤醒在 epoll_wait 中阻塞的进程，所以 epoll 实际上是**事件驱动**（每个事件关联上fd）的，降低了 system call 的时间复杂度
- epoll 内核中根据每个 fd 上的 callback 函数来实现，只有活跃的 socket 才会主动调用 callback，所以使用 epoll 没有前面两者的线性下降的性能问题，效率提高
- epoll 注册新的事件是注册到到内核中 epoll 句柄中，不需要每次调用 epoll_wait 时重复拷贝，对比前面两种只需要将描述符从进程缓冲区向内核缓冲区**拷贝一次**，也可以利用 **mmap() 文件映射内存**加速与内核空间的消息传递（只是可以用，并没有用）
- 前面两者要把 current 往设备等待队列中挂一次，epoll 也只把 current 往等待队列上挂一次，但是这里的等待队列并不是设备等待队列，只是一个 epoll 内部定义的等待队列，这样可以节省开销
- epoll 对多线程编程更有友好，一个线程调用了 epoll_wait() 另一个线程关闭了同一个描述符，也不会产生像 select 和 poll 的不确定情况

---

### 应用

应用场景： 

- select 应用场景：
  - select 的 timeout 参数精度为微秒，poll 和 epoll 为毫秒，因此 select 适用**实时性要求比较高**的场景，比如核反应堆的控制
  - select 可移植性更好，几乎被所有主流平台所支持
- poll 应用场景：poll 没有最大描述符数量的限制，适用于平台支持并且对实时性要求不高的情况
- epoll 应用场景：
  - 运行在 Linux 平台上，有大量的描述符需要同时轮询，并且这些连接最好是**长连接**
  - 需要同时监控小于 1000 个描述符，没必要使用 epoll，因为这个应用场景下并不能体现 epoll 的优势
  - 需要监控的描述符状态变化多，而且是非常短暂的，就没有必要使用 epoll。因为 epoll 中的所有描述符都存储在内核中，每次对描述符的状态改变都需要通过 epoll_ctl() 进行系统调用，频繁系统调用降低效率，并且 epoll 的描述符存储在内核，不容易调试

## 参考资料

[Linux IO模式及 select、poll、epoll详解 - 人云思云 - SegmentFault 思否](https://segmentfault.com/a/1190000003063859#item-1-3)
