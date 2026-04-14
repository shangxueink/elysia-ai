const fs = require('node:fs')
const path = require('node:path')

function patchTsConfig() {
  try {
    // 检查当前脚本是否在开发环境中运行
    // 如果路径包含 node_modules，说明是作为依赖安装的，应该跳过执行
    if (__dirname.includes('node_modules')) {
      console.log('🔍 检测到作为依赖安装，跳过 tsconfig 配置')
      return
    }

    // 如果路径不包含 external，也跳过执行（额外安全检查）
    if (!__dirname.includes('external')) {
      console.log('🔍 检测到非开发环境，跳过 tsconfig 配置')
      return
    }

    console.log('🚀 开发环境检测通过，开始配置 tsconfig')

    // 找到项目根目录的 tsconfig.json
    let currentDir = __dirname
    let rootTsConfigPath = null

    // 向上查找直到找到包含 package.json 的根目录
    while (currentDir !== path.parse(currentDir).root) {
      const packageJsonPath = path.join(currentDir, 'package.json')
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
        if (packageJson.name === 'koishi-app' || packageJson.dependencies?.koishi) {
          rootTsConfigPath = path.join(currentDir, 'tsconfig.json')
          break
        }
      }
      currentDir = path.dirname(currentDir)
    }

    if (!rootTsConfigPath || !fs.existsSync(rootTsConfigPath)) {
      console.error('❌ 无法找到 Koishi 项目的 tsconfig.json')
      process.exit(1)
    }

    console.log(`📁 找到 tsconfig.json: ${rootTsConfigPath}`)

    const tsconfigContent = fs.readFileSync(rootTsConfigPath, 'utf8')
    const newPath = 'external/elysia-ai/packages/*/src'

    if (tsconfigContent.includes(newPath)) {
      console.log('✅ 路径配置已存在，无需修改')
      return
    }

    const koishiPluginPattern = /("koishi-plugin-\*": \[\s*)([^\]]+?)(\s*\]\s*,)/
    const match = tsconfigContent.match(koishiPluginPattern)

    if (!match) {
      console.error('❌ 无法找到 "koishi-plugin-*" 配置')
      process.exit(1)
    }

    const prefix = match[1]
    const existingPaths = match[2]
    const suffix = match[3]

    const cleanExistingPaths = existingPaths.trim().replace(/,\s*$/, '')
    const updatedPaths = cleanExistingPaths + ',\n        "' + newPath + '"'

    const newContent = tsconfigContent.replace(
      koishiPluginPattern,
      prefix + updatedPaths + suffix
    )

    fs.writeFileSync(rootTsConfigPath, newContent, 'utf8')

    console.log('✅ 成功更新 tsconfig.json')
    console.log(`📋 在 "koishi-plugin-*" 配置中添加了路径: ${newPath}`)
  } catch (error) {
    console.error('❌ 更新 tsconfig.json 时出错:', error.message)
    process.exit(1)
  }
}

patchTsConfig()
