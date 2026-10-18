# 囤货管家 · pantryKeeper

本地优先的家庭库存管理应用，面向手机与平板，可打包为 Android 应用。记录物品、批次和保质期，在到期前提醒；所有数据只保存在本机，不上传云端。

## 功能

- **物品与批次**：同一物品可拆成多个批次，每批独立记录数量、生产日期、保质期和使用状态
- **三种保质期录入方式**：
  - 生产日期 + 保质期，自动推算过期日（支持天 / 月 / 年，按自然月并处理月末）
  - 直接填写过期日期
  - 只标年月：按当月最后一天计算，例如「2026年10月」到 10 月 31 日才过期
- **出入库**：入库追加批次；出库时默认选中最早到期的批次，也可手动选择
- **使用状态**：未拆封 / 使用中 / 弃用；弃用批次不计入在库数量
- **首页排序**：默认按 已过期 → 临期 → 正常 → 无保质期 → 已弃用 分组，已用完可通过筛选查看
- **搜索与筛选**：按名称或分类关键词搜索，按到期状态筛选
- **统计页**：在库物品、未用完批次、临期/过期数量、分类分布、近期到期
- **深浅色模式**：浅色 / 深色 / 跟随系统
- **连续录入**：长按右下角「+」进入批量添加模式，保存后自动清空表单继续录下一件
- **数据备份**：JSON 导出与导入，一键清空库存
- **多端**：响应式布局（手机底部 Tab / 平板侧边栏）、PWA、Android APK

## 技术栈

- React 18 + TypeScript + Vite 6
- 数据持久化：`localStorage`（键名 `pantry-keeper.v1`）
- 图标：lucide-react
- 移动端：Capacitor 8（Android）

## 快速开始

需要 Node.js 20+ 与 npm。

```bash
git clone https://github.com/LinuxMint-User/pantryKeeper.git
cd pantryKeeper
npm install
npm run dev
```

开发服务器默认监听 `0.0.0.0:5173`，同一局域网内的手机也可以直接访问。

构建与本地预览：

```bash
npm run build
npm run preview
```

`npm run build` 会先执行 TypeScript 类型检查，再产出 `dist/`。

## 打包 Android

需要 JDK 17/21、Android SDK（含 API 35 的 build-tools），并设置 `ANDROID_HOME`。

```bash
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```

产物位于：

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

这是 debug 签名的安装包，适合自用测试；如需分发，请自行配置 release 签名。

## 数据与备份

- 所有数据存放在浏览器的 `localStorage`，不会上传到任何服务器。
- 清理浏览器数据、卸载应用或重装系统都可能导致数据丢失，建议定期在设置页导出 JSON 备份。
- 导入时会校验备份格式，非法文件不会覆盖现有数据。
- 备份包含物品、批次、出入库记录和设置。

## 过期计算规则

- 保质期按自然月/年推进，遇到月末自动收敛：1 月 31 日 + 1 个月 = 2 月 28/29 日。
- 「仅年月」的过期日期按当月最后一天入库与计算，避免月初就误报过期。
- 临期阈值默认 30 天，可在设置中调整。

## 项目结构

```text
src/
  components/   页面与弹层组件（首页、详情、统计、各类表单）
  lib/
    expiry.ts   日期、保质期推算与过期状态
    store.ts    数据读写、校验与备份解析
    categories.ts  分类与单位
    nav.ts      导航与筛选类型
  types.ts      数据模型
public/         PWA manifest、Service Worker 与图标
android/        Capacitor 生成的 Android 工程
```

## 已知限制

- 数据仅存本机，暂不支持多设备同步。
- 目前只生成了 Android 工程；如需要 iOS，可自行执行 `npx cap add ios`。
- 备份为 JSON 明文，请自行妥善保管。
