# B/C 用户注册与模型分组隔离开发计划

状态：已完成本地开发与 SQLite 联调，尚未发布正式环境
编写日期：2026-08-31
本地实施日期：2026-08-31
前端迁移验证日期：2026-09-01
适用范围：`new-api-kkai` 后端与 `new-api-kkai/web/default` 用户前端

## 1. 背景与目标

注册时需要区分 B 端和 C 端用户。两类用户本质上都是普通用户，拥有相同的账户、余额、订阅和后台功能权限；差异仅在于登录后台后可见、可选择、可调用的模型分组不同。

目标如下：

- 注册页支持选择个人用户（C 端）或企业用户（B 端）。
- B/C 用户继续使用同一个普通用户角色，不新增权限角色。
- C 端只能看到并调用通用模型和 C 端模型。
- B 端只能看到并调用通用模型和 B 端模型。
- 前端展示、模型价格、令牌分组和实际中转请求使用同一套服务端访问策略。
- 订阅升级、到期或用户等级变化不能覆盖 B/C 身份。
- 历史用户保持兼容，默认归为 C 端。
- 支持 SQLite、MySQL 5.7+ 和 PostgreSQL 9.6+。

## 2. 已确认的当前状态

### 2.1 当前账户与分组体系

系统当前存在四个权限角色：

| 角色  | 数值 | 用途           |
| ----- | ---: | -------------- |
| Guest |    0 | 访客或最低权限 |
| User  |    1 | 普通用户       |
| Admin |   10 | 管理员         |
| Root  |  100 | 超级管理员     |

密码注册目前统一创建 `RoleCommonUser`，没有 B/C 字段。`users.group` 当前默认是 `default`，并参与用户等级、倍率、令牌分组和模型渠道路由。

订阅计划支持在购买后修改 `users.group`，到期后再回退。因此不能直接使用 `users.group` 永久记录 B/C 身份，否则用户购买 VIP 等套餐后会丢失原客户类型。

### 2.2 当前模型分组链路

系统已有以下能力：

- 根据用户分组计算可用模型分组。
- `/api/user/self/groups` 返回用户可选择的分组。
- `/api/user/models` 返回用户可见模型。
- `/api/pricing` 根据可用分组过滤价格与模型。
- 令牌鉴权会验证令牌分组是否属于用户可用分组。
- distributor 在真正选择渠道前会验证请求分组。
- 自动分组、图片工作室、视频工作室也依赖同一组分组配置。

本需求应扩展这套服务端链路，不能只在前端隐藏菜单或模型。

### 2.3 2026-08-31 本地运行环境记录

当时本地运行状态为：

| 层级                                     | 实际目标                               |
| ---------------------------------------- | -------------------------------------- |
| `localhost:4174` 的 `/api`、`/mj`、`/pg` | `http://localhost:3000`                |
| 本地后端模型渠道                         | 0 个                                   |
| 开发环境公共价格兜底                     | `https://omnitoken.online/api/pricing` |

当时本地数据库中 `channels`、`abilities`、`models` 均为空。本地 `/api/pricing` 返回空模型列表，但开发前端会在列表为空时请求线上公开价格数据。

该兜底可能绕过 B/C 模型展示验证：如果服务端过滤后返回空列表，前端仍可能显示线上公开数据。因此实施本需求时必须限制或关闭登录状态下的远程兜底。

> 本节仅记录当时的本地调试环境，不代表生产渠道配置。临时数据库路径和进程状态不作为长期配置依据。

## 3. 核心架构决策

### 3.1 四个独立维度

| 维度     | 字段或配置     | 职责                 | 示例                     |
| -------- | -------------- | -------------------- | ------------------------ |
| 权限角色 | `role`         | 后台功能权限         | user/admin/root          |
| 客户类型 | `account_type` | B/C 产品分群         | consumer/business        |
| 用户等级 | `group`        | 订阅、倍率、套餐升级 | default/vip/svip         |
| 模型分组 | 渠道与模型分组 | 模型目录和路由       | shared/consumer/business |

推荐默认值：

```text
C 端：role=user, account_type=consumer, group=default
B 端：role=user, account_type=business, group=default
```

### 3.2 最终可用分组算法

新增客户类型模型分组白名单，例如：

```json
{
  "consumer": {
    "shared": "通用模型",
    "consumer": "个人用户模型"
  },
  "business": {
    "shared": "通用模型",
    "business": "企业用户模型"
  }
}
```

最终可用分组采用交集计算：

```text
现有用户等级可用分组
        ∩
客户类型模型分组白名单
        =
最终可用模型分组
```

伪代码：

```go
entitlementGroups := resolveGroupsByUserGroup(user.Group)
catalogGroups := resolveGroupsByAccountType(user.AccountType)
usableGroups := intersectGroups(entitlementGroups, catalogGroups)
```

设计原则：

- `shared` 通过同时出现在两份白名单中实现共享，不增加魔法逻辑。
- `group` 继续决定订阅和倍率，不承担 B/C 身份职责。
- `account_type` 决定模型目录的最大边界。
- 开启 B/C 隔离后，配置缺失或非法应失败关闭，不能返回全量模型。
- 历史空值或未知值按最低权限 `consumer` 处理。
- 标记为 `all` 的模型视为所有客户类型共享；需要隔离的模型不能配置为 `all`。

## 4. 后端开发计划

### 4.1 数据模型与常量

在 `model.User` 增加：

```go
AccountType string `json:"account_type" gorm:"type:varchar(16)"`
```

定义稳定常量：

```go
const (
    AccountTypeConsumer = "consumer"
    AccountTypeBusiness = "business"
)
```

新增统一方法：

- `NormalizeAccountType`
- `ValidateAccountType`
- `EffectiveAccountType`

规则：

- 新用户未传时默认 `consumer`。
- 显式传入未知值时返回参数错误。
- 历史空数据在读取时按 `consumer` 处理。
- 所有用户创建入口在 `prepareForInsert` 中做最终规范化。
- 不使用数据库 CHECK 枚举约束，以保持三种数据库兼容。

### 4.2 显式数据库迁移

在现有 KKAI migration catalog 增加 v9，例如 `user_account_type`。

迁移任务：

1. 为 `users` 添加兼容回滚的 `account_type` 列。
2. 将历史 `NULL`、空字符串回填为 `consumer`。
3. 增加 schema readiness 验证。
4. 为 SQLite、MySQL、PostgreSQL 分别提供合法迁移语句。
5. 增加 migration catalog、checksum、重复执行和回填测试。

生产环境不能只依赖 GORM `AutoMigrate`。迁移应采用先扩展 schema、再启用功能的两阶段流程。旧版本应用会忽略新增列，回滚时保留该列，不执行破坏性删列。

如用户量较大，`account_type` 索引应根据管理员筛选查询频率单独评估，避免在首个版本中引入不必要的在线建索引风险。

### 4.3 用户缓存与请求上下文

在 `UserBase` 增加 `AccountType`，并完成：

- `userCacheSchemaVersion` 从 1 升到 2。
- 更新 Redis Hash 的写入、读取和 Lua 参数。
- 更新 `User.ToBaseUser`。
- 新增 `ContextKeyUserAccountType`。
- dashboard session 和 API token 鉴权都写入有效客户类型。
- 管理员修改客户类型后清理用户缓存及其全部令牌缓存。

缓存更新是访问控制的一部分，不能等待 TTL 自然过期。

### 4.4 注册 DTO 与密码注册

新增专用注册 DTO，不再直接把整个 `model.User` 当作客户端请求模型：

```go
type RegisterRequest struct {
    Username         string `json:"username"`
    Email            string `json:"email"`
    Password         string `json:"password"`
    VerificationCode string `json:"verification_code"`
    AffCode          string `json:"aff_code"`
    AccountType      string `json:"account_type"`
}
```

处理流程：

```text
解析 DTO
→ 校验并规范化 account_type
→ 缺省 consumer
→ 写入 cleanUser.AccountType
→ 继续使用普通用户角色创建账户
```

安全要求：

- 客户端不能直接指定 `group`、`role` 或任意模型分组。
- B/C 选择只映射到受控的 `account_type` 枚举。
- 非法类型返回明确的参数错误。
- 管理员创建用户、OAuth、微信和 Telegram 等入口也必须经过同一缺省逻辑。

### 4.5 OAuth 与第三方注册

标准 OAuth 流程调整：

```text
注册页选择 B/C
→ 获取 OAuth state 时提交 account_type
→ 服务端校验并写入 pending session
→ OAuth 回调只在创建新用户时使用
→ 创建完成或失败终止后清理 pending 值
```

约束：

- 已存在用户 OAuth 登录时绝不能覆盖原客户类型。
- 从注册页发起的 OAuth 必须保留 B/C 选择。
- 从普通登录页隐式创建的未知 OAuth 用户默认 C 端，或后续通过产品开关禁止隐式注册。
- 微信、Telegram 等非标准 OAuth 入口需要明确支持选择，或明确按 C 端注册，不能产生空值。

### 4.6 客户类型配置

新增系统配置：

```text
AccountTypeSegmentationEnabled
AccountTypeGroupMapping
```

建议新增独立 setting 模块负责：

- 解析 JSON。
- 深拷贝读取。
- 校验只包含已知客户类型。
- 校验分组存在于当前 `GroupRatio`。
- 校验 consumer/business 均有配置。
- 在启用功能前拒绝空白名单。

功能开关关闭时保持旧行为；开关开启后严格执行客户类型白名单，不允许因配置缺失退回全量模型。

### 4.7 分组访问策略服务

引入统一访问上下文：

```go
type UserAccessProfile struct {
    UserGroup   string
    AccountType string
}
```

统一提供：

```go
ResolveUserUsableGroups(profile)
IsGroupAllowed(profile, requestedGroup)
ResolveUserAutoGroups(profile)
```

所有控制器和中间件必须调用该服务，禁止各处自行判断 `account_type == business`。

### 4.8 服务端展示接口

以下接口必须使用最终可用分组：

- `/api/pricing`
- `/api/user/self/groups`
- `/api/user/models`
- `/api/kkai/group-status`
- `/v1/models`
- 图片工作室模型与专用令牌
- 视频工作室模型与专用令牌

未登录公共价格页建议按 C 端或显式 public 白名单处理。登录后的价格接口必须按实际账户类型过滤。

### 4.9 令牌与实际中转鉴权

必须覆盖：

- TokenAuth 中令牌分组合法性验证。
- Playground 手工指定 `group`。
- 自动分组选择。
- `/v1/models` 的分组选择。
- 图片、视频工作室分组。
- distributor 选择渠道前的最终校验。

推荐在鉴权完成后把最终允许分组集合写入 Gin Context，后续只使用该集合验证请求。不能把当前 token group 当作用户原始等级再次计算权限。

安全验收要求：即使用户手工构造请求、修改前端状态或使用旧令牌，也不能访问另一客户类型的模型分组。

### 4.10 `/api/models` 暴露面复核

当前 `/api/models` 对普通登录用户返回 `channelId2Models`。实施时需要确认实际消费者：

- 如果只供管理员使用，提升为管理员权限。
- 如果普通用户仍需使用，按最终允许分组过滤。
- 不能向普通用户继续返回全部渠道模型名称。

### 4.11 管理员修改客户类型

建议新增独立接口：

```http
PUT /api/user/:id/account-type
```

请求示例：

```json
{
  "account_type": "business"
}
```

处理要求：

- 校验管理员对目标用户的管理权限。
- 在事务中更新单一字段。
- 清理用户缓存和全部令牌缓存。
- 记录 `user.account_type.update` 审计事件，包含修改前后值。
- 普通用户不能通过个人资料接口修改客户类型。

## 5. 前端开发计划

### 5.1 注册表单

在当前新版注册页增量增加客户类型选择，不能覆盖已有未提交的登录注册 UI 修改。

推荐文案：

```text
个人用户
适合个人创作者和开发者

企业用户
适合团队和企业业务
```

交互规则：

- 默认选择个人用户。
- 支持 `/sign-up?account_type=consumer` 和 `/sign-up?account_type=business`。
- 使用 TanStack Router `validateSearch` 校验查询参数。
- React Hook Form + Zod 校验枚举。
- 注册 payload 增加 `account_type`。
- OAuth state 请求同步携带选择。
- 切换类型不能清空已填写的邮箱、验证码和密码。
- 所有新增文案进入现有国际化文件。

### 5.2 前端类型

同步更新：

- `RegisterPayload`
- `AuthUser`
- `User`
- 管理员用户表单与查询类型

`/api/user/self` 和登录结果应返回 `account_type`。前端只用它显示身份、预选入口或埋点，模型安全过滤仍以服务端返回结果为准。

### 5.3 管理后台

增加：

- 用户列表客户类型列。
- consumer/business 筛选。
- 用户编辑页修改客户类型。
- 修改成功后刷新用户列表和详情。
- 模型分组设置页的 C 端、B 端可用分组多选器。
- shared 分组可同时选入两端。
- 保存前校验空配置、未知分组和无效 JSON。

### 5.4 开发环境公共数据兜底

当前开发环境在本地价格为空时请求线上公开价格数据。应调整为以下方案之一：

- 登录状态永远不启用远程兜底；或
- 增加 `VITE_ENABLE_PUBLIC_DATA_FALLBACK=false`；或
- 只允许未登录公开演示页使用兜底。

B/C 验收必须使用本地 fixture 渠道和模型，不能用线上公开价格兜底作为验证数据。

## 6. 测试计划

### 6.1 后端测试

注册与账户：

1. 未传 `account_type` 时注册为 consumer。
2. consumer/business 注册分别写入正确值。
3. 非法值返回参数错误。
4. 客户端伪造 `group`、`role` 不生效。
5. 管理员创建用户默认值正确。

OAuth：

1. 新 OAuth 用户继承注册页选择。
2. 已有 OAuth 用户登录不修改客户类型。
3. pending session 不会串到下一次注册。
4. 非标准 OAuth 入口不会产生空客户类型。

分组与模型：

1. C 端返回 shared + consumer。
2. B 端返回 shared + business。
3. `/api/pricing`、`/api/user/models`、`/api/user/self/groups` 结果一致。
4. `/v1/models` 不泄漏其他客户类型模型。
5. 自动分组不跨越客户类型边界。
6. `all` 模型按共享模型处理。

实际调用：

1. C 端伪造 business token group 返回 403。
2. B 端伪造 consumer token group 返回 403。
3. Playground 手工修改 group 返回 403。
4. 旧令牌在管理员修改客户类型后立即受新策略约束。

订阅与缓存：

1. VIP 升级、到期只修改 `group`，不修改 `account_type`。
2. 用户缓存 schema 升级后不会读取旧缓存。
3. 管理员修改后用户缓存和令牌缓存立即失效。

数据库：

1. SQLite、MySQL、PostgreSQL 迁移语句均通过。
2. 历史用户正确回填 consumer。
3. migration catalog checksum 和幂等验证通过。
4. 新版本可以运行在扩展后的 schema，旧版本可以忽略新增列回滚运行。

### 6.2 前端测试

- 注册页默认选择 consumer。
- URL 可以预选 business。
- 非法查询参数回退 consumer。
- 注册请求包含正确 `account_type`。
- OAuth state 包含正确类型。
- 切换类型不清空表单。
- 管理员编辑和筛选行为正确。
- 移动端和桌面端布局正常。
- 所有支持语言包含新增键。
- 登录用户不会触发远程公共价格兜底绕过分组。

### 6.3 端到端验收矩阵

测试环境准备：

```text
shared-model
consumer-only-model
business-only-model
```

| 场景                | C 端                 | B 端                 |
| ------------------- | -------------------- | -------------------- |
| shared-model        | 可见、可调用         | 可见、可调用         |
| consumer-only-model | 可见、可调用         | 不可见、调用返回 403 |
| business-only-model | 不可见、调用返回 403 | 可见、可调用         |
| 购买 VIP 后         | account_type 不变    | account_type 不变    |
| 重新登录后          | account_type 不变    | account_type 不变    |
| 伪造前端状态        | 服务端拒绝越权       | 服务端拒绝越权       |

## 7. 实施顺序与交付拆分

### 工作包 A：Schema 与领域模型

- 新增 `account_type`、常量、规范化逻辑。
- 增加 v9 migration 和三数据库测试。
- 更新 UserBase、Redis 缓存和请求 Context。

完成标准：历史用户可安全读取为 consumer，新老应用具备 schema 回滚兼容性。

### 工作包 B：注册与 OAuth

- 新增注册 DTO。
- 完成密码注册、OAuth、管理员创建等入口。
- 返回 `account_type` 到登录和 self API。

完成标准：所有创建入口都能产生合法且稳定的客户类型。

### 工作包 C：访问策略与中转安全

- 新增 AccountTypeGroupMapping 配置。
- 重构统一分组策略。
- 接入价格、模型、分组、令牌、自动分组和 distributor。
- 复核 `/api/models` 暴露面。

完成标准：不能通过任何服务端入口越权访问另一客户类型模型。

### 工作包 D：注册 UI 与管理后台

- 新版注册页增加 B/C 选择。
- OAuth 请求透传选择。
- 用户列表、筛选、编辑和系统配置 UI。
- 完成国际化、类型检查和 lint。

完成标准：用户和管理员均可完成完整操作，前端不承担安全决策。

### 工作包 E：集成验证与上线准备

- 建立本地 B/C fixture。
- 关闭登录状态远程价格兜底。
- 跑后端、前端和 E2E 验收矩阵。
- 准备迁移前检查、上线观测和回滚步骤。

完成标准：展示和真实调用结果一致，迁移及回滚路径已验证。

## 8. 上线计划

推荐顺序：

1. 发布 v9 扩展迁移能力，B/C 功能开关保持关闭。
2. 执行 schema 扩展并回填历史用户为 consumer。
3. 验证用户总数、空值数和非法值数。
4. 部署支持 `account_type` 但仍保持旧分组行为的后端。
5. 配置 shared、consumer、business 渠道和模型分组。
6. 配置 AccountTypeGroupMapping。
7. 部署新版注册页和管理后台。
8. 使用内部 B/C 测试账号开启并验证。
9. 验证模型列表、价格、令牌、自动分组和真实调用。
10. 全量开启注册区分并观察错误指标。

建议监控：

- 分组访问拒绝数量。
- `no valid upstream channel` 数量。
- B/C 用户注册比例。
- 未知或空 `account_type` 数量。
- `/api/pricing` 空列表比例。
- TokenAuth 和 distributor 分组拒绝差异。
- Redis 用户缓存 schema miss 数量。

## 9. 回滚方案

发生问题时：

1. 关闭 `AccountTypeSegmentationEnabled`。
2. 前端隐藏 B/C 选择，注册回到默认 consumer。
3. 恢复旧的可用分组计算逻辑。
4. 保留 `account_type` 数据库列和已写入数据。
5. 不删除列、不反向迁移用户数据。
6. 如问题仅为模型配置，回滚 AccountTypeGroupMapping 和渠道分组即可，无需回滚用户表。

## 10. 产品决策默认值

本计划按以下默认决策编写：

- B 端允许用户在注册时自行选择并立即生效。
- 历史用户全部归入 C 端。
- 未登录公开模型页按 C 端或 public 白名单展示。
- shared 模型同时对 B/C 开放。
- 管理员管理页面可以查看全部模型，但普通用户视角和 API token 仍执行账户类型限制。

如果 B 端涉及合同、销售审核或专属价格，后续应增加 `business_pending` 状态和独立审核流程，不建议把审核状态混入本次基础模型隔离实现。

## 11. 粗略工期

| 工作内容                     |      预估 |
| ---------------------------- | --------: |
| Schema、模型与缓存           | 1～1.5 天 |
| 注册、OAuth 和管理接口       | 1～1.5 天 |
| 分组策略与中转鉴权           | 1.5～2 天 |
| 注册 UI 和管理后台           | 1～1.5 天 |
| 三数据库测试、E2E 和上线准备 | 1～1.5 天 |

合计约 5～7 个开发日，不包含 B 端企业资料、人工审核和销售审批流程。

## 12. 本地实施与验证记录

本轮已按工作包 A～E 完成本地实现，并将误写在旧 `link_ai/web/default` 中的 B/C 前端能力按功能合并到实际项目 `new-api-kkai/web/default`。未执行生产构建发布、生产数据库迁移或正式环境配置变更。

已完成内容：

- `users.account_type`、consumer/business 常量、写入校验、历史数据读取兜底。
- KKAI v9 扩展迁移、历史用户回填、三数据库方言语句、catalog checksum 和运行时 schema 契约。
- UserBase/Redis cache schema v2、Session/Token 请求上下文和缓存失效。
- 密码注册、标准 OAuth、微信新用户、管理员创建与管理员独立修改接口；所有入口继续创建普通用户，客户端不能伪造 role/group。已有第三方账号登录不覆盖原客户类型，Telegram 登录不附加未签名参数。
- `AccountTypeSegmentationEnabled` 和 `AccountTypeGroupMapping` 系统配置；开关默认关闭，配置缺失时失败关闭。
- 统一访问策略接入用户分组、定价、模型列表、令牌、自动分组、Playground、Studio token 和实际渠道选择。
- `new-api-kkai/web/default` 新版注册页 B/C 选择、注册链接预选、OAuth/微信注册透传、管理员列表/筛选/编辑、系统分组配置和多语言文案。
- 保留 `new-api-kkai` 前端已有的 Telegram、微信、新版鉴权 UI、Studio 模块和测试，不使用旧前端整目录覆盖。该前端当前没有旧项目中的线上价格兜底逻辑。

本地验证结果：

| 验证项                   | 结果                                                                   |
| ------------------------ | ---------------------------------------------------------------------- |
| 后端全量 `go test ./...` | 通过                                                                   |
| v9 migration apply/check | 在本地 SQLite 副本通过，重复执行和冷启动通过                           |
| 历史用户回填             | NULL/空值回填 consumer，通过                                           |
| 注册 API                 | consumer/business 正确持久化；非法类型拒绝；role/group 伪造无效        |
| 登录响应                 | 返回稳定的 `account_type`                                              |
| 分组隔离                 | C=`shared + consumer-models`，B=`shared + business-models`             |
| 模型隔离                 | C 请求 B 模型组为空，B 请求 C 模型组为空                               |
| 管理员修改类型           | 修改后策略立即切换；普通用户接口调用被拒绝                             |
| 注册页浏览器验证         | 默认 consumer、URL 预选 business、非法参数回退 consumer，控制台无错误  |
| 管理后台浏览器验证       | 用户列表显示/筛选账号类型；分组定价页显示 B/C 白名单并正确回显本地配置 |
| 前端全量 typecheck       | 通过                                                                   |
| 前端全量测试             | 82 个测试文件、457 条测试全部通过                                      |
| 前端构建                 | `bun run build` 通过                                                   |
| i18n 与格式              | i18n 契约通过；本次涉及的 32 个前端文件格式检查通过                    |
| lint                     | 仓库全量 lint 仍受既有规则错误阻塞；本次新增代码未出现新的 lint 报错   |

当前本地联调地址：

- 用户前端：`http://localhost:4174/`，进程目录为 `new-api-kkai/web/default`
- 后端 API：`http://localhost:3000/`
- 后端使用 `/tmp/omnitoken-bc-local.D7e4TZ/one-api.db` 临时 SQLite 副本，未修改正式数据源。

发布前仍需在独立测试环境完成 MySQL/PostgreSQL 实例迁移演练、真实上游调用和生产观测/回滚演练；这些动作不属于本轮本地验证范围。
