import { BuildInfo, defaultBuildLogger, Template, waitForFile } from '@e2b/code-interpreter'
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
    dockerTag: firstDockerTag,
    alias: firstAlias,
    cpuCount,
    memoryMB
  })
  buildInfos.push(firstBuildInfo)

  // We then build the rest of the templates in parallel
  const buildPromises = entries.slice(1).map(([dockerTag, alias]) =>
    buildAlias({
      dockerTag,
      alias,
      cpuCount,
      memoryMB
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
  dockerTag,
  alias,
  cpuCount,
  memoryMB
}: {
  dockerTag: string
  alias: string
  cpuCount: number
  memoryMB: number
}) {
  core.info(`Building alias: ${alias}`)
  const template = Template()
    .fromImage(dockerTag)
    .skipCache()
    .setWorkdir('/home/user/app')
    .setStartCmd("/bin/sh", waitForFile("/home/user/app/package.json"))

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
