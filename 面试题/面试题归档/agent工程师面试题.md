# Agent 工程师面试题（100题）

> 本文档整理了100道高质量的Agent工程师面试题，涵盖Agent架构、工具调用、记忆管理、多Agent协作、生产化部署等核心主题。

---

## 一、Agent 架构与基础（15题）

### 1. 什么是AI Agent？它与传统Chatbot有什么区别？

**答案：**
AI Agent是一个能够自主感知环境、做出决策并执行行动的智能系统。与传统Chatbot的核心区别：

| 维度 | 传统Chatbot | AI Agent |
|------|-------------|----------|
| 交互模式 | 单轮问答 | 多轮对话，自主决策 |
| 工具使用 | 无或有限 | 可调用外部工具和API |
| 记忆能力 | 有限上下文 | 长期记忆和上下文管理 |
| 任务规划 | 被动响应 | 主动规划和执行任务 |
| 错误处理 | 简单重试 | 自我修正和重试机制 |

**Agent核心公式：**
```
Agent = LLM + Memory + Tools + Planning + Execution + Reflection
```

### 2. Agent的核心组件有哪些？

**答案：**
Agent由以下核心组件构成：

1. **LLM（大脑）**：负责推理、规划和决策
2. **Memory（记忆）**：
   - 短期记忆：当前会话上下文
   - 长期记忆：跨会话持久化存储
   - 工作记忆：当前任务的临时状态
3. **Tools（工具）**：外部能力接口（API、数据库、文件系统等）
4. **Planner（规划器）**：任务分解和执行计划
5. **Executor（执行器）**：执行具体动作
6. **Reflector（反思器）**：评估结果并调整策略

### 3. 什么是ReAct模式？它的执行流程是什么？

**答案：**
ReAct（Reasoning + Acting）是一种让LLM在推理和行动之间交替执行的模式。

**执行流程：**
```
Thought: 分析当前情况，决定下一步行动
Action: 选择并调用工具
Observation: 获取工具执行结果
Thought: 根据结果继续推理
... (循环直到完成)
Final Answer: 输出最终答案
```

**代码示例：**
```python
def react_loop(query, tools, max_iterations=10):
    context = [{"role": "user", "content": query}]
    
    for i in range(max_iterations):
        # 1. Thought + Action
        response = llm.chat(context, tools=tools)
        
        if response.has_tool_calls:
            # 2. 执行工具
            for tool_call in response.tool_calls:
                result = execute_tool(tool_call)
                
                # 3. Observation
                context.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": result
                })
        else:
            # Final Answer
            return response.content
    
    return "达到最大迭代次数"
```

### 4. ReAct什么时候用？什么时候不用？

**答案：**
**适合使用ReAct的场景：**
- 开放式探索任务
- 需要动态决策的复杂问题
- 多步骤信息检索
- 需要根据中间结果调整策略的任务

**不适合使用ReAct的场景：**
- 低延迟场景：每轮工具调用增加延迟
- 简单确定性任务：规则引擎或pipeline更稳定
- 强合规流程：步骤固定、审批明确时应使用workflow
- 高风险动作：支付、删库等不能让模型自由循环

**面试加分回答：** ReAct是一种动态决策loop，不是默认选择。只要任务确定性足够高，就不要先上ReAct。

### 5. Plan-and-Execute与ReAct有什么区别？

**答案：**

| 维度 | ReAct | Plan-and-Execute |
|------|-------|------------------|
| 规划方式 | 每步动态规划 | 先整体规划再执行 |
| 适用场景 | 动态探索 | 复杂多步骤任务 |
| 优势 | 灵活应变 | 全局最优 |
| 劣势 | 可能偏离目标 | 计划可能过时 |

**Plan-and-Execute流程：**
```
1. Plan: 将任务分解为子任务列表
2. Execute: 按顺序执行每个子任务
3. Replan: 根据执行结果调整计划（可选）
```

**选择建议：**
- 任务步骤明确 → Plan-and-Execute
- 任务高度不确定 → ReAct
- 混合场景 → Plan-and-Execute + 动态Replan

### 6. 什么是Agent Loop？如何设计一个可靠的Agent Loop？

**答案：**
Agent Loop是Agent的核心执行循环，负责驱动任务完成。

**设计要点：**
```python
class AgentLoop:
    def __init__(self, config):
        self.max_iterations = config.max_iterations  # 步数上限
        self.max_tokens = config.max_tokens          # Token上限
        self.max_time = config.max_time              # 时间上限
        self.loop_detector = LoopDetector()          # 死循环检测
        
    async def run(self, task):
        state = State(task)
        
        while not state.is_complete():
            # 1. 检查终止条件
            if self.should_terminate(state):
                break
            
            # 2. 获取下一步行动
            action = await self.plan_next_action(state)
            
            # 3. 执行行动
            result = await self.execute_action(action)
            
            # 4. 更新状态
            state.update(action, result)
            
            # 5. 检测死循环
            if self.loop_detector.is_looping(state):
                state = self.handle_loop(state)
        
        return state.final_answer
```

### 7. 如何防止Agent进入死循环？

**答案：**
**防死循环策略：**

1. **步数限制**：设置最大迭代次数
2. **状态检测**：检测状态是否重复
3. **进展检查**：检查是否有实质进展
4. **工具指纹**：检测相同工具+参数的重复调用
5. **熔断机制**：连续失败后强制终止

```python
class LoopDetector:
    def __init__(self):
        self.state_history = []
        self.tool_call_history = []
        
    def is_looping(self, current_state):
        # 1. 检测状态重复
        if self.is_state_repeating(current_state):
            return True
        
        # 2. 检测工具调用重复
        if self.is_tool_call_repeating(current_state.last_tool_call):
            return True
        
        # 3. 检测进展停滞
        if self.is_progress_stalled(current_state):
            return True
        
        return False
    
    def is_tool_call_repeating(self, tool_call):
        # 检查最近N次调用是否有相同工具+参数
        recent_calls = self.tool_call_history[-5:]
        return any(
            call.tool == tool_call.tool and 
            call.params == tool_call.params
            for call in recent_calls
        )
```

### 8. Agent的状态机如何设计？

**答案：**
**Agent状态定义：**
```
IDLE → PLANNING → EXECUTING → OBSERVING → REFLECTING
                                          ↓
                                      COMPLETED / FAILED
```

**状态机实现：**
```python
class AgentStateMachine:
    states = ['idle', 'planning', 'executing', 'observing', 
              'reflecting', 'completed', 'failed']
    
    transitions = {
        'idle': {'start': 'planning'},
        'planning': {'plan_ready': 'executing', 'error': 'failed'},
        'executing': {'action_done': 'observing', 'error': 'failed'},
        'observing': {'observation_done': 'reflecting'},
        'reflecting': {'continue': 'planning', 'complete': 'completed'},
    }
    
    def transition(self, event):
        current = self.state
        next_state = self.transitions[current].get(event)
        
        if next_state:
            self.on_exit(current)
            self.state = next_state
            self.on_enter(next_state)
        else:
            raise InvalidTransition(f"{current} -> {event}")
```

### 9. 什么是Harness Engineering？它和Prompt Engineering有什么关系？

**答案：**
**Harness Engineering** 是指在模型外部构建执行环境，包括任务管理、上下文供给、工具反馈、验证和错误恢复。

**关系：**
```
Prompt Engineering → Context Engineering → Harness Engineering
     (单次提示)        (上下文组装)          (执行环境)
```

**Harness的六层检查框架：**
1. 输入验证层：校验用户输入
2. 上下文管理层：组装和压缩上下文
3. 工具调用层：工具选择和执行
4. 输出验证层：校验模型输出
5. 错误恢复层：异常处理和重试
6. 审计日志层：记录执行轨迹

### 10. 为什么说 Agent = Model + Harness？

**答案：**
模型提供"思考"能力，Harness提供"执行"环境。

**Harness的职责：**
- 任务分解和调度
- 上下文管理和压缩
- 工具注册和执行
- 状态持久化和恢复
- 错误处理和重试
- 安全控制和权限
- 监控和可观测性

**核心观点：** 模型能力升级后，Harness的某些机制需要重新验证，但Harness的工程价值不会消失。

### 11. Agent的循环驱动有哪些模式？

**答案：**
1. **LLM驱动**：每步都由LLM决定下一步
2. **状态机驱动**：预定义状态转换规则
3. **事件驱动**：外部事件触发执行
4. **混合驱动**：LLM决策 + 状态机约束

**选择建议：**
- 开放式任务 → LLM驱动
- 流程明确 → 状态机驱动
- 实时响应 → 事件驱动
- 生产环境 → 混合驱动

### 12. 如何设计Agent的终止条件？

**答案：**
**终止条件类型：**
1. **正常终止**：任务完成，输出Final Answer
2. **超时终止**：超过最大时间或步数
3. **错误终止**：连续失败达到阈值
4. **成本终止**：Token消耗超过预算
5. **人工终止**：用户主动取消

```python
class TerminationChecker:
    def should_terminate(self, state):
        # 正常完成
        if state.is_complete:
            return TerminationReason.COMPLETED
        
        # 步数限制
        if state.iteration >= self.max_iterations:
            return TerminationReason.MAX_ITERATIONS
        
        # 时间限制
        if state.elapsed_time > self.max_time:
            return TerminationReason.TIMEOUT
        
        # Token限制
        if state.total_tokens > self.max_tokens:
            return TerminationReason.MAX_TOKENS
        
        # 连续失败
        if state.consecutive_failures >= self.max_failures:
            return TerminationReason.MAX_FAILURES
        
        return None
```

### 13. Agent的异常处理策略有哪些？

**答案：**
**分层异常处理：**

1. **工具层**：try-catch，返回结构化错误
   ```python
   {"status": "failed", "error_type": "Timeout", "retry_after": 5}
   ```

2. **推理层**：max iteration + loop detection，熔断终止

3. **系统层**：全局超时 + Token成本上限

**重试策略：**
- 瞬时错误（网络超时）：指数退避重试
- 逻辑错误（参数错误）：修正后重试
- 持久错误（服务不可用）：降级或人工介入

### 14. 什么是Agent的"思考-行动-观察"循环？

**答案：**
这是ReAct模式的核心，每个循环包含：

1. **Thought（思考）**：分析当前状态，推理下一步
2. **Action（行动）**：选择并执行工具
3. **Observation（观察）**：获取执行结果

**关键点：**
- 每步都要有明确的思考过程
- 工具结果要反馈给模型
- 循环直到任务完成或达到终止条件

### 15. Agent与Workflow有什么区别？如何选择？

**答案：**

| 维度 | Agent | Workflow |
|------|-------|----------|
| 决策方式 | LLM动态决策 | 预定义流程 |
| 灵活性 | 高 | 低 |
| 可预测性 | 低 | 高 |
| 适用场景 | 开放式探索 | 确定性流程 |

**选择原则：**
- 步骤固定、规则明确 → Workflow
- 需要动态决策、灵活应变 → Agent
- 混合场景 → Workflow + Agent节点

---

## 二、工具调用与MCP（15题）

### 16. 什么是Function Calling？它的原理是什么？

**答案：**
Function Calling是让LLM输出结构化工具调用的能力。

**原理：**
1. 模型接收工具定义（名称、描述、参数schema）
2. 根据用户输入决定是否调用工具
3. 输出结构化的工具调用请求（JSON格式）
4. 应用执行工具并返回结果
5. 模型根据结果继续推理

**训练方式：**
通过SFT（监督微调）实现，使用包含工具调用的训练数据。

### 17. 如何设计可靠的工具定义（Tool Schema）？

**答案：**
**工具设计原则：**
1. **描述性命名**：`search_database` 而不是 `tool_1`
2. **使用指导**：告诉模型何时使用、何时不使用
3. **参数描述**：每个参数都要说明用途和有效值
4. **合理默认值**：减少模型需要做的决策
5. **约束类型**：使用enum、range、required防止无效调用

**示例：**
```json
{
  "name": "get_weather",
  "description": "获取指定城市的天气信息。仅用于查询天气，不用于预测。",
  "parameters": {
    "type": "object",
    "properties": {
      "city": {
        "type": "string",
        "description": "城市名称，如'北京'、'上海'"
      },
      "unit": {
        "type": "string",
        "enum": ["celsius", "fahrenheit"],
        "default": "celsius"
      }
    },
    "required": ["city"]
  }
}
```

### 18. Function Calling和MCP有什么区别？

**答案：**

| 维度 | Function Calling | MCP |
|------|------------------|-----|
| 定义 | 模型输出结构化调用的能力 | 工具/数据源的标准协议 |
| 起源 | OpenAI | Anthropic |
| 关注点 | 模型↔应用 | 应用↔工具 |
| 目标 | 让模型能调用工具 | 让工具能跨模型复用 |

**关系：**
- FC生成调用指令
- MCP负责执行这些指令
- 它们是互补的

### 19. 什么是MCP（Model Context Protocol）？

**答案：**
MCP是Anthropic提出的开放协议，用于标准化AI应用与外部工具/数据源的交互。

**核心概念：**
- **Client**：AI应用（如Claude Desktop）
- **Server**：工具/数据源提供者
- **Transport**：通信协议（stdio、HTTP、SSE）

**三大能力：**
1. **Tools**：可调用的函数
2. **Resources**：可读取的数据
3. **Prompts**：预定义的提示模板

### 20. MCP的传输方式有哪些？如何适配？

**答案：**
**传输方式：**
1. **stdio**：标准输入输出，适合本地进程
2. **HTTP**：HTTP请求，适合远程服务
3. **SSE**：Server-Sent Events，适合流式通信
4. **Streamable HTTP**：HTTP/2流式传输

**适配策略：**
```javascript
class TransportAdapter {
  static create(type, config) {
    switch(type) {
      case 'stdio': return new StdioTransport(config);
      case 'http': return new HTTPTransport(config);
      case 'sse': return new SSETransport(config);
      default: throw new Error(`Unknown transport: ${type}`);
    }
  }
}
```

### 21. 如何处理工具调用的超时和重试？

**答案：**
**超时处理：**
```python
async def execute_with_timeout(tool, params, timeout=30):
    try:
        result = await asyncio.wait_for(
            tool.execute(params),
            timeout=timeout
        )
        return {"status": "success", "result": result}
    except asyncio.TimeoutError:
        return {
            "status": "timeout",
            "retry_after": 5
        }
```

**重试策略：**
- 读操作：可以重试
- 写操作：必须带幂等键，先查询状态再决定

### 22. 如何实现工具调用的幂等性？

**答案：**
**幂等性设计：**
```python
class IdempotentTool:
    def __init__(self):
        self.executed_keys = {}
    
    async def execute(self, params, idempotency_key):
        # 检查是否已执行
        if idempotency_key in self.executed_keys:
            return self.executed_keys[idempotency_key]
        
        # 执行并记录
        result = await self._do_execute(params)
        self.executed_keys[idempotency_key] = result
        
        return result
```

**关键点：**
- 写操作必须有幂等键
- 超时后先查询状态再决定是否重试
- 使用数据库记录执行状态

### 23. 工具太多时如何管理？

**答案：**
**工具管理策略：**

1. **工具检索**：根据任务动态选择工具子集
2. **工具分类**：按功能分组
3. **工具描述优化**：写短、加示例
4. **工具合并**：细碎工具合并为带mode参数的工具
5. **文档外置**：按需加载工具文档

```python
class ToolRegistry:
    def get_tools_for_task(self, task):
        # 基于任务检索相关工具
        relevant_tools = self.semantic_search(task)
        return relevant_tools[:5]  # 只返回Top5
```

### 24. 如何处理工具调用的错误？

**答案：**
**错误处理策略：**

1. **参数错误**：JSON schema校验，回灌错误让模型修正
2. **超时错误**：读操作重试，写操作先查状态
3. **格式错误**：宽松解析，失败则回灌要求重出
4. **连续失败**：降级到结构化输出或换模型

```python
def handle_tool_error(error, tool_call):
    if error.type == "validation":
        # 回灌错误让模型修正
        return f"参数错误: {error.message}，请修正后重试"
    elif error.type == "timeout":
        # 先查询状态
        status = check_operation_status(tool_call.id)
        if status == "completed":
            return get_result(tool_call.id)
        else:
            return "操作超时，请稍后重试"
```

### 25. 什么是工具网关（Tool Gateway）？

**答案：**
Tool Gateway负责控制工具执行，与Tool Registry（描述和发现）分离。

**职责：**
- 权限校验：当前租户能否调用
- 审批流程：是否需要人工审批
- 限流控制：调用频率限制
- 审计日志：记录调用历史

```python
class ToolGateway:
    async def execute(self, tool_call, context):
        # 1. 权限校验
        if not self.check_permission(context.user, tool_call.tool):
            raise PermissionDenied()
        
        # 2. 限流检查
        if not self.rate_limiter.allow(tool_call.tool):
            raise RateLimited()
        
        # 3. 审批检查
        if self.needs_approval(tool_call):
            await self.request_approval(tool_call)
        
        # 4. 执行
        result = await self.registry.execute(tool_call)
        
        # 5. 审计
        self.audit_log(tool_call, result)
        
        return result
```

### 26. 如何设计工具的权限控制？

**答案：**
**权限模型：**
```python
class ToolPermission:
    def __init__(self):
        self.policies = {
            "read_tool": ["user", "admin"],
            "write_tool": ["admin"],
            "delete_tool": ["super_admin"]
        }
    
    def check(self, user_role, tool_name, action):
        policy = self.policies.get(f"{tool_name}_{action}")
        return user_role in policy
```

**最小权限原则：**
- 默认拒绝
- 显式授权
- 按需分配
- 定期审计

### 27. MCP的版本兼容问题如何处理？

**答案：**
**版本兼容策略：**

1. **版本协商**：客户端和服务端协商共同支持的版本
2. **特性检测**：检查是否支持特定功能
3. **降级处理**：高版本特性不可用时降级
4. **迁移路径**：提供版本升级指南

```python
class MCPVersionManager:
    def negotiate(self, client_versions, server_versions):
        common = set(client_versions) & set(server_versions)
        if not common:
            raise NoCommonVersion()
        return max(common)  # 选择最新共同版本
```

### 28. 如何处理工具返回的大量数据？

**答案：**
**大数据处理策略：**

1. **结果裁剪**：只返回必要字段
2. **摘要压缩**：对长文本生成摘要
3. **分页返回**：支持分页查询
4. **外部存储**：大结果存外部，返回引用

```python
def handle_large_result(result, max_tokens=2000):
    result_str = json.dumps(result)
    
    if count_tokens(result_str) > max_tokens:
        # 生成摘要
        summary = summarize(result_str)
        return {
            "summary": summary,
            "full_result_ref": store_to_db(result)
        }
    
    return result
```

### 29. 什么是A2A（Agent-to-Agent）协议？

**答案：**
A2A是Google提出的协议，用于Agent之间的通信。

**与MCP的关系：**
- MCP：Agent ↔ 工具/API
- A2A：Agent ↔ Agent

**核心概念：**
- **Agent Card**：描述Agent能力的JSON文档
- **Task**：Agent间的任务委派
- **Message**：Agent间的结构化消息

### 30. 如何设计工具的Schema？

**答案：**
**Schema设计最佳实践：**

```json
{
  "name": "search_products",
  "description": "搜索商品。用于用户查找商品，不用于库存查询。",
  "parameters": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "搜索关键词"
      },
      "category": {
        "type": "string",
        "enum": ["electronics", "clothing", "food"],
        "description": "商品类别"
      },
      "max_results": {
        "type": "integer",
        "minimum": 1,
        "maximum": 100,
        "default": 10
      }
    },
    "required": ["query"]
  },
  "returns": {
    "type": "object",
    "properties": {
      "products": {"type": "array"},
      "total": {"type": "integer"}
    }
  }
}
```

---

## 三、记忆与上下文管理（15题）

### 31. Agent的记忆类型有哪些？

**答案：**
**记忆分类：**

1. **短期记忆（Short-term Memory）**
   - 当前会话的上下文
   - 滑动窗口管理
   - 会话结束即丢失

2. **长期记忆（Long-term Memory）**
   - 跨会话持久化存储
   - 用户画像、偏好、历史结论
   - 使用向量库或KV存储

3. **工作记忆（Working Memory）**
   - 当前任务的临时状态
   - 中间计算结果
   - 任务完成可清理

### 32. 如何管理短期记忆（上下文窗口）？

**答案：**
**上下文窗口管理策略：**

1. **滑动窗口**：保留最近N条消息
2. **Token预算**：按Token限制截断
3. **重要性排序**：保留重要消息
4. **摘要压缩**：将历史压缩为摘要

```python
class ContextManager:
    def __init__(self, max_tokens=4000):
        self.max_tokens = max_tokens
        self.messages = []
    
    def add_message(self, message):
        self.messages.append(message)
        self.trim_context()
    
    def trim_context(self):
        total_tokens = sum(count_tokens(m) for m in self.messages)
        
        while total_tokens > self.max_tokens:
            # 方案1：移除最早的消息
            removed = self.messages.pop(0)
            total_tokens -= count_tokens(removed)
            
            # 方案2：生成摘要替代
            # summary = summarize(removed)
            # self.messages[0] = summary
```

### 33. 如何实现上下文压缩？

**答案：**
**压缩策略：**

1. **摘要压缩**：将多条消息压缩为摘要
2. **关键信息提取**：只保留关键信息
3. **分层压缩**：近期详细，远期摘要

```python
class ContextCompressor:
    def compress(self, messages, target_tokens):
        current_tokens = sum(count_tokens(m) for m in messages)
        
        if current_tokens <= target_tokens:
            return messages
        
        # 分层压缩
        recent = messages[-5:]  # 保留最近5条
        old = messages[:-5]     # 压缩较早的消息
        
        # 生成摘要
        summary = self.summarize(old)
        
        return [summary] + recent
    
    def summarize(self, messages):
        prompt = f"请将以下对话压缩为简短摘要：\n{messages}"
        return llm.chat(prompt)
```

### 34. 长期记忆的写入策略是什么？

**答案：**
**写入过滤：**
不是所有对话都值得进入长期记忆。

**过滤规则：**
1. **重要性评分**：LLM评估信息重要性
2. **规则过滤**：关键信息才写入
3. **去重检查**：相似记忆合并而非追加

```python
class MemoryWriter:
    def should_write(self, message):
        # 1. 重要性评分
        score = self.evaluate_importance(message)
        if score < 0.5:
            return False
        
        # 2. 去重检查
        similar = self.find_similar(message)
        if similar:
            self.merge(similar, message)
            return False
        
        # 3. 写入
        return True
    
    def evaluate_importance(self, message):
        prompt = f"评估以下信息的重要性(0-1)：{message}"
        return float(llm.chat(prompt))
```

### 35. 如何处理记忆冲突？

**答案：**
**冲突处理策略：**

1. **覆盖策略**：新记忆覆盖旧记忆
2. **版本控制**：保留历史版本
3. **时间衰减**：旧记忆权重降低

```python
class MemoryConflictResolver:
    def resolve(self, old_memory, new_memory):
        # 检查是否冲突
        if self.is_conflict(old_memory, new_memory):
            # 覆盖策略：新的覆盖旧的
            new_memory.supersedes = old_memory.id
            old_memory.status = "superseded"
            
            # 或者合并策略
            # merged = self.merge(old_memory, new_memory)
            # return merged
        
        return new_memory
```

### 36. 记忆的召回策略是什么？

**答案：**
**召回策略：**

1. **语义检索**：基于向量相似度
2. **关键词匹配**：基于关键词
3. **时间排序**：按时间优先
4. **混合检索**：结合多种方式

```python
class MemoryRetriever:
    def retrieve(self, query, top_k=5):
        # 1. 语义检索
        semantic_results = self.vector_search(query, top_k * 2)
        
        # 2. 关键词匹配
        keyword_results = self.keyword_search(query, top_k * 2)
        
        # 3. 混合排序
        merged = self.merge_results(semantic_results, keyword_results)
        
        # 4. Token限制
        return self.limit_by_tokens(merged, max_tokens=1000)
```

### 37. 如何实现跨会话的用户偏好学习？

**答案：**
**偏好学习流程：**

1. **偏好提取**：从对话中提取用户偏好
2. **偏好存储**：结构化存储偏好信息
3. **偏好应用**：在新会话中应用偏好

```python
class PreferenceLearner:
    def extract_preferences(self, conversation):
        prompt = f"""
        从以下对话中提取用户偏好：
        {conversation}
        
        返回JSON格式：
        {{"preference_type": "...", "value": "...", "confidence": 0.9}}
        """
        return json.loads(llm.chat(prompt))
    
    def apply_preferences(self, user_id, context):
        preferences = self.get_preferences(user_id)
        
        # 将偏好注入上下文
        context.system_prompt += f"\n用户偏好：{preferences}"
        
        return context
```

### 38. 长期记忆存储介质如何选型？

**答案：**

| 存储介质 | 适用场景 | 优势 | 劣势 |
|----------|----------|------|------|
| 向量库 | 语义检索 | 相似度搜索 | 结构化查询弱 |
| KV存储 | 键值对 | 快速读写 | 复杂查询难 |
| 关系型DB | 结构化数据 | 事务支持 | 灵活性低 |
| 图数据库 | 关系网络 | 关系查询 | 学习成本高 |

**选型建议：**
- 纯语义检索 → 向量库
- 结构化偏好 → KV/关系型DB
- 复杂关系 → 图数据库
- 混合场景 → 多存储组合

### 39. 如何处理记忆的过期和遗忘？

**答案：**
**过期策略：**

1. **TTL（Time To Live）**：设置过期时间
2. **时间衰减**：越旧权重越低
3. **访问频率**：不常用的逐渐遗忘
4. **手动清理**：用户主动删除

```python
class MemoryExpiry:
    def cleanup(self):
        # 1. TTL过期
        expired = self.find_expired_memories()
        self.delete(expired)
        
        # 2. 时间衰减
        for memory in self.get_all():
            age_days = (now() - memory.created_at).days
            memory.weight = memory.weight * (0.99 ** age_days)
        
        # 3. 低权重重置
        low_weight = self.find_low_weight(threshold=0.1)
        self.archive(low_weight)
```

### 40. 上下文污染是什么？如何防止？

**答案：**
**上下文污染：** 错误或无关信息进入上下文，影响模型输出。

**防止策略：**
1. **输入验证**：校验用户输入
2. **来源过滤**：只注入可信来源的数据
3. **长度限制**：防止大量垃圾信息
4. **定期清理**：清理过期和低质量信息

```python
class ContextGuard:
    def protect(self, context, new_content):
        # 1. 长度检查
        if count_tokens(new_content) > self.max_input_tokens:
            raise InputTooLong()
        
        # 2. 内容过滤
        if self.contains_injection(new_content):
            raise PromptInjectionDetected()
        
        # 3. 来源验证
        if not self.is_trusted_source(new_content):
            new_content = self.sanitize(new_content)
        
        return context.add(new_content)
```

### 41. 什么是记忆的"写入-召回-应用"闭环？

**答案：**
**完整闭环：**

1. **写入阶段**：
   - 从对话中提取信息
   - 评估重要性
   - 去重和合并
   - 存储到记忆库

2. **召回阶段**：
   - 接收查询
   - 语义/关键词检索
   - 排序和过滤
   - 返回相关记忆

3. **应用阶段**：
   - 将记忆注入上下文
   - 模型参考记忆生成回答
   - 记录记忆使用情况

### 42. 如何实现记忆的持久化？

**答案：**
**持久化方案：**

```python
class PersistentMemory:
    def __init__(self, storage):
        self.storage = storage  # Redis/PostgreSQL/向量库
    
    async def save(self, memory):
        # 序列化
        serialized = self.serialize(memory)
        
        # 存储
        await self.storage.set(
            key=f"memory:{memory.id}",
            value=serialized,
            ttl=memory.ttl
        )
    
    async def load(self, memory_id):
        # 读取
        data = await self.storage.get(f"memory:{memory_id}")
        
        # 反序列化
        return self.deserialize(data)
```

### 43. 工作记忆和短期记忆有什么区别？

**答案：**

| 维度 | 工作记忆 | 短期记忆 |
|------|----------|----------|
| 范围 | 当前任务 | 当前会话 |
| 生命周期 | 任务完成即清理 | 会话结束清理 |
| 内容 | 中间状态、计算结果 | 对话历史 |
| 存储位置 | 内存 | 内存/缓存 |

### 44. 如何优化记忆检索的性能？

**答案：**
**性能优化：**

1. **索引优化**：建立合适的索引
2. **缓存策略**：热点数据缓存
3. **分页查询**：避免一次加载过多
4. **异步加载**：非阻塞检索

```python
class OptimizedMemoryRetriever:
    def __init__(self):
        self.cache = LRUCache(maxsize=1000)
        self.index = VectorIndex()
    
    async def retrieve(self, query, top_k=5):
        # 检查缓存
        cache_key = self.get_cache_key(query)
        if cache_key in self.cache:
            return self.cache[cache_key]
        
        # 异步检索
        results = await self.index.search(query, top_k)
        
        # 缓存结果
        self.cache[cache_key] = results
        
        return results
```

### 45. 记忆系统如何支持多用户？

**答案：**
**多用户隔离：**

```python
class MultiUserMemory:
    def __init__(self):
        self.user_memories = {}
    
    def get_user_memory(self, user_id):
        if user_id not in self.user_memories:
            self.user_memories[user_id] = UserMemory(user_id)
        return self.user_memories[user_id]
    
    async def save(self, user_id, memory):
        user_memory = self.get_user_memory(user_id)
        await user_memory.save(memory)
    
    async def retrieve(self, user_id, query):
        user_memory = self.get_user_memory(user_id)
        return await user_memory.retrieve(query)
```

---

## 四、多Agent协作（10题）

### 46. 什么时候需要多Agent？

**答案：**
**适合多Agent的场景：**
1. 任务可分解为独立子任务
2. 需要不同专业能力
3. 需要并行处理
4. 需要相互验证和制衡

**不适合多Agent的场景：**
1. 任务简单，单Agent足够
2. 通信成本高于收益
3. 难以定义清晰的职责边界

**原则：** 单Agent是默认选择，只在真正需要时才用多Agent。

### 47. 多Agent的常见架构有哪些？

**答案：**
**架构模式：**

1. **中心化（Orchestrator-Worker）**
   - 主Agent分配任务
   - 子Agent执行并汇报
   - 适合任务分解明确的场景

2. **去中心化（Peer-to-Peer）**
   - Agent之间平等通信
   - 通过消息总线协调
   - 适合协作式任务

3. **分层（Hierarchical）**
   - Manager → Specialist
   - 逐级委派和汇总
   - 适合复杂组织结构

4. **黑板模式（Blackboard）**
   - 共享知识库
   - Agent独立读写
   - 适合知识密集型任务

### 48. 多Agent之间如何通信？

**答案：**
**通信方式：**

1. **结构化消息**（推荐）
   ```json
   {
     "from": "agent_a",
     "to": "agent_b",
     "intent": "request_review",
     "payload": {...},
     "timestamp": "2024-01-01T00:00:00Z"
   }
   ```

2. **共享状态**
   - 通过共享数据库或缓存
   - 需要处理并发冲突

3. **事件驱动**
   - 发布/订阅模式
   - 解耦生产者和消费者

**最佳实践：** 使用结构化消息，避免自然语言传递导致的信息变形。

### 49. 如何处理多Agent的状态共享？

**答案：**
**状态共享策略：**

1. **共享数据库**：所有Agent读写同一数据库
2. **消息传递**：通过消息同步状态
3. **事件溯源**：记录所有状态变更事件

**并发控制：**
```python
class SharedState:
    def __init__(self):
        self.version = 0
        self.lock = asyncio.Lock()
    
    async def update(self, agent_id, updates):
        async with self.lock:
            # 乐观锁：检查版本
            if self.version != updates.expected_version:
                raise ConflictError()
            
            # 应用更新
            self.apply(updates)
            self.version += 1
```

### 50. 如何处理多Agent的冲突？

**答案：**
**冲突类型：**
1. **写冲突**：多个Agent同时修改同一资源
2. **决策冲突**：Agent对下一步有不同判断
3. **资源冲突**：竞争有限资源

**解决策略：**
1. **单写者原则**：一个资源同时只有一个Agent可写
2. **乐观锁**：写入前校验版本，冲突则重读重做
3. **优先级机制**：高优先级Agent优先
4. **仲裁者**：由主Agent裁决冲突

### 51. 多Agent协作的通信协议如何设计？

**答案：**
**协议设计要点：**

```python
class AgentProtocol:
    # 消息类型
    MESSAGE_TYPES = {
        "request": "请求",
        "response": "响应",
        "notification": "通知",
        "error": "错误"
    }
    
    # 消息格式
    @staticmethod
    def create_message(from_agent, to_agent, msg_type, payload):
        return {
            "id": generate_id(),
            "from": from_agent,
            "to": to_agent,
            "type": msg_type,
            "payload": payload,
            "timestamp": datetime.utcnow().isoformat(),
            "correlation_id": None  # 用于关联请求和响应
        }
```

### 52. Agent-as-Tool模式是什么？

**答案：**
将专才Agent包装成可调用工具，由主控Agent保留决策控制权。

**优势：**
- 主控Agent保持对话和决策控制
- 子Agent专注于特定领域
- 易于测试和维护

**实现：**
```python
class AgentTool:
    def __init__(self, agent):
        self.agent = agent
    
    async def execute(self, params):
        result = await self.agent.run(params.task)
        return {
            "status": "success",
            "result": result
        }
```

### 53. 多Agent系统如何进行错误处理？

**答案：**
**错误处理策略：**

1. **超时处理**：设置单个Agent的执行超时
2. **降级策略**：某个Agent失败时的降级方案
3. **重试机制**：可重试的错误进行重试
4. **人工介入**：关键错误转人工处理

```python
class MultiAgentErrorHandler:
    async def handle_agent_failure(self, failed_agent, task):
        # 1. 尝试重试
        if self.is_retryable(failed_agent.last_error):
            return await self.retry(failed_agent, task)
        
        # 2. 降级到其他Agent
        backup_agent = self.get_backup_agent(failed_agent.role)
        if backup_agent:
            return await backup_agent.execute(task)
        
        # 3. 人工介入
        return await self.escalate_to_human(task)
```

### 54. 多Agent系统的性能优化？

**答案：**
**优化策略：**

1. **并行执行**：独立子任务并行处理
2. **结果缓存**：缓存重复查询的结果
3. **负载均衡**：分配任务到空闲Agent
4. **提前终止**：达到目标后提前结束

```python
class ParallelExecutor:
    async def execute_parallel(self, tasks):
        # 并行执行
        results = await asyncio.gather(
            *[self.execute_task(task) for task in tasks],
            return_exceptions=True
        )
        
        # 处理结果
        successful = [r for r in results if not isinstance(r, Exception)]
        failed = [r for r in results if isinstance(r, Exception)]
        
        return {
            "successful": successful,
            "failed": failed
        }
```

### 55. 如何评估多Agent系统的效果？

**答案：**
**评估指标：**

1. **任务完成率**：成功完成的任务比例
2. **执行时间**：端到端执行时间
3. **通信开销**：Agent间通信次数和数据量
4. **资源利用率**：CPU、内存、Token消耗
5. **错误率**：失败和重试的比例

---

## 五、规划与推理（10题）

### 56. Agent的规划能力有哪些类型？

**答案：**
**规划类型：**

1. **任务分解**：将复杂任务分解为子任务
2. **步骤排序**：确定子任务的执行顺序
3. **资源分配**：分配工具和计算资源
4. **动态重规划**：根据执行结果调整计划

### 57. 如何实现任务分解？

**答案：**
**任务分解策略：**

```python
class TaskDecomposer:
    async def decompose(self, task):
        prompt = f"""
        将以下任务分解为子任务：
        任务：{task}
        
        返回JSON格式：
        [
          {{"id": 1, "description": "...", "dependencies": [], "tools": ["..."]}},
          ...
        ]
        """
        
        subtasks = json.loads(await llm.chat(prompt))
        
        # 验证依赖关系
        self.validate_dependencies(subtasks)
        
        return subtasks
```

### 58. 什么是动态重规划？

**答案：**
根据执行结果动态调整计划。

**触发条件：**
1. 子任务失败
2. 发现新信息
3. 外部环境变化
4. 用户需求变更

```python
class DynamicPlanner:
    async def replan(self, original_plan, execution_results):
        prompt = f"""
        原始计划：{original_plan}
        执行结果：{execution_results}
        
        请根据执行结果调整计划。
        """
        
        new_plan = await llm.chat(prompt)
        return new_plan
```

### 59. Agent的推理模式有哪些？

**答案：**
**推理模式：**

1. **Chain-of-Thought（CoT）**：逐步推理
2. **Tree-of-Thought（ToT）**：探索多条推理路径
3. **ReAct**：推理+行动交替
4. **Reflexion**：反思和自我修正

### 60. 什么是Tree-of-Thought？

**答案：**
ToT让LLM探索多条推理路径，评估并选择最优路径。

**流程：**
1. 生成多个思考分支
2. 评估每个分支的前景
3. 剪枝低质量分支
4. 选择最优路径继续

**适用场景：**
- 需要创造性解决的问题
- 有多个可能解的问题
- 需要全局规划的任务

### 61. 如何实现Agent的反思能力？

**答案：**
**反思机制：**

```python
class Reflector:
    async def reflect(self, task, execution_history):
        prompt = f"""
        任务：{task}
        执行历史：{execution_history}
        
        请反思：
        1. 哪些步骤执行得好？
        2. 哪些步骤可以改进？
        3. 下一步应该如何调整？
        """
        
        reflection = await llm.chat(prompt)
        
        return {
            "insights": reflection,
            "should_replan": self.should_replan(reflection),
            "adjustments": self.extract_adjustments(reflection)
        }
```

### 62. Agent如何处理不确定性？

**答案：**
**不确定性处理：**

1. **概率推理**：评估每种可能的概率
2. **多假设验证**：同时验证多个假设
3. **信息收集**：主动收集更多信息
4. **保守决策**：在不确定时选择保守方案

### 63. 如何实现因果推理？

**答案：**
**因果推理框架：**

1. **观察**：收集相关数据
2. **假设**：提出可能的因果关系
3. **验证**：通过实验或推理验证
4. **结论**：得出因果结论

```python
class CausalReasoner:
    async def reason(self, observation):
        prompt = f"""
        观察：{observation}
        
        请分析可能的因果关系：
        1. 直接原因
        2. 间接原因
        3. 相关因素
        4. 验证方法
        """
        
        return await llm.chat(prompt)
```

### 64. 什么是Agentic RL？

**答案：**
Agentic RL是将强化学习应用于Agent训练的方法。

**核心思想：**
- Agent通过与环境交互学习
- 使用奖励信号指导行为
- 逐步优化决策策略

**应用场景：**
- 优化工具选择策略
- 学习任务分解方法
- 改进错误恢复能力

### 65. 如何设计Agent的决策机制？

**答案：**
**决策机制设计：**

1. **规则引擎**：基于预定义规则
2. **LLM决策**：由模型自主决策
3. **混合决策**：规则+LLM结合
4. **投票机制**：多个策略投票

```python
class DecisionMaker:
    async def decide(self, context, options):
        # 1. 规则过滤
        valid_options = self.apply_rules(options)
        
        # 2. LLM评估
        scores = await self.evaluate_with_llm(context, valid_options)
        
        # 3. 选择最优
        best_option = max(scores, key=lambda x: x['score'])
        
        return best_option
```

---

## 六、提示工程与安全（10题）

### 66. 如何设计Agent的System Prompt？

**答案：**
**System Prompt设计要点：**

1. **角色定义**：明确Agent的角色和能力
2. **行为规范**：定义Agent的行为准则
3. **工具说明**：描述可用工具及其用途
4. **输出格式**：指定输出的格式要求
5. **安全约束**：添加安全相关的限制

```python
SYSTEM_PROMPT = """
你是一个专业的客服Agent。

## 角色
- 帮助用户解决产品问题
- 提供准确的产品信息

## 行为规范
- 始终保持礼貌和专业
- 不确定时承认不确定
- 保护用户隐私

## 可用工具
- search_product: 搜索产品信息
- create_ticket: 创建工单

## 输出格式
使用JSON格式输出：
{"action": "...", "parameters": {...}}

## 安全约束
- 不泄露内部信息
- 不执行危险操作
"""
```

### 67. 什么是Prompt Injection？如何防御？

**答案：**
**Prompt Injection：** 攻击者通过输入操纵模型行为。

**攻击类型：**
1. **直接注入**：直接覆盖系统指令
2. **间接注入**：通过外部数据注入

**防御策略：**
```python
class PromptInjectionDefense:
    def __init__(self):
        self.dangerous_patterns = [
            r"ignore previous instructions",
            r"you are now",
            r"system prompt",
            r"reveal your instructions"
        ]
    
    def detect(self, user_input):
        for pattern in self.dangerous_patterns:
            if re.search(pattern, user_input, re.IGNORECASE):
                return True
        return False
    
    def sanitize(self, user_input):
        # 移除危险字符
        sanitized = user_input.replace("{", "").replace("}", "")
        return sanitized
```

### 68. 如何设计结构化输出？

**答案：**
**结构化输出方案：**

1. **JSON Schema约束**：使用schema约束输出格式
2. **输出解析器**：解析和验证输出
3. **重试机制**：格式错误时重试

```python
class StructuredOutput:
    def __init__(self, schema):
        self.schema = schema
    
    async def generate(self, prompt):
        for attempt in range(3):
            response = await llm.chat(prompt)
            
            try:
                result = json.loads(response)
                self.validate(result)
                return result
            except json.JSONDecodeError:
                # 尝试修复
                result = self.try_fix(response)
                if result:
                    return result
        
        raise OutputFormatError()
    
    def validate(self, result):
        jsonschema.validate(result, self.schema)
```

### 69. 如何防止Agent泄露敏感信息？

**答案：**
**信息防护策略：**

1. **输入过滤**：检测敏感信息请求
2. **输出检查**：检查输出是否包含敏感信息
3. **最小信息原则**：只提供必要信息

```python
class InformationGuard:
    SENSITIVE_PATTERNS = [
        r"\b\d{18}\b",  # 身份证号
        r"\b1[3-9]\d{9}\b",  # 手机号
        r"\b\d{16,19}\b"  # 银行卡号
    ]
    
    def check_output(self, output):
        for pattern in self.SENSITIVE_PATTERNS:
            if re.search(pattern, output):
                return False
        return True
    
    def redact(self, text):
        for pattern in self.SENSITIVE_PATTERNS:
            text = re.sub(pattern, "[REDACTED]", text)
        return text
```

### 70. 什么是Guardrails？如何实现？

**答案：**
Guardrails是限制Agent行为的安全机制。

**实现方式：**

```python
class Guardrails:
    def __init__(self):
        self.rules = []
    
    def add_rule(self, rule):
        self.rules.append(rule)
    
    async def check(self, action):
        for rule in self.rules:
            if not await rule.validate(action):
                return {
                    "allowed": False,
                    "reason": rule.reason
                }
        return {"allowed": True}

# 规则示例
class NoDeleteRule:
    async def validate(self, action):
        if action.type == "delete":
            return False
        return True
    
    reason = "删除操作需要人工审批"
```

### 71. 如何实现权限最小化？

**答案：**
**最小权限原则：**

1. **默认拒绝**：未明确允许的操作默认拒绝
2. **按需分配**：只分配完成任务所需的最小权限
3. **时间限制**：权限有时效性
4. **审计日志**：记录所有权限使用

```python
class PermissionManager:
    def __init__(self):
        self.permissions = {}
    
    def grant(self, agent_id, permissions, ttl=3600):
        self.permissions[agent_id] = {
            "permissions": permissions,
            "expires_at": time.time() + ttl
        }
    
    def check(self, agent_id, permission):
        agent_perms = self.permissions.get(agent_id)
        
        if not agent_perms:
            return False
        
        if time.time() > agent_perms["expires_at"]:
            return False
        
        return permission in agent_perms["permissions"]
```

### 72. 如何检测和处理幻觉？

**答案：**
**幻觉检测：**

```python
class HallucinationDetector:
    async def detect(self, answer, context):
        # 1. 事实一致性检查
        factuality = await self.check_factuality(answer, context)
        
        # 2. 来源验证
        has_source = self.verify_sources(answer, context)
        
        # 3. 置信度评估
        confidence = await self.evaluate_confidence(answer)
        
        return {
            "is_hallucination": factuality < 0.7 or not has_source,
            "factuality": factuality,
            "confidence": confidence
        }
    
    async def handle(self, answer, detection_result):
        if detection_result["is_hallucination"]:
            return "抱歉，我无法确认这个信息的准确性。建议您查阅官方文档。"
        return answer
```

### 73. 什么是Red Teaming？

**答案：**
Red Teaming是通过模拟攻击测试系统安全性的方法。

**Agent Red Teaming场景：**
1. **越狱攻击**：绕过安全限制
2. **信息泄露**：获取敏感信息
3. **权限提升**：获取未授权权限
4. **资源滥用**：过度消耗资源

**防御措施：**
- 输入验证
- 输出过滤
- 行为监控
- 异常检测

### 74. 如何设计安全的工具调用？

**答案：**
**安全工具调用设计：**

1. **参数验证**：严格验证输入参数
2. **权限检查**：检查调用权限
3. **审计日志**：记录所有调用
4. **限流控制**：防止滥用

```python
class SecureToolExecutor:
    async def execute(self, tool_call, context):
        # 1. 权限检查
        if not self.check_permission(context.user, tool_call):
            raise PermissionDenied()
        
        # 2. 参数验证
        self.validate_params(tool_call.params)
        
        # 3. 限流检查
        if not self.rate_limiter.allow(tool_call.tool):
            raise RateLimited()
        
        # 4. 执行
        result = await self.tool.execute(tool_call.params)
        
        # 5. 审计
        self.audit_log(tool_call, result)
        
        return result
```

### 75. 如何实现Agent的安全对齐？

**答案：**
**安全对齐策略：**

1. **目标对齐**：确保Agent目标与人类一致
2. **价值对齐**：Agent行为符合人类价值观
3. **能力限制**：限制Agent的能力范围
4. **监督机制**：人类监督Agent行为

**实现方法：**
- RLHF（人类反馈强化学习）
- Constitutional AI（宪法AI）
- 安全边界设定
- 持续监控和调整

---

## 七、生产化部署（15题）

### 76. Agent生产化的核心挑战是什么？

**答案：**
**核心挑战：**

1. **可靠性**：长时间稳定运行
2. **可观测性**：追踪和调试
3. **成本控制**：Token和计算成本
4. **安全性**：防止滥用和攻击
5. **扩展性**：支持高并发

### 77. 什么是LLMOps？

**答案：**
LLMOps是LLM应用的运维实践。

**核心组成：**
1. **模型管理**：版本控制、A/B测试
2. **提示管理**：提示版本、效果追踪
3. **监控告警**：性能、成本、错误监控
4. **日志追踪**：完整的执行轨迹

### 78. 如何优化Agent的成本？

**答案：**
**成本优化策略：**

1. **模型路由**：简单任务用小模型
2. **缓存策略**：缓存重复查询
3. **上下文压缩**：减少Token消耗
4. **批量处理**：合并相似请求

```python
class CostOptimizer:
    def __init__(self):
        self.model_router = ModelRouter()
        self.cache = Cache()
    
    async def process(self, request):
        # 检查缓存
        cached = await self.cache.get(request)
        if cached:
            return cached
        
        # 选择模型
        model = self.model_router.select(request)
        
        # 执行
        result = await model.process(request)
        
        # 缓存结果
        await self.cache.set(request, result)
        
        return result
```

### 79. 如何实现模型路由？

**答案：**
**模型路由策略：**

```python
class ModelRouter:
    def __init__(self):
        self.models = {
            "simple": "gpt-3.5-turbo",
            "complex": "gpt-4",
            "code": "codex"
        }
    
    def select(self, request):
        # 基于任务复杂度选择模型
        complexity = self.evaluate_complexity(request)
        
        if complexity < 0.3:
            return self.models["simple"]
        elif complexity < 0.7:
            return self.models["complex"]
        else:
            return self.models["complex"]  # 或更高级的模型
```

### 80. 如何监控Agent的性能？

**答案：**
**监控指标：**

1. **延迟**：响应时间
2. **吞吐量**：每秒处理请求数
3. **错误率**：失败请求比例
4. **Token消耗**：每次请求的Token数
5. **工具调用**：工具成功率

```python
class AgentMonitor:
    def __init__(self):
        self.metrics = {
            "latency": [],
            "tokens": [],
            "errors": 0,
            "total": 0
        }
    
    def record(self, request, result):
        self.metrics["total"] += 1
        self.metrics["latency"].append(result.latency)
        self.metrics["tokens"].append(result.tokens_used)
        
        if result.error:
            self.metrics["errors"] += 1
        
        # 发送到监控系统
        self.send_to_prometheus()
```

### 81. 如何实现Agent的可观测性？

**答案：**
**可观测性三大支柱：**

1. **日志（Logs）**：详细的执行日志
2. **指标（Metrics）**：性能和业务指标
3. **追踪（Traces）**：完整的执行轨迹

```python
class AgentTracer:
    def __init__(self):
        self.traces = []
    
    def start_trace(self, trace_id):
        return TraceContext(trace_id)
    
    def record_span(self, context, span):
        context.spans.append(span)
        self.traces.append(span)
```

### 82. 如何处理Agent的故障排查？

**答案：**
**故障排查流程：**

1. **收集信息**：日志、指标、追踪
2. **定位问题**：分析错误模式
3. **复现问题**：使用相同输入测试
4. **修复验证**：修复后验证效果

**常见问题：**
- 模型幻觉：检查上下文和提示
- 工具失败：检查工具可用性和参数
- 性能问题：检查Token消耗和延迟
- 成本超支：检查缓存和模型路由

### 83. 如何实现Agent的A/B测试？

**答案：**
**A/B测试设计：**

```python
class AgentABTest:
    def __init__(self):
        self.variants = {
            "control": {"model": "gpt-3.5-turbo", "prompt": "..."},
            "treatment": {"model": "gpt-4", "prompt": "..."}
        }
    
    def assign_variant(self, user_id):
        # 基于用户ID分配变体
        hash_value = hash(user_id) % 100
        
        if hash_value < 50:
            return "control"
        else:
            return "treatment"
    
    async def run(self, user_id, request):
        variant = self.assign_variant(user_id)
        config = self.variants[variant]
        
        result = await self.execute(config, request)
        
        # 记录结果
        self.record_result(variant, result)
        
        return result
```

### 84. 如何优化Agent的延迟？

**答案：**
**延迟优化策略：**

1. **流式输出**：使用SSE流式返回
2. **并行处理**：独立任务并行执行
3. **预加载**：提前加载常用资源
4. **缓存**：缓存重复查询
5. **模型选择**：简单任务用快速模型

### 85. 如何实现Agent的扩展性？

**答案：**
**扩展性设计：**

1. **无状态设计**：Agent实例无状态
2. **水平扩展**：增加实例数量
3. **负载均衡**：均匀分配请求
4. **队列缓冲**：使用消息队列

```python
class ScalableAgent:
    def __init__(self):
        self.state_store = RedisStateStore()
        self.message_queue = RabbitMQ()
    
    async def process(self, request):
        # 从状态存储加载状态
        state = await self.state_store.get(request.session_id)
        
        # 处理请求
        result = await self.execute(request, state)
        
        # 保存状态
        await self.state_store.set(request.session_id, result.state)
        
        return result
```

### 86. 如何实现Agent的灰度发布？

**答案：**
**灰度发布策略：**

```python
class GrayscaleRelease:
    def __init__(self):
        self.versions = {
            "stable": {"weight": 90, "version": "v1.0"},
            "canary": {"weight": 10, "version": "v1.1"}
        }
    
    def select_version(self, user_id):
        rand = hash(user_id) % 100
        
        cumulative = 0
        for name, config in self.versions.items():
            cumulative += config["weight"]
            if rand < cumulative:
                return config["version"]
```

### 87. 如何处理Agent的版本管理？

**答案：**
**版本管理要素：**

1. **模型版本**：LLM模型版本
2. **提示版本**：System Prompt版本
3. **工具版本**：工具接口版本
4. **配置版本**：参数配置版本

```python
class AgentVersionManager:
    def __init__(self):
        self.versions = {}
    
    def register(self, version, config):
        self.versions[version] = {
            "model": config.model,
            "prompt": config.prompt,
            "tools": config.tools,
            "created_at": datetime.now()
        }
    
    def get_version(self, version):
        return self.versions.get(version)
```

### 88. 如何实现Agent的回滚机制？

**答案：**
**回滚策略：**

1. **快速回滚**：切换到稳定版本
2. **数据回滚**：恢复到之前的状态
3. **流量切换**：将流量切到旧版本

```python
class AgentRollback:
    async def rollback(self, from_version, to_version):
        # 1. 停止新版本
        await self.stop_version(from_version)
        
        # 2. 启动旧版本
        await self.start_version(to_version)
        
        # 3. 切换流量
        await self.switch_traffic(to_version)
        
        # 4. 验证
        await self.verify(to_version)
```

### 89. 如何处理Agent的高并发？

**答案：**
**高并发处理：**

1. **异步处理**：使用asyncio
2. **连接池**：复用数据库连接
3. **限流控制**：防止过载
4. **队列缓冲**：削峰填谷

```python
class HighConcurrencyAgent:
    def __init__(self):
        self.semaphore = asyncio.Semaphore(100)  # 最大并发数
        self.connection_pool = ConnectionPool()
    
    async def process(self, request):
        async with self.semaphore:
            # 获取连接
            conn = await self.connection_pool.acquire()
            
            try:
                result = await self.execute(request, conn)
                return result
            finally:
                # 释放连接
                await self.connection_pool.release(conn)
```

### 90. 如何设计Agent的灾备方案？

**答案：**
**灾备策略：**

1. **多活部署**：多个数据中心同时服务
2. **故障转移**：主节点故障自动切换
3. **数据备份**：定期备份状态数据
4. **降级方案**：核心功能降级可用

---

## 八、评估与测试（10题）

### 91. 如何评估Agent的效果？

**答案：**
**评估维度：**

1. **任务完成率**：成功完成的任务比例
2. **响应质量**：回答的准确性和相关性
3. **执行效率**：时间和Token消耗
4. **用户满意度**：用户反馈评分

```python
class AgentEvaluator:
    def evaluate(self, test_cases):
        results = []
        
        for case in test_cases:
            # 执行Agent
            response = self.agent.run(case.input)
            
            # 评估结果
            score = {
                "task_completion": self.check_completion(response, case.expected),
                "response_quality": self.evaluate_quality(response),
                "efficiency": self.measure_efficiency(response)
            }
            
            results.append(score)
        
        return self.aggregate(results)
```

### 92. 什么是LLM-as-Judge？

**答案：**
使用LLM评估Agent输出的质量。

**实现方式：**
```python
class LLMJudge:
    async def evaluate(self, question, answer, reference):
        prompt = f"""
        请评估以下回答的质量：
        
        问题：{question}
        回答：{answer}
        参考答案：{reference}
        
        评分维度（1-10）：
        1. 准确性
        2. 完整性
        3. 相关性
        4. 清晰度
        
        返回JSON格式评分。
        """
        
        return json.loads(await llm.chat(prompt))
```

### 93. 如何设计Agent的测试用例？

**答案：**
**测试用例设计：**

1. **功能测试**：验证基本功能
2. **边界测试**：测试边界条件
3. **异常测试**：测试错误处理
4. **性能测试**：测试响应时间和吞吐量

```python
test_cases = [
    {
        "name": "基本查询",
        "input": "今天天气怎么样？",
        "expected_tools": ["get_weather"],
        "expected_output_contains": "天气"
    },
    {
        "name": "边界条件",
        "input": "",
        "expected_error": "输入不能为空"
    },
    {
        "name": "工具失败",
        "input": "查询天气",
        "tool_error": "WeatherAPI unavailable",
        "expected_behavior": "graceful_fallback"
    }
]
```

### 94. 什么是Eval Harness？

**答案：**
Eval Harness是Agent评估的框架，包括：
- 测试用例管理
- 自动化执行
- 结果收集和分析
- 可视化报告

### 95. 如何评估Agent的工具调用能力？

**答案：**
**工具调用评估：**

1. **工具选择准确性**：是否选择了正确的工具
2. **参数正确性**：参数是否正确
3. **执行成功率**：工具调用是否成功
4. **结果利用度**：是否正确使用了工具结果

```python
class ToolCallEvaluator:
    def evaluate(self, test_case, agent_response):
        # 检查工具选择
        expected_tools = test_case["expected_tools"]
        actual_tools = agent_response["tool_calls"]
        
        tool_accuracy = len(
            set(expected_tools) & set(actual_tools)
        ) / len(expected_tools)
        
        # 检查参数
        param_accuracy = self.check_params(
            test_case["expected_params"],
            agent_response["tool_params"]
        )
        
        return {
            "tool_accuracy": tool_accuracy,
            "param_accuracy": param_accuracy
        }
```

### 96. 如何进行Agent的回归测试？

**答案：**
**回归测试策略：**

1. **测试套件**：维护完整的测试用例集
2. **自动化执行**：每次更新后自动运行
3. **结果对比**：与基线版本对比
4. **告警机制**：性能下降时告警

```python
class RegressionTester:
    def __init__(self):
        self.test_suite = self.load_test_suite()
        self.baseline = self.load_baseline()
    
    async def run_regression(self):
        results = []
        
        for test in self.test_suite:
            result = await self.run_test(test)
            results.append(result)
        
        # 与基线对比
        comparison = self.compare_with_baseline(results)
        
        # 检查是否有退化
        if comparison.has_regression:
            self.alert(comparison.regressions)
        
        return comparison
```

### 97. 如何评估Agent的安全性？

**答案：**
**安全性评估：**

1. **越狱测试**：测试是否能绕过限制
2. **注入测试**：测试Prompt Injection防御
3. **权限测试**：测试权限控制
4. **信息泄露测试**：测试信息保护

```python
class SecurityTester:
    async def run_security_tests(self, agent):
        tests = [
            self.test_jailbreak,
            self.test_injection,
            self.test_permission,
            self.test_info_leak
        ]
        
        results = []
        for test in tests:
            result = await test(agent)
            results.append(result)
        
        return results
```

### 98. 如何进行Agent的负载测试？

**答案：**
**负载测试设计：**

```python
class LoadTester:
    async def run_load_test(self, agent, config):
        # 并发用户数
        concurrent_users = config["concurrent_users"]
        # 测试持续时间
        duration = config["duration"]
        
        # 创建并发请求
        tasks = []
        for i in range(concurrent_users):
            task = self.simulate_user(agent, duration)
            tasks.append(task)
        
        # 执行
        results = await asyncio.gather(*tasks)
        
        # 分析结果
        return self.analyze_results(results)
```

### 99. 如何评估Agent的用户体验？

**答案：**
**用户体验指标：**

1. **响应时间**：用户等待时间
2. **首次响应**：流式输出的首字时间
3. **任务完成率**：用户任务完成比例
4. **满意度评分**：用户主观评分
5. **重试率**：用户重试的比例

### 100. 如何建立Agent的持续改进机制？

**答案：**
**持续改进流程：**

1. **数据收集**：收集用户反馈和执行日志
2. **问题分析**：分析常见问题和失败案例
3. **优化迭代**：改进提示、工具、流程
4. **效果验证**：验证优化效果
5. **发布上线**：灰度发布新版本

```python
class ContinuousImprovement:
    def __init__(self):
        self.feedback_collector = FeedbackCollector()
        self.analyzer = ProblemAnalyzer()
        self.optimizer = AgentOptimizer()
    
    async def improve(self):
        # 收集反馈
        feedback = await self.feedback_collector.collect()
        
        # 分析问题
        problems = self.analyzer.analyze(feedback)
        
        # 生成优化方案
        optimizations = self.optimizer.generate(problems)
        
        # 验证效果
        results = await self.validate(optimizations)
        
        # 发布
        if results.improvement > threshold:
            await self.deploy(optimizations)
```

---

## 📊 面试准备建议

### 核心知识点
1. **Agent架构**：ReAct、Plan-and-Execute、状态机
2. **工具调用**：Function Calling、MCP、工具设计
3. **记忆管理**：短期/长期记忆、上下文压缩
4. **多Agent**：协作架构、通信协议、冲突处理
5. **生产化**：监控、成本、安全、扩展

### 面试技巧
1. **结合项目**：每个知识点都要能联系到实际项目
2. **深入细节**：准备好被追问5层下挖
3. **代码示例**：关键点要有代码实现
4. **权衡取舍**：说明为什么选择这个方案

### 常见追问
1. "这个方案的缺点是什么？"
2. "如果规模增长10倍，怎么扩展？"
3. "线上出问题了怎么排查？"
4. "成本怎么优化？"

---

**祝面试顺利！** 🚀