---
title: 实现静态版的 TODO
authors: [cangjingyue]
tags:
    - frontend
date: 2026-01-02 00:00:00
categories:
    - frontend
---

# 实现静态版的 TODO

搭建一个简单的 TODO

![image.png](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/picgo/20260102232213.png)

## 一、项目初始化

使用 vite 进行初始化

```shell
npm create vite@latest learn-react -- --template react-ts
cd learn-react
pnpm install
pnpm run dev
```

## 二、目录结构

```shell
├── package.json
├── pnpm-lock.yaml
├── public
│   └── vite.svg
├── README.md
├── src
│   ├── app
│   │   ├── components
│   │   │   ├── footer
│   │   │   │   ├── actions.tsx
│   │   │   │   ├── filter.tsx
│   │   │   │   ├── index.less
│   │   │   │   ├── index.tsx
│   │   │   │   └── remain.tsx
│   │   │   ├── header
│   │   │   │   └── index.tsx
│   │   │   └── todos
│   │   │       ├── item.less
│   │   │       ├── item.tsx
│   │   │       ├── list.less
│   │   │       └── list.tsx
│   │   ├── data.ts
│   │   └── index.tsx
│   ├── assets
│   │   └── react.svg
│   ├── global.less
│   └── main.tsx
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

## 三、添加依赖

```shell
pnpm add -D less
pnpm add antd @ant-design/icons
```

## 四、组件实现

### 1. Header

```typescript
import { Input } from "antd";

type HeaderProps = {
    placeholder?: string;
};

const Header: React.FC<HeaderProps> = ({
    placeholder = "What needs to be done?",
}) => {
    return <Input className="new-todo" placeholder={placeholder} />;
};

export default Header;
```

### 2. Todo 内容

antd 的 Grid 将页面 24 等分，使用其提供的 Row，Col 可以轻松为页面布局

#### 2.1. TodoItem

```typescript
import { DeleteFilled } from "@ant-design/icons";
import { Checkbox, Col, Row } from "antd";

import "./item.less";

export type TodoItemProps = {
    id: number;
    text: string;
    completed: boolean;
};

const TodoItem: React.FC<Pick<TodoItemProps, "text" | "completed">> = ({
    text,
    completed,
}) => {
    return (
        <li className="todo-item">
            <Row>
                <Col span={2} className="toggle-status">
                    <Checkbox checked={completed} />
                </Col>
                <Col span={20} className="todo-text">
                    {text}
                </Col>
                <Col span={2} className="delete-todo">
                    <DeleteFilled className="delete-todo-icon" />
                </Col>
            </Row>
        </li>
    );
};

export default TodoItem;
```

#### 2.2. TodoList

```typescript
import TodoItem, { type TodoItemProps } from "./item";
import "./list.less";

type TodoListProps = {
    data: TodoItemProps[];
};

const TodoList: React.FC<TodoListProps> = ({ data }) => {
    return (
        <ul className="todo-list">
            {data.map(({ id, text, completed }) => (
                <TodoItem key={id} text={text} completed={completed} />
            ))}
        </ul>
    );
};

export default TodoList;
```

### 3. Footer

Footer 拆分为 Actions，Remain，Filter 三个组件，在 footer/index.tsx 中进行组装，使用到了 antd 的 Grid 三等分布局

#### 3.1. Actions

```typescript
import { Button, Typography } from "antd";

const Title = Typography.Title;

const FooterActions: React.FC = () => {
    return (
        <>
            <Title level={5}>Actions</Title>
            <Button className="btn-action" size="small">
                Mark All as Completed
            </Button>
            <Button className="btn-action" size="small">
                Clear Completed
            </Button>
        </>
    );
};

export default FooterActions;
```

#### 3.2. Remain

```typescript
import { Typography } from "antd";

const Title = Typography.Title;

type RemainingTodoProps = {
    count: number;
};

const RemainingTodo: React.FC<RemainingTodoProps> = ({ count }) => {
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

#### 3.3. Filter

```typescript
import { Radio, Typography } from "antd";

const Title = Typography.Title;

export const FILTERS = {
    All: "all",
    Active: "active",
    Completed: "completed",
} as const;

export type FiltersValueType = (typeof FILTERS)[keyof typeof FILTERS];

type FilterProps = {
    filter: FiltersValueType;
};

const Filter: React.FC<FilterProps> = ({ filter }) => {
    const filterTextList = Object.keys(FILTERS) as Array<keyof typeof FILTERS>;
    return (
        <div className="filters status-filters">
            <Title level={5}>Filter by Status</Title>
            <Radio.Group defaultValue={filter} size="small">
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

#### 3.4. 组装

```typescript
import { Col, Row } from "antd";
import Actions from "./actions";
import type { FiltersValueType } from "./filter";
import Filter from "./filter";
import RemainingTodos from "./remain";

import "./index.less";

type FooterProps = {
    todosRemaining: number;
    filter: FiltersValueType;
};

const Footer: React.FC<FooterProps> = ({ todosRemaining, filter }) => {
    return (
        <footer className="todo-footer">
            <Row>
                <Col className="actions" span={8}>
                    <Actions />
                </Col>
                <Col span={8}>
                    <RemainingTodos count={todosRemaining} />
                </Col>
                <Col span={8}>
                    <Filter filter={filter} />
                </Col>
            </Row>
        </footer>
    );
};

export default Footer;
export { FILTERS } from "./filter";
```

## 五、拼装完整 APP

准备 mock 数据

```typescript
import { type TodoItemProps } from "./components/todos/item";

const data: TodoItemProps[] = [
    {
        id: 1,
        text: "first thing",
        completed: true,
    },
    {
        id: 2,
        text: "second thing",
        completed: false,
    },
    {
        id: 3,
        text: "third thing",
        completed: false,
    },
];

export default data;
```

组装 APP

```typescript
import { Typography } from "antd";
import Header from "./components/header";
import TodoList from "./components/todos/list";
import Footer, { FILTERS } from "./components/footer";

import defaultTodoData from "./data";

import "../global.less";

const Title = Typography.Title;

export default function App() {
    const todosRemaining = defaultTodoData.reduce((acc, prev) => {
        return prev.completed ? acc : acc + 1;
    }, 0);

    return (
        <div className="todo-container">
            <Title level={2}>Todos</Title>
            <div className="todo">
                <Header />
                <TodoList data={defaultTodoData} />
                <Footer todosRemaining={todosRemaining} filter={FILTERS.All} />
            </div>
        </div>
    );
}
```
