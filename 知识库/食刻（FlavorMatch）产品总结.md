# 食刻（FlavorMatch）产品总结

> 本文档由三部分组成：**一、产品设计**、**二、API 接口设计**、**三、数据库设计**。
> 接口路径统一前缀：`/api/v1`；数据库统一使用 MySQL 8.0。

---

## 一、产品设计

### 1. 产品概述

**食刻**是一款专为情侣设计的美食决策与互动应用，核心解决情侣间「今天吃什么」的决策难题。通过智能推荐系统、个性化记忆管理、RAG 菜谱搜索和模拟点餐系统，让每一顿饭的选择变得简单、有趣且充满仪式感。

#### 1.1 核心价值

| 价值点 | 说明 |
|---|---|
| 决策效率 | 3 秒内给出吃什么的具体建议 |
| 个性化 | 记住双方口味偏好，越用越懂你 |
| 情感连接 | 模拟点餐互动，增进感情 |
| 趣味性 | 下单 - 接单 - 小票的完整模拟体验 |
| 实用性 | 提供完整菜谱和做法指导 |

#### 1.2 目标用户

- **主力用户**：同居情侣、已婚夫妇
- **次要用户**：异地恋情侣、准情侣
- **年龄层次**：以 20–35 岁年轻用户为主

### 2. 核心功能模块

#### 2.1 用户系统

手机号注册/登录、第三方登录（微信 / Apple ID）、个人资料设置、账号安全。

#### 2.2 情侣系统

情侣绑定（邀请码 / 扫码）、关系管理、共同空间、纪念日设置。

#### 2.3 智能决策系统

一键随机推荐、摇一摇决策、条件筛选、双方偏好匹配、决策历史。

#### 2.4 RAG 智能搜索

自然语言搜索、食材反查、语义理解、API Key 管理。

#### 2.5 菜谱浏览

分类浏览（早 / 午 / 晚 / 夜宵）、菜系分类、难度与时长筛选。

#### 2.6 模拟点餐系统（特色功能）

- **点餐流程**：选菜 → 加入购物车 → 留言备注 → 生成订单 → 对方接单
- **订单小票**：仿真实票据设计，支持保存与分享
- **互动功能**：留言板、表情反应、订单历史
- **订单状态**：待接单 / 已接单 / 已完成 / 已取消 / 已过期

#### 2.7 偏好记忆模块

| 记忆类型 | 说明 | 生效方式 |
|---|---|---|
| 长期记忆 | 过敏、禁忌、口味偏好 | 永久有效 |
| 周期记忆 | 生理期、作息规律 | 循环触发 |
| 临时记忆 | 健康状况、短期目标 | 到期失效 |
| 情境记忆 | 天气、心情关联 | 条件触发 |

**优先级**：安全 > 健康 > 目标 > 口味 > 情境

#### 2.8 个性化功能

今日推荐、智能菜单、食材清单、营养信息、收藏与想做清单。

### 3. 技术架构

#### 3.1 移动端（Android 原生 / Kotlin）

| 层面 | 选型 |
|---|---|
| 架构 | MVVM + Clean Architecture |
| UI | Jetpack Compose |
| 导航 | Navigation Compose |
| 依赖注入 | Hilt |
| 网络 | Retrofit + OkHttp |
| 本地存储 | Room + DataStore |
| 图片 | Coil |
| 推送 | FCM |
| 动画 | Lottie |

#### 3.2 后端（FastAPI + Python）

| 层面 | 选型 |
|---|---|
| 数据库 | MySQL 8.0 |
| 缓存 | Redis |
| 向量数据库 | Milvus（用于 RAG） |
| 任务队列 | Celery |
| 文件存储 | OSS |
| 部署 | Docker + Docker Compose |

#### 3.3 AI 集成

- **DeepSeek API**（用户提供 API Key）
- **RAG 系统**（菜谱知识库检索）
- **Prompt 智能构建**（注入用户记忆）

### 4. 特色创新

1. **模拟点餐系统**：完整还原点餐流程，增加情侣互动趣味。
2. **智能决策轮盘**：动画化随机选择，支持双方偏好匹配。
3. **记忆驱动个性化**：越用越精准，自动学习和更新。
4. **食材反查功能**：输入现有食材，智能匹配可做的菜品。
5. **订单小票设计**：个性化模板，可保存分享作为纪念。

### 5. 迭代规划

| 版本 | 内容 |
|---|---|
| V1.0 | 基础功能 + 模拟点餐（MVP） |
| V1.5 | 决策优化 + 记忆完善 + 点餐增强 |
| V2.0 | AI 对话 + 美食日历 + 营养分析 |
| V2.5 | 食材管理 + AR 指导 + 多平台 |

---

## 二、API 接口设计

### 1. 认证相关接口

```text
POST   /api/v1/auth/register          用户注册
POST   /api/v1/auth/login             用户登录
POST   /api/v1/auth/logout            用户登出
POST   /api/v1/auth/refresh           刷新 Token
POST   /api/v1/auth/verify-code       发送验证码
POST   /api/v1/auth/oauth/wechat      微信登录
POST   /api/v1/auth/oauth/apple       Apple 登录
GET    /api/v1/auth/me                获取当前用户信息
PUT    /api/v1/auth/me                更新用户信息
PUT    /api/v1/auth/password          修改密码
DELETE /api/v1/auth/me                注销账号
```

### 2. 情侣相关接口

```text
POST   /api/v1/couple/invite           生成邀请码
POST   /api/v1/couple/bind             绑定情侣
POST   /api/v1/couple/invite/accept    接受邀请
POST   /api/v1/couple/invite/reject    拒绝邀请
GET    /api/v1/couple/info             获取情侣信息
PUT    /api/v1/couple/info             更新情侣信息
PUT    /api/v1/couple/anniversary      设置纪念日
GET    /api/v1/couple/status           获取情侣状态
DELETE /api/v1/couple/unbind           解绑情侣
```

### 3. 菜谱相关接口

```text
GET    /api/v1/recipes                   获取菜谱列表
GET    /api/v1/recipes/{id}              获取菜谱详情
GET    /api/v1/recipes/categories        获取分类列表
GET    /api/v1/recipes/cuisines          获取菜系列表
POST   /api/v1/recipes/search            搜索菜谱
GET    /api/v1/recipes/{id}/steps        获取烹饪步骤
GET    /api/v1/recipes/{id}/ingredients  获取食材清单
GET    /api/v1/recipes/{id}/nutrition    获取营养信息
GET    /api/v1/recipes/{id}/similar      获取相似菜谱
```

### 4. 搜索相关接口

```text
POST   /api/v1/search/rag              RAG 智能搜索
POST   /api/v1/search/by-ingredients   食材反查
POST   /api/v1/search/semantic         语义搜索
GET    /api/v1/search/suggestions      搜索建议
GET    /api/v1/search/history          获取搜索历史
DELETE /api/v1/search/history          清空搜索历史
```

### 5. 推荐相关接口

```text
GET    /api/v1/recommend/daily         获取今日推荐
GET    /api/v1/recommend/random        随机推荐
GET    /api/v1/recommend/filter        条件筛选推荐
POST   /api/v1/recommend/decision      智能决策
POST   /api/v1/recommend/couple-match  情侣匹配推荐
GET    /api/v1/recommend/history       推荐历史
POST   /api/v1/recommend/feedback      推荐反馈
```

### 6. 决策相关接口

```text
POST   /api/v1/decision/random         随机决策
POST   /api/v1/decision/shake          摇一摇决策
POST   /api/v1/decision/couple         情侣共同决策
GET    /api/v1/decision/history        决策历史
POST   /api/v1/decision/{id}/feedback  决策反馈
```

### 7. 记忆管理接口

```text
GET    /api/v1/memories                获取所有记忆
GET    /api/v1/memories/{id}           获取单条记忆
POST   /api/v1/memories                创建记忆
PUT    /api/v1/memories/{id}           更新记忆
DELETE /api/v1/memories/{id}           删除记忆
GET    /api/v1/memories/templates      获取记忆模板
POST   /api/v1/memories/batch          批量添加记忆
PUT    /api/v1/memories/{id}/active    激活 / 停用记忆
GET    /api/v1/memories/preview        预览生效记忆
```

### 8. API Key 管理接口

```text
POST   /api/v1/apikey/validate         验证 API Key
POST   /api/v1/apikey/save             保存 API Key
GET    /api/v1/apikey/status           获取 API Key 状态
DELETE /api/v1/apikey/delete           删除 API Key
GET    /api/v1/apikey/usage            获取使用统计
```

### 9. 收藏相关接口

```text
GET    /api/v1/favorites                     获取收藏列表
POST   /api/v1/favorites/{recipe_id}         添加收藏
DELETE /api/v1/favorites/{recipe_id}         取消收藏
GET    /api/v1/favorites/want                获取想做列表
POST   /api/v1/favorites/{recipe_id}/want    添加到想做
DELETE /api/v1/favorites/{recipe_id}/want    从想做移除
```

### 10. 购物车相关接口

```text
GET    /api/v1/cart                      获取购物车
POST   /api/v1/cart/items                添加菜品到购物车
PUT    /api/v1/cart/items/{id}           更新购物车菜品
DELETE /api/v1/cart/items/{id}           删除购物车菜品
DELETE /api/v1/cart                      清空购物车
```

### 11. 订单相关接口

```text
POST   /api/v1/orders                    创建订单（下单）
GET    /api/v1/orders                    获取订单列表
GET    /api/v1/orders/{id}               获取订单详情
PUT    /api/v1/orders/{id}/accept        接单
PUT    /api/v1/orders/{id}/complete      完成订单
PUT    /api/v1/orders/{id}/cancel        取消订单
POST   /api/v1/orders/{id}/message       发送留言
POST   /api/v1/orders/{id}/emoji         发送表情
GET    /api/v1/orders/{id}/ticket        生成订单小票
POST   /api/v1/orders/{id}/share         分享订单
GET    /api/v1/orders/statistics         订单统计
```

---

## 三、数据库设计

### 1. 用户相关表

#### users（用户表）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | BIGINT | 主键 |
| phone | VARCHAR(20) | 手机号（唯一） |
| password_hash | VARCHAR(255) | 密码哈希 |
| nickname | VARCHAR(50) | 昵称 |
| avatar_url | VARCHAR(255) | 头像 URL |
| gender | TINYINT | 性别 |
| birthday | DATE | 生日 |
| status | TINYINT | 状态 |
| last_login_at | DATETIME | 最后登录时间 |

#### user_oauth（第三方登录表）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | BIGINT | 主键 |
| user_id | BIGINT | 用户 ID |
| provider | VARCHAR(20) | 渠道（wechat / apple） |
| open_id | VARCHAR(100) | 第三方 openId |
| union_id | VARCHAR(100) | unionId |

#### api_keys（API Key 表）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | BIGINT | 主键 |
| user_id | BIGINT | 用户 ID |
| provider | VARCHAR(20) | 服务商（deepseek） |
| api_key | VARCHAR(255) | 加密的 Key |
| api_key_hash | VARCHAR(64) | Key 哈希 |
| is_active | TINYINT | 是否有效 |
| expired_at | DATETIME | 过期时间 |

### 2. 情侣相关表

#### couples（情侣关系表）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | BIGINT | 主键 |
| invite_code | VARCHAR(20) | 邀请码（唯一） |
| user1_id | BIGINT | 发起者 |
| user2_id | BIGINT | 被邀请者 |
| status | TINYINT | 状态 |
| anniversary | DATE | 纪念日 |
| bound_at | DATETIME | 绑定时间 |

#### couple_settings（情侣设置表）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | BIGINT | 主键 |
| couple_id | BIGINT | 情侣 ID |
| setting_key | VARCHAR(50) | 设置键 |
| setting_value | JSON | 设置值 |

### 3. 菜谱相关表

#### recipes（菜谱主表）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | BIGINT | 主键 |
| name | VARCHAR(100) | 菜名 |
| description | TEXT | 描述 |
| category | VARCHAR(20) | 分类（早 / 午 / 晚 / 夜宵） |
| cuisine | VARCHAR(30) | 菜系 |
| difficulty | TINYINT | 难度（1–3） |
| cooking_time | INT | 烹饪时间（分钟） |
| prep_time | INT | 准备时间 |
| servings | INT | 份量 |
| image_url | VARCHAR(255) | 图片 URL |
| rating | DECIMAL(3,2) | 评分 |
| tags | JSON | 标签 |
| nutrition_info | JSON | 营养信息 |

#### ingredients（食材表）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | BIGINT | 主键 |
| name | VARCHAR(50) | 食材名称（唯一） |
| category | VARCHAR(30) | 食材分类 |
| nutrition_info | JSON | 营养信息 |

#### recipe_ingredients（菜谱食材关联表）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | BIGINT | 主键 |
| recipe_id | BIGINT | 菜谱 ID |
| ingredient_id | BIGINT | 食材 ID |
| amount | VARCHAR(50) | 用量 |
| unit | VARCHAR(20) | 单位 |
| is_optional | TINYINT | 是否可选 |

#### recipe_steps（烹饪步骤表）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | BIGINT | 主键 |
| recipe_id | BIGINT | 菜谱 ID |
| step_number | INT | 步骤序号 |
| description | TEXT | 步骤描述 |
| image_url | VARCHAR(255) | 步骤图片 |
| duration | INT | 耗时 |
| tips | TEXT | 小贴士 |

### 4. 用户交互表

#### favorites（收藏想做表）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | BIGINT | 主键 |
| user_id | BIGINT | 用户 ID |
| recipe_id | BIGINT | 菜谱 ID |
| type | VARCHAR(20) | 类型（favorite / want） |

#### decision_history（决策历史表）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | BIGINT | 主键 |
| couple_id | BIGINT | 情侣 ID |
| user_id | BIGINT | 用户 ID |
| recipe_id | BIGINT | 菜谱 ID |
| decision_type | VARCHAR(30) | 决策类型 |
| context | JSON | 决策上下文 |
| result | JSON | 决策结果 |
| is_satisfied | TINYINT | 是否满意 |

#### search_history（搜索历史表）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | BIGINT | 主键 |
| user_id | BIGINT | 用户 ID |
| search_query | VARCHAR(255) | 搜索词 |
| search_type | VARCHAR(20) | 搜索类型 |
| result_count | INT | 结果数 |

### 5. 记忆相关表

#### user_memories（用户记忆表）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | BIGINT | 主键 |
| user_id | BIGINT | 用户 ID |
| memory_type | VARCHAR(20) | 类型（long_term / periodic / temporary / situational） |
| category | VARCHAR(50) | 分类 |
| content | JSON | 记忆内容 |
| priority | INT | 优先级（1–10） |
| is_active | TINYINT | 是否激活 |
| valid_from | DATETIME | 生效时间 |
| valid_until | DATETIME | 失效时间 |
| repeat_rule | JSON | 重复规则 |
| trigger_conditions | JSON | 触发条件 |
| source | VARCHAR(20) | 来源（user / system / ai） |

#### memory_templates（记忆模板表）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | BIGINT | 主键 |
| template_name | VARCHAR(100) | 模板名称 |
| memory_type | VARCHAR(20) | 记忆类型 |
| category | VARCHAR(50) | 分类 |
| default_content | JSON | 默认内容 |
| is_system | TINYINT | 是否系统预设 |

#### memory_update_history（记忆更新历史表）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | BIGINT | 主键 |
| memory_id | BIGINT | 记忆 ID |
| update_type | VARCHAR(20) | 更新类型 |
| old_content | JSON | 旧内容 |
| new_content | JSON | 新内容 |
| updated_by | VARCHAR(50) | 更新者 |

### 6. 订单相关表

#### orders（订单主表）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | BIGINT | 主键 |
| order_no | VARCHAR(50) | 订单号（唯一） |
| couple_id | BIGINT | 情侣 ID |
| sender_id | BIGINT | 下单方 |
| receiver_id | BIGINT | 接单方 |
| status | VARCHAR(20) | 状态（pending / accepted / completed / cancelled / expired） |
| message | TEXT | 留言 |
| delivery_type | VARCHAR(20) | 配送方式 |
| meal_time | DATETIME | 用餐时间 |
| total_amount | DECIMAL(10,2) | 虚拟总金额 |
| is_read | TINYINT | 是否已读 |
| accepted_at | DATETIME | 接单时间 |
| completed_at | DATETIME | 完成时间 |

#### order_items（订单菜品明细表）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | BIGINT | 主键 |
| order_id | BIGINT | 订单 ID |
| recipe_id | BIGINT | 菜谱 ID |
| quantity | INT | 数量 |
| unit_price | DECIMAL(10,2) | 虚拟单价 |
| special_notes | VARCHAR(255) | 特殊要求 |

#### order_interactions（订单互动记录表）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | BIGINT | 主键 |
| order_id | BIGINT | 订单 ID |
| user_id | BIGINT | 用户 ID |
| interaction_type | VARCHAR(20) | 类型（comment / emoji / status_change） |
| content | TEXT | 互动内容 |
| emoji | VARCHAR(10) | 表情符号 |

### 7. 推荐相关表

#### daily_recommendations（每日推荐表）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | BIGINT | 主键 |
| user_id | BIGINT | 用户 ID |
| recipe_id | BIGINT | 菜谱 ID |
| recommend_date | DATE | 推荐日期 |
| meal_type | VARCHAR(20) | 餐次 |
| reason | TEXT | 推荐理由 |
| score | DECIMAL(5,4) | 推荐评分 |
| is_clicked | TINYINT | 是否点击 |
| is_accepted | TINYINT | 是否接受 |

### 8. 购物车相关表

#### cart_items（购物车表）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | BIGINT | 主键 |
| user_id | BIGINT | 用户 ID |
| recipe_id | BIGINT | 菜谱 ID |
| quantity | INT | 数量 |
| special_notes | VARCHAR(255) | 特殊要求 |
| created_at | DATETIME | 创建时间 |
