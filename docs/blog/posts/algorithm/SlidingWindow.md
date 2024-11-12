---
title: 滑动窗口模版
authors: [cangjingyue]
tags: 
    - Algorithm
date: 2024-11-12
categories:
  - Algorithm
---
统一模版
``` java
//外层循环扩展右边界，内层循环扩展左边界
for (int l = 0, r = 0 ; r < n ; r++) {
        //当前考虑的元素
        while (l <= r && check()) {//区间[left,right]不符合题意
        //扩展左边界
    }
    //区间[left,right]符合题意，统计相关信息
}
```

<br/>
<br/>

模版题：[3. 无重复字符的子串](https://leetcode.cn/problems/longest-substring-without-repeating-characters/description/?envType=study-plan-v2&envId=top-100-liked)


Java题解
``` java
class Solution {
    public int lengthOfLongestSubstring(String s) {
        char[] ss = s.toCharArray();
        Set<Character> set = new HashSet<>();
        int res = 0;
        for (int left = 0, right = 0; right < s.length(); right++) {
            char ch = ss[right];
            while (set.contains(ch)) {
                set.remove(ss[left]);
                left++;
            }
            set.add(ss[right]);
            res = Math.max(res, right - left + 1);
        }
        return res;
    }
}
```


python题解
``` py
class Solution:
    def lengthOfLongestSubstring(self, s: str) -> int:
        x = set()
        res, left = 0, 0
        for right in range(len(s)):
            while s[right] in x:
                x.remove(s[left])
                left += 1
            x.add(s[right])
            res = max(res, right - left + 1)
        return res
```