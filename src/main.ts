import * as core from '@actions/core'
import { buildTemplates } from './build-template.js'

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  const sandboxProviderApiKey = core.getInput('sandboxProviderApiKey')
  const dockerTags = core
    .getInput('dockerTags')
    .split('\n')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)

  if (!sandboxProviderApiKey) {
    core.setFailed('sandboxProviderApiKey is required')
    return
  }

  // Set API key for sandbox provider
  process.env.E2B_API_KEY = sandboxProviderApiKey

  if (!dockerTags.length) {
    core.setFailed('Docker tags are required')
    return
  }

  core.info(
    `Parsed ${dockerTags.length} docker tags: ${JSON.stringify(dockerTags)}`
  )

  core.startGroup('Docker tags')
  for (const dockerTag of dockerTags) {
    core.info(dockerTag)
  }
  core.endGroup()

  // Get CPU count and memory from inputs
  const cpuCount = parseInt(core.getInput('cpuCount'))
  const memoryMB = parseInt(core.getInput('memoryMB'))

  try {
    // Debug logs are only output if the `ACTIONS_STEP_DEBUG` secret is true
    const result = await buildTemplates({
      dockerTags,
      cpuCount,
      memoryMB
    })

    core.setOutput('aliases', result.join(','))

    // Set outputs for other workflow steps to use
    // core.setOutput('time', new Date().toTimeString())
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
