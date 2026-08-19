import { TextEncoder } from 'node:util'

import { vi } from 'vitest'
import { SignJWT } from 'jose'
import { statusCodes } from '@defra/lis-infra-ui-services/status-codes'
import { createSpokeAuthToken } from '@defra/lis-hubs-infra-access/auth'

import { config } from '#config/config.js'
import { createServer } from '#server/server.js'

const { getSheepForCph, getCphsForUser } = vi.hoisted(() => ({
  getSheepForCph: vi.fn(),
  getCphsForUser: vi.fn()
}))

vi.mock('#server/services/sheep-home-api.js', () => ({
  createSheepHomeApi: () => ({ getSheepForCph, getCphsForUser })
}))

const encoder = new TextEncoder()

async function createHubJwt(permissions = ['lis-perm-sheep-read']) {
  return new SignJWT({
    email: 'test.user@example.com',
    firstName: 'Test',
    lastName: 'User',
    roles: [],
    permissions,
    serviceId: 'test-service'
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject('test-user')
    .setIssuer(config.get('auth.hubJwt.issuer'))
    .setAudience(config.get('auth.hubJwt.audience'))
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(encoder.encode(config.get('auth.hubJwt.secret')))
}

async function createHubServiceToken() {
  return createSpokeAuthToken(
    {
      taxonomyId: 'home',
      spokeId: 'sheep-home',
      user: {
        sub: 'test-user',
        email: 'test.user@example.com',
        firstName: 'Test',
        lastName: 'User',
        roles: [],
        permissions: ['lis-perm-sheep-read']
      }
    },
    {
      secret: config.get('auth.hubJwt.secret'),
      issuer: config.get('auth.hubJwt.issuer'),
      audience: config.get('auth.hubJwt.audience'),
      ttlSeconds: config.get('auth.hubJwt.ttlSeconds')
    }
  )
}

describe('#homeController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('Should provide expected response', async () => {
    getCphsForUser.mockResolvedValue({
      source: 'cph-provider',
      cached_until_utc: '2026-07-15T12:00:00Z',
      data: [{ name: 'My farm', cph: '10/081/1234', postcode: 'MK11 1AA' }]
    })
    getSheepForCph.mockResolvedValue({
      data: [
        {
          eartag: 'UK123456100001',
          sex: 'Female',
          breed: 'HF',
          status: 'saved'
        },
        {
          eartag: 'UK123456100002',
          sex: 'Male',
          breed: 'AA',
          status: 'draft'
        },
        { eartag: 'UK123456100003', sex: 'Female', breed: 'JE' }
      ]
    })
    const request = {
      method: 'GET',
      url: '/10/081/1234',
      headers: {
        'x-cdp-request-id': 'trace-123'
      }
    }

    const jwt = await createHubJwt()
    request.headers.cookie = `${config.get('auth.hubJwt.cookieName')}=${jwt}`

    const { result, statusCode } = await server.inject(request)

    expect(result).toEqual(expect.stringContaining('Home for Sheep |'))
    expect(result).toEqual(expect.stringContaining('My farm'))
    expect(result).toEqual(expect.stringContaining('10/081/1234'))
    expect(result).toEqual(expect.stringContaining('3 sheep'))
    expect(result).toEqual(expect.stringContaining('MK11 1AA'))
    expect(result).toEqual(
      expect.stringContaining('href="/sheep/register/10/081/1234"')
    )
    expect(result).toEqual(
      expect.stringContaining('href="/sheep/move/10/081/1234"')
    )
    expect(result).toEqual(
      expect.stringContaining('href="/sheep/death/10/081/1234"')
    )
    expect(result).toEqual(expect.stringContaining('UK123456100001'))
    expect(result).toEqual(expect.stringContaining('Female'))
    expect(result).toEqual(expect.stringContaining('HF'))
    expect(result).toEqual(expect.stringContaining('Validated'))
    expect(result).toEqual(expect.stringContaining('Pending'))
    expect(getCphsForUser).toHaveBeenCalledWith(
      'test.user@example.com',
      'trace-123'
    )
    expect(statusCode).toBe(statusCodes.ok)
  })

  test('Should provide a summary fragment to the front-office hub', async () => {
    getCphsForUser.mockResolvedValue({
      data: [{ name: 'My farm', cph: '10/081/1234' }]
    })
    getSheepForCph.mockResolvedValue({ data: [{}, {}] })
    const bearerToken = await createHubServiceToken()

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/summary',
      headers: { authorization: bearerToken }
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toEqual(expect.stringContaining('My farm'))
    expect(result).toEqual(expect.stringContaining('10/081/1234'))
    expect(result).toEqual(expect.stringContaining('>2</dd>'))
    expect(result).not.toEqual(expect.stringContaining('<html'))
  })

  test('Should reject summary requests without a hub-service token', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/summary'
    })

    expect(statusCode).toBe(statusCodes.unauthorized)
    expect(result).toEqual({ message: 'Hub service authentication required' })
  })

  test('Should provide structured summary data to the front-office hub', async () => {
    getCphsForUser.mockResolvedValue({
      data: [
        {
          name: 'My farm',
          cph: '10/081/1234',
          postcode: 'MK11 1AA'
        }
      ]
    })
    getSheepForCph.mockResolvedValue({
      data: [
        {
          sheep_id: 'UK012345600001',
          eartag: 'UK012345600001',
          date_of_birth: '2025-02-03',
          sex: 'Female',
          breed: 'Texel',
          status: 'saved'
        }
      ]
    })
    const bearerToken = await createHubServiceToken()

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/summary-data',
      headers: { authorization: bearerToken }
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toEqual({
      species: {
        id: 'sheep',
        label: 'Sheep',
        url: '/sheep/home'
      },
      holdings: [
        {
          farmName: 'My farm',
          cph: '10/081/1234',
          postcode: 'MK11 1AA',
          count: 1,
          url: '/sheep/home/10/081/1234',
          animals: [
            {
              id: 'UK012345600001',
              earTag: 'UK012345600001',
              dateOfBirth: '2025-02-03',
              dateRegistered: undefined,
              sex: 'Female',
              breed: 'Texel',
              status: 'saved',
              statusLabel: 'Validated'
            }
          ]
        }
      ],
      actions: []
    })
  })

  test('Should redirect to the hub when the JWT is missing', async () => {
    const { headers, statusCode } = await server.inject({
      method: 'GET',
      url: '/'
    })

    expect(statusCode).toBe(302)
    expect(headers.location).toContain(
      'https://front-office.lis.defra/auth/login?returnUrl=%2Fsheep%2Fhome'
    )
  })

  test('Should return forbidden when the user lacks the sheep module permission', async () => {
    const jwt = await createHubJwt(['lis-perm-sheep-move-read'])
    const { statusCode, result } = await server.inject({
      method: 'GET',
      url: '/',
      headers: {
        cookie: `${config.get('auth.hubJwt.cookieName')}=${jwt}`
      }
    })

    expect(statusCode).toBe(statusCodes.forbidden)
    expect(result).toEqual({ message: 'Module access denied' })
  })
})
