---
title: K 个一组翻转链表
authors: [cangjingyue]
tags: 
    - Algorithm
date: 2024-11-12 00:00:00
categories:
  - Algorithm
---

# K 个一组翻转链表

题目链接: [25. K 个一组翻转链表](https://leetcode.cn/problems/reverse-nodes-in-k-group/)

```python
```python
# Definition for singly-linked list.
# class ListNode:
#     def __init__(self, val=0, next=None):
#         self.val = val
#         self.next = next
class Solution:
    def reverseKGroup(self, head: Optional[ListNode], k: int) -> Optional[ListNode]:
        '''
        pre 是这次翻转后的头节点
        p0 是上一次翻转的尾节点
        nxt = p0.next 是这次翻转前的头节点/这次翻转后的尾节点
        cur 是下一次翻转前的头节点
        在一次翻转完成之后
        nxt.next = cur 这一次翻转的尾节点应指向下一次的头节点
        p0.next = pre 上次翻转的尾节点应指向这次翻转的头节点
        p0 变为这次翻转后的尾节点
        '''
        n = 0
        cur = head
        while cur:
            cur = cur.next
            n += 1
        p0 = sentinel = ListNode(next=head)
        pre, cur = None, head
        while n >= k:
            n -= k
            for _ in range(k):  
                nxt = cur.next
                cur.next = pre
                pre = cur
                cur = nxt
            nxt = p0.next
            nxt.next = cur
            p0.next = pre
            p0 = nxt
        return sentinel.next
```

pre 是这次翻转后的头节点

p0 是上一次翻转的尾节点

nxt = p0.next 是这次翻转前的头节点/这次翻转后的尾节点

cur 是下一次翻转前的头节点

---

在一次翻转完成之后

nxt.next = cur 这一次翻转的尾节点应指向下一次的头节点

p0.next = pre 上次翻转的尾节点应指向这次翻转的头节点

p0 变为这次翻转后的尾节点
