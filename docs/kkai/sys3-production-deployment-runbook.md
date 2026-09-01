# LinkAI / NewAPI sys3 生产安全部署手册

> 适用环境：`sys3`（`51.81.154.107`）、`https://omnitoken.online`
>
> 文档目标：让应用发布可重复、可审计、可回滚，并把数据库与业务数据安全放在发布速度之前。
>
> 最后核对日期：2026-09-01

## 1. 安全目标与适用范围

本手册适用于 LinkAI / NewAPI 的生产应用发布，包括前端 UI、后端程序和不改变数据库结构的配置兼容更新。

“绝对零风险”在生产系统中无法作数学意义的保证。本手册采用 **fail closed（条件不满足就停止）** 的方式，把可控风险降到最低：

- 不在生产服务器构建镜像；
- 不使用浮动标签，不覆盖已有发布版本；
- 不把数据库迁移混入应用发布；
- 不在候选实例上使用可写数据库账号；
- 不在候选验收通过前切换公网流量；
- 不删除当前版本、回滚版本、数据库卷或 Redis 卷；
- 每次发布前生成并验证 PostgreSQL、应用数据和 Redis 备份，同时在启用 FileVault 的 Mac 上原子保留一份已验证异机副本；
- 任一证据缺失、版本不一致或健康检查失败时立即停止，不带病上线。

数据库迁移、数据修复、批量业务操作、Redis 数据结构升级不属于本手册的普通发布范围，必须使用独立方案、独立授权和独立维护窗口。

## 2. 当前生产基线

以下内容只是 2026-09-01 的已知基线。每次发布都必须重新读取在线状态，不能把本表当作实时状态。

| 项目                   | 已知值                                                                    |
| ---------------------- | ------------------------------------------------------------------------- |
| 目标服务器             | `sys3` / `51.81.154.107`                                                  |
| SSH 用户               | `ubuntu`                                                                  |
| 公网地址               | `https://omnitoken.online`                                                |
| Compose 项目           | `kkai-newapi`                                                             |
| Compose 文件           | `/srv/kkai/stacks/newapi/compose.yml`                                     |
| 应用容器               | `sys3-newapi`                                                             |
| PostgreSQL 容器        | `sys3-newapi-postgres`                                                    |
| Redis 容器             | `sys3-newapi-redis`                                                       |
| 应用监听               | `127.0.0.1:3000`                                                          |
| 当前应用镜像           | `qaul11111/new-api-kkai:sys3-linkai-console-webcompat-20260831-1c8c37b86` |
| 当前镜像后端基线       | `56145052eef44b10ee053fafeaf2eb54beeb1713`                                |
| UI 变更提交            | `1c8c37b8631f2f4766df4f878e22699e5ca49eff`                                |
| 最近确认的 KKAI schema | v4                                                                        |
| 当前应用角色           | `KKAI_NODE_ROLE=leader`                                                   |
| 应用持久化目录         | `/srv/kkai/data/apps/newapi` -> 容器 `/data`                              |
| Redis 持久化目录       | `/srv/kkai/data/apps/newapi-redis` -> 容器 `/data`                        |
| Redis 持久化模式       | AOF 已开启（everysec），同时保留 RDB save 规则                            |
| 候选 PostgreSQL 账号   | `newapi_readonly`；默认事务只读，实测写入被拒绝                           |
| 候选 Redis 账号        | `newapi_readonly`；ACL 只读，实测写入被拒绝                               |
| 当前备份目录           | `/srv/kkai/backups/newapi`                                                |
| 最近 Compose 备份      | `compose.yml.pre-linkai-console-webcompat-1c8c37b86-20260831T131338Z`     |

当前镜像是一次“旧后端 + 新前端”的兼容构建。镜像 OCI revision 标记的是旧后端提交，UI 提交体现在镜像名中。这种来源表达不完整，只能作为过渡状态；后续标准发布必须让源码提交、镜像 revision、发布元数据和实际制品一一对应。

## 3. 当前存在的发布阻断项

截至最后核对日期，sys3 已完成状态巡检、Mac 单份异机备份和真实隔离恢复验证，并已安装固定基础设施提交的 fail-closed 控制器；但它 **尚不具备本仓库规定的标准生产发布条件**：

1. `/usr/local/sbin/kkai-newapi-manual-deploy` 当前只实现 `status` 和 `preflight`，`stage`、`promote`、`rollback` 会明确拒绝执行；
2. sys3 当前是单应用实例 Compose，不具备只替换空闲槽位、候选只读验收、原版本原地待命的完整蓝绿结构；
3. 最近确认的 schema 是 v4，而当前 B/C 正式构建的 `bridge` 与 `feature` 契约都要求 `(9,9,9)`。

因此，在下一次普通生产发布前必须先完成以下工作：

- 在 sys3 基础设施仓库中补齐并验证蓝绿槽位、路由和控制器的 `stage`、`promote`、`rollback`；
- 单独规划 schema v4 到受支持版本的迁移。迁移不得由普通发布顺带执行。

上述任一项未完成时，普通发布结论必须是 **STOP**。不得用裸 `docker compose up`、手工改镜像名或临时启动第二个 leader 来绕过门禁。紧急事故处置必须使用单独的 break-glass 方案和明确授权，不属于本手册的快速发布路径。

## 4. 发布类型决策

每次发布先分类，不允许边部署边判断。

| 变更类型                    | 走本手册普通流程 | 额外要求                                           |
| --------------------------- | ---------------- | -------------------------------------------------- |
| 纯前端 UI / 静态资源        | 是               | 仍然是完整应用制品发布；后端与 schema 契约必须一致 |
| 后端逻辑，无 schema 变化    | 是               | 执行完整测试、候选验收和蓝绿切换                   |
| 环境变量或 secret 引用变化  | 有条件           | 单独审查兼容性；不得输出 secret 值                 |
| KKAI schema 变化            | 否               | 单独迁移方案、快照、克隆演练、显式授权             |
| 上游表结构 / GORM 迁移变化  | 否               | 单独数据库维护方案                                 |
| 业务数据修复或批量更新      | 否               | 单独 SQL/业务操作方案和审计                        |
| PostgreSQL / Redis 版本升级 | 否               | 基础设施维护手册                                   |

前端发布不代表可以忽略后端。Web 静态资源被编译进应用镜像，最终仍需验证同一镜像中的后端版本、schema 契约、运行角色和健康状态。

## 5. 角色与最小授权

一次标准发布至少区分以下职责：

- **发布操作员**：构建、上传、stage、执行验收、按授权 promote；
- **数据库操作员**：生成/验证备份，执行独立 schema 迁移；
- **验收人**：核对前台、登录注册、关键 API 和用户后台的最小受影响流程；
- **事故负责人**：决定是否回滚，以及是否进入数据库恢复流程。

同一人可以承担多个角色，但记录中仍需分别写明结论。应用发布授权不自动包含 schema 迁移、数据恢复、清理数据卷或删除旧镜像的权限。

## 6. 发布前证据单

每次发布先创建一份独立记录，至少包含：

```text
变更说明：
发布负责人：
验收负责人：
维护窗口（含时区）：
生产分支：production/kkrich
源提交 SHA：
目标 schema 契约：bridge / feature
在线 schema 观察结果及摘要：
当前活动槽位、版本、镜像 digest：
当前回滚槽位、版本、镜像 digest：
数据库备份路径：
数据库备份 SHA-256：
应用数据快照 ID / SHA-256：
Redis 快照 ID / SHA-256：
异机备份对象及 SHA-256：
最近一次恢复演练时间和结果：
候选地址：
候选验收结果：
切流时间：
切流后验收结果：
最终结论：成功 / 回滚 / 停止
```

记录中禁止出现数据库 DSN、密码、API Key、Cookie、session、OAuth secret、SSH 私钥内容或 `.env` 全文。

## 7. 阶段 A：准备源码

### 7.1 使用唯一生产工作区

生产制品只允许从本仓库的本地 `production/kkrich` 分支构建。不得使用旧 clone、临时 worktree、开发分支或生产服务器上的源码目录替代。

```bash
app_repo=/Users/wxl/Documents/DevProject/GPTProject/Omnitoken/new-api-kkai
cd "$app_repo"

git branch --show-current
git status --porcelain=v1 --untracked-files=all
git rev-parse HEAD
git cat-file -e 'HEAD^{commit}'
```

通过条件：

- 当前分支严格等于 `production/kkrich`；
- `git status --porcelain` 没有任何输出；
- 目标 PR 已按正常评审流程进入该分支；
- `HEAD` 是本次证据单记录的唯一 source SHA。

不允许为了构建临时 stash、忽略未跟踪文件或把开发分支伪装成生产分支。

### 7.2 运行完整质量门禁

```bash
cd "$app_repo"
scripts/kkai/check-fork-quality.sh --full
```

该命令必须成功结束。任何跳过、超时、依赖漂移或测试失败都视为 STOP。纯前端变更也不例外，因为最终发布的是包含后端的完整镜像。

## 8. 阶段 B：读取实时生产状态

### 8.1 先读取全局手册

每次发布都必须先完整阅读：

```text
/Users/wxl/Documents/DevProject/GPTProject/Omnitoken/kkai-infra-sys3/runbooks/newapi-upgrade-and-deployment.md
```

文件不存在、无法读取或存在多个冲突版本时立即停止。不能依赖聊天记录或记忆补全命令。

### 8.2 使用用户确认的基础设施仓库

不要自动搜索历史基础设施 clone。由用户明确指定唯一仓库后执行：

```bash
infra_repo=/absolute/path/to/confirmed/kkai-infra
cd "$infra_repo"

git rev-parse HEAD
git status --porcelain=v1 --untracked-files=all
make newapi-status
```

将输出中的以下内容写入证据单：

- 当前活动槽位和空闲槽位；
- 当前版本、source SHA、镜像 digest；
- 稳定别名和 writer 所属槽位；
- 两个槽位的健康状态；
- 候选回环地址；
- 基础设施 commit 和部署协议。

仓库约定的基础设施 contract 当前为：

```text
KKAI_INFRA_SHA=393ee2cb3446472d57da59c011c71abd29c3a660
KKAI_DEPLOYMENT_PROTOCOL=router-v3-staged
```

实际基础设施 commit 或协议不一致时停止。不要修改 contract 来迎合未知服务器状态；必须先审查并安装准确的基础设施版本。

## 9. 阶段 C：数据库安全门禁

### 9.1 普通发布不改数据库

普通应用发布必须满足：

- 不运行 `kkai-migrate` 的 apply 操作；
- 不运行 GORM AutoMigrate；
- 不执行 SQL DDL/DML；
- 不重建 PostgreSQL 或 Redis 容器；
- 不删除或替换 `/var/lib/postgresql`、Redis `/data` 等数据卷；
- 不修改数据库用户权限。

正式生产镜像将 `schema_management` 编译为 `external`，应用启动只校验 schema，不执行 KKAI schema 迁移。

### 9.2 只读观察在线 schema

schema 契约必须来自当次发布窗口的在线只读观察，不能根据镜像名、旧记录或 generic preflight 推断。

使用全局/基础设施手册规定的 secret-safe 观察命令，最终应等价于：

```bash
./kkai-migrate --observe --current --json --dsn-stdin
```

DSN 必须通过受控 stdin 或 secret provider 传入，禁止：

- 把 DSN 写入命令行 `--dsn`；
- 把 DSN 粘贴到 shell history、聊天、PR、工单或日志；
- 打开 `set -x`；
- 输出容器的完整环境变量；
- 将 secret 复制到仓库或普通临时文件。

记录 `current_version`、dialect、validated prefix/digest，不记录 DSN。

### 9.3 选择构建契约

当前正式构建契约：

| 在线 schema              | 构建参数                    | 允许发布                 |
| ------------------------ | --------------------------- | ------------------------ |
| v9                       | `--schema-contract feature` | 是，仅在 v9 已独立确认后 |
| v4、v5、v6、v7、v8      | 无当前普通发布契约          | STOP，先走独立迁移计划   |
| 未知、校验失败、未来版本 | 无                          | STOP                     |

当前 `bridge` 与 `feature` 都是 `(runtime_min=9, runtime_max=9, migration_target=9)`。bridge 构建标签仅为构建兼容保留，不表示 B/C 代码可在 v8 运行。generic preflight 显示 ready 不代表 schema 兼容。

sys3 最近确认是 v4，因此不能直接部署当前 `bridge` 或 `feature` 正式镜像。必须先按 [migrations.md](./migrations.md) 单独完成受控升级，或保持经过单独评审的旧后端兼容制品。后者不是长期标准发布路径。

## 10. 阶段 D：生成并验证备份

### 10.1 备份原则

每次生产发布前必须具备：

1. 当前 Compose/基础设施配置备份；
2. PostgreSQL 一致性逻辑备份；
3. 应用 `/data` 的一致性快照；
4. Redis AOF/RDB 的一致性快照；
5. 所有备份对象的 SHA-256；
6. 加密异机副本及相同 SHA-256；
7. 最近一次成功的隔离恢复演练证据。

同机 `/srv/kkai/backups` 只能用于快速回退，不能作为唯一备份。异机副本未完成时停止发布。

### 10.2 sys3 PostgreSQL 备份模板

以下命令只读取 PostgreSQL，并将备份目录权限设为 root-only。执行前确认磁盘空间充足，且命令中的容器名仍与实时状态一致。

```bash
set -Eeuo pipefail

backup_stamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_dir="/srv/kkai/backups/newapi/${backup_stamp}"

df -h /srv/kkai
sudo install -d -m 0700 -o root -g root "$backup_dir"
sudo cp --preserve=all /srv/kkai/stacks/newapi/compose.yml "$backup_dir/compose.yml"

sudo docker exec sys3-newapi-postgres sh -eu -c '
  export PGPASSWORD="$(cat "$POSTGRES_PASSWORD_FILE")"
  exec pg_dump \
    --username "$POSTGRES_USER" \
    --dbname "$POSTGRES_DB" \
    --format=custom \
    --no-owner \
    --no-acl
' | sudo tee "$backup_dir/postgres.dump" >/dev/null

sudo test -s "$backup_dir/postgres.dump"
sudo sh -c '
  docker exec -i sys3-newapi-postgres pg_restore --list < "$1" >/dev/null
' sh "$backup_dir/postgres.dump"
sudo sha256sum "$backup_dir/compose.yml" "$backup_dir/postgres.dump" \
  | sudo tee "$backup_dir/SHA256SUMS"
sudo chmod 0600 \
  "$backup_dir/compose.yml" \
  "$backup_dir/postgres.dump" \
  "$backup_dir/SHA256SUMS"
```

安全说明：

- PostgreSQL `pg_dump` 使用一致性快照，不需要停止应用，但仍应在低峰期执行并观察负载；
- 管道必须在 `set -o pipefail` 的发布 shell 中运行，任何 `pg_dump` 失败都必须使流程失败；
- 不要把 password file 内容打印到终端；
- 不要把 dump 放入 Git、对象公开读的存储桶或未加密传输；
- `pg_restore --list` 只能验证归档可解析，不能替代隔离恢复演练。

当前 PostgreSQL 容器内包含 `pg_restore`。如果未来镜像不再包含它，必须使用同版本 PostgreSQL 工具容器或基础设施备份工具验证；不得因为工具缺失而跳过。

### 10.3 应用数据与 Redis 快照

除 PostgreSQL 外，sys3 还有两个持久化目录：

- `/srv/kkai/data/apps/newapi`：应用 `/data`；
- `/srv/kkai/data/apps/newapi-redis`：Redis `/data`，包含 AOF/RDB。

必须由基础设施备份工具生成一致性快照并记录快照 ID、时间点和 SHA-256。禁止直接在 Redis 运行期间递归 `cp` AOF 目录，因为多段 AOF 和 manifest 可能处在切换过程中，复制结果不一定可恢复。

Redis 备份至少需要：

1. 使用 secret-safe 的专用备份账号触发并确认持久化；
2. 等待后台保存/AOF 状态成功；
3. 对底层卷做一致性快照，或使用 Redis 官方备份方法导出；
4. 用对应版本的 Redis 工具检查备份；
5. 在隔离 Redis 实例上加载并验证关键 stream、nonce 和缓存结构。

应用 `/data` 也不能假设只有日志。应使用文件系统/卷快照，或在基础设施手册定义的短暂 quiesce 窗口内备份，并在演练环境检查文件数量、总大小、权限和抽样 hash。

当前 sys3 尚无已核实的这两类快照控制器，所以它们也是下一次标准发布前的 STOP 项。本手册不提供未经验证的“一键复制目录”命令。

### 10.4 加密异机副本

将 `postgres.dump`、Compose、应用数据快照、Redis 快照及其校验清单打包后，通过已批准的备份系统进行客户端加密并上传到另一台主机或独立对象存储。要求：

- 加密密钥不与备份保存在同一服务器；
- 传输和静态存储均加密；
- 上传后重新下载或远端校验 SHA-256；
- 备份系统账号只授予写入指定前缀的最小权限；
- 保留策略和删除权限与应用发布权限分离。

在异机备份方案落地前，不得把“同机 dump 已完成”标记为数据安全门禁通过。

当前异机目标采用操作员 Mac，Mac 最终只保留一份“最新且已验证”的完整备份包。轮换必须原子化：

1. 新备份先写入独立临时目录，不能覆盖当前有效备份；
2. 完成文件完整性、SHA-256 和恢复可读性检查；
3. 校验失败时删除失败的新包，继续保留旧包；
4. 校验成功后将新包原子切换为 `current`；
5. 只有切换成功后才能删除旧包。

轮换过程中会短暂存在新旧两份，最终稳定状态只有一份。禁止先删除旧包再下载新包，否则传输或校验失败时会失去唯一异机副本。以当前数据规模，每份完整备份保守按 500 MB 预留。

### 10.5 恢复演练

普通应用发布要求最近 7 天内至少有一次成功的自动/人工隔离恢复演练。涉及 schema 迁移时，必须针对本次新 dump 单独演练。

演练只能在隔离的非生产 PostgreSQL 上执行：

1. 创建全新空数据库；
2. 使用 `pg_restore --exit-on-error` 恢复；
3. 比较关键表行数、schema 摘要和业务抽样；
4. 用同一版本 `kkai-migrate --observe --current --json` 校验；
5. 恢复应用 `/data` 快照并核对权限、数量、大小与抽样 hash；
6. 在隔离 Redis 中加载快照并验证关键 stream/nonce；
7. 记录全部 SHA、恢复耗时和结果；
8. 验证完成后按测试环境清理规范销毁演练环境。

禁止在生产数据库上试跑 restore，也禁止对生产执行 `pg_restore --clean`。

## 11. 阶段 E：构建不可变发布制品

在生产分支干净、测试通过、在线 schema 已确认后执行：

```bash
cd "$app_repo"

# 仅当在线 schema 已独立确认是 v9：
scripts/kkai/build-manual-release.sh --schema-contract feature
```

脚本输出：

- `.local-releases/<version>.tar`
- `.local-releases/<version>.json`

构建要求：

- 必须在可信构建工作站执行，禁止在 sys3 构建；
- 平台必须是 `linux/amd64`；
- 一个 source SHA 只构建一个不可变 release；
- 不允许使用 `latest`；
- 构建失败后如果修改了源码、锁文件或依赖，必须提交新 SHA 并生成新版本；
- 不覆盖或复用已有 `.tar` / `.json`。

### 11.1 本地核对元数据和镜像标签

```bash
release_json=/absolute/path/to/.local-releases/<version>.json
release_tar="$(dirname "$release_json")/$(jq -r '.archive' "$release_json")"

jq . "$release_json"
shasum -a 256 "$release_tar"
```

必须逐项核对：

- `.source_sha` 等于证据单中的生产 HEAD；
- `.schema_contract` 等于根据在线 schema 选择的契约；
- `.platform` 等于 `linux/amd64`；
- archive 实际 SHA-256 等于 `.archive_sha256`；
- image tag 包含不可变 release version。

## 12. 阶段 F：只部署到空闲槽位

### 12.1 sys3 控制器门禁

正式执行前必须确认：

- sys3 已安装经过固定 infra SHA 验证的 `/usr/local/sbin/kkai-newapi-manual-deploy`；
- 本地 deploy client 明确固定指向 sys3，并使用独立密钥和 known_hosts；
- SSH 强制 `BatchMode=yes`、固定 known_hosts、禁用 ProxyJump/ProxyCommand；
- controller 的 preflight 成功；
- 空闲槽位使用 `KKAI_NODE_ROLE=standby-readonly`；
- 空闲槽位使用 PostgreSQL 只读账号，数据库层强制只读；
- 空闲槽位不拥有稳定别名、不接公网流量、不运行全局 writer。

任何一项不满足都停止，不能用 Compose 直接替换 leader。

### 12.2 Stage

只有当控制器补齐蓝绿 stage 能力、全部门禁通过并取得当次发布授权后，才按全局手册执行：

```bash
cd "$app_repo"
scripts/kkai/deploy-manual-release.sh --stage "$release_json"
```

注意：客户端虽然已固定为 sys3，但当前控制器会对 `stage` fail closed。不得修改脚本或绕过控制器来替换正在服务的 leader。

stage 只能完成：

- 本地校验 archive checksum；
- 服务器只读 preflight；
- 通过私有 SSH 传输精确 archive；
- 加载并验证镜像；
- 替换空闲槽位；
- 暴露只在服务器 loopback 可访问的候选地址。

stage 不得切换公网路由、稳定别名、writer、Redis、release pointer 或 rollback pointer。

## 13. 阶段 G：候选验收

候选实例必须保持 `standby-readonly`，使用数据库只读凭据。应用内只读保护只是第二道防线，不能替代数据库权限。

### 13.1 身份与运行状态

从 controller 输出取得候选地址，不要猜端口。核对：

- 候选返回的版本等于 release metadata；
- 镜像 digest 与 stage 结果一致；
- 角色为 `standby-readonly`；
- 无 schema migrate / AutoMigrate 日志；
- 无数据库写入拒绝、权限错误、panic、重复 leader 或重启循环；
- 容器持续 healthy，restart count 为 0。

### 13.2 HTTP 只读冒烟

以下路径至少全部返回 2xx；候选地址必须是 loopback 或经受控 SSH tunnel 暴露的本地地址：

```bash
candidate_base=http://127.0.0.1:<candidate-port>

for path in \
  / \
  /sign-in \
  /sign-up \
  /pricing \
  /rankings \
  /docs \
  /about \
  /login \
  /console \
  /console/token \
  /console/log \
  /console/topup \
  /forbidden
do
  curl --fail --silent --show-error --output /dev/null \
    "$candidate_base$path"
done

for path in \
  /api/status \
  /api/pricing \
  '/api/rankings?period=month' \
  /api/notice \
  /api/home_page_content
do
  curl --fail --silent --show-error --output /dev/null \
    "$candidate_base$path"
done
```

这些检查只读，不应创建用户、session、充值、token 或调用计费模型。候选使用只读账号时，不要在候选上测试登录提交、注册提交或其他写操作。

### 13.3 浏览器视觉验收

至少覆盖：

- 浏览器 tab 标题为 LinkAI，favicon 正确；
- 首页背景、首屏、模块图片无 404、黑块和明显首次加载停顿；
- 首页导航到模型广场、排行榜、文档、关于、登录、注册均正常；
- 登录与注册卡片比例、logo 尺寸、条款间距、底部安全距离正常；
- 模型广场显示真实接口数据；
- 排行榜、公告、首页内容接口正常；
- Chrome DevTools Console 无站点自身 error；
- Network 中无静态资源 404/5xx，无错误 MIME 和跨域失败；
- 响应式尺寸至少覆盖桌面、窄桌面和手机宽度。

候选验收失败时停止并保留活动槽位，不要边修边覆盖同一个 release。

## 14. 阶段 H：Promote 与切流

只有满足以下条件才可 promote：

- 用户授权包含完整蓝绿部署，而不是 build-only 或 stage-only；
- 精确候选版本和 digest 已通过验收；
- 没有新发现的 schema、权限、数据或容量风险；
- 当前活动槽位仍健康；
- 备份、异机副本和恢复演练门禁通过。

promotion 命令必须严格使用当时有效的基础设施手册和 controller。应用仓库目前只提供 stage 客户端，因此本手册不猜测或伪造 promote 子命令。

controller 必须以一个基础设施事务完成：

1. 将候选切换为 serving/leader 所需的正式配置；
2. 确保只有新活动槽位拥有稳定别名和 writer 能力；
3. 切换公网流量；
4. 将旧活动槽位保留为可回滚版本；
5. 更新 release/rollback pointers；
6. 输出新活动槽位、版本、digest 和 writer 所有权证据。

禁止手工同时启动两个 leader，也禁止直接编辑 Compose 后反复 `up -d` 尝试达到相同效果。

## 15. 阶段 I：切流后验收

切流后立即检查：

```bash
public_base=https://omnitoken.online

curl --fail --silent --show-error "$public_base/api/status" | jq .
curl --fail --silent --show-error --output /dev/null "$public_base/"
curl --fail --silent --show-error --output /dev/null "$public_base/sign-in"
curl --fail --silent --show-error --output /dev/null "$public_base/sign-up"
curl --fail --silent --show-error --output /dev/null "$public_base/pricing"
curl --fail --silent --show-error --output /dev/null "$public_base/rankings"
curl --fail --silent --show-error --output /dev/null "$public_base/docs"
curl --fail --silent --show-error --output /dev/null "$public_base/about"
```

然后使用专用测试账号执行最小写路径：

- 登录并退出；
- 打开用户概览、令牌、使用日志、钱包、个人资料、Playground；
- 仅在本次变更影响计费/推理时，使用限额测试 token 做一次最小请求；
- 不使用真实用户账号，不执行真实充值，不修改真实用户资料。

持续观察至少一个完整的关键后台任务周期，确认：

- 新活动槽位健康，restart count 为 0；
- 只有一个 leader/writer；
- 旧槽位保持可回滚；
- PostgreSQL、Redis 健康；
- 5xx、登录失败率、延迟和资源占用没有异常抬升；
- 没有 schema 错误、permission denied、重复任务或队列堆积。

全部证据写回发布记录后，才可宣布完成。

## 16. 回滚规则

### 16.1 可以执行应用回滚的情况

- 本次发布没有改变数据库 schema 或业务数据；或
- 旧镜像的 schema 契约明确兼容当前 schema；
- 旧槽位仍健康且 digest 与证据单一致。

此时使用基础设施 controller 的正式 rollback 流程，把流量和唯一 writer 一起切回旧槽位。禁止只改代理、不改 writer，或只改容器标签。

### 16.2 不能直接应用回滚的情况

- schema 已迁移，而旧镜像不接受新版本；
- 有不可逆业务写入或数据格式变化；
- 旧槽位版本/digest 不明；
- PostgreSQL、Redis 或存储本身异常。

此时停止普通回滚，进入事故处理。数据库 restore 是最后手段，必须：

- 显式获得数据恢复授权；
- 停止全部写入并确认唯一维护窗口；
- 先保全故障现场和当前数据库快照；
- 使用已经做过隔离恢复验证的备份；
- 评估备份时间点之后的数据损失；
- 恢复后重新执行 schema、行数和业务完整性检查。

不要在运行中的生产数据库上直接执行 `pg_restore --clean`。本手册故意不提供一键覆盖数据库命令，避免普通应用回滚误伤数据。

## 17. 发布后清理与保留

发布后只能做非破坏性整理：

- 保留当前活动 release、上一回滚 release 的镜像、archive 和 metadata；
- 保留本次数据库 dump、SHA-256、Mac 上最新一份已验证的异机副本和发布证据；
- 对日志中的敏感字段进行脱敏；
- 关闭临时 SSH tunnel；
- 不立即删除旧槽位、旧镜像或备份；
- 不在同一发布窗口顺手执行数据库清理或 Docker volume prune。

建议最低保留策略：

- 当前与回滚制品：至少保留到后两个发布均稳定；
- 发布证据：至少 180 天；
- Mac 异机数据备份：最终只保留最新一份，必须按上一节的校验后原子轮换；
- schema 迁移前备份：在迁移稳定验收前作为 Mac 唯一有效备份，不得被普通发布备份提前轮换。

实际保留策略应由基础设施备份政策统一执行，不能依靠人工记忆清理。

## 18. 明确禁止的操作

- 在 sys3 上 `docker build` 或 `git pull` 后直接构建；
- 部署 `latest`、复用旧 tag 或覆盖同名 release；
- 从开发分支、dirty worktree、旧 clone 构建生产制品；
- 直接修改 `/srv/kkai/stacks/newapi/compose.yml` 后替换 leader；
- 使用裸 `docker compose` 绕过 preflight、stage、candidate 和 promote；
- 让候选实例使用 leader 角色或生产可写数据库账号；
- 同时运行两个 leader/writer；
- 把 schema 迁移夹在应用启动命令里；
- 删除 PostgreSQL/Redis volume、执行 `docker system prune --volumes`；
- 输出完整 `docker inspect` 环境变量、DSN 或 secret 文件内容；
- 将 SSH 私钥、`ssh.zip`、数据库 dump、`.env` 提交到 Git；
- 未验证异机备份就宣布“数据有备份”；
- 验收失败后覆盖同一个 release 继续试；
- schema 已变化时盲目回滚到不兼容旧镜像。

## 19. 一页式快速检查表

### 发布前

- [ ] 已读取唯一全局部署手册；
- [ ] 用户已确认唯一 sys3 基础设施仓库；
- [ ] `make newapi-status` 是本次刚执行的实时结果；
- [ ] sys3 controller、infra SHA、协议均匹配；
- [ ] 生产分支为 `production/kkrich` 且完全干净；
- [ ] 完整质量门禁通过；
- [ ] 在线 schema 已只读观察并记录；
- [ ] schema 契约选择正确；
- [ ] 当前活动/回滚槽位版本与 digest 已记录；
- [ ] 当前 Compose 已备份；
- [ ] PostgreSQL dump 非空、可解析、SHA-256 已记录；
- [ ] 应用 `/data` 一致性快照已生成并校验；
- [ ] Redis AOF/RDB 一致性快照已生成并校验；
- [ ] 加密异机副本已校验；
- [ ] 恢复演练在有效期内；
- [ ] 回滚条件和负责人已明确。

### Stage 与候选

- [ ] archive 与 metadata checksum 一致；
- [ ] source SHA、schema contract、platform 一致；
- [ ] 只替换空闲槽位；
- [ ] 候选使用数据库只读账号；
- [ ] 候选角色为 `standby-readonly`；
- [ ] 候选没有公网流量、writer 或迁移行为；
- [ ] 页面、接口、浏览器视觉和日志验收通过；
- [ ] 候选版本/digest 与目标完全一致。

### Promote 后

- [ ] 只有一个 leader/writer；
- [ ] 公网版本/digest 正确；
- [ ] 首页、登录注册、公共页面和关键 API 正常；
- [ ] 专用测试账号的最小写路径正常；
- [ ] PostgreSQL、Redis、应用健康；
- [ ] 无重启循环、5xx 抬升、重复后台任务；
- [ ] 旧槽位仍可回滚；
- [ ] 发布证据完整且不含 secret。

## 20. 相关文档

- [KKAI Schema Migrations](./migrations.md)
- [KKAI Background Jobs](./background-jobs.md)
- [KKAI Fork Manifest](./fork-manifest.md)
- [Production Image README](../../build/kkai-image/README.md)
- [Manual Build Script](../../scripts/kkai/build-manual-release.sh)
- [Manual Stage Client](../../scripts/kkai/deploy-manual-release.sh)
- [Pinned Deployment Contract](../../scripts/kkai/manual-deployment-contract.env)
