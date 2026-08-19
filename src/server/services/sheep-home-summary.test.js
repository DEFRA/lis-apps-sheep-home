import { buildSheepHomeSummary } from './sheep-home-summary.js'

describe('#buildSheepHomeSummary', () => {
  test('Builds counts for every CPH and an overall total', async () => {
    const sheepHomeApi = {
      getCphsForUser: vi.fn().mockResolvedValue({
        data: [
          { name: 'My farm', cph: '10/081/1234' },
          { name: 'My other farm', cph: '12/091/6278' }
        ]
      }),
      getSheepForCph: vi
        .fn()
        .mockResolvedValueOnce({
          data: [{ status: 'saved' }, { status: 'draft' }, {}]
        })
        .mockResolvedValueOnce({ data: [{}] })
    }

    const summary = await buildSheepHomeSummary({
      sheepHomeApi,
      userId: 'test.user@example.com',
      traceId: 'trace-123'
    })

    expect(summary).toEqual({
      holdings: [
        {
          name: 'My farm',
          cph: '10/081/1234',
          sheep: [
            {
              status: 'saved',
              statusLabel: 'Validated',
              statusClass: 'govuk-tag--green'
            },
            {
              status: 'draft',
              statusLabel: 'Pending',
              statusClass: 'govuk-tag--blue'
            },
            {
              statusLabel: 'Pending',
              statusClass: 'govuk-tag--blue'
            }
          ],
          sheepCount: 3
        },
        {
          name: 'My other farm',
          cph: '12/091/6278',
          sheep: [
            {
              statusLabel: 'Pending',
              statusClass: 'govuk-tag--blue'
            }
          ],
          sheepCount: 1
        }
      ],
      totalSheep: 4
    })
    expect(sheepHomeApi.getSheepForCph).toHaveBeenCalledTimes(2)
    expect(sheepHomeApi.getSheepForCph).toHaveBeenCalledWith(
      '10/081/1234',
      'trace-123'
    )
    expect(sheepHomeApi.getSheepForCph).toHaveBeenCalledWith(
      '12/091/6278',
      'trace-123'
    )
  })

  test('Returns an empty summary when the user has no CPHs', async () => {
    const sheepHomeApi = {
      getCphsForUser: vi.fn().mockResolvedValue({ data: [] }),
      getSheepForCph: vi.fn()
    }

    const summary = await buildSheepHomeSummary({
      sheepHomeApi,
      userId: 'test.user@example.com'
    })

    expect(summary).toEqual({ holdings: [], totalSheep: 0 })
    expect(sheepHomeApi.getSheepForCph).not.toHaveBeenCalled()
  })
})
