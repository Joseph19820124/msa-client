# 斐波那契数列算法 (Fibonacci Sequence Algorithm)

## 算法简介

斐波那契数列是一个经典的数学序列，其中每个数字都是前两个数字的和。序列通常以 0 和 1 开始：

```
0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, ...
```

数学定义：
- F(0) = 0
- F(1) = 1  
- F(n) = F(n-1) + F(n-2) for n > 1

## 算法实现

### 1. 递归实现 (Recursive Implementation)

```javascript
/**
 * 递归方式计算斐波那契数列第n项
 * 时间复杂度: O(2^n)
 * 空间复杂度: O(n)
 */
function fibonacciRecursive(n) {
    if (n <= 1) {
        return n;
    }
    return fibonacciRecursive(n - 1) + fibonacciRecursive(n - 2);
}

// 使用示例
console.log(fibonacciRecursive(10)); // 输出: 55
```

### 2. 迭代实现 (Iterative Implementation)

```javascript
/**
 * 迭代方式计算斐波那契数列第n项
 * 时间复杂度: O(n)
 * 空间复杂度: O(1)
 */
function fibonacciIterative(n) {
    if (n <= 1) {
        return n;
    }
    
    let a = 0, b = 1;
    for (let i = 2; i <= n; i++) {
        let temp = a + b;
        a = b;
        b = temp;
    }
    return b;
}

// 使用示例
console.log(fibonacciIterative(10)); // 输出: 55
```

### 3. 动态规划实现 (Dynamic Programming)

```javascript
/**
 * 使用动态规划计算斐波那契数列第n项
 * 时间复杂度: O(n)
 * 空间复杂度: O(n)
 */
function fibonacciDP(n) {
    if (n <= 1) {
        return n;
    }
    
    const dp = new Array(n + 1);
    dp[0] = 0;
    dp[1] = 1;
    
    for (let i = 2; i <= n; i++) {
        dp[i] = dp[i - 1] + dp[i - 2];
    }
    
    return dp[n];
}

// 使用示例
console.log(fibonacciDP(10)); // 输出: 55
```

### 4. 生成斐波那契序列

```javascript
/**
 * 生成前n项斐波那契数列
 * @param {number} n - 要生成的项数
 * @returns {number[]} 斐波那契数列数组
 */
function generateFibonacciSequence(n) {
    if (n <= 0) return [];
    if (n === 1) return [0];
    if (n === 2) return [0, 1];
    
    const sequence = [0, 1];
    for (let i = 2; i < n; i++) {
        sequence[i] = sequence[i - 1] + sequence[i - 2];
    }
    
    return sequence;
}

// 使用示例
console.log(generateFibonacciSequence(10)); 
// 输出: [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]
```

### 5. Python 实现示例

```python
def fibonacci_iterative(n):
    """
    迭代方式计算斐波那契数列第n项
    """
    if n <= 1:
        return n
    
    a, b = 0, 1
    for _ in range(2, n + 1):
        a, b = b, a + b
    
    return b

def fibonacci_generator(n):
    """
    生成器方式生成斐波那契数列
    """
    a, b = 0, 1
    for _ in range(n):
        yield a
        a, b = b, a + b

# 使用示例
print(fibonacci_iterative(10))  # 输出: 55
print(list(fibonacci_generator(10)))  # 输出: [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]
```

## 性能比较

| 实现方式 | 时间复杂度 | 空间复杂度 | 适用场景 |
|---------|------------|------------|----------|
| 递归 | O(2^n) | O(n) | 学习理解，小数值 |
| 迭代 | O(n) | O(1) | 生产环境推荐 |
| 动态规划 | O(n) | O(n) | 需要保存中间结果 |

## 实际应用

斐波那契数列在计算机科学和数学中有广泛应用：

1. **算法设计** - 递归和动态规划的经典示例
2. **性能测试** - 用于测试递归函数的性能
3. **数学建模** - 自然界中的螺旋模式
4. **金融分析** - 斐波那契回撤线技术分析
5. **计算机图形学** - 黄金比例相关的设计

## 注意事项

- 对于大数值，建议使用迭代实现以避免栈溢出
- 递归实现虽然直观但效率较低，不适合生产环境
- 在 JavaScript 中，当 n 超过 1476 时，会出现数值精度问题
- 可以使用 BigInt 来处理大数值的斐波那契计算