---
title: 让 TODO 动起来
authors: [cangjingyue]
tags:
    - frontend
date: 2026-01-02 00:00:00
categories:
    - frontend
---

# 让 TODO 动起来

## 一、使用 Context API 父子组件通信

React 提供 Context API 兼顾显示数据管理和全局数据引用便利性。

### 1. 创建应用的 Context

```typescript
import { createContext } from "react";

const ThemeContext = createContext({"light"});
```

### 2. 使用 Context 包裹组件根节点

```typescript
import React, { createContext } from "react";

const ThemeContext = createContext("light");

function App() {
    const [theme, setTheme] = React.useState("light");
    // ...
    return (
        // value 内容发生变化，触发应用内消费 Context 数据的所有组件重新渲染
        <ThemeContext.Provider value={theme}>
            <Page />
        </ThemeContext.Provider>
    );
}
```

### 3. 底层组件直接获取 Context 数据

```typescript
import React, { useContext } from "react";

// Page的子组件 Button
function Button() {
    const theme = useContext(ThemeContext);
    return <button className={theme}></button>;
}
```

## 二、为 TODO 创建 Context

Todo 应用因用户交互变化的数据主要有三部分，定义为 state: todo, todos, filter。

用户交互行为被封装在了 header，footer，todos 组件中，这些组件既需要顶层的数据用于展示 UI，有需要操纵数据变化，因此需要在 Context 中传入 todo，todos, filter 以及相应的操作方法。

```typescript
import { createContext } from "react";
import type { FiltersValueType } from "./components/footer/filter";
import type { TodoItemProps } from "./components/todos/item";

type Context = {
    filter: FiltersValueType;
    setFilter: (filter: FiltersValueType) => void;
    todos: TodoItemProps[];
    setTodos: (todos: TodoItemProps[]) => void;
};

const TodoContext = createContext<Context>({} as Context);

export default TodoContext;
```

## 三、准备初始数据，使用 Context 包裹应用

```typescript
import { Typography } from "antd";
import Footer, { FILTERS } from "./components/footer";
import Header from "./components/header";
import TodoList from "./components/todos/list";

import defaultTodoData from "./data";

import { useEffect, useState } from "react";
import "../global.less";
import type { FiltersValueType } from "./components/footer/filter";
import type { TodoItemProps } from "./components/todos/item";
import TodoContext from "./todoContext";

const Title = Typography.Title;

function getTodoData(): Promise<TodoItemProps[]> {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(defaultTodoData);
        }, 300);
    });
}

export default function App() {
    const [filter, setFilter] = useState<FiltersValueType>(FILTERS.All);
    const [todos, setTodos] = useState<TodoItemProps[]>();

    useEffect(() => {
        getTodoData().then(setTodos);
    }, []);

    return (
        <TodoContext.Provider
            value={{
                filter,
                setFilter,
                todos: todos || [],
                setTodos: setTodos,
            }}
        >
            <div className="todo-container">
                <Title level={2}>Todos</Title>
                <div className="todo">
                    <Header />
                    <TodoList />
                    <Footer />
                </div>
            </div>
        </TodoContext.Provider>
    );
}
```

## 四、为 header 增加 addTodo 能力

```typescript
import { Input } from "antd";
import { useContext, useState } from "react";
import TodoContext from "../../todoContext";
import type { TodoItem } from "../todos/item";

const Header: React.FC = () => {
    const [input, setInput] = useState("");
    const { todos, setTodos } = useContext(TodoContext);

    const addTodo = () => {
        if (input !== "") {
            const lastTodoId =
                todos.length > 0 ? todos[todos.length - 1].id : 0;

            const newTodo: TodoItem = {
                id: lastTodoId + 1,
                text: input,
                completed: false,
            };

            setTodos([...todos, newTodo]);
            setInput("");
        }
    };

    return (
        <Input
            className="new-todo"
            placeholder="What needs to be done?"
            value={input}
            onChange={(ev) => {
                setInput(ev.target.value);
            }}
            onKeyDown={(ev) => {
                if (ev.key === "Enter") {
                    addTodo();
                }
            }}
        />
    );
};

export default Header;
```

## 五、footer 处理

### 1. 简化 footer 根组件

```typescript
import { Col, Row } from "antd";
import Actions from "./actions";
import Filter from "./filter";
import RemainingTodos from "./remain";

import "./index.less";

const Footer: React.FC = () => {
    return (
        <footer className="todo-footer">
            <Row>
                <Col className="actions" span={8}>
                    <Actions />
                </Col>
                <Col span={8}>
                    <RemainingTodos />
                </Col>
                <Col span={8}>
                    <Filter />
                </Col>
            </Row>
        </footer>
    );
};

export default Footer;
export { FILTERS } from "./filter";
```

### 2. 为 actions 添加修改 todos 状态的能力

```typescript
import { Button, Typography } from "antd";
import { useContext } from "react";
import TodoContext from "../../todoContext";

const Title = Typography.Title;

const FooterActions: React.FC = () => {
    const { todos, setTodos } = useContext(TodoContext);

    return (
        <>
            <Title level={5}>Actions</Title>
            <Button
                className="btn-action"
                size="small"
                onClick={() => {
                    const newTodos = todos.map((todo) => {
                        todo.completed = true;
                        return todo;
                    });
                    setTodos(newTodos);
                }}
            >
                Mark All as Completed
            </Button>
            <Button
                className="btn-action"
                size="small"
                onClick={() => {
                    const newTodos = todos.filter((todo) => !todo.completed);
                    setTodos(newTodos);
                }}
            >
                Clear Completed
            </Button>
        </>
    );
};

export default FooterActions;
```

### 3. remain 组件自主计算显示数字

```typescript
import { Typography } from "antd";
import { useContext } from "react";
import TodoContext from "../../todoContext";

const Title = Typography.Title;

const RemainingTodo: React.FC = () => {
    const { todos } = useContext(TodoContext);

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

### 4. 为 filter 添加切换能力

```typescript
import { Radio, Typography } from "antd";
import { useContext } from "react";
import TodoContext from "../../todoContext";

const Title = Typography.Title;

export const FILTERS = {
    All: "all",
    Active: "active",
    Completed: "completed",
} as const;

export type FiltersValueType = (typeof FILTERS)[keyof typeof FILTERS];

const Filter: React.FC = () => {
    const { filter, setFilter } = useContext(TodoContext);

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

## 六、todo 控制

### 1. 简化 list

```typescript
import { useContext } from "react";
import TodoContext from "../../todoContext";
import { FILTERS } from "../footer";
import TodoItem from "./item";
import "./list.less";

const TodoList: React.FC = () => {
    const { todos, filter } = useContext(TodoContext);

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

### 2. 为 todo item 添加交互

```typescript
import { DeleteFilled } from "@ant-design/icons";
import { Checkbox, Col, Row } from "antd";

import { useContext } from "react";
import TodoContext from "../../todoContext";
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
    const { todos, setTodos } = useContext(TodoContext);

    const toggleCompleted = () => {
        const todoItem = todos.find((todo) => todo.id === id);
        if (todoItem) {
            todoItem.completed = !todoItem.completed;
            setTodos([...todos]);
        }
    };

    const remove = () => {
        const newTodos = todos.filter((todo) => todo.id !== id);
        setTodos(newTodos);
    };

    return (
        <li className="todo-item">
            <Row>
                <Col span={2} className="toggle-status">
                    <Checkbox checked={completed} onClick={toggleCompleted} />
                </Col>
                <Col span={20} className="todo-text">
                    {text}
                </Col>
                <Col span={2} className="delete-todo">
                    <DeleteFilled
                        className="delete-todo-icon"
                        onClick={remove}
                    />
                </Col>
            </Row>
        </li>
    );
};

export default TodoItem;
```
