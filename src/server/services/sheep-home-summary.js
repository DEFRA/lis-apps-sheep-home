/**
 * @param {{ sheepHomeApi: object, userId: string, traceId?: string }} options
 * @returns {Promise<{ holdings: object[], totalSheep: number }>}
 */
export async function buildSheepHomeSummary({ sheepHomeApi, userId, traceId }) {
  const cphResponse = await sheepHomeApi.getCphsForUser(userId, traceId)
  const holdings = await Promise.all(
    cphResponse.data.map(async (holding) => {
      const sheepResponse = await sheepHomeApi.getSheepForCph(
        holding.cph,
        traceId
      )

      return {
        ...holding,
        sheep: sheepResponse.data.map(addDisplayStatus),
        sheepCount: sheepResponse.data.length
      }
    })
  )

  return {
    holdings,
    totalSheep: holdings.reduce(
      (total, holding) => total + holding.sheepCount,
      0
    )
  }
}

function addDisplayStatus(animal) {
  const isValidated = animal.status === 'saved'

  return {
    ...animal,
    statusLabel: isValidated ? 'Validated' : 'Pending',
    statusClass: isValidated ? 'govuk-tag--green' : 'govuk-tag--blue'
  }
}
