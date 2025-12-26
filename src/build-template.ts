import {
  BuildInfo,
  defaultBuildLogger,
  Template,
  waitForFile
} from '@e2b/code-interpreter'
import * as core from '@actions/core'

export async function buildTemplates({
  dockerTags,
  cpuCount,
  memoryMB
}: {
  dockerTags: string[]
  cpuCount: number
  memoryMB: number
}): Promise<string[]> {
  // Change to workspace directory so E2B can find files (Dockerfile, package.json, etc.)
  const workspace = process.env.GITHUB_WORKSPACE || process.cwd()
  process.chdir(workspace)
  core.info(`Working directory: ${workspace}`)

  // Map dockerTag -> alias (deduped by alias)
  const tagToAlias = new Map<string, string>()

  for (const dockerTag of dockerTags) {
    const alias = getAliasFromDockerTag(dockerTag)
    // Only keep first occurrence of each alias
    if (!Array.from(tagToAlias.values()).includes(alias)) {
      tagToAlias.set(dockerTag, alias)
    }
  }

  const entries = Array.from(tagToAlias.entries())

  const buildInfos: BuildInfo[] = []

  // We first build the first one, so that the follow up ones are cached
  const [firstDockerTag, firstAlias] = entries[0]
  const firstBuildInfo = await buildAlias({
    alias: firstAlias,
    cpuCount,
    memoryMB,
    workspacePath: workspace,
    dockerTag: firstDockerTag
  })
  buildInfos.push(firstBuildInfo)

  // We then build the rest of the templates in parallel
  const buildPromises = entries.slice(1).map(([dockerTag, alias]) =>
    buildAlias({
      alias,
      cpuCount,
      memoryMB,
      workspacePath: workspace,
      dockerTag
    })
  )
  const otherBuildInfos = await Promise.all(buildPromises)
  buildInfos.push(...otherBuildInfos)

  const builtAliases = buildInfos.map((buildInfo) => buildInfo.alias)

  // Log built aliases
  core.startGroup('Built sandbox aliases')
  for (const alias of builtAliases) {
    core.info(alias)
  }
  core.endGroup()

  return builtAliases
}

async function buildAlias({
  alias,
  cpuCount,
  memoryMB,
  workspacePath,
  dockerTag
}: {
  alias: string
  cpuCount: number
  memoryMB: number
  workspacePath: string
  dockerTag: string
}) {
  core.info(`Building alias: ${alias}`)

  const template = Template({
    fileContextPath: workspacePath
  })
    .skipCache()
    .fromImage(dockerTag)
    .setWorkdir('/home/user/app')
    .setEnvs({
      PROJECT_ROOT: '/home/user/app'
    })
    .setStartCmd(
      'pm2 start /home/user/utils/ecosystem.config.json',
      waitForFile('/home/user/app/package.json')
    )

  const buildInfo = await Template.build(template, {
    alias,
    cpuCount,
    memoryMB,
    onBuildLogs: defaultBuildLogger()
  })

  core.info(`Built alias: ${buildInfo.alias}`)
  return buildInfo
}

function getAliasFromDockerTag(dockerTag: string): string {
  // The docker tag is: ghcr.io/imagine-projects/template-tanstack-start:pr-16
  // The alias should be: template-tanstack-start-pr-16
  // We get rid of everything before the last / and replace : with -
  const lastSlashIndex = dockerTag.lastIndexOf('/')
  if (lastSlashIndex === -1) {
    throw new Error(`Invalid docker tag: ${dockerTag}`)
  }
  const alias = dockerTag.slice(lastSlashIndex + 1).replace(/:/g, '-')
  return alias
}
