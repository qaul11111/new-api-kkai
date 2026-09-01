# NewAPI 用户后台新 UI 功能保留与改造计划

> 目标仓库：`new-api-kkai`，审计基线 `ad4ef773c`（2026-08-31）
> 新 UI 来源仓库：`link_ai`，基线 `7868e694a` + 当前未提交工作区（迁移前必须单独保存快照）
> 旧功能基线：`web/classic`
> 功能实现目标：`new-api-kkai/web/default`
> 范围：普通用户可见的认证入口、用户后台及其必要的公共依赖；不改超级管理员界面。

## 1. 目标与结论

本计划不是在 `new-api-kkai` 里重新设计一套 UI。`link_ai` 是用户后台新视觉及已改页面的迁移来源；`new-api-kkai` 是唯一最终运行、测试和交付目标。实施方式必须是“先合并 `link_ai` 已完成的视图和素材，再把 `new-api-kkai`/Classic 的完整功能 controller 接回这些视图”，避免重复做同一批样式。

双仓库审计显示：公开页和登录/注册 LinkAI 风格已经进入 `new-api-kkai`；但用户后台壳层、侧栏、Dashboard、API Keys、用量日志、钱包等已改界面仍只存在于 `link_ai`。2026-08-31 的逐文件哈希盘点确认 `link_ai` 当前独有 `features/linkai-console` 下 14 个源码文件（含 1 个 CSS）和 22 个 `public/figma/linkai-console` 素材，目标仓库对应路由仍使用原 `AuthenticatedLayout`、`Dashboard`、`ApiKeys`、`UsageLogs`、`Wallet`。因此不能把 `link_ai` 视为已完成迁移或删除。

迁移后仍不能直接判定“已保留 95%”，因为还要处理以下高影响功能契约：

1. LinkAI 登录/注册页没有完整暴露原有 OAuth 与微信/Telegram 入口，且部分后端开关未正确反映到界面。
2. 多个旧地址没有兼容跳转，旧书签、邮件链接和外部集成可能失效；`/reset` 的语义还与旧版冲突。
3. Playground 缺少旧版高级请求体、调试/SSE、配置导入导出和图片 URL 等能力；新 UI 中附件、搜索入口目前只是提示，不执行功能。
4. 个人资料中的 Telegram 绑定仍是静态占位。
5. 绘图/任务日志的显示与访问还需同时遵守旧版功能开关和侧栏模块配置。
6. `/dashboard/users` 只在导航层隐藏，普通用户仍可直接访问并触发管理员 API。
7. 模型详情的 Performance 已接真实指标 API，但 API 页仍在展示根据模型名推导的“支持参数”和“速率限制”；另有未挂载的模拟应用排行组件。正式用户界面不能把推导/模拟值当成真实配置。

因此，实施策略调整为“冻结 `link_ai` 工作区 → 合并已改用户后台 → 接回并验证 P0 功能 → 补剩余页面 → 全量视觉与功能验收”，并使用可计数的功能矩阵作为 95% 的唯一判定依据。

## 2. 范围边界

### 包含

- 登录、注册、找回/重置密码、2FA、Passkey、OAuth、法律条款、Turnstile。
- 用户后台壳层、侧栏、移动端导航、通知、语言和主题。
- Dashboard、API Keys、普通/绘图/任务日志、钱包、充值、支付、订阅购买、邀请返利、个人资料、Playground、聊天预设。
- 普通用户可用的新功能：分组状态、图片工作室、视频工作室。
- 与上述流程直接相关的公共页和深链接兼容，例如模型价格页、协议页、OAuth 回调和旧 `/console/*` 地址。

### 不包含

- 超级管理员界面的视觉重构和信息架构调整。
- 管理员渠道、模型、用户、兑换码、订阅配置、系统设置、系统信息等页面的功能改造。
- 新业务能力扩张。新增功能不能用来抵消旧功能缺失。

如果必须修改共享组件，需以普通用户界面为目的，并增加管理员路由冒烟测试，确保管理员界面没有被顺带重排或换肤。

## 3. 新 UI 视觉基线与迁移原则

用户后台目标样式以 `link_ai/web/default` 当前工作区为准，而不是以 `new-api-kkai` 尚未换肤的后台页面为准：

- 优先迁移 `features/linkai-console/**`、对应 `_authenticated` 路由接线和 `public/figma/linkai-console/**` 原始素材；禁止先在目标仓库重新临摹一套相似界面。
- `link_ai` 提供视图结构、布局、样式和素材；`new-api-kkai` 当前 controller/hooks/API、权限守卫、状态开关和本轮修复提供功能来源。不能用较简化的 `link_ai` 业务逻辑覆盖目标仓库更完整的功能。
- 迁移采用“View + Adapter”方式：保留 `link_ai` 的页面外观，把目标仓库现有真实数据、表单、Dialog、DataTable 和动作通过 adapter/controller 接入。
- 复用双方已有 Base UI、Tailwind token、圆角、间距、阴影、动效和主题能力，不引入第二套组件库。
- 用户后台壳层、侧栏、空间切换器、页面容器和移动端布局先统一迁移，再迁移各页面，避免每个页面重复造壳。
- 认证页沿用 LinkAI 深色背景、胶囊按钮、紫色强调和现有素材；只替换/补齐功能控制器，不回退旧版样式。
- 同一动作在桌面端、移动端、命令菜单和个人下拉菜单中使用同一权限与功能开关判断。
- 新增文案进入现有 7 个 locale；中文和英文完整验收，其余语言至少通过 key 完整性检查且不显示原始 key。
- 键盘焦点、对比度、错误提示、加载/空状态以及减少动态效果遵守当前组件规范。

### 3.1 `link_ai` 的保留规则

- 迁移完成前，`link_ai` 作为只读视觉来源和回退依据保留；可以停止其本地开发服务，但不得删除目录或未提交改动。
- 迁移开始前先保存 `link_ai` 当前 16 项未提交改动（提交到临时分支或导出 patch），并记录文件清单和素材校验值。该快照已生成于 `.codex/migration-snapshots/20260831-linkai-console-baseline/`，包含双仓库 binary diff、未跟踪文件归档、路径清单和 SHA-256。
- 只有当独有源码/素材已进入 `new-api-kkai`、目标路由已切换、功能矩阵与视觉验收通过、并完成 Git 备份后，才能标记 `link_ai` 为可归档。

## 4. 当前页面级审计

| 功能域                         | 当前判断                       | 已保留内容                                                                                 | 主要缺口                                                                                                  | 处理优先级 |
| ------------------------------ | ------------------------------ | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- | ---------- |
| 登录/注册/找回密码             | 不完整                         | 密码、邮件验证码、Turnstile、法律同意、2FA、Passkey 主流程                                 | OAuth 渠道不全；微信/Telegram 缺失；注册字段语义改变；系统开关和自用模式显示不完整                        | P0         |
| 旧链接与回调                   | 不完整                         | `/register`、`/console/log`、`/console/topup` 已有兼容                                     | `/login`、多数 `/console/*`、`/forbidden` 缺失；`/reset` 语义冲突                                         | P0         |
| 权限与功能开关                 | 部分完成                       | 登录态、侧栏模块、主要管理员路由有守卫                                                     | 绘图/任务开关组合；`/dashboard/users` 缺少路由级管理员守卫                                                | P0         |
| 后台壳层/侧栏                  | `link_ai` 已改、目标仓库迁移中 | `LinkAiAuthenticatedLayout`、控制台侧栏、空间切换器及响应式壳层                            | 迁入 22 个素材；导航数据必须继续复用目标角色、侧栏配置与功能开关，管理员路由保持原壳层                    | P0/M1      |
| Dashboard                      | 概览与数据看板已迁入新风格     | LinkAI 概览、摘要卡片、模型用量、公告面板、目标仓库完整筛选与图表                          | 补齐 FAQ、API 信息、Uptime 及组合空/错状态验收；继续保留管理员守卫                                        | P0/M1      |
| API Keys                       | `link_ai` 已改、目标仓库未迁   | LinkAI 表格、页面和专用样式                                                                | 以目标仓库完整 CRUD/批量/限制/聊天/CC Switch controller 为准接回，不允许功能倒退                          | P0/M1      |
| 用量/绘图/任务日志             | `link_ai` 已改、目标仓库未迁   | LinkAI 普通日志界面                                                                        | 合并视觉后保留三类日志、全部筛选/统计/详情、功能开关与直达守卫                                            | P0/M1      |
| 钱包/充值/支付/订阅            | `link_ai` 已改、目标仓库未迁   | LinkAI 钱包界面                                                                            | 合并视觉后接回余额、兑换、账单、转账、邀请、五类支付和订阅全流程                                          | P0/M1      |
| 个人资料/安全                  | 部分完成                       | 密码、邮箱/微信/OAuth、访问令牌、Passkey、2FA/备份码、签到、通知、语言、删除账户、侧栏偏好 | Telegram 绑定是占位；需回归安全验证链                                                                     | P0/P1      |
| Playground                     | 不完整                         | 模型/分组、常用参数、流/非流、消息编辑/复制/删除/重试、清空与本地持久化                    | 自定义 JSON 请求体、请求/响应/SSE 调试、配置导入导出、图片 URL/多模态；附件和搜索是假入口                 | P0/P1      |
| 聊天预设                       | 基本完成                       | Web/协议型预设、密钥注入、占位符替换、错误态                                               | 旧 `/console/chat/:id?`；iframe 主题/语言同步需补回                                                       | P1         |
| 通知/主题/语言                 | 基本完成                       | 公告/通知、已读状态、主题配置、7 语言                                                      | 跨入口开关一致性、移动端和无障碍回归                                                                      | P2         |
| 模型价格/公共依赖              | 有上线风险                     | 真实模型与价格、筛选、详情，以及真实 Performance 指标                                      | API 页的支持参数/速率限制由规则推导；未挂载组件还包含模拟应用排行。无真实来源时应隐藏或明确显示“暂无数据” | P0         |
| 分组状态/邀请/图片与视频工作室 | 已实现的新能力                 | 路由、权限、API 和主要操作已有实现；分组状态已接入 LinkAI 用户后台视觉                     | 不纳入旧功能保留分子，只做回归，不能抵消旧功能缺口                                                        | P2         |

## 5. 已确认的功能缺口

### 5.1 认证能力完整性

新 LinkAI 认证页应继续使用现有视觉，但把已有的通用认证逻辑抽成无样式 controller/hook，再由 LinkAI 组件渲染，避免复制两套业务逻辑。

必须补齐：

- 按 `/api/status` 动态显示 GitHub、Discord、OIDC、LinuxDO、微信、Telegram 和 `custom_oauth_providers`，未配置的渠道不展示无效按钮。
- OIDC 是通用提供方，不能固定标成 Google；显示配置名称或“OIDC”。
- Telegram 登录/绑定接回真实 widget 和 `/api/oauth/telegram/login`、`/api/oauth/telegram/bind` 流程，删除“coming soon”与静态占位。
- 微信恢复二维码、验证码提交及错误/加载状态。
- 登录页遵守 `password_login_enabled`、`passkey_login` 和设备支持状态。
- 注册入口和页面遵守 `register_enabled`、`self_use_mode_enabled`、`password_register_enabled`、`oauth_register_enabled`。
- 恢复旧版注册字段契约：独立用户名、密码、确认密码；仅在要求邮件验证时强制邮箱和验证码。不能始终把邮箱同时写入 username。
- 所有认证方式统一执行法律条款同意、Turnstile、OAuth state、防重复点击、affiliate code 保留和成功后的 redirect。

### 5.2 旧链接兼容层

新增薄路由，仅做 301/应用内 replace 跳转并保留合法 query/hash：

| 旧地址                      | 新地址/行为                                                                              |
| --------------------------- | ---------------------------------------------------------------------------------------- |
| `/login`                    | `/sign-in`                                                                               |
| `/register`                 | `/sign-up`（已存在，补测试）                                                             |
| `/console`                  | `/dashboard/overview`                                                                    |
| `/console/token`            | `/keys`                                                                                  |
| `/console/playground`       | `/playground`                                                                            |
| `/console/personal`         | `/profile`                                                                               |
| `/console/log`              | `/usage-logs/common`                                                                     |
| `/console/midjourney`       | `/usage-logs/drawing`                                                                    |
| `/console/task`             | `/usage-logs/task`                                                                       |
| `/console/topup`            | `/wallet`（已存在，保留 query）                                                          |
| `/console/chat/:id`         | `/chat/:id`                                                                              |
| `/forbidden`                | `/403`                                                                                   |
| `/user/reset?email=&token=` | 保持重置确认页                                                                           |
| `/reset`                    | 有合法 `email+token` 时进入确认页，否则跳 `/forgot-password`，兼容旧版“发起找回密码”语义 |

OAuth 回调、支付回跳和邮件链接必须以真实 URL 做 E2E，不能只验证组件跳转。

### 5.3 权限和开关联动

- 普通用户直达 `/dashboard/users` 时，在路由 `beforeLoad` 阶段跳转 `/403`，组件不得挂载、不得请求 `/api/data/users`。
- 绘图和任务日志同时受 `enable_drawing`/`enable_task`、`SidebarModulesAdmin` 和用户 `sidebar_modules` 约束；导航、命令菜单、直达路由使用同一判断。
- 图片/视频工作室继续遵守各自 access mode；钱包、邀请、签到、Passkey 和支付渠道继续遵守 status/permission 配置。
- 任何“导航里隐藏、URL 仍可执行”的权限都判失败。

### 5.4 Playground 功能回补

保留新 Playground 布局，按以下顺序补回旧版能力：

1. 自定义请求 JSON 编辑器：格式化、校验、重置，并与可视化 messages/parameters 双向同步。
2. 调试面板：请求 URL、headers、最终 payload、普通响应、错误响应、原始 SSE 事件查看与复制。
3. 配置管理：导入、导出、恢复默认；导入时校验 schema 和版本。
4. 图片 URL/多模态输入，并正确生成兼容的 message content。
5. 清理或完成附件、搜索按钮；正式版本不允许“点击后只弹提示”的假功能。
6. 回归流式 reasoning、停止、重试、编辑后重发、消息删除、模型切换、本地恢复和异常断流。

### 5.5 `link_ai` 已改页面的合并与专项回归

以下页面先迁移 `link_ai` 视图，再用目标仓库 controller 做功能并集；不能直接复制路由后以 `link_ai` 当前较少的功能替换目标实现：

- API Keys：覆盖批量密钥、无限额度/过期时间、模型限制、IP/CIDR、跨分组重试、状态切换、完整 key 获取、聊天预设和 CC Switch；对照旧版补齐或经产品确认替代 FluentRead 的模型选择、prefill 提示与“不再提醒”。
- 日志：覆盖所有筛选字段、分页、列显示、统计、详情弹窗，以及普通用户 self endpoint 与管理员 endpoint 隔离。
- 钱包：覆盖最小充值、预设/折扣、五种支付方式、回跳、账单、兑换、余额转移、邀请收益、订阅购买和账单偏好。
- 个人资料：覆盖安全验证后修改密码/Passkey/2FA、绑定与解绑、备份码、访问令牌、通知通道、签到、删除账户和侧栏设置。
- Dashboard：覆盖日期/模型/分组筛选、图表偏好、无数据、部分接口失败、公告与 Uptime。
- Chat：恢复向 iframe 发送当前 theme 和 language 的 `postMessage`，并测试 Web、custom protocol、FluentRead 等不同预设类型。

### 5.6 数据真实性与占位清理

- `web/default/src/features/pricing/lib/mock-stats.ts` 中的推导/模拟数据不得在生产环境冒充真实数据。当前 Performance 页已经使用真实 `/api` 指标，应保留；API 页的支持参数/速率限制若没有真实后端字段则隐藏或显示“暂无数据”，未挂载的模拟应用排行不得重新接入正式路由。
- 删除或标注未被路由使用的旧认证、旧 Pricing、`ComingSoon` 组件，避免后续审计误把“文件存在”当成“用户可用”。
- 对所有 routed user feature 扫描 `coming soon`、静态 widget、只 toast 的按钮、硬编码成功态和 mock 数据；发现一个即阻断发布。

## 6. 实施分批

### Wave 0：冻结双仓库基线

- 从 `web/classic/src/App.jsx`、旧侧栏、旧页面 actions/hooks、API 调用和 `/api/status` 开关生成原子功能清单。
- 保存 `link_ai` 当前未提交工作区，生成独有源码、路由、素材和 locale 的迁移清单；记录目标仓库对应页面与 controller。
- 每项记录 `ID / 旧入口 / 旧源码 / API 或开关 / 新入口 / 新源码 / 测试 / 状态 / 优先级`。
- 只排除：管理员专属、源码不可达的死代码、经产品确认废弃的功能。排除项必须有证据和审批记录。
- 产物：`user-console-capability-matrix.md`、机器可读 JSON/CSV、`link_ai` 工作区 patch/commit 和逐文件迁移表。

### Wave 1：先合并 `link_ai` 已改用户后台

按以下顺序迁入 `new-api-kkai`：

1. `LinkAiAuthenticatedLayout`、Console Layout、Sidebar、Space Switcher 与 22 个 Figma 素材。
2. Dashboard。
3. API Keys。
4. Usage Logs，并扩展到 Drawing/Task 两类日志。
5. Wallet，并接回充值、支付、账单、邀请和订阅能力。
6. 对照双方未提交认证文件，只吸收尚未进入目标仓库的视觉/交互差异；已完成的目标仓库功能修复不得被覆盖。

完成条件：目标路由已经渲染 LinkAI 视图；普通用户主入口无旧壳混用；页面使用真实 API；Desktop/Tablet/Mobile 截图通过；没有目标仓库原有功能倒退。

### Wave 2：P0 功能并集与上线阻断项

- 完整认证渠道、注册字段与系统开关。
- 旧路由兼容和 reset 语义。
- `/dashboard/users` 路由级权限。
- 绘图/任务日志开关统一。
- Telegram 真实绑定。
- 模拟指标下线或接真实 API。

完成条件：所有 P0 功能用普通用户 E2E 通过，P0 覆盖率 100%，无占位交互、无越权请求。

### Wave 3：高价值功能补齐

- Playground 高级请求、调试/SSE、导入导出、多模态。
- Chat iframe 主题/语言同步与旧深链接。
- 个人资料全部安全链路回归。

完成条件：对应旧版能力逐项有新 UI 实现与自动化测试，旧版可完成而新版不能完成的主路径为 0。

### Wave 4：剩余页面 LinkAI 风格统一与全面回归

- Dashboard、Keys、三类日志、Wallet、Notifications、Sidebar、移动端。
- 合并重复 controller，统一错误、空、加载、确认和成功反馈。
- 修复响应式、键盘、对比度、文本截断和 7 locale 文案问题。

完成条件：功能矩阵总覆盖率达到发布阈值，核心视口无视觉回归。

### Wave 5：灰度、归档与清理

- feature flag 灰度，先内部/测试用户，再小比例普通用户，最后全量。
- 监控登录失败、OAuth 回调失败、充值/支付失败、密钥 CRUD、日志加载和 Playground 错误率。
- 保留旧 UI 快速回退入口至少一个稳定周期；指标稳定后再删除死代码。
- 确认 `link_ai` 独有源码和素材为 0、未提交工作已入库且目标仓库验收通过后，将 `link_ai` 标记为只读归档；归档前不得删除。

## 7. “95% 功能保留”的计量规则

以页面数或文件数计数会掩盖缺失，必须以原子功能用例计数：

```text
功能保留率 = 已通过的新 UI 基线功能用例数 / 适用的旧 UI 基线功能用例总数 × 100%
```

本轮源码盘点先列出了 108 个编号能力。按照本任务“只改用户后台”的边界，明确排除春节装饰按钮、Classic 前端弃用横幅、首次安装向导 3 项，形成 105 项初始验收分母。对应发布门槛是至少 100 项 PASS、最多 5 项未通过；任何 P0 未通过仍然直接阻断发布。

| 基线域           | 适用项数 | 内容摘要                                                             |
| ---------------- | -------: | -------------------------------------------------------------------- |
| A 共享与全局行为 |       13 | 状态、守卫、导航、主题/语言、通知、侧栏、用户菜单、安全验证、i18n 等 |
| B 认证           |       11 | 密码、2FA、Passkey、OAuth、注册、重置、验证、微信/Telegram、协议     |
| C Dashboard      |       10 | 统计、图表、筛选、API 信息、公告、FAQ、Uptime、响应式                |
| D API Keys       |       11 | 表格/筛选、CRUD、批量、真实 key、聊天、FluentRead、CC Switch         |
| E 普通用量日志   |        5 | 数据、筛选、统计、详情、列/分页                                      |
| F 绘图日志       |        3 | 数据、筛选、结果详情                                                 |
| G 任务日志       |        3 | 数据、筛选、音频/内容详情                                            |
| H 钱包/充值/订阅 |       17 | 余额、兑换、五类支付、账单、邀请、订阅购买与偏好                     |
| I 个人资料/安全  |       10 | 基本资料、签到、绑定、令牌、密码、Passkey、2FA、删除、通知、语言     |
| J Playground     |        8 | 请求、模型/分组、参数、流式、自定义 JSON、消息、多模态、调试配置     |
| K Chat           |        3 | iframe、Chat2Link、动态聊天入口                                      |
| L Pricing        |        7 | 数据、搜索、筛选、视图/单位/货币、详情、供应商、响应式               |
| M 公共依赖       |        4 | Home、About、协议、403/404                                           |
| **合计**         |  **105** | **至少 100 PASS，P0 仍须 100%**                                      |

Wave 0 可以把复合项继续拆小，但不得删减功能要求；拆分后分母和向上取整的 95% 门槛同步增加。105 项清单在首个实现 PR 前冻结，后续任何 `EXCLUDED` 都必须由产品负责人明确确认。

计分规则：

- “通过”必须同时具备可达 UI、真实 API/行为、权限与开关正确、自动化测试通过；部分完成按 0 计，不计 0.5。
- 新增功能不进入分子，不能抵消旧功能缺失。
- P0 包括认证、密钥、充值/支付、日志、账户安全、权限和兼容链接，要求 100%，不能被总分 95% 掩盖。
- 全部适用功能要求至少 95%；按当前 105 项分母即至少 100 PASS。剩余未通过项必须全部为 P2/P3，且有明确排期和用户可接受的降级。
- 所有旧 API endpoint、status flag、角色分支和旧深链接都要在矩阵中至少出现一次。

建议矩阵状态仅使用：`PASS / FAIL / BLOCKED / EXCLUDED`。`EXCLUDED` 需要写明理由，不能用于普通用户仍可触发的功能。

## 8. 测试与发布门禁

### 自动化测试

- Vitest/RTL：每个 controller、开关组合、表单验证、错误映射、路由重定向。
- API contract：对比 classic 与 default 使用的普通用户 endpoint/字段，检测漏接、字段改名和 self/admin endpoint 混用。
- Playwright E2E：普通用户固定数据集，覆盖认证、密钥、日志、钱包、个人安全、Playground 和聊天。
- 视觉回归：至少 375、768、1440 三个宽度，light/dark，两种中文/英文长短文案；认证页保留 LinkAI 新视觉。
- a11y：键盘完整操作、焦点可见、Dialog/Drawer 焦点圈、表单 label、错误播报和 WCAG AA 对比度。
- i18n：中文/英文逐页；法语、日语、俄语、越南语、繁体中文执行 key 完整性与布局冒烟。

### 必须覆盖的配置组合

- 普通用户、管理员、超级管理员三种角色；普通用户不得触发管理员 API。
- 注册总开/关、密码登录/注册开/关、OAuth 注册开/关、自用模式。
- 每个 OAuth 提供方单独开启、多个同时开启、全部关闭。
- Turnstile、邮件验证、法律条款、Passkey、签到分别开/关。
- 绘图/任务日志、图片/视频工作室、侧栏管理配置和用户侧栏配置的交叉组合。
- 每个支付渠道单开、无支付渠道、支付成功/取消/失败回跳。

### Release Gate

- P0：100% PASS。
- 总体：至少 95% PASS。
- 旧深链接：100% 可兼容或给出明确迁移页。
- 可见占位/假按钮/生产 mock 指标：0。
- 普通用户越权 API 请求：0。
- `bun run lint`、类型检查、相关 Vitest、Playwright、生产构建全部通过。
- 关键页面在 375/768/1440、light/dark、中文/英文视觉验收通过。

## 9. 交付物

1. 可追踪的用户功能矩阵及覆盖率报告。
2. P0/P1 分批 PR，每个 PR 只处理一个功能域并附矩阵 ID。
3. 自动化测试、视觉基线图和配置组合报告。
4. 上线前验收报告：P0 结果、总覆盖率、未完成项、排除项、回滚方案。
5. 灰度监控结果与旧 UI 下线决定。

## 10. 最终 Definition of Done

只有同时满足以下条件，才能签署“NewAPI 用户后台 95% 以上功能已保留”：

- 普通用户从新 UI 可完成所有 P0 主流程，且行为、参数、错误处理和权限与旧版等价或更好。
- 可计数矩阵的 PASS 比例至少 95%，P0 为 100%。
- 新视觉贯穿所有补齐页面，没有回退旧组件风格或混入另一套设计系统。
- 超级管理员页面没有被改版，普通用户也不能通过 URL 或前端请求触达管理员能力。
- 没有可见占位、假交互和伪造生产数据。
- 自动化、视觉、无障碍、i18n、构建和灰度监控全部通过。

## 11. 实施推进记录

### 第一批：P0 基础修复

状态说明：`TODO / IN_PROGRESS / REVIEW / PASS / BLOCKED / PAUSED`。

| 工作包 | 范围 | 当前状态 | 验收重点 |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W1-A 认证功能完整性 | 保留 LinkAI 登录/注册现有视觉，只补 controller、渠道、字段、开关及 Telegram 绑定 | REVIEW | 最新实现 Run `20260831_130750_796_3c7280cf`；45 个认证测试、类型检查和 i18n 通过；最新规格审查 Run `20260831_132051_728_63af16f2` 为 PASS；质量复审 Run `20260831_134850_634_9149d93a` 确认功能与稳健性问题均已修复，仅剩 7 个 locale 中已失去引用的 Telegram stub 文案清理，尚未取得 clean quality acceptance |
| W1-B 旧路由、权限与日志开关 | 兼容旧地址，修复 `/dashboard/users`，统一绘图/任务日志可见性与直达守卫 | REVIEW | 最新实现 Run `20260831_134107_329_6a85f60e`；106 个定向测试、类型检查和构建通过；管理员 section 判定已统一到 registry，侧栏重复过滤已移除；该最新 Run 的 spec/quality 尚待复审 |
| W1-C Pricing 数据真实性 | 保留真实 Performance，移除正式路由中的推导/模拟参数、速率限制、incident/outage 展示 | REVIEW | 最新实现 Run `20260831_132956_196_76cf7e07`；15 个 Pricing 测试、类型检查和 i18n 通过；最新规格审查 Run `20260831_134102_074_f471ce92` 为 PASS；该最新 Run 的 quality review 尚待执行 |
| W1-D 用户后台壳层迁移 | LinkAI authenticated layout、console layout、sidebar、space switcher、22 个素材；目标导航/权限 controller 保留 | REVIEW | 壳层已迁入 `new-api-kkai`：普通用户路由使用 LinkAI 壳层，管理员/超级管理员路由保持原布局；目标动态聊天、角色/功能开关、通知、语言和用户菜单均已保留。Dashboard 内容区保留空间切换入口，侧边栏顶部的重复入口已移除；底部 C/B 端装饰入口已移除，普通用户与管理员不显示切换入口，只有超级管理员显示“管理员”按钮并沿用原 B 端 `/subscriptions` 跳转进入原管理员壳层。按当前产品要求，用户后台 Search 与 ConfigDrawer 暂时隐藏并停用快捷键入口，公共前台不受影响。相关壳层 31/31 回归测试、typecheck、build、scoped lint/format 与 diff-check 通过；待补 Desktop/Tablet/Mobile 截图 |
| W1-E Dashboard Overview 视图迁移 | 将 `link_ai` 欢迎区、账户/今日卡、模型用量和公告迁入；保留目标 API/admin guard/Models/Flow/Users | REVIEW | `/dashboard/overview` 已切换为 LinkAI 内容视图，12/12 定向测试、typecheck、build、scoped lint/format、i18n 与 diff-check 通过；spec + quality clean acceptance 已完成，原两个 P2（切换按钮选中态无障碍、实际分流/卡片路由测试）已闭环，正在最终验证。原 Overview 的设置引导/快捷动作、API 信息、FAQ、Uptime 必须在 Dashboard adapter 子批中迁入新风格，未完成前不宣称 Dashboard 整页达 95% |
| W1-F API Keys 视图迁移 | LinkAI 标题、Base URL/账户摘要、深色工具栏与表格；保留目标完整 Provider/DataTable/Dialogs | REVIEW | `/keys` 已切换 LinkAI 内容视图；未采用 `link_ai` 简化表格，继续复用目标的 URL 筛选/分页、完整列、移动端卡片、真实密钥、CRUD、状态切换、批量复制/删除、聊天预设、FluentRead 与 CC Switch。Chrome 登录态已验证 11 个业务列、创建抽屉和无默认弹窗；6/6 聚焦测试、typecheck、production build、scoped lint/format 与 diff-check 通过，待补 375/768 响应式及破坏性动作确认前 E2E 后转 PASS |
| W1-G Usage Logs 视图迁移 | LinkAI 标题、真实 Usage/RPM/TPM 卡片、深色筛选器与表格；保留普通/绘图/任务 controller | REVIEW | `/usage-logs/common                                                                                                                                                                                                                                                                                                                                                                                  | drawing | task` 已切换 LinkAI 内容视图；继续复用目标权限/模块开关守卫、self/admin endpoint 隔离、URL 筛选/分页、列显隐、移动端列表和全部详情弹窗。Chrome 登录态验证普通日志高级筛选，以及任务 6 列、绘图 8 列和切换页签；23/23 聚焦测试、typecheck、production build、scoped lint/format 与 diff-check 通过，待详情弹窗和 375/768 响应式 E2E 后转 PASS |
| W1-H Wallet 视图迁移 | 按 Figma `9:1223` 重构余额摘要、充值主区、订单与邀请侧栏；保留目标完整支付 controller | REVIEW | `/wallet` 已按 Figma 分成 3 张独立摘要卡、左侧充值主区和右侧订单/邀请区；继续复用目标最小充值、预设/折扣、兑换码、Stripe/Epay/Creem/Waffo/Waffo Pancake、账单、转账、邀请返利、订阅购买和账单偏好，未写入 Figma 示例金额或 VIP 假数据。订单卡异常位图已换为清晰矢量图标；后台读取改为静默失败，状态请求取消 429 重试，账单只在弹窗打开时加载，全局 429 提示按固定 ID 去重并短时自动消失；订阅区保持固定挂载位置，空数据时结束骨架屏，不再因装卸组件循环请求。Chrome 登录态持续观察 10 秒，订阅卡和骨架屏均保持为 0；本轮 8/8 Wallet 聚焦测试、typecheck、production build、scoped lint/format 通过；待各支付配置组合及确认前 E2E 后转 PASS |
| W1-I Profile 视觉统一 | 将目标 Profile 完整 controller 置于 LinkAI 页面容器并统一卡片/输入/弹窗视觉 | REVIEW | `/profile` 已按 Figma `11:2196 / 11:2486 / 11:2584 / 11:2690` 重构为渐变资料 Hero、胶囊页签与深色表单卡片；账户绑定、通知、个人资料、安全、偏好设置五个状态继续复用目标 controller，并保留签到、密码、访问令牌、Passkey、2FA、删除账户、语言和侧栏配置。Chrome 登录态已逐个验证五个页签；4/4 聚焦测试、typecheck 与 production build 通过。待全部安全确认链、Telegram/微信/OAuth 配置组合和 375/768 视觉 E2E 后转 PASS |
| W1-J Playground 视觉统一 | 按 Figma `13:3770` 重构用户游乐场内容区；保留目标真实模型、消息、参数与操作 controller | REVIEW | `/playground` 已落地模型标题、对话/代码双视图、交错消息卡片和大尺寸输入区；继续复用模型/分组选择、真实历史消息、流式生成/停止、编辑/重试/删除/复制、参数面板、附件入口、清空确认与响应源码展示，未写入 Figma 示例模型或对话。根据截图反馈，低分辨率 Figma 位图已全部移除：顶部改为随真实模型解析的 `@lobehub/icons` 厂商矢量图标，工具栏与发送改用清晰矢量图标并整体缩至 36–40px 控件。Chrome 登录态已验证 Desktop、375px、768px、真实代码视图以及模型/参数/附件/清空确认状态；12/12 聚焦测试、typecheck、production build、scoped lint/format 与 diff-check 通过。高级自定义 JSON、请求/响应与 SSE 调试、配置导入导出、真实多模态附件和搜索能力仍按原计划留在第二批，未完成前不转 PASS |
| W1-K 数据看板、分组状态与共享弹窗 | 统一普通用户数据看板、分组状态和后台 Dialog/AlertDialog；修复概览冗余标题与顶部导航居中 | REVIEW | `/dashboard/models` 已接入 LinkAI 深色卡片、统计、工具栏和图表视觉，保留日期/用户筛选、图表偏好、真实统计请求及管理员分支；`/group-status` 已接入同一页面容器、摘要、时间窗口和自适应卡片网格，保留实时/历史窗口、自动刷新、重试及空/错状态。弹窗样式已从 Profile 页面专属 CSS 抽为普通用户外壳共享样式，Wallet、Usage Logs、Dashboard、Profile 等普通用户路由统一生效；角色标记测试确认管理员不命中覆盖。首页/公共 Header 导航改为真实视口居中，Overview 顶部冗余“数据看板”已移除；Header 通知入口改为桌面/移动端独立受控状态，消除重复实例互相关闭弹窗的问题。Chrome 登录态已验证首页中心点、Overview、Dashboard Models、偏好设置弹窗、Profile 绑定邮箱弹窗、Group Status 和通知弹窗；16/16 聚焦测试、typecheck、scoped lint、production build 与 diff-check 通过。待 375/768 视口和管理员真实登录态截图后转 PASS |
| W1-R 两轮审查 | 每个实现分别进行 spec 与 quality review | IN_PROGRESS | W1-D 已完成独立 spec + quality clean acceptance，无 P0/P1/P2；已处理 provider、移动端 actions/drawer-close、matcher 边界和隐藏菜单焦点问题。W1-A/B/C 剩余审查与后续页面审查仍需收口 |
| W1-V 最终验证 | 聚焦测试、类型、lint、构建、工作流最终验证 | IN_PROGRESS | W1-D 壳层的代码/自动化 final verification 已接受，登录后视觉截图待补；Dashboard、Keys、Logs、Wallet 内容页和 Wave 1 整体功能矩阵未完成，不得把 Wave 1 或 95% 保留率标记为 PASS |

### 11.1 恢复快照（2026-08-31）

- 状态：`RESUMED`。原 `codex-with-cc` 已替换为 `codex-native-agents`，用户已明确恢复执行并允许按需要使用子代理。
- 已落地：LinkAI 登录/注册功能补齐与组合边界修复；旧地址兼容、角色/功能开关直达守卫；Pricing 推导/模拟内容和伪 incident/outage 表达清理。
- 已有稳定证据：认证 45 tests；旧路由/侧栏/守卫 106 tests；Pricing 15 tests；用户后台壳层 47 tests + typecheck + production build + scoped lint/format + diff-check；壳层 22/22 PNG 哈希一致。
- 未完成验收：认证 clean quality acceptance；旧路由最新 Run 的 spec + quality；Pricing 最新 Run 的 quality；Wave 1 final verifier、统一全量回归和真实路由 E2E。
- 当前执行：双仓库已用 binary diff + 未跟踪归档冻结；LinkAI console 14 个源码/22 个素材、目标壳层权限边界和四个核心页功能差异已完成审计；普通用户壳层、Dashboard Overview、API Keys、三类 Usage Logs 与 Wallet LinkAI 视图已进入 REVIEW。下一批转入 Profile/Playground 等尚未在 `link_ai` 预改的用户页面统一；Dashboard 剩余 API 信息/FAQ/Uptime adapter 保留为同 Wave 子批并计入最终覆盖率。
- 节奏调整：后续以页面批次推进 UI；仅 P0/P1 功能缺失、权限/安全错误、误导数据阻断当前批次，低风险清理项写入 backlog，避免反复打断样式迁移。

### 11.2 用户后台壳层滚动与紧凑 Header 修复（2026-08-31）

- 状态：`REVIEW`。仅修改普通用户 LinkAI Console 壳层；管理员/超级管理员布局不受影响。
- 滚动契约：Console 根节点固定为一屏高并阻止 body 滚动；Header 与 Sidebar 保持在壳层固定位置；Dashboard、Keys、Usage Logs、Group Status、Wallet、Profile、Playground 等页面只允许右侧内容区或其业务子容器滚动。
- 紧凑 Header：控制台 Header 从 135px 收至 80px，Sidebar 通过同一个 `--app-header-height` 变量对齐；Logo 从素材原始 242px 降至 190px 显示，避免低分辨率位图被大尺寸呈现。
- Chrome 登录态证据：1920×906 下 body `clientHeight/scrollHeight = 906/906`；概览内容区 `826/1395` 并可独立滚至 420；滚动后 Header top=0、Sidebar top=80、body scrollTop=0。另抽查 Dashboard Models、Keys、Usage Logs、Group Status、Wallet、Profile、Playground，均未产生页面级滚动。
- 自动化证据：壳层/Header/Dashboard 相关 11 tests 通过，`tsgo -b` 通过，scoped `oxfmt` 通过。

### 11.3 前后台 Header、页面层级与折叠侧栏统一（2026-08-31）

- 状态：`REVIEW`。公共前台、首页动效 Header 与用户后台统一为 80px；首页未滚动和滚动后的浮动状态均为 80px，保留原有 0.7s 过渡、圆角、模糊与阴影动效。
- 层级契约：Wallet、Profile、API Keys、普通/绘图/任务日志等一级侧栏页面不显示面包屑；只有未来存在独立二级路由时才由二级页面显式提供面包屑，弹窗/抽屉操作不伪装成页面层级。
- 折叠侧栏：折叠宽度从 44px 校准为 52px，空间头像与菜单图标统一居中。后续按产品反馈移除底部 C/B 端装饰入口；普通用户和管理员均不显示额外切换项，只有 `ROLE.SUPER_ADMIN` 显示清晰矢量盾牌“管理员”按钮，折叠时保留可访问名称，点击仍进入 `/subscriptions` 并由既有 route matcher 切换到原管理员壳层。
- Chrome 证据：公共 Pricing Header 80px、首页两种滚动状态均为 80px 且 transition duration=0.7s；折叠侧栏、头像、10 个一级图标和 C 端入口中心点均为 26px；Wallet 面包屑计数为 0。
- 自动化证据：14/14 聚焦测试、`tsgo -b`、scoped lint/format 与 production build 通过。

### 11.4 Figma 个人资料页落地（2026-08-31）

- 状态：`REVIEW`。本批严格限定 `/profile` 用户个人资料页；Header、侧栏、钱包、日志及管理员/超级管理员界面均未纳入改动。
- Figma 基线：用户给出的 `11:2197` 是黑色位图层，向上解析到容器 `11:2195` 后，以个人中心 `11:2196`、修改资料 `11:2486`、安全设置 `11:2584` 和存储设置 `11:2690` 为结构化实现依据。
- 视觉落地：使用蓝青—紫—粉渐变封面、跨封面头像、用户身份与账户摘要、水平胶囊页签、深色圆角卡片、49px 输入框和白色主操作按钮；未引入临时 Figma 图片链接，头像继续使用真实用户资料与既有回退样式。
- 功能保留：五个一级状态映射为账户绑定、通知、个人资料、安全、偏好设置；原有邮箱/微信/OAuth/Telegram/LinuxDO/自定义 OAuth、Passkey、邮件/Webhook/Bark/Gotify、签到、密码、访问令牌、2FA、删除账户、语言和侧栏模块配置均继续受原 status flag 与 controller 控制。个人资料状态补齐显示名称编辑，并在保存成功后同步登录态显示名称。
- Chrome 登录态证据：逐个打开五个页签，确认页面默认无弹窗；当前配置下账户绑定显示邮箱与 Passkey，通知显示四类通道，安全显示 2FA/密码/访问令牌/删除账户，偏好设置显示语言与 12 个侧栏开关。验收过程未提交资料、未生成令牌、未修改安全或绑定数据。
- 弹窗反馈闭环：个人资料弹窗通过 body Portal 渲染，原页面容器内的样式无法覆盖，是旧灰色 Footer、32px 输入框和窄弹窗混用的共享根因。现以 Figma 绑定邮箱节点 `11:2331` 的 738px 外框、50px 输入框、`#171717 / #1d1d1d` 内容与 Footer、12px 圆角为基线；该样式已在 W1-K 抽到普通用户外壳级共享文件，Profile、Wallet、Usage Logs、Dashboard 等用户页面统一命中，管理员角色不命中。Chrome 已实测邮箱绑定、修改密码、访问令牌二次确认、删除账户与模型偏好设置弹窗，未执行验证码发送、令牌生成、密码修改或账户删除。
- 自动化证据：资料表单与 Telegram 绑定相关 4/4 聚焦测试通过，`tsgo -b`、scoped lint/format 和 production build 通过。
- 剩余门禁：破坏性/安全确认动作只验证到确认前；Telegram、微信和各 OAuth 提供方仍需在对应配置开启时执行组合 E2E；375/768 视口视觉回归完成前保持 `REVIEW`，不据此宣称全后台 95% 发布门槛已达成。

### 11.5 Figma 游乐场页落地（2026-08-31）

- 状态：`REVIEW`。本批严格限定普通用户 `/playground` 内容区；公共 Header、用户侧栏、其他后台模块及管理员/超级管理员页面均未改动。
- Figma 基线：以用户指定节点 `13:3770` 的 1920×1260 桌面稿为依据，恢复模型标题、居中双视图切换、交错消息卡片、底部大输入区和工具/发送控制；模型名、历史消息和运行状态全部来自目标项目真实 controller，不使用设计稿示例数据。
- 图标反馈闭环：Figma 导出的模型标识与底部 5 个工具位图在实际页面中边缘模糊，已全部移除。顶部模型标识复用项目 `@lobehub/icons`，按真实模型名解析 OpenAI、Claude、Gemini、DeepSeek、Qwen 等厂商并为未知模型提供清晰通用回退；附件、搜索、参数、清空和发送改用项目已有矢量图标。工具按钮统一为 36px、模型与发送控件为 36–40px，图形本体为 17–18px，保留原 tooltip、disabled、弹窗与菜单语义。
- 功能保留：模型与分组选择、对话历史、发送/停止、编辑、重试、删除、复制、清空二次确认、参数启停与数值配置、附件入口、搜索提示和 Markdown/源码展示继续使用原逻辑；“代码视图”直接切换真实消息源码展示，不是静态展示控件。
- Chrome 登录态证据：桌面宽屏下逐一打开对话/代码视图、模型选择、参数面板、附件菜单和清空确认；375×812 与 768×900 下完成布局检查，页面仍由中间内容区滚动，输入区和工具未溢出。验收中未发送消息、未清空历史、未提交模型或参数变更。
- 自动化证据：Playground 视图/源码切换、消息编辑和模型厂商解析相关 12/12 聚焦测试通过，`tsgo -b`、scoped `oxlint`/`oxfmt`、production build 与 `git diff --check` 通过。
- 剩余门禁：高级自定义 JSON body、请求/响应与 SSE 调试、配置导入导出、真实多模态附件和联网搜索仍属于原计划第二批能力；这些能力及多模型/异常流组合 E2E 完成前保持 `REVIEW`，不据此宣称 Playground 或用户后台 95% 发布门槛已达成。

### 11.6 数据看板、分组状态与普通用户共享弹窗（2026-08-31）

- 状态：`REVIEW`。本批只给普通用户 LinkAI 外壳增加 `linkai-user-console-shell` 角色标记并据此换肤；管理员及超级管理员即使访问共享 Dashboard 组件，也不会命中本批 CSS。自动化测试覆盖普通用户命中和管理员不命中两条分支。
- 顶部与概览反馈闭环：首页未滚动 Header 和公共/控制台 Header 的桌面导航均改为相对视口真实 `50%` 居中；Chrome 在 1920px 视口实测导航左右边界 `675/1245`、中心点 `960`。`/dashboard/overview` 顶部重复“数据看板”文案已移除，空间切换器和全部概览业务卡片保留。
- 数据看板：`/dashboard/models` 保留原 `Dashboard` controller、真实 quota 请求、时间筛选、用户筛选、图表默认偏好、消费分布和模型调用图表，只增加普通用户作用域内的新页面标题、分段工具栏、五项摘要与深色图表卡片样式。Chrome 已验证页面真实数据加载和“偏好设置”弹窗，未保存偏好或提交筛选。
- 分组状态：保留 `now/15m/1h/6h/24h` 窗口、15 秒前台自动刷新、手动刷新、缓存数据回退、空/错状态和真实分组卡片；视觉改为新 UI 深色摘要/指标/卡片。`auto-fill` 改为 `auto-fit`，两组数据时实测两张卡片各 722px 并完整填满内容区，不再保留无意义空列。时间窗口改为独立按钮组，内部使用 5px 间距、4px 容器内边距、与刷新按钮保持 6px 外间距；Chrome 计算样式确认五个按钮均为统一 8px 四角圆角，`24h` 不再被旧 ButtonGroup 末项规则覆盖。
- 共享弹窗：Profile 中 Portal 专属覆盖已迁入 `linkai-console-theme.css`，普通用户后台 Dialog/AlertDialog 统一使用 738/560px 响应式外框、深色内容与 Footer、50px 输入/选择器和一致的按钮/焦点状态；Wallet 与 Usage Logs 的旧局部覆盖已删除。Chrome 实测模型偏好设置与绑定邮箱弹窗背景 `rgb(23,23,23)`、圆角 `12px`，Profile Footer 为 `rgb(29,29,29)`。
- 通知弹窗反馈闭环：公共 Header 同时存在桌面与隐藏移动端两份通知组件，原先共用单一 `open` 状态，桌面弹窗刚打开就会被隐藏实例关闭。现增加具体触发入口状态，Chrome 实测桌面 trigger 为 `true` 时移动 trigger 保持 `false`，弹窗稳定显示为 416×362px、14px 圆角深色面板；关闭按钮同步普通用户新 UI 样式。
- 自动化证据：Header/Console Layout/Dashboard/Group Status 相关 16/16 聚焦测试通过，`tsgo -b`、scoped `oxlint`/`oxfmt`、production build 与 `git diff --check` 通过。
- 剩余门禁：375/768 视口需补视觉截图；管理员真实账号需补共享 Dashboard 的未换肤截图。完成前保持 `REVIEW`，不据此宣称全部用户后台或 95% 功能门槛已完成。

第一批验收完成前不把 Playground 标记为已完成。第一批通过后进入第二批：Playground 高级能力、Chat iframe 同步与个人安全链路回归。
