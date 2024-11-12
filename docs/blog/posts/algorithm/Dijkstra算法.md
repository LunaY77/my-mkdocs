---
title: Dijkstra算法
authors: [cangjingyue]
tags: 
    - Algorithm
date: 2024-11-12
categories:
  - Algorithm
---

技巧：
如果图为无向图（有向图反转）且不存在负边，要求求各个点 i 到同一终点 n 的最短路径，可以设置Dijkstra的起点和终点 均为 n，求解得到的 distance 数组即 各个点 i 到终点 n 的最短距离。