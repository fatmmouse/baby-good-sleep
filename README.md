# 宝宝爱睡觉 · 你的主动式睡眠搭子

AdventureX 黑客松作品:睡前一键布置卧室环境,睡眠中系统每 5 秒自动巡检温湿度与光照、
偏离偏好即自动调节,醒来生成完整睡眠报告。硬件层当前为模拟器,接口已为 RDK X5 预留。

## 快速开始

```bash
npm install
npx prisma migrate dev   # 初始化 SQLite(prisma/dev.db)
npm run seed             # 写入小明 / 乐乐样板账号与历史记录
npm run dev              # http://localhost:3000
```

可选:语音自然语言解析需要在项目根 `.env` 添加 `STEPFUN_API_KEY=<你的 key>`。
未配置时六条快捷指令仍可立即执行,其他说法会安全降级。模型默认
`step-3.5-flash`,也可用服务器变量 `STEPFUN_MODEL` 覆盖。

样板账号可从欢迎页直接取回:

- 成人模式:昵称「小明」
- 儿童模式:昵称「乐乐」,年龄 3

## 演示动线(评委版)

1. 欢迎页选身份、输昵称,「入夜」一键进入(自动预置 4 套睡眠方案)
2. 仪表盘右下角「演示」面板,把温度拉到 15℃(模拟环境突变)
3. 「开始睡眠」→ 数秒内看系统自动弹出「检测到偏冷,已升温至 23.5℃」,温度曲线回升
4. 「结束睡眠」→ 查看睡眠报告(时长、调节次数、温湿度曲线、睡眠分期)

## 验证

```bash
npm run test      # 模拟器 + 自动调节判断的单元测试
npx tsc --noEmit  # 类型检查
```

## 文档

- 设计 spec(权威):`docs/superpowers/specs/2026-07-24-baby-good-sleep-design.md`
- 实现计划与执行状态:`docs/superpowers/plans/2026-07-24-baby-good-sleep.md`
- AI 协作约定:`AGENTS.md`
