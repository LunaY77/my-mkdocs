---
title: React Query
authors: [cangjingyue]
tags:
    - frontend
date: 2026-01-03 00:00:00
categories:
    - frontend
---

# React Query

在前面的章节中，我们使用了 Zustand 来集中管理应用的状态，但实际上我们把两种不同性质的状态混在了一起：**服务端状态** 和 **客户端状态**。

## 一、服务端状态 vs 客户端状态

### 1. 客户端状态

客户端状态是完全由前端控制的状态，它只存在于浏览器中，而不需要与服务器同步。例如：

-   UI 状态：模态框的打开/关闭状态、选项卡的切换状态等
-   表单输入：用户正在输入但是还未提交的内容
-   筛选条件：TodoList 中的 filter（All/Active/Completed）

这些状态的特点是：

-   不需要先从服务器获取
-   不需要同步到服务器
-   完全由前端控制

### 2. 服务端状态

服务端状态是来自服务器的数据，它的真实来源在服务端，例如：

-   用户信息
-   文章列表
-   TodoList 中的 todos 数据

这些状态的特点是：

-   需要从服务器异步获取
-   可能会过期，需要重新获取
-   可能被其他用户修改
-   需要缓存以提升性能
-   需要处理加载、错误等状态

### 3. 为什么要区分？

在之前的 Zustand 实现中，我们把 todos（服务端状态）和 filter（客户端状态）混合在一起管理：

```typescript
type TodoState = {
    todos: TodoItem[];
    filter: FiltersValueType;
};
```

这样做的问题是：

1. 职责不清：Zustand 既要管理 UI 状态，又要管理服务器数据
2. 缺少缓存：Zustand 没有内置的缓存机制，我们需要自己实现数据的获取、缓存、过期等逻辑
3. 没有加载状态：无法优雅地处理数据的加载和错误状态
4. 手动同步：需要手动编写代码来同步数据
5. 重复逻辑：每个需要获取服务器数据的地方都需要重复编写相似的逻辑

## 二、React Query 简介

React Query 是一个用于管理服务端状态的强大库。它提供了以下功能：

1. **自动缓存**：自动缓存服务器数据，避免重复请求
2. **后台更新**: 自动在后台刷新数据，保持数据最新
3. **加载状态**: 自动管理 loading、error、success 等状态
4. **乐观更新**: 可以在请求完成前更新 UI，提升用户体验
5. **分页和无限加载**: 内置对分页和无限滚动的支持
6. **请求去重**: 相同的请求会被自动合并

相比于自己使用 `useState` 和 `useEffect` 来管理服务器数据，React Query 提供了更简洁、更高效的解决方案。

## 三、安装

```shell
pnpm add @tanstack/react-query
```

## 四、架构改造

### 1. 创建 api 层

首先我们需要把和服务端交互的逻辑抽离到单独的 API 层，创建 `src/app/api/todo-api.ts`

```typescript
import type { TodoItem } from "../components/todos/item";
import defaultTodoData from "./data";

// 模拟服务器 API - 获取所有 todos
export async function fetchTodos(): Promise<TodoItem[]> {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(defaultTodoData);
        }, 1000);
    });
}

// 模拟服务器 API - 添加一个新的 todo
export async function addTodoApi(text: string): Promise<TodoItem> {
    return new Promise((resolve) => {
        setTimeout(() => {
            const newTodo: TodoItem = {
                id: Math.floor(Math.random() * 10000),
                text,
                completed: false,
            };
            resolve(newTodo);
        }, 300);
    });
}

// 模拟服务器 API - 切换 todo 状态
export async function toggleTodoApi(id: number): Promise<{ id: number }> {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({ id });
        }, 300);
    });
}

// 模拟服务器 API - 删除一个 todo
export async function removeTodoApi(id: number): Promise<{ id: number }> {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({ id });
        }, 300);
    });
}

// 模拟服务器 API - 清除已完成的 todos
export async function clearCompletedApi(
    completedIds: number[]
): Promise<number[]> {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(completedIds);
        }, 300);
    });
}

// 模拟服务器 API - 标记所有 todos 为已完成
export async function markAllCompletedApi(
    todoIds: number[]
): Promise<number[]> {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(todoIds);
        }, 300);
    });
}
```

### 2. 简化 Zustand Store

现在 Zustand 只需要管理客户端状态 filter：

```typescript
import { create } from "zustand";
import {
    FILTERS,
    type FiltersValueType,
} from "../components/footer/filter-constants";

// 定义类型，用于描述状态管理器的状态和操作
type TodoState = {
    filter: FiltersValueType;
};

type TodoActions = {
    setFilter: (filter: FiltersValueType) => void;
};

export type TodoStore = TodoState & TodoActions;

const useTodoStore = create<TodoStore>((set) => ({
    filter: FILTERS.All,
    setFilter: (filter: FiltersValueType) => set({ filter }),
}));

export default useTodoStore;
```

### 3. 创建自定义 hook

为了方便在组件中使用 React Query，我们创建一个自定义的 hook `src/app/hooks/use-todos.ts`

```typescript
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    addTodoApi,
    clearCompletedApi,
    fetchTodos,
    markAllCompletedApi,
    removeTodoApi,
    toggleTodoApi,
} from "../api/todo-api";
import { type TodoItem } from "../components/todos/item";

// Query Key
export const TODOS_QUERY_KEY = ["todos"];

// 获取所有 Todos
export function useTodos() {
    return useQuery({
        queryKey: TODOS_QUERY_KEY,
        queryFn: fetchTodos,
    });
}

// 添加所有 todo
export function useAddTodo() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: addTodoApi,
        onSuccess: (newTodo) => {
            queryClient.setQueryData<TodoItem[]>(TODOS_QUERY_KEY, (old) => {
                return old ? [...old, newTodo] : [newTodo];
            });
        },
    });
}

// 切换 todo 状态
export function useToggleTodo() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: toggleTodoApi,
        onSuccess: ({ id }) => {
            queryClient.setQueryData<TodoItem[]>(TODOS_QUERY_KEY, (old) => {
                if (!old) return old;
                return old.map((todo) =>
                    todo.id === id
                        ? { ...todo, completed: !todo.completed }
                        : todo
                );
            });
        },
    });
}

// 删除 todo
export function useRemoveTodo() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: removeTodoApi,
        onSuccess: ({ id }) => {
            queryClient.setQueryData<TodoItem[]>(TODOS_QUERY_KEY, (old) => {
                if (!old) return old;
                return old.filter((todo) => todo.id !== id);
            });
        },
    });
}

// 清除已完成的 todos
export function useClearCompleted() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => {
            const todos =
                queryClient.getQueryData<TodoItem[]>(TODOS_QUERY_KEY) || [];
            const completedIds = todos
                .filter((todo) => todo.completed)
                .map((todo) => todo.id);
            return clearCompletedApi(completedIds);
        },
        onSuccess: (completedIds) => {
            queryClient.setQueryData<TodoItem[]>(TODOS_QUERY_KEY, (old) => {
                return old
                    ? old.filter((todo) => !completedIds.includes(todo.id))
                    : [];
            });
        },
    });
}

// 标记所有 todos 为已完成
export function useMarkAllCompleted() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => {
            const todos =
                queryClient.getQueryData<TodoItem[]>(TODOS_QUERY_KEY) || [];
            const todoIds = todos
                .filter((todo) => !todo.completed)
                .map((todo) => todo.id);
            return markAllCompletedApi(todoIds);
        },
        onSuccess: (todoIds) => {
            queryClient.setQueryData<TodoItem[]>(TODOS_QUERY_KEY, (old) => {
                if (!old) return old;
                return old.map((todo) =>
                    todoIds.includes(todo.id)
                        ? { ...todo, completed: true }
                        : todo
                );
            });
        },
    });
}
```

几个关键概念：

1. **queryKey**：用于标识和缓存数据的唯一键
2. **useQuery**：用于获取数据的 Hook，自动处理缓存、加载状态
3. **useMutation**：用于修改数据的 Hook，支持乐观更新和回调
4. **useQueryClient**：用于访问 Query Client，进行手动缓存更新
5. **onSuccess**：数据修改成功后的回调，用于更新缓存

### 4. 配置 QueryClientProvider

修改 `src/app/index.tsx`，添加 QueryClientProvider

```typescript
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Typography } from "antd";
import Footer from "./components/footer";
import Header from "./components/header";
import TodoList from "./components/todos/list";

import "../global.less";

const Title = Typography.Title;

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60, // 1 minute
            refetchOnWindowFocus: false,
        },
    },
});

export default function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <div className="todo-container">
                <Title level={2}>Todos</Title>
                <div className="todo">
                    <Header />
                    <TodoList />
                    <Footer />
                </div>
            </div>
        </QueryClientProvider>
    );
}
```

配置说明：

-   `staleTime: 1000 * 60`：数据在缓存中保持新鲜的时间，1 分钟内不会重新请求
-   `refetchOnWindowFocus: false`：禁用窗口聚焦时自动重新请求数据

## 五、组件改造

### 1. TodoList

```typescript
import { useTodos } from "../../hooks/use-todos";
import useTodoStore from "../../store/todo-store";
import { FILTERS } from "../footer/filter-constants";
import TodoItem from "./item";
import "./list.less";

const TodoList: React.FC = () => {
    const { data: todos = [], isLoading } = useTodos();
    const filter = useTodoStore((state) => state.filter);

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

    if (isLoading) {
        return <div className="todo-list-loading">Loading todos...</div>;
    }

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

### 2. TodoItem

```typescript
import { DeleteFilled } from "@ant-design/icons";
import { Checkbox, Col, Row } from "antd";

import { useRemoveTodo, useToggleTodo } from "../../hooks/use-todos";
import "./item.less";

export type TodoItem = {
    id: number;
    text: string;
    completed: boolean;
};

type TodoItemProps = {
    data: TodoItem;
};

const TodoItem: React.FC<TodoItemProps> = ({
    data: { id, text, completed },
}) => {
    const toggleTodoMutation = useToggleTodo();
    const removeTodoMutation = useRemoveTodo();

    return (
        <li className="todo-item">
            <Row>
                <Col span={2} className="toggle-status">
                    <Checkbox
                        checked={completed}
                        onClick={() => toggleTodoMutation.mutate(id)}
                    />
                </Col>
                <Col span={20} className="todo-text">
                    {text}
                </Col>
                <Col span={2} className="delete-todo">
                    <DeleteFilled
                        className="delete-todo-icon"
                        onClick={() => removeTodoMutation.mutate(id)}
                    />
                </Col>
            </Row>
        </li>
    );
};

export default TodoItem;
```

### 3. Header

```typescript
import { Input } from "antd";
import { useState } from "react";
import { useAddTodo } from "../../hooks/use-todos";

const Header: React.FC = () => {
    const [input, setInput] = useState("");
    const addTodoMutation = useAddTodo();

    return (
        <Input
            className="new-todo"
            placeholder="What needs to be done?"
            value={input}
            onChange={(ev) => {
                setInput(ev.target.value);
            }}
            onKeyDown={(ev) => {
                if (ev.key === "Enter" && input !== "") {
                    addTodoMutation.mutate(input);
                    setInput("");
                }
            }}
        />
    );
};

export default Header;
```

### 4. Footer Actions

```typescript
import { Button, Typography } from "antd";
import { useClearCompleted, useMarkAllCompleted } from "../../hooks/use-todos";

const Title = Typography.Title;

const FooterActions: React.FC = () => {
    const clearCompletedMutation = useClearCompleted();
    const markAllCompletedMutation = useMarkAllCompleted();

    return (
        <>
            <Title level={5}>Actions</Title>
            <Button
                className="btn-action"
                size="small"
                onClick={() => markAllCompletedMutation.mutate()}
            >
                Mark All as Completed
            </Button>
            <Button
                className="btn-action"
                size="small"
                onClick={() => clearCompletedMutation.mutate()}
            >
                Clear Completed
            </Button>
        </>
    );
};

export default FooterActions;
```

### 5. Remaining

```typescript
import { Typography } from "antd";
import { useTodos } from "../../hooks/use-todos";

const Title = Typography.Title;

const RemainingTodo: React.FC = () => {
    const { data: todos = [] } = useTodos();

    const count = todos.reduce((acc, prev) => {
        return prev.completed ? acc : acc + 1;
    }, 0);

    const suffix = count === 1 ? "" : "s";

    return (
        <div className="todo-count">
            <Title level={5}>Remaining Todos</Title>
            <strong>{count}</strong> item{suffix} left
        </div>
    );
};

export default RemainingTodo;
```

### 6. Filter

要将 Filter 中的常量拆出来否则会有循环依赖问题。

```typescript
import { Radio, Typography } from "antd";
import { useShallow } from "zustand/react/shallow";
import useTodoStore from "../../store/todo-store";
import { FILTERS } from "./filter-constants";

const Title = Typography.Title;

const Filter: React.FC = () => {
    const { filter, setFilter } = useTodoStore(
        useShallow((state) => ({
            filter: state.filter,
            setFilter: state.setFilter,
        }))
    );

    const filterTextList = Object.keys(FILTERS) as Array<keyof typeof FILTERS>;
    return (
        <div className="filters status-filters">
            <Title level={5}>Filter by Status</Title>
            <Radio.Group
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                size="small"
            >
                {filterTextList.map((text) => {
                    const val = FILTERS[text];
                    return (
                        <Radio.Button key={val} value={val}>
                            {text}
                        </Radio.Button>
                    );
                })}
            </Radio.Group>
        </div>
    );
};

export default Filter;
```

touch filter-constants.ts

```typescript
export const FILTERS = {
    All: "all",
    Active: "active",
    Completed: "completed",
} as const;

export type FiltersValueType = (typeof FILTERS)[keyof typeof FILTERS];
```
