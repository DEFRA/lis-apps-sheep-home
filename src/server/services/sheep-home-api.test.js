import { createSheepHomeApi, SheepHomeApiError } from './sheep-home-api.js'

const configValues = {
  'sheepHomeApi.url': 'http://localhost:8085',
  'sheepHomeApi.apiKey': 'test-api-key',
  'sheepHomeApi.apiKeyHeader': 'x-api-key',
  'sheepHomeApi.timeout': 5000,
  'tracing.header': 'x-cdp-request-id',
  log: {
    enabled: false,
    level: 'silent',
    format: 'json',
    redact: []
  },
  serviceName: 'Sheep home API client test',
  serviceVersion: null
}

const config = {
  get(key) {
    return configValues[key]
  }
}

function jsonResponse(data, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue(data)
  }
}

describe('#createSheepHomeApi', () => {
  test('Gets CPHs for an encoded user ID with API and tracing headers', async () => {
    const payload = { source: 'cph-provider', data: [] }
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(payload))
    const client = createSheepHomeApi({ config, fetchImpl })

    const result = await client.getCphsForUser(
      'test.user+home@example.com',
      'trace-123'
    )

    expect(result).toEqual(payload)
    expect(fetchImpl).toHaveBeenCalledWith(
      new URL(
        'http://localhost:8085/api/users/test.user%2Bhome%40example.com/cphs'
      ),
      {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'x-api-key': 'test-api-key',
          'x-cdp-request-id': 'trace-123'
        },
        signal: expect.any(AbortSignal)
      }
    )
  })

  test('Gets sheep using the three CPH route segments', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: [] }))
    const client = createSheepHomeApi({ config, fetchImpl })

    await client.getSheepForCph('10/081/1234')

    expect(fetchImpl.mock.calls[0][0].toString()).toBe(
      'http://localhost:8085/api/cphs/10/081/1234/sheep'
    )
  })

  test('Rejects malformed CPH values without making a request', async () => {
    const fetchImpl = vi.fn()
    const client = createSheepHomeApi({ config, fetchImpl })

    expect(() => client.getSheepForCph('10/081')).toThrow(
      'CPH must contain county, parish and holding'
    )
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  test('Gets details using an encoded sheep ID', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: {} }))
    const client = createSheepHomeApi({ config, fetchImpl })

    await client.getSheepDetails('UK 123/456')

    expect(fetchImpl.mock.calls[0][0].toString()).toBe(
      'http://localhost:8085/api/sheep/UK%20123%2F456'
    )
  })

  test('Raises a typed error when the API request fails', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse(null, { ok: false, status: 503 }))
    const client = createSheepHomeApi({ config, fetchImpl })

    await expect(client.getCphsForUser('test-user')).rejects.toEqual(
      expect.objectContaining({
        name: 'SheepHomeApiError',
        statusCode: 503,
        message: 'Sheep home API request failed with status 503'
      })
    )
  })

  test('Raises a typed error when the response is not JSON', async () => {
    const response = jsonResponse(null)
    response.json.mockRejectedValue(new SyntaxError('Invalid JSON'))
    const fetchImpl = vi.fn().mockResolvedValue(response)
    const client = createSheepHomeApi({ config, fetchImpl })

    await expect(client.getCphsForUser('test-user')).rejects.toBeInstanceOf(
      SheepHomeApiError
    )
  })
})
