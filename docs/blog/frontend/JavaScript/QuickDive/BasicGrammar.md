---
title: 基本语法
authors: [cangjingyue]
tags: 
    - javascript
date: 2024-11-13
categories:
  - javascript
      - QuickDive
---



# 基本语法
JavaScript的语法和Java语言类似，每个语句以`;`结束，语句块用`{...}`。但是，JavaScript并不强制要求在每个语句的结尾加`;`，浏览器中负责执行JavaScript代码的引擎会自动在每个语句的结尾补上`;`。



## 1. 声明

``` javascript
var x = 1;
const y = 1;
let z = 1;
```

1. var
声明一个变量，可选初始化一个值。

2. const
声明一个块作用域的只读常量。

3. let
声明一个块作用域的局部变量，可选初始化一个值。

!!! 注意
    建议在代码中尽可能多地使用 `let`，而不是 `var`


## 2. 分支
### 错误判断

下面这些值将被计算出 false (also known as Falsy values):
* false
* undefined
* null
* 0
* NaN
* 空字符串（""）



### if...else
``` javascript
if (condition_1) {
  statement_1;
} else if (condition_2) {
  statement_2;
} else if (condition_n_1) {
  statement_n;
} else {
  statement_last;
}
```



### switch

``` javascript
switch (expression) {
   case label_1:
      statements_1
      [break;]
   case label_2:
      statements_2
      [break;]
   ...
   default:
      statements_def
      [break;]
}
```



## 3. 错误




### 异常处理语句
你可以用 throw 语句抛出一个异常并且用 try...catch 语句捕获处理它。

* throw语句
* try...catch语句



### 异常类型

JavaScript 可以抛出任意对象。然而，不是所有对象能产生相同的结果。尽管抛出数值或者字母串作为错误信息十分常见，但是通常用下列其中一种异常类型来创建目标更为高效：

* [ECMAScript exceptions](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Error#error_types)
* [DOMException](https://developer.mozilla.org/zh-CN/docs/Web/API/DOMException) and [DOMError](https://developer.mozilla.org/zh-CN/docs/Web/API/DOMError)




### throw

使用throw语句抛出一个异常。当你抛出异常，你规定一个含有值的表达式要被抛出。

``` javascript
throw expression;
```



### try...catch...finally

``` javascript
openMyFile();
try {
  writeMyFile(theData); //This may throw a error
} catch (e) {
  handleError(e); // If we got a error we handle it
} finally {
  closeMyFile(); // always close the resource
}
```



## 4. 循环与迭代



### for

``` javascript
for ([initialExpression]; [condition]; [incrementExpression])
  statement
```

示例：
``` javascript
var step;
for (step = 0; step < 5; step++) {
  // Runs 5 times, with values of step 0 through 4.
  console.log("Walking east one step");
}
```



### do...while

``` javascript
do
  statement
while (condition);
```

示例：
在下面的例子中，这个 `do` 循环将至少重复一次，并且一直重复直到 `i` 不再小于 5。
``` javascript
var i = 0;
do {
  i += 1;
  console.log(i);
} while (i < 5);
```



### while

``` javascript
while (condition)
  statement
```

示例：
``` javascript
var n = 0;
var x = 0;
while (n < 3) {
  n++;
  x += n;
}
```



### label
类似于java，一个 `label` 提供了一个让你在程序中其他位置引用它的标识符。例如，你可以用 `label` 标识一个循环，然后使用 `break` 或者 `continue` 来指出程序是否该停止循环还是继续循环。

``` javascript
var num = 0;
outPoint: for (var i = 0; i < 10; i++) {
  for (var j = 0; j < 10; j++) {
    if (i == 5 && j == 5) {
      break outPoint; // 在 i = 5，j = 5 时，跳出所有循环，
      // 返回到整个 outPoint 下方，继续执行
    }
    num++;
  }
}

alert(num); // 输出 55
```




### for...in
for...in 语句循环一个指定的变量来循环一个对象所有可枚举的属性。JavaScript 会为每一个不同的属性执行指定的语句。

``` js
for (variable in object) {
  statements
}
```

示例：
下面的函数通过它的参数得到一个对象和这个对象的名字。然后循环这个对象的所有属性并且返回一个列出属性名和该属性值的字符串。
``` js
function dump_props(obj, obj_name) {
  var result = "";
  for (var i in obj) {
    result += obj_name + "." + i + " = " + obj[i] + "<br>";
  }
  result += "<hr>";
  return result;
}
```
对于一个拥有 `make` 和 `model` 属性的 `car` 对象来说，执行结果 `result` 是：
```
car.make = Ford
car.model = Mustang
```



### for...of

for...of 语句在可迭代对象（包括Array、Map、Set、arguments 等等）上创建了一个循环，对值的每一个独特属性调用一次迭代。

``` js
for (variable of object) {
  statement
}
```



下面的这个例子展示了 for...of 和 for...in 两种循环语句之间的区别。 for...in 循环遍历的结果是数组元素的下标，而 for...of 遍历的结果是元素的值：
``` js
let arr = [3, 5, 7];
arr.foo = "hello";

for (let i in arr) {
  console.log(i); // 输出 "0", "1", "2", "foo"
}

for (let i of arr) {
  console.log(i); // 输出 "3", "5", "7"
}

// 注意 for...of 的输出没有出现 "hello"
```