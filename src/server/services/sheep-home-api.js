import { getLoggerForConfig } from '@defra/lis-infra-ui-services/logging'

const cphSegmentCount = 3

/**
 * Error returned for an unsuccessful or invalid sheep-home API response.
 */
export class SheepHomeApiError extends Error {
  /**
   * @param {string} message Error description
   * @param {{ cause?: Error, statusCode?: number }} options Error metadata
   */
  constructor(message, options = {}) {
    super(message, options)
    this.name = 'SheepHomeApiError'
    this.statusCode = options.statusCode
  }
}

/**
 * @param {{ config: object, fetchImpl?: Function }} options
 * @returns {object} Sheep-home API operations
 */
export function createSheepHomeApi({ config, fetchImpl = globalThis.fetch }) {
  if (!config?.get) {
    throw new TypeError(
      'Sheep home API client requires a config object with a get method'
    )
  }

  if (typeof fetchImpl !== 'function') {
    throw new TypeError('Sheep home API client requires a fetch implementation')
  }

  const logger = getLoggerForConfig(config)
  const baseUrl = new URL(config.get('sheepHomeApi.url'))
  const apiKey = config.get('sheepHomeApi.apiKey')
  const apiKeyHeader = config.get('sheepHomeApi.apiKeyHeader')
  const timeout = config.get('sheepHomeApi.timeout')
  const tracingHeader = config.get('tracing.header')

  async function getJson(path, traceId) {
    const url = new URL(path, ensureTrailingSlash(baseUrl))
    const headers = { accept: 'application/json' }

    if (apiKey) {
      headers[apiKeyHeader] = apiKey
    }

    if (traceId) {
      headers[tracingHeader] = traceId
    }

    logger.info('Getting data from the sheep-home API')

    const response = await fetchImpl(url, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(timeout)
    })

    if (!response.ok) {
      throw new SheepHomeApiError(
        `Sheep home API request failed with status ${response.status}`,
        { statusCode: response.status }
      )
    }

    try {
      return await response.json()
    } catch (error) {
      throw new SheepHomeApiError(
        'Sheep home API returned an invalid JSON response',
        { cause: error, statusCode: response.status }
      )
    }
  }

  return {
    getCphsForUser(userId, traceId) {
      return getJson(`api/users/${encodeURIComponent(userId)}/cphs`, traceId)
    },

    getSheepForCph(cph, traceId) {
      const cphSegments = cph.split('/')

      if (
        cphSegments.length !== cphSegmentCount ||
        cphSegments.some((part) => !part)
      ) {
        throw new TypeError('CPH must contain county, parish and holding')
      }

      const encodedCph = cphSegments.map(encodeURIComponent).join('/')
      return getJson(`api/cphs/${encodedCph}/sheep`, traceId)
    },

    getSheepDetails(sheepId, traceId) {
      return getJson(`api/sheep/${encodeURIComponent(sheepId)}`, traceId)
    }
  }
}

function ensureTrailingSlash(url) {
  const value = new URL(url)
  value.pathname = `${value.pathname.replace(/\/$/, '')}/`
  return value
}
