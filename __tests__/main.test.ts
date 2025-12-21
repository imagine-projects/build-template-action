/**
 * Unit tests for the action's main functionality, src/main.ts
 */
import { jest } from '@jest/globals'
import * as core from '../__fixtures__/core.js'

// Mock buildTemplates
const mockBuildTemplates = jest.fn()

// Mocks should be declared before the module being tested is imported.
jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule('../src/build-template.js', () => ({
  buildTemplates: mockBuildTemplates
}))

// The module being tested should be imported dynamically.
const { run } = await import('../src/main.js')

describe('main.ts', () => {
  beforeEach(() => {
    // Reset process.env
    delete process.env.E2B_API_KEY
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('fails if sandboxProviderApiKey is not provided', async () => {
    core.getInput.mockImplementation((name: string) => {
      if (name === 'sandboxProviderApiKey') return ''
      if (name === 'name') return 'test-template'
      if (name === 'dockerTags') return 'ghcr.io/org/image:tag'
      return ''
    })

    await run()

    expect(core.setFailed).toHaveBeenCalledWith(
      'sandboxProviderApiKey is required'
    )
  })

  it('fails if name is not provided', async () => {
    core.getInput.mockImplementation((name: string) => {
      if (name === 'sandboxProviderApiKey') return 'test-api-key'
      if (name === 'name') return ''
      if (name === 'dockerTags') return 'ghcr.io/org/image:tag'
      return ''
    })

    await run()

    expect(core.setFailed).toHaveBeenCalledWith('Name is required')
  })

  it('fails if dockerTags is empty', async () => {
    core.getInput.mockImplementation((name: string) => {
      if (name === 'sandboxProviderApiKey') return 'test-api-key'
      if (name === 'name') return 'test-template'
      if (name === 'dockerTags') return ''
      return ''
    })

    await run()

    expect(core.setFailed).toHaveBeenCalledWith('Docker tags are required')
  })

  it('builds template with 1 docker tag', async () => {
    const dockerTag = 'ghcr.io/your-org/your-image:your-tag' // TODO: Fill in your docker tag

    core.getInput.mockImplementation((name: string) => {
      if (name === 'sandboxProviderApiKey') return 'test-api-key'
      if (name === 'name') return 'test-template'
      if (name === 'dockerTags') return dockerTag
      if (name === 'cpuCount') return '4'
      if (name === 'memoryMB') return '2048'
      return ''
    })

    // Note: alias has : replaced with - (e.g. your-image:your-tag -> your-image-your-tag)
    mockBuildTemplates.mockResolvedValue(['your-image-your-tag'] as never)

    await run()

    expect(mockBuildTemplates).toHaveBeenCalledWith({
      name: 'test-template',
      dockerTags: [dockerTag],
      cpuCount: 4,
      memoryMB: 2048
    })

    expect(core.setOutput).toHaveBeenCalledWith(
      'aliases',
      'your-image-your-tag'
    )
    expect(process.env.E2B_API_KEY).toBe('test-api-key')
  })

  it('handles buildTemplates error', async () => {
    core.getInput.mockImplementation((name: string) => {
      if (name === 'sandboxProviderApiKey') return 'test-api-key'
      if (name === 'name') return 'test-template'
      if (name === 'dockerTags') return 'ghcr.io/org/image:tag'
      if (name === 'cpuCount') return '4'
      if (name === 'memoryMB') return '2048'
      return ''
    })

    mockBuildTemplates.mockRejectedValue(new Error('Build failed') as never)

    await run()

    expect(core.setFailed).toHaveBeenCalledWith('Build failed')
  })
})
