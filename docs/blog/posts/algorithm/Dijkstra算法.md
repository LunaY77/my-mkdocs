---
title: Dijkstra算法
authors: [cangjingyue]
tags: 
    - Algorithm
date: 2024-11-12
categories:
  - Algorithm
---

![Pasted image 20240717033502](https://cangjingyue.oss-cn-hangzhou.aliyuncs.com/2024/11/12/pasted-image-20240717033502.png)


技巧：
如果图为无向图（有向图反转）且不存在负边，要求求各个点 i 到同一终点 n 的最短路径，可以设置Dijkstra的起点和终点 均为 n，求解得到的 distance 数组即 各个点 i 到终点 n 的最短距离。

以[743. 网络延迟时间](https://leetcode.cn/problems/network-delay-time/description/)为例

Dijkstra算法模版

Java 题解：

``` java
class Solution {
    public int networkDelayTime(int[][] times, int n, int s) {
        ArrayList<ArrayList<int[]>> graph = new ArrayList<>();
        // 节点下标为 1 - n
        for (int i = 0; i <= n; i++) {
            graph.add(new ArrayList<>());
        }
        for (int[] edge : times) {
            graph.get(edge[0]).add(new int[]{edge[1], edge[2]});
        }
        int[] distance = new int[n + 1];
        Arrays.fill(distance, Integer.MAX_VALUE);
        distance[s] = 0;
        boolean[] visted = new boolean[n + 1];
        PriorityQueue<int[]> heap = new PriorityQueue<>((a, b) -> a[1] - b[1]);
        heap.add(new int[]{s, 0});
        while (!heap.isEmpty()) {
            int u = heap.poll()[0];
            if (visted[u]) {
                continue;
            }
            visted[u] = true;
            for (int[] edge : graph.get(u)) {
                int v = edge[0];
                int w = edge[1];
                if (!visted[v] && distance[u] + w < distance[v]) {
                    distance[v] = distance[u] + w;
                    heap.add(new int[] {v, distance[u] + w});
                }
            }
        }
        int ans = Integer.MIN_VALUE;
        for (int i = 1; i <= n; i++) {
            if (distance[i] == Integer.MAX_VALUE) {
                return -1;
            }
            ans = Math.max(ans, distance[i]);
        }
        return ans;
    }
}
```

Python 题解：

``` py
class Solution:
    def networkDelayTime(self, times: List[List[int]], n: int, s: int) -> int:
        graph = [[] for _ in range(n + 1)]
        for u, v, w in times:
            graph[u].append((v, w))
        
        distance = [inf for _ in range(n + 1)]
        distance[s] = 0
        visited = [False for _ in range(n + 1)]
        
        heap = [(0, s)]
        while heap:
            _, u = heappop(heap)
            if visited[u]:
                continue
            visited[u] = True
            for v, w in graph[u]:
                if not visited[v] and distance[u] + w < distance[v]:
                    distance[v] = distance[u] + w
                    heappush(heap, (distance[v], v))
        ans = max(distance[1:])
        return ans if ans < inf else -1

```