import { describe, expect, test, vi } from 'vitest'
import {
  buildHoldingActionLinks,
  cphFromParams,
  cphPath
} from './controller.js'
import { home } from './index.js'

describe('home holding paths', () => {
  test('builds a CPH from the three route segments', () => {
    expect(
      cphFromParams({ county: '10', parish: '081', holding: '1234' })
    ).toBe('10/081/1234')
    expect(cphFromParams()).toBeNull()
    expect(cphFromParams({ county: '10', parish: '081' })).toBeNull()
  })

  test('retains slash-separated CPHs in URLs', () => {
    expect(cphPath('10/081/1234')).toBe('10/081/1234')
    expect(buildHoldingActionLinks('10/081/1234')).toEqual([
      {
        text: 'Register sheep',
        url: '/sheep/register/10/081/1234'
      },
      {
        text: 'Move sheep',
        url: '/sheep/move/10/081/1234'
      },
      {
        text: 'Report a sheep death',
        url: '/sheep/death/10/081/1234'
      }
    ])
  })

  test('registers both collection and holding detail routes', () => {
    const route = vi.fn()
    home.plugin.register({ route })

    expect(route).toHaveBeenCalledOnce()
    expect(route.mock.calls[0][0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ method: 'GET', path: '/' }),
        expect.objectContaining({
          method: 'GET',
          path: '/{county}/{parish}/{holding}'
        })
      ])
    )
  })
})
