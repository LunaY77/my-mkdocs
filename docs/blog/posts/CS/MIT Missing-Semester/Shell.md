---
title: The Shell
authors: [cangjingyue]
tags: 
    - CS
    - Missing
date: 2024-12-1 00:00:00
categories:
  - CS
---

# The Shell

!!! 前言  
    临近期末，前方有一大堆的背诵+考试等着我，但我好像不是很慌(这是什么原因...), 感觉我是那种不死到临头不会动的人，闲的无聊决定刷一下这门广受好评的公开课，就当做娱乐放松罢(计划使用英文笔记，锻炼一下写作能力，如果有大量错误请见谅  
    ----课程链接: [2020 Lectures · Missing Semester](https://missing.csail.mit.edu/2020/)   

本章节链接: [Missing Semester Overview](https://missing.csail.mit.edu/2020/course-shell/)

    

## 1. What is the shell

All kinds of shell share one common core: **they allow you to run programs, give them input, and inspect their output in a semi-structured way**

As I use macos, my shell is terminal or namely zsh. (uh... btw, to be honest, I don't quiet know the differences between zsh and terminal and shell, hope I'm right..

## 2. Using the shell

When you launch your terminal, you will see a prompt that often looks a little like this:

```shell
missing:~$ 
```

Down below is what my shell looks like:

```shell
cangjingyue@chenjinyangdeMacBook-Air ~ % 
```

This is the main textual interface to the shell. It tells you that you are on the machine `missing` and that your **“current working directory”**, or where you currently are, is `~` **(short for “home”)**. The `$` tells you that you are **not the root** user (more on that later). At this prompt you can type a command, which will then be interpreted by the shell. 

---

### **Some basic command**

1. **date**

`date` prints the current date and time

```shell
missing:~$ date
Fri 10 Jan 2020 11:49:31 AM EST
missing:~$ 
```

---
2. **echo**

`echo` simply prints out its arguments.

```shell
missing:~$ echo hello
hello
```

If you want to provide an argument that contains **spaces** or other **special characters** (e.g., a directory named `“My Photos”`), you can either **quote** the argument with `'` or `"` (`"My Photos"`), or escape just the relevant characters with `\` (`My\ Photos`).

But... it seems that my macos doesn't need those quote or back slash, it will also print out the correct arguments

just like ⬇️

```shell
cangjingyue@chenjinyangdeMacBook-Air ~ % echo My Photos
My Photos
```

If the shell is asked to execute a command that doesn’t match one of its programming keywords, it consults an *environment variable* called `$PATH` that lists which directories the shell should search for programs when it is given a command:

```shell
missing:~$ echo $PATH
/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
missing:~$ which echo
/bin/echo
missing:~$ /bin/echo $PATH
/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
```

## 3. Navigating in the shell

**1. pwd**

`pwd` prints the absolute path of current working directory

```shell
missing:~$ pwd
/home/missing
```

----

**2. cd**

`cd` change your working directory to another

```shell
missing:~$ cd /home
missing:/home$ pwd
/home
missing:/home$ cd ..
missing:/$ pwd
/
missing:/$ cd ./home
missing:/home$ pwd
/home
missing:/home$ cd missing
missing:~$ pwd
/home/missing
```

---

**3. ls**

To see what lives in a given directory, we use the `ls` command:

```shell
missing:~$ ls
missing:~$ cd ..
missing:/home$ ls
missing
missing:/home$ cd ..
missing:/$ ls
bin
boot
dev
etc
home
...
```

---

**4. ls -l**

`ls -l` use a long listing format:

```shell
missing:~$ ls -l /home
drwxr-xr-x 1 missing  users  4096 Jun 15  2019 missing
```

- First, the `d` at the beginning of the line tells us that **missing is a directory**. 
- Then follow three groups of three characters (**rwx**). These indicate what permissions **the owner of the file (missing)**, **the owning group (users)**, and **everyone else** respectively have on the relevant item. 
- A `-` indicates that the given principal **does not have the given permission.** 
- Above, only the owner is allowed to **modify (w)** the missing directory **(i.e., add/remove files in it)**. 
- To enter a directory, a user must have **“search” (represented by “execute”: x)** permissions on that directory (and its parents). 
- To list its contents, a user must have **read (r)** permissions on that directory. For files, the permissions are as you would expect. 
- **Quick summary**: `rwx` represents the **permissions**, `r` for **read**, `w` for **modify**, `x` for **execute**, `-` for **don't have the given permission**.
- Notice that nearly all the files in `/bin` have the `x` permission set for the last group, **“everyone else”**, so that **anyone can execute those programs**.

---

**5. other else**

- `mv` (to **rename/move** a file)
- `cp` (to **copy** a file)
- `mkdir` (to **make a new directory**).
- `man` ( It takes as an argument the name of a program, and shows you its manual page. Press `q` to exit.)

```shell
missing:~$ man ls
```

## 4. Connecting programs

`< file` and `> file`. These let you rewire the input and output streams of a program to a file respectively:

```shell
missing:~$ echo hello > hello.txt
missing:~$ cat hello.txt
hello
missing:~$ cat < hello.txt
hello
missing:~$ cat < hello.txt > hello2.txt
missing:~$ cat hello2.txt
hello
```

`cat` is a program that concatenates files. When given **file names** as arguments, it **prints the contents** of each of the files in sequence to its output stream. But when cat is **not given any arguments**, it prints contents from its **input stream to its output stream** (like in the third example above).

You can also use `>>` to append to a file

The `|` operator lets you **“chain”** programs such that the output of one is the input of another:

```shell
missing:~$ ls -l / | tail -n1
drwxr-xr-x 1 root  root  4096 Jun 20  2019 var
missing:~$ curl --head --silent google.com | grep --ignore-case content-length | cut --delimiter=' ' -f2
219
```

The command `tail` means print the tail lines of a file, `-n` means the index of the line(starting from 1 in the end), `-n1` means to print the exactly last one line of the file.

## 5. A versatile and powerful tool

On most Unix-like systems, one user is special: the **“root”** user.

The root user is above (almost) all access restrictions, and can create, read, update, and delete any file in the system.

using the `sudo` command. As its name implies, it lets you **“do”** something **“as su”** (short for **“super user”**, or **“root”**)

One thing you need to be root in order to do is writing to the sysfs file system mounted under `/sys`. sysfs exposes a number of kernel parameters as files, so that you can easily reconfigure the kernel on the fly without specialized tools. ***Note that sysfs does not exist on Windows or macOS.***

For example, the brightness of your laptop’s screen is exposed through a file called brightness under

```shell
/sys/class/backlight
```

By writing a value into that file, we can change the screen brightness. Your first instinct might be to do something like:

```shell
$ sudo find -L /sys/class/backlight -maxdepth 2 -name '*brightness*'
/sys/class/backlight/thinkpad_screen/brightness
$ cd /sys/class/backlight/thinkpad_screen
$ sudo echo 3 > brightness
An error occurred while redirecting file 'brightness'
open: Permission denied
```

Simply speaking, the error occurs because the shell (which is authenticated just as your user) tries to open the brightness file for writing, before setting that as sudo echo’s output, but is prevented from doing so since the shell does not run as root. 

```shell
$ echo 3 | sudo tee brightness
```

Since the `tee` program is the one to open the `/sys` file for writing, and it is running as root, the permissions all work out. 

## 6. exercises

!!!warning  
    I will write my own solution to the problem, If you want to solve those by yourself, please stop.

---

**1. Create a new directory called `missing` under `/tmp`.**    

```shell
cd /tmp
mkdir missing
```

---

**2. Use `touch` to create a new file called `semester` in `missing`.**

```bash
cd missing
touch semster
```

----

**5. Write the following into that file, one line at a time:**

```bash
#!/bin/sh
curl --head --silent https://missing.csail.mit.edu
```

The first line might be tricky to get working. It’s helpful to know that `#` starts a comment in Bash, and `!` has a special meaning even within **double-quoted (")** strings. Bash treats **single-quoted** strings **(')** differently: they will do the trick in this case. See the Bash [Quoting (Bash Reference Manual)](https://www.gnu.org/software/bash/manual/html_node/Quoting.html) manual page for more information.

```bash
echo '#!/bin/sh' > semster
echo 'curl --head --silent https://missing.csail.mit.edu' >> semster
```

----

**6. execute the file**

**result**:

```bash
cangjingyue@chenjinyangdeMacBook-Air missing % ./semster
zsh: permission denied: ./semester
```

doesn't work...

using `ls -l` to check the permissions:

```bash
cangjingyue@chenjinyangdeMacBook-Air missing % ls -l 
total 8
-rw-r--r--  1 cangjingyue  wheel  61 Dec  1 10:44 semster
```

----

**7. Use `chmod` to make it possible to run the command `./semester`**

First, quick dive to `chmod`

`chmod` : change file modes or Access Control Lists

**Usage**: `chmod [选项]... 模式[,模式]... 文件...`

`mode` define the permissions of the file or directory, usually 3 number. Each number represents the permissions of **user**, **group** and **other** respectively.

Each **write**, **read**, and **execute** permissions have the following number value:

- r (read) = 4
- w (write) = 2
- x (execute) = 1
- no permissions = 0

To find out the file’s permissions in numeric mode simply **calculate** the totals for all users classes. For example, to give read, write and execute permission to the file’s owner, read and execute permissions to the file’s group and only read permissions to all other users you would do the following:

- Owner: rwx=4+2+1=7
- Group: r-x=4+0+1=5
- Others: r-x=4+0+0=4

Using the above knowledge, the solution:

```bash
chmod 777 semester
./semster
```

**result**

```bash
HTTP/2 200 
server: GitHub.com
content-type: text/html; charset=utf-8
last-modified: Thu, 24 Oct 2024 16:34:06 GMT
access-control-allow-origin: *
etag: "671a76fe-205d"
expires: Sat, 30 Nov 2024 08:50:54 GMT
cache-control: max-age=600
x-proxy-cache: MISS
x-github-request-id: FFD8:1DA486:102D65D:10CDF1E:674ACF96
accept-ranges: bytes
age: 0
date: Sun, 01 Dec 2024 03:08:59 GMT
via: 1.1 varnish
x-served-by: cache-itm1220038-ITM
x-cache: HIT
x-cache-hits: 0
x-timer: S1733022540.782095,VS0,VE181
vary: Accept-Encoding
x-fastly-request-id: f004543c54e1f7139ecb9f84682d652aa24b9a04
content-length: 8285
```

---

**8. Use `|` and `>` to write the `“last modified”` date output by `semester` into a file called `last-modified.txt` in your home directory.**

```bash
./semster | grep last-modified > ~/last-modified.txt
```

**result**

```bash
cangjingyue@chenjinyangdeMacBook-Air missing % cat ~/last-modified.txt 
last-modified: Thu, 24 Oct 2024 16:34:06 GMT
```
