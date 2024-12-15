---
title: Editors (Vim)
authors: [cangjingyue]
tags: 
    - CS
    - Missing
date: 2024-12-14 00:00:00
categories:
  - CS
---

# Editors (Vim)

!!!attachment
    course link: [Editors (Vim)](https://missing.csail.mit.edu/2020/editors/)
    
    
## Modal editing


Vim has multiple operating modes.

* **Normal**: for moving around a file and making edits
* **Insert**: for inserting text
* **Replace**: for replacing text
* **Visual (plain, line, or block)**: for selecting blocks of text
* **Command-line**: for running a command



<img src="https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2024/12/14/17341679832612.jpg" style="height:400px; display: block; margin: auto;">


## Basics

### Inserting text

From **Normal** mode, press `i` to enter **Insert** mode. 

Now, Vim behaves like any other text editor, until you press` <ESC>` to return to **Normal** mode. 

---

### Buffers, tabs, and windows

Vim maintains a set of open files, called **“buffers”**. 

A Vim **session** has **a number of tabs**, each of which has **a number of windows** (split panes). 

**Each window shows a single buffer**. Unlike other programs you are familiar with, like web browsers, there is not a 1-to-1 correspondence between buffers and windows; windows are merely views. 

**A given buffer may be open in multiple windows, even within the same tab.**

This can be quite handy, for example, to **view two different parts of a file at the same time**.

By default, Vim opens with a **single** tab, which contains a **single** window.

----

### Command-line

**Command** mode can be entered by typing `:` in **Normal** mode. 

Your cursor will jump to the command line at the **bottom** of the screen upon pressing `:`. 

This mode has many functionalities, including **opening, saving, and closing files, and quitting Vim**.

* `:q` quit (close window)
* `:w` save (“write”)
* `:wq` save and quit
* `:e {name of file}` open file for editing
* `:ls` show open buffers
* `:help {topic}` open help
    * `:help :w` opens help for the `:w` command
    * `:help w` opens help for the `w` movement

---
    
## Vim’s interface is a programming language


### Movement

Movements in Vim are also called **“nouns”**, because **they refer to chunks of text**.

* **Basic movement**: `hjkl` (left, down, up, right)
* **Words**: `w` (next word), `b` (beginning of word), `e` (end of word)
* **Lines**: `0` (beginning of line), `^` (first non-blank character), `$` (end of line)
* **Screen**: `H` (top of screen), `M` (middle of screen), `L` (bottom of screen)
* **Scroll**: `Ctrl-u` (up), `Ctrl-d` (down)
* **File**: `gg` (beginning of file), `G` (end of file)
* **Line numbers**: :`{number}<CR>` or `{number}G` (line {number})
* **Misc**: `%` (corresponding item)
* **Find**: `f{character}`, `t{character}`, `F{character}`, `T{character}`
    * find/to forward/backward {character} on the current line
    * `,` / `;` for navigating matches
* **Search**: `/{regex}`, `n` / `N` for navigating matches    

---

### Selection

**Visual** modes:

* Visual: v
* Visual Line: V
* Visual Block: Ctrl-v


Can use movement keys to make selection.

---

### Edits

Vim’s editing commands are also called **“verbs”**, because **verbs act on nouns**.

* `i` enter **Insert** mode
    * but for manipulating/deleting text, want to use something more than backspace
* `o` / `O` **insert line** ***below*** / ***above***
* `d{motion}` **delete** `{motion}`
    * e.g. `dw` is delete word, `d$` is delete to end of line, `d0` is delete to beginning of line
* `c{motion}` **change** `{motion}`
    * e.g. `cw` is change word
    * like `d{motion}` followed by `i`
* `x` **delete** character (equal do `dl`)
* `s` **substitute** character (equal to `cl`)
* **Visual mode + manipulation**
    * select text, `d` to delete it or `c` to change it
* `u` to **undo**, `<C-r>` to **redo**
* `y` to **copy** / ***“yank”*** (some other commands like `d` also copy)
* `p` to **paste**
* Lots more to learn: e.g. `~` **flips the case** of a character

---

### Counts

You can combine nouns and verbs with a **count**, which will perform a given action a number of times.

* `3w` move 3 **words** **forward**
* `5j` move 5 **lines** **down**
* `7dw` **delete** 7 **words**

---

### Modifiers

You can use **modifiers** to **change** the meaning of a **noun**. 

Some modifiers are `i`, which means **“inner”** or **“inside”**, and `a`, which means **“around”**.

* `ci(` change the contents inside the current pair of parentheses
* `ci[` change the contents inside the current pair of square brackets
* `da'` delete a single-quoted string, including the surrounding single quotes


## Customizing Vim

Vim is customized through a plain-text configuration file in `~/.vimrc` (containing Vimscript commands).

Here is the basic configuration file that provided by this course.

```vim
" Comments in Vimscript start with a `"`.

" If you open this file in Vim, it'll be syntax highlighted for you.

" Vim is based on Vi. Setting `nocompatible` switches from the default
" Vi-compatibility mode and enables useful Vim functionality. This
" configuration option turns out not to be necessary for the file named
" '~/.vimrc', because Vim automatically enters nocompatible mode if that file
" is present. But we're including it here just in case this config file is
" loaded some other way (e.g. saved as `foo`, and then Vim started with
" `vim -u foo`).
set nocompatible

" Turn on syntax highlighting.
syntax on

" Disable the default Vim startup message.
set shortmess+=I

" Show line numbers.
set number

" This enables relative line numbering mode. With both number and
" relativenumber enabled, the current line shows the true line number, while
" all other lines (above and below) are numbered relative to the current line.
" This is useful because you can tell, at a glance, what count is needed to
" jump up or down to a particular line, by {count}k to go up or {count}j to go
" down.
set relativenumber

" Always show the status line at the bottom, even if you only have one window open.
set laststatus=2

" The backspace key has slightly unintuitive behavior by default. For example,
" by default, you can't backspace before the insertion point set with 'i'.
" This configuration makes backspace behave more reasonably, in that you can
" backspace over anything.
set backspace=indent,eol,start

" By default, Vim doesn't let you hide a buffer (i.e. have a buffer that isn't
" shown in any window) that has unsaved changes. This is to prevent you from "
" forgetting about unsaved changes and then quitting e.g. via `:qa!`. We find
" hidden buffers helpful enough to disable this protection. See `:help hidden`
" for more information on this.
set hidden

" This setting makes search case-insensitive when all characters in the string
" being searched are lowercase. However, the search becomes case-sensitive if
" it contains any capital letters. This makes searching more convenient.
set ignorecase
set smartcase

" Enable searching as you type, rather than waiting till you press enter.
set incsearch

" Unbind some useless/annoying default key bindings.
nmap Q <Nop> " 'Q' in normal mode enters Ex mode. You almost never want this.

" Disable audible bell because it's annoying.
set noerrorbells visualbell t_vb=

" Enable mouse support. You should avoid relying on this too much, but it can
" sometimes be convenient.
set mouse+=a

" Try to prevent bad habits like using the arrow keys for movement. This is
" not the only possible bad habit. For example, holding down the h/j/k/l keys
" for movement, rather than using more efficient movement commands, is also a
" bad habit. The former is enforceable through a .vimrc, while we don't know
" how to prevent the latter.
" Do this in normal mode...
nnoremap <Left>  :echoe "Use h"<CR>
nnoremap <Right> :echoe "Use l"<CR>
nnoremap <Up>    :echoe "Use k"<CR>
nnoremap <Down>  :echoe "Use j"<CR>
" ...and in insert mode
inoremap <Left>  <ESC>:echoe "Use h"<CR>
inoremap <Right> <ESC>:echoe "Use l"<CR>
inoremap <Up>    <ESC>:echoe "Use k"<CR>
inoremap <Down>  <ESC>:echoe "Use j"<CR>
``` 

For macos, There might not have the default `.vimrc` file in `~`.

But never mind, just type `vim ~/.vimrc` and paste the code into it, then type `:wq`.

You will find that everything is done!


## Extending Vim

***copy lecture notes...need review***

There are tons of plugins for extending Vim. Contrary to outdated advice that you might find on the internet, you do not need to use a plugin manager for Vim (since Vim 8.0). Instead, you can use the built-in package management system. Simply create the directory `~/.vim/pack/vendor/start/`, and put plugins in there (e.g. via `git clone`).

Here are some of our favorite plugins:

* [ctrlp.vim](https://github.com/ctrlpvim/ctrlp.vim): fuzzy file finder
* [ack.vim](https://github.com/mileszs/ack.vim): code search
* [nerdtree](https://github.com/preservim/nerdtree): file explorer
* [vim-easymotion](https://github.com/easymotion/vim-easymotion): magic motions


We’re trying to avoid giving an overwhelmingly long list of plugins here. You can check out the instructors’ dotfiles ([Anish](https://github.com/anishathalye/dotfiles), [Jon](https://github.com/jonhoo/configs), [Jose](https://github.com/JJGO/dotfiles)) to see what other plugins we use. Check out [Vim Awesome](https://vimawesome.com/) for more awesome Vim plugins. There are also tons of blog posts on this topic: just search for “best Vim plugins”.



## Resources

* **vimtutor** is a tutorial that comes installed with Vim - if Vim is installed, you should be able to run `vimtutor` from your shell
* [Vim Adventures](https://vim-adventures.com/) is a game to learn Vim
* [Vim Tips Wiki](https://vim.fandom.com/wiki/Vim_Tips_Wiki)
* [Vim Advent Calendar](https://vimways.org/2019/) has various Vim tips
* [Vim Golf](https://www.vimgolf.com/) is [code golf](https://en.wikipedia.org/wiki/Code_golf), but where the programming language is Vim’s UI
* [Vi/Vim Stack Exchange](https://vi.stackexchange.com/)
* [Vim Screencasts](http://vimcasts.org/)
* [Practical Vim](https://pragprog.com/titles/dnvim2/practical-vim-second-edition/) (book)


## Exercises

!!!warning
    I will write my own solution to the problem, If you want to solve those by yourself, please stop.
    
---

**Problem1**

Complete `vimtutor`. Note: it looks best in a `80x24` (80 columns by 24 lines) terminal window.


<br/>

**Solution**

```bash
vimtutor
```


---

**Problem2**

- Install and configure a plugin: [ctrlp.vim](https://github.com/ctrlpvim/ctrlp.vim).

    1. Create the plugins directory with `mkdir -p ~/.vim/pack/vendor/start`
    2. Download the plugin: `cd ~/.vim/pack/vendor/start; git clone https://github.com/ctrlpvim/ctrlp.vim`
    3. Read the [documentation](https://github.com/ctrlpvim/ctrlp.vim/blob/master/readme.md) for the plugin. Try using CtrlP to locate a file by navigating to a project directory, opening Vim, and using the Vim command-line to start `:CtrlP`.
    4. Customize CtrlP by adding configuration to your `~/.vimrc` to open CtrlP by pressing Ctrl-P.

<br/>

**Solution**


---

**Problem3**

To practice using Vim, re-do the Demo from lecture on your own machine.

Here is a broken fizz buzz implementation:

```python
def fizz_buzz(limit):
    for i in range(limit):
        if i % 3 == 0:
            print('fizz')
        if i % 5 == 0:
            print('fizz')
        if i % 3 and i % 5:
            print(i)

def main():
    fizz_buzz(10)
```

fix the following issues:

* Main is never called
* Starts at 0 instead of 1
* Prints “fizz” and “buzz” on separate lines for multiples of 15
* Prints “fizz” for multiples of 5
* Uses a hard-coded argument of 10 instead of taking a command-line argument

<br/>

**Solution**

1. `G` move to the bottom of the file
2. `o` create a new line
3. insert code:
```py
if __name__ == '__main__':
    main()
```
4. `/limit` search for `limit`, then press `n` to move to the next match
2. `i` enter `insert` mode, and change `limit` to `1, limit + 1`
3. `/fizz` search for `fizz`, then press `n` to move to the next match.
4. `ci'` change the inner text of `'`, insert `buzz`
5. move the cursor to the `print('fizz')` line, press `$`, then `i` enter insert mode and insert `, end=''`
6. `jj.` move the cursor to line 6 and make the same change as previous did
7. `gg` move the cursor to the top of the file, `O` create the new line above，and insert `import sys`
8. `/10` find `10`, then `ci(` change the text in `(`, type `int(sys.argv[1])`


The final result:
```py
import sys

def fizz_buzz(limit):
    for i in range(1, limit + 1):
        if i % 3 == 0:
            print('fizz', end='')
        if i % 5 == 0:
            print('buzz', end='')
        if i % 3 and i % 5:
            print(i)

def main():
    fizz_buzz(int(sys.argv[1]))

if __name__ == '__main__':
    main()
```


---

**Problem4**

(Advanced) Convert XML to JSON ([example file](https://missing.csail.mit.edu/2020/files/example-data.xml)) using Vim macros. Try to do this on your own, but you can look at the macros section above if you get stuck.


<br/>

**Solution**

...TO DO
