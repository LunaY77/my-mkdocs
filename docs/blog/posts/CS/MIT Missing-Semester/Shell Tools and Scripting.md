---
title: Shell Tools and Scripting
authors: [cangjingyue]
tags: 
    - CS
    - Missing
date: 2024-12-4 00:00:00
categories:
  - CS
---

# Shell Tools and Scripting

!!!attachment  
    course link: [Shell Tools and Scripting](https://missing.csail.mit.edu/2020/shell-tools/)

## Shell Scripting

### 1. Assign Variables

To assign variables in bash, use the syntax `foo=bar` and access the value of the variable with `$foo`. Note that `foo = bar` will not work since it is interpreted as calling the `foo` program with **arguments `=` and `bar`**. In general, in shell scripts the space character will perform argument splitting. This behavior can be confusing to use at first, so always check for that.

Strings in bash can be defined with `'` and `"` delimiters.

Strings delimited with `'` are **literal** strings and **will not** substitute variable values.

Strings delimited with `"` **will** substitute variable values.

```bash
foo=bar
echo "$foo"
# prints bar
echo '$foo'
# prints $foo
```

---

### 2. Functions

As with most programming languages, bash supports control flow techniques including `if`, `case`, `while` and `for`. Similarly, bash has **functions** that take arguments and can operate with them. 

Here is an example of a function that **creates a directory and cds into it**.

```bash
mcd () {
    mkdir -p "$1"
    cd "$1"
}
```

Here is how to test `mcd` function

```bash
vim mcd.sh
# paste the code into it...
source mcd.sh
mcd test
# And you will find that you are in the test directory, which is a 
# child dir in which you run the mcd program
```

---

### 3. Function arguments

Unlike other scripting languages, bash uses a variety of special variables to refer to **arguments, error codes, and other relevant variables**. Below is a list of some of them. A more comprehensive list can be found [here](https://tldp.org/LDP/abs/html/special-chars.html).

- `$0` - **Name** of the script
- `$1` to `$9` - Arguments to the script. `$1` is the first argument and so on.
- `$@` - **All** the arguments
- `$#` - **Number** of arguments
- `$?` - Return code of the **previous** command
- `$$` - Process identification number **(PID)** for the current script
- `!!` - **Entire last command**, including arguments. A common pattern is to execute a command only for it to fail due to missing permissions; you can quickly re-execute the command with sudo by doing `sudo !!`
- `$_` - **Last argument** from the **last command**. If you are in an interactive shell, you can also quickly get this value by typing `Esc` followed by `.` or `Alt+`.

Commands will often return **output** using `STDOUT`, **errors** through `STDERR`, and a **Return Code** to report errors in a more script-friendly manner. 

The **return code** or **exit status** is the way scripts/commands have to communicate how execution went. 

- A value of `0` usually means everything went **OK**
- anything **different** from `0` means an **error** occurred.

Exit codes can be used to conditionally execute commands using `&&` (and operator) and `||` (or operator), both of which are short-circuiting operators. 

Commands can also be separated within the same line using a semicolon `;`. 

- The `true` program will always have a `0` return code
- the `false` command will always have a `1` return code. 

Let’s see some examples

```bash
false || echo "Oops, fail"
# Oops, fail

true || echo "Will not be printed"
#

true && echo "Things went well"
# Things went well

false && echo "Will not be printed"
#

true ; echo "This will always run"
# This will always run

false ; echo "This will always run"
# This will always run
```

----

### 4. Substitution

Another common pattern is wanting to get the output of a command as a variable. 

This can be done with `command substitution`. Whenever you place `$( CMD )` it will execute `CMD`, get the output of the command and substitute it in place. 

For example, if you do `for file in $(ls)`, the shell will first call ls and then iterate over those values. 

A lesser known similar feature is `process substitution`, `<( CMD )` will execute `CMD` and place the output in a **temporary file** and **substitute** the `<()` with that **file’s name**.

This is useful when commands expect values to be passed by **file** instead of by `STDIN`. For example, `diff <(ls foo) <(ls bar)` will show differences between files in dirs `foo` and `bar`.

 <br/>

let’s see an **example** that showcases some of these features. 

***It will iterate through the arguments we provide, grep for the string foobar, and append it to the file as a comment if it’s not found.***

```bash
#!/bin/bash

echo "Starting program at $(date)" # Date will be substituted

echo "Running program $0 with $# arguments with pid $$"

for file in "$@"; do
    grep foobar "$file" > /dev/null 2> /dev/null
    # When pattern is not found, grep has exit status 1
    # We redirect STDOUT and STDERR to a null register since we do not care about them
    if [[ $? -ne 0 ]]; then
        echo "File $file does not have any foobar, adding one"
        echo "# foobar" >> "$file"
    fi
done
```

In the comparison we tested whether **`$?` was not equal to `0`**. Bash implements many comparisons of this sort - you can find a detailed list in the manpage for [test](https://www.man7.org/linux/man-pages/man1/test.1.html). 

When performing comparisons in bash, try to use double brackets `[[ ]]` in favor of simple brackets `[ ]`. Chances of making mistakes are lower although it won’t be portable to `sh`. A more detailed explanation can be found [here](https://mywiki.wooledge.org/BashFAQ/031).

---

### 5. Globbing

When launching scripts, you will often want to provide arguments that are **similar**. Bash has ways of making this easier, expanding expressions by carrying out filename expansion. These techniques are often referred to as ***shell globbing***.

- **Wildcards**
	- `?` match **one** character.
	- `*` match **any** amount of characters. 
	- For instance, given files `foo, foo1, foo2, foo10 and bar`, the command `rm foo?` will **delete foo1 and foo2 whereas `rm foo*` will delete all but bar**.
- **Curly braces** `{}` - Whenever you have a **common substring** in a **series of commands**, you can use curly braces for bash to **expand** this automatically. This comes in very handy when moving or converting files.

```bash
convert image.{png,jpg}
# Will expand to
convert image.png image.jpg

cp /path/to/project/{foo,bar,baz}.sh /newpath
# Will expand to
cp /path/to/project/foo.sh /path/to/project/bar.sh /path/to/project/baz.sh /newpath

# Globbing techniques can also be combined
mv *{.py,.sh} folder
# Will move all *.py and *.sh files


mkdir foo bar
# This creates files foo/a, foo/b, ... foo/h, bar/a, bar/b, ... bar/h
touch {foo,bar}/{a..h}
touch foo/x bar/y
# Show differences between files in foo and bar
diff <(ls foo) <(ls bar)
# Outputs
# < x
# ---
# > y
```

---

### 6. shebang

Note that **scripts** need not necessarily be written in bash to be called from the terminal. For instance, here’s a simple Python script that outputs its arguments in reversed order:

```python
#!/usr/local/bin/python
import sys
for arg in reversed(sys.argv[1:]):
    print(arg)
```

The kernel knows to execute this script with a **python interpreter** **instead of** **a** **shell command** because we included a **shebang** line at the top of the script. 

It is good practice to write **shebang** lines using the `env` command that will resolve to wherever the command lives in the system, increasing the portability of your scripts.

btw, if you really want to figure out where your program is, type this: `which python`, namely `which ***`, and add the output to the **shebang** line 

To resolve the location, `env` will make use of the `PATH` environment variable we introduced in the first lecture. For this example the **shebang** line would look like `#!/usr/bin/env python`.

Some differences between shell functions and scripts that you should keep in mind are:

- **Functions** have to be in the **same** language as the **shell**, while **scripts** can be written in **any language**. This is why including a **shebang** for scripts is important.
- **Functions** are **loaded once** when their definition is read. **Scripts** are **loaded every time** they are executed. This makes functions slightly **faster** to load, but whenever you change them you will have to **reload** their definition.
- **Functions** are executed in the **current shell environment** whereas **scripts** execute in their **own process**. Thus, **functions can modify environment variables**, e.g. change your current directory, whereas scripts can’t. Scripts will be passed by value environment variables that have been exported using export
- As with any programming language, functions are a powerful construct to achieve modularity, code reuse, and clarity of shell code. Often shell scripts will include their own function definitions.

## Shell Tools

### 1. Finding how to use commands

- the first-order approach is to call said command with the `-h` or `--help` flags. 
- A more detailed approach is to use the `man` command. Short for manual, man provides a manual page (called manpage) for a command you specify.
- For interactive tools such as the ones based on ncurses, help for the commands can often be accessed within the program using the `:help` command or typing `?`.

Sometimes **manpages** can provide **overly detailed** descriptions of the commands, making it hard to decipher what flags/syntax to use for common use cases. 

[TLDR pages](https://tldr.sh/) are a nifty complementary solution that focuses on giving example use cases of a command so you can quickly figure out which options to use. 

To use `tldr`, just type: `tldr ***` (**~~just remind, you need to install it first~~**)

---

### 2. Finding files

`find` will recursively search for files matching some criteria. 

Some examples:

```bash
# Find all directories named src
find . -name src -type d
# Find all python files that have a folder named test in their path
find . -path '*/test/*.py' -type f
# Find all files modified in the last day
find . -mtime -1
# Find all zip files with size in range 500k to 10M
find . -size +500k -size -10M -name '*.tar.gz'
```

Beyond listing files, find can also perform actions over files that match your query. This property can be incredibly helpful to simplify what could be fairly monotonous tasks.

```bash
# Delete all files with .tmp extension
find . -name '*.tmp' -exec rm {} \;
# Find all PNG files and convert them to JPG
find . -name '*.png' -exec convert {} {}.jpg \;
```

----

### 3. Finding code

`grep`, a generic tool for matching patterns from the input text. 

For now, know that `grep` has many flags that make it a very versatile tool. Some I frequently use are `-C` for getting Context around the matching line and `-v` for inverting the match, i.e. print all lines that do not match the pattern. 

For example, `grep -C 5` will print 5 lines before and after the match. When it comes to quickly searching through many files, you want to use `-R` since it will Recursively go into directories and look for files for the matching string.

But `grep -R` can be improved in many ways, such as ignoring `.git` folders, using multi CPU support, &c. 

Many grep alternatives have been developed, including [ack](https://github.com/beyondgrep/ack3), [ag](https://github.com/ggreer/the_silver_searcher) and [rg](https://github.com/BurntSushi/ripgrep). All of them are fantastic and pretty much provide the same functionality. For now I am sticking with **ripgrep (rg)**, given how fast and intuitive it is. Some examples:

```bash
# Find all python files where I used the requests library
rg -t py 'import requests'
# Find all files (including hidden files) without a shebang line
rg -u --files-without-match "^#\!"
# Find all matches of foo and print the following 5 lines
rg foo -A 5
# Print statistics of matches (# of matched lines and files )
rg --stats PATTERN
```

---

### 4. Finding shell commands

The `history` command will let you access your shell history programmatically. 

It will print your **shell history** to the standard output. If we want to search there we can pipe that output to **grep** and **search** for patterns. `history | grep find` will print commands that contain the substring `“find”`.

In most shells, you can make use of `Ctrl+R` to perform backwards search through your history. After pressing `Ctrl+R`, you can type a substring you want to match for commands in your history. As you keep pressing it, you will **cycle** through the matches in your history. 

---

### 5. Directory Navigation

uh...just look up the lecture notes

## Exercises

!!!warning  
    I will write my own solution to the problem, If you want to solve those by yourself, please stop.

---

**Problem1**

Read `man ls` and write an `ls` command that lists files in the following manner

- Includes all files, including hidden files
- Sizes are listed in human readable format (e.g. 454M instead of 454279954)
- Files are ordered by recency
- Output is colorized

A sample output would look like this

```bash
 -rw-r--r--   1 user group 1.1M Jan 14 09:53 baz
 drwxr-xr-x   5 user group  160 Jan 14 09:53 .
 -rw-r--r--   1 user group  514 Jan 14 06:42 bar
 -rw-r--r--   1 user group 106M Jan 13 12:12 foo
 drwx------+ 47 user group 1.5K Jan 12 18:08 ..
```

<br/>

**Solution**

```bash
[root@iZbp12idmwavjjcx2k19kjZ course2]# ls -a -l -h -t --color=auto
total 88K
-rw-r--r--  1 root root  54K Dec  3 21:46 install_lts.sh
drwxr-xr-x  5 root root 4.0K Dec  3 21:46 .
-rwxrwxrwx  1 root root   83 Dec  3 20:04 script.py
drwxr-xr-x 11 root root 4.0K Dec  3 20:02 bar
drwxr-xr-x 11 root root 4.0K Dec  3 20:02 foo
-rwxrwxrwx  1 root root   50 Dec  3 19:21 mcd.sh
-rwxrwxrwx  1 root root  485 Dec  3 19:21 f.sh
drwxr-xr-x  2 root root 4.0K Dec  3 19:17 test
drwxr-xr-x 14 root root 4.0K Dec  3 19:12 ..
```

- `-a` : includes all files
- `-l` : use a long listing format
- `-h` : print sizes like 1K 234M 2G etc.
- `-t` : sort by recency
- `--color=auto` : colorize output

----

**Problem2**

Write bash functions `marco` and `polo` that do the following. Whenever you execute `marco` the current working directory should be saved in some manner, then when you execute `polo`, no matter what directory you are in, `polo` should `cd` you back to the directory where you executed `marco`. For ease of debugging you can write the code in a file `marco.sh` and (re)load the definitions to your shell by executing `source marco.sh`.

<br/>

**Solution**

```bash
#!/bin/bash
marco() {
        echo "$(pwd)" > $HOME/marco_history.log
        echo "save pwd - $(pwd)"
}
polo() {
        cd "$(cat "$HOME/marco_history.log")"
}
```

----

**Problem3**

Say you have a command that fails rarely. In order to debug it you need to capture its output but it can be time consuming to get a failure run. Write a bash script that runs the following script until it fails and captures its standard output and error streams to files and prints everything at the end. Bonus points if you can also report how many runs it took for the script to fail.

```bash
 #!/usr/bin/env bash

 n=$(( RANDOM % 100 ))

 if [[ n -eq 42 ]]; then
    echo "Something went wrong"
    >&2 echo "The error was using magic numbers"
    exit 1
 fi

 echo "Everything went according to plan"
```

<br/>

**Solution**

```bash
#!/usr/bin/env bash
count=0
echo > out.log

while true
do
        ./task3.sh &>> out.log
        if [[ $? -ne 0 ]]; then
                cat out.log
                echo "failed after $count times"
                break
        fi
        ((count++))
done
```

---

**Problem4**

As we covered in the lecture `find`’s `-exec` can be very powerful for performing operations over the files we are searching for. However, what if we want to do something with all the files, like creating a zip file? As you have seen so far commands will take input from both arguments and STDIN. When piping commands, we are connecting STDOUT to STDIN, but some commands like `tar` take inputs from arguments. To bridge this disconnect there’s the xargs command which will execute a command using STDIN as arguments. For example `ls | xargs rm` will delete the files in the current directory.

Your task is to write a command that recursively finds all HTML files in the folder and makes a zip with them. Note that your command should work even if the files have spaces (hint: check `-d` flag for `xargs`).

<br/>

**Solution**

prerequisite

```bash
mkdir html_root
cd html_root
mkdir html_{a..h}
touch html_{a..h}/{a..h}.html
```

code

```bash
find . -type f -name '*.html' | xargs -d '\n' tar -cvzf html.zip
```

1. `find . -type f -name "*.html"  
`
    - `find` searches for files and directories.
    - `.` specifies the current directory as the starting point.
    - `-type f` filters the results to include only files (not directories or other types).
    - `-name "*.html"` matches files with the .html extension.
    - Output: A list of `.html` file paths.

1. `|` (Pipe symbol)
	
	- Passes the output of find (list of .html files) as input to the next command, xargs.

2. `xargs -d '\n'`
	- `xargs` converts the input (list of file paths) into arguments for the tar command.
	- `-d '\n'` specifies that each line of input is treated as a separate file. This ensures paths with spaces or special characters are handled correctly.

3. `tar -cvzf html.zip`
	- `tar` creates compressed archives.
	- `-c` : Creates a new archive.
	- `-v` : Displays a list of files being added to the archive (verbose mode).
	- `-z` : Compresses the archive using gzip.
	- `-f` html.zip: Names the output file `html.zip`.

---

**Problem5**

(Advanced) Write a command or script to recursively find the most recently modified file in a directory. More generally, can you list all files by recency?

<br/>

**Solution**

```bash
find . -type f -print0 | xargs -0 ls -lt | head -1
```

## Summary

uh... I find that I'm still quite uncomfortable with the grammar of bash script. The next step I think, before next lecture, maybe is to pursue a deeper and better understanding of bash script.
