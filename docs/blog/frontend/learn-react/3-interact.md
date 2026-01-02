---
title: 为组件添加交互能力
authors: [cangjingyue]
tags:
    - frontend
date: 2026-01-02 00:00:00
categories:
    - frontend
---

# 为组件添加交互能力

## 一、事件绑定

React 元素的事件处理和 DOM 元素的很相似，但是有一点语法上的不同：

-   React 事件的命名使用小驼峰式，而不是纯小写
-   使用 JSX 语法时需要传入一个函数作为事件处理函数，而不是一个字符串

```html
<button onclick="activateLasers()">Activate Lasers</button>
```

```jsx
<button onClick={activateLasers}>Activate Lasers</button>
```

## 二、组件状态管理

之前写的组件中没有设计 state，使用 props 进行静态渲染，但很多时候组件是有内部状态的，比如一个计数器，每点击一次按钮，count+1， 使用 props 可能这样写

```typescript
function Counter(props: { count: number }) {
    let { count } = props;
    return (
        <div>
            <p>Count: {count}</p>
            <button onClick={() => (count += 1)}>Increment</button>
        </div>
    );
}
```

但是上面的代码是错误的，因为 props 是只读的，不能被修改。也就是说 `fx(props) = UI` 是一锤子买卖，组件根据 props 完成渲染后不再变化，我们称其为无状态组件。

很多时候组件渲染完成后，内部状态在发生变化，需要相应的 UI 渲染内容更新。React 组件中这种运行时内部状态称为 State，State 可以理解为组件实例的内存，是组件在某一时刻的 SnapShot。

State 也是 React 组件数据的一部分，因此用 `fx(data) = UI` 来描述 React 更合适。

### 1. 使用 useState 保持状态

React 使用 useState Hook 来在函数组件中添加状态管理能力，State 变化会触发组件的重新渲染，状态被保留，渲染符合预期的 UI 结果。

```typescript
import { useState } from "react";

export default function Counter(props: { count: number }) {
    const [count, setCount] = useState(props.count);

    return (
        <div>
            <p>Count: {count}</p>
            <button onClick={() => setCount(count + 1)}>Increment</button>
        </div>
    );
}
```

`const [状态变量， 修改状态的函数] = useState(状态变量初始值);`

useState 在函数第一次执行时赋值为初始值，当函数内部状态发生变化，函数重新执行，state 不会重新初始化，而是引用返回当前的状态值直接使用。

### 2. 中括号的作用

很多 demo 中使用的变量名是 [state, setState], 这样的写法可能让人误会 useState 返回的是一个有名字的变量，实际 useState 返回的是一个 length=2 的普通数组。

`const [count, setCount] = useState(0);` 语法是数组解构，返回值是数组开发者可以起和逻辑相符的名称，而返回值是对象就自带了 key，多个 state 使用时需要反复重命名。

## 三、副作用 useEffect

在 React 组件中，除了渲染 UI 之外，很多时候我们还需要执行一些副作用操作，比如数据获取、订阅事件、手动修改 DOM 等等。这些操作通常不直接影响组件的渲染结果，但它们可能会影响组件的行为或外部环境。

React 提供了 useEffect Hook 来处理这些副作用操作。useEffect 允许我们在函数组件中执行副作用代码，并且可以指定依赖项来控制副作用的执行时机。

```typescript
import { useEffect, useState } from "react";

export default function Counter(props: { readonly count: number }) {
    const [count, setCount] = useState(props.count);

    useEffect(() => {
        document.title = `You clicked ${count} times`;
    });

    return (
        <div>
            <p>Count: {count}</p>
            <button onClick={() => setCount(count + 1)}>Increment</button>
        </div>
    );
}
```

### 1. 执行时机

useEffect 会在组件完成渲染、节点挂载到 DOM 对象后执行，所以可以修改最新的组件 DOM 渲染结果

### 2. useEffect 每次渲染都执行吗

是的，默认情况下 useEffect 在第一次渲染和每次更新后都会执行，在 useEffect 内部可以拿到出发渲染时最新的 state，每次组件重新渲染都会生成新的 effect。某种意义上讲，effect 更像是渲染结果的一部分，每个 effect 属于一次特定的渲染。

```typescript
import { useEffect, useState } from "react";

export default function Counter(props: { readonly count: number }) {
    const [count, setCount] = useState(props.count);

    useEffect(() => {
        setTimeout(() => {
            console.log(`Count is: ${count}`);
        }, 1000);
    });

    return (
        <div>
            <p>Count: {count}</p>
            <button onClick={() => setCount(count + 1)}>Increment</button>
        </div>
    );
}
```

连续点击按钮三次，按照常规的理解，首次渲染控制台打印 0，连续三次点击后触发，count 已经被更新为 3，所以应该连续输出 3 3 3，但实际结果确实 1 2 3。

React 会保证组件的 state 是每次渲染的独立快照，不会在多次渲染之间共享（除非特意使用 useRef），因此上文才说 effect 也是渲染结果的一部分，属于一次特定的渲染。

### 3. 如何控制 useEffect 过度调用

有时候我们并不希望 useEffect 每次渲染都执行，比如上面的例子，我们只希望在 count 变化时才执行副作用操作。为此，useEffect 提供了第二个参数，依赖项数组，可以用来指定副作用的依赖项。

```typescript
import { useEffect, useState } from "react";

export default function Counter(props: { readonly count: number }) {
    const [count, setCount] = useState(props.count);

    useEffect(() => {
        setTimeout(() => {
            console.log(`Count is: ${count}`);
        }, 1000);
    });

    useEffect(() => {
        document.title = `You clicked ${count} times`;
    }, [count]); // 只有当 count 变化时才执行

    useEffect(() => {
        console.log("Component mounted");
    }, []); // 只在组件挂载时执行一次

    return (
        <div>
            <p>Count: {count}</p>
            <button onClick={() => setCount(count + 1)}>Increment</button>
        </div>
    );
}
```

### 4. 清理副作用

有些副作用操作需要在组件卸载或依赖项变化时进行清理，比如订阅事件、定时器等。useEffect 允许我们返回一个清理函数，用于执行清理操作。

```typescript
useEffect(() => {
    // 副作用处理

    return () => {
        // 清理操作
    };
}, [依赖项]);
```

## 四、Hooks

React 中 useState、useEffect 这类 use 作为命名前缀风格的函数被称为 hook。React 倡导组件尽量写成纯函数，没有状态和执行副作用，如果需要使用则用钩子将这类代码钩如 React 组件中。

### 1. 规则

-   只能在函数组件的顶层调用 Hook，不能在循环、条件判断或嵌套函数中调用。
-   只能在 React 函数组件或自定义 Hook 中调用 Hook，不能在普通的 JavaScript 函数中调用。

可以在单个组件中使用多个 State Hook 或 Effect Hook，React 怎么知道哪个 state 对应哪个 useState？答案是 React 通过调用顺序来区分不同的 Hook，每次渲染时，React 会按照 Hook 被调用的顺序来分配状态。只要 Hook 的调用顺序在多次渲染之间保持一致，React 就能正确地将内部的 state 和对应的 hook 进行关联，使用 if 等包裹会导致顺序不稳定，因此只能在最顶层调用。

### 2. 修改 state 的时候发生了什么

修改 state 会触发 React 组件重新渲染，React 会保证 State 不会重新初始化，并且保持上次渲染的状态；组件可能会多次修改 State，React 会合并一个渲染周期内的多次 State 修改，只进行一次重新渲染。
