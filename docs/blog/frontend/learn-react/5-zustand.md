---
title: 状态管理 Zustand
authors: [cangjingyue]
tags:
    - frontend
date: 2026-01-02 00:00:00
categories:
    - frontend
---

# 状态管理 Zustand

## 一、依旧混乱的代码

在前面的章节中，我们使用 useContext 集中管理应用的状态，显著减少了 props 层层传递的问题，但由于把触发状态变化和状态变化过程的代码杂糅在一起，应用代码组织依然混乱。

在复杂交互的应用中管理不断变化的 state 非常困难。如果一个 model 的变化会引起另一个 model 的变化，那么当 view 变化的时候，就可能引起对应 model 的变化，进而引起另一个 model 的变化，最终又引起 view 的变化，这样就形成了一个循环，导致应用难以维护。

当这些连锁反应到一定程度之后，开发者根本搞不清到底发生了什么。state 在什么时候，由于什么原因，如何变化已然不可控制。当系统变得错综复杂的时候，想重现问题或者添加新功能就会变得举步维艰。

为此，我们需要引入一个新的状态管理依赖 - zustand。

## 二、Zustand 简介

Zustand 是德语单词，意思是“状态”。中文空耳 `猝死丹特`,基本上每一个框架都会有自己的状态管理工具，比如 Vue 的 `Vuex`，React 的 `Redux`，Zustand 自然也是一个状态管理工具。

那么对比 Redux，等状态管理工具 Zustand 有什么优势呢？

> redux 是老牌状态管理库，能完成各种基本功能，并且有着庞大的中间件生态来扩展额外功能,但 redux 经常被人诟病它的使用繁琐。

1. `轻量级` Zustand 的体积非常小，只有 1kb 左右。
2. `简单易用` Zustand 不需要像 Redux，去通过`Provider`包裹组件，Zustand 提供了简洁的 API，能够快速上手。
3. `易于集成` Zustand 可以轻松的与 React 和 Vue 等框架集成。(Zustand 也有 Vue 版本)
4. `扩拓展性` Zustand 提供了中间件的概念，可以通过插件的方式扩展功能，例如(持久化,异步操作，日志记录)等。
5. `无副作用` Zustand 推荐使用 `immer`库处理不可变性， 避免不必要的副作用。

## 三、安装

```shell
pnpm add zustand
```

## 四、使用

### 1. 创建 Store

在 src 下新建目录 store，创建 todo-store.ts

```typescript
import { create } from "zustand";
import { FILTERS, type FiltersValueType } from "../components/footer/filter";
import { type TodoItem } from "../components/todos/item";

// 定义类型，用于描述状态管理器的状态和操作
type TodoState = {
    todos: TodoItem[];
    filter: FiltersValueType;
};

type TodoActions = {
    addTodo: (text: string) => void;
    removeTodo: (id: number) => void;
    toggleTodo: (id: number) => void;
    initTodos: (todos: TodoItem[]) => void;
    clearCompleted: () => void;
    markAllCompleted: () => void;
    setFilter: (filter: FiltersValueType) => void;
};

export type TodoStore = TodoState & TodoActions;

const useTodoStore = create<TodoStore>((set) => ({
    todos: [],
    addTodo: (text: string) =>
        set((state) => {
            const newTodo: TodoItem = {
                id: state.todos.length > 0 ? state.todos.at(-1)!.id + 1 : 1,
                text,
                completed: false,
            };
            return { todos: [...state.todos, newTodo] };
        }),
    removeTodo: (id: number) =>
        set((state) => ({
            todos: state.todos.filter((todo) => todo.id !== id),
        })),
    toggleTodo: (id: number) =>
        set((state) => ({
            todos: state.todos.map((todo) =>
                todo.id === id ? { ...todo, completed: !todo.completed } : todo
            ),
        })),
    initTodos: (todos: TodoItem[]) => set({ todos }),
    clearCompleted: () =>
        set((state) => ({
            todos: state.todos.filter((todo) => !todo.completed),
        })),
    markAllCompleted: () =>
        set((state) => ({
            todos: state.todos.map((todo) => ({ ...todo, completed: true })),
        })),
    filter: FILTERS.All,
    setFilter: (filter: FiltersValueType) => set({ filter }),
}));

export default useTodoStore;
```

### 2. 在组件中使用 Store

在组件中使用，以更新后的 TodoList 组件为例：

```typescript
import useTodoStore from "../../store/todo-store";
import { FILTERS } from "../footer";
import TodoItem from "./item";
import "./list.less";

const TodoList: React.FC = () => {
    const { todos, filter } = useTodoStore();

    const visibleTodos = todos.filter((todo) => {
        switch (filter) {
            case FILTERS.Active:
                return todo.completed === false;
            case FILTERS.Completed:
                return todo.completed === true;
            default:
                return true;
        }
    });

    return (
        <ul className="todo-list">
            {visibleTodos.map((todo) => (
                <TodoItem key={todo.id} data={todo} />
            ))}
        </ul>
    );
};

export default TodoList;
```

我们仅关注这一段代码：

```typescript
const { todos, filter } = useTodoStore();
```

通过 TS 的解构赋值，我们可以从 useTodoStore Hook 中获取到 todos 和 filter 两个状态变量。

通过调用 useTodoStore Hook，我们可以直接访问和操作全局状态，而不需要通过 Context 传递数据。这大大简化了组件的代码，使其更易于理解和维护。

### 3. 状态选择器

我们刚刚的代码中使用了解构来引入状态，但是这样引入会引发一个问题，例如，当我们修改 filter 状态时，其他组件也会重新渲染，即使其他组件依赖的状态没有变化，这样就导致了不必要的重渲染，因为其他组件很可能没有用到 filter 状态。（这也是 Context API 的问题）

为了解决这个问题，Zustand 提供了状态选择器的功能。我们可以通过传递一个选择器函数给 useTodoStore 来只订阅我们关心的状态。

```typescript
const todos = useTodoStore((state) => state.todos);
const filter = useTodoStore((state) => state.filter);
```

通过这种方式，只有当 todos 或 filter 发生变化时，组件才会重新渲染，从而提高了性能。

### 4. useShallow

想象一下，如果一个属性很多，比如 100 个，我们需要引入 100 次 useTodoStore 才能获取到所有属性，这样代码会变得非常冗长。

!!!tips
useShallow 只检查顶层对象的引用是否变化，如果顶层对象的引用没有变化（即使其内部属性或子对象发生了变化，但这些变化不影响顶层对象的引用），使用 useShallow 的组件将不会重新渲染

```typescript
import { useShallow } from "zustand/react/shallow";

const { todos, filter } = useTodoStore(
    useShallow((state) => ({
        todos: state.todos,
        filter: state.filter,
    }))
);
```

## 五、有状态无渲染，有渲染无状态

"有状态无渲染，有渲染无状态" 是社区对可维护的 React 组件的抽象

-   有状态无渲染：组件只负责管理状态，不负责渲染 UI。状态存储在外部（如 Zustand store），组件通过订阅状态变化来更新 UI。
-   有渲染无状态：组件只负责渲染 UI，不管理状态。 组件通过 props 接收状态和回调函数来更新状态。

这种模式有助于将状态管理和 UI 渲染分离，使组件更易于测试和复用。通过使用 Zustand 这样的状态管理库，我们可以轻松实现这种模式，从而提高应用的可维护性和性能。
