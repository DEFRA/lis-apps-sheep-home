import { buildMicrositePath } from '@defra/lis-infra-ui-services'
import { taxonomy } from '@defra/lis-taxonomy-home'
import { species } from '@defra/lis-species-sheep'
import { config } from '#config/config.js'
import { createSheepHomeApi } from '#server/services/sheep-home-api.js'
import { buildSheepHomeSummary } from '#server/services/sheep-home-summary.js'
import { statusCodes } from '@defra/lis-infra-ui-services/status-codes'

const sheepHomeApi = createSheepHomeApi({ config })

export const homeController = {
  async handler(request, h) {
    const viewModel = await buildViewModel(request)
    const selectedCph = cphFromParams(request.params)
    const selectedHolding = selectedCph
      ? viewModel.holdings.find((holding) => holding.cph === selectedCph)
      : viewModel.holdings[0]
    if (selectedCph && !selectedHolding) {
      return h.response('Page not found').code(statusCodes.notFound)
    }
    const actionLinks = selectedHolding
      ? buildHoldingActionLinks(selectedHolding.cph)
      : []
    const homePath = buildMicrositePath(taxonomy.id, species.id)
    const holdingLinks = viewModel.holdings.map((holding) => ({
      ...holding,
      url: `${homePath}/${cphPath(holding.cph)}`,
      selected: holding.cph === selectedHolding?.cph
    }))

    return h.view('home/index', {
      pageTitle: 'Home for Sheep',
      heading: 'Home for Sheep',
      caption: 'Spoke microsite',
      taxonomy,
      species,
      ...viewModel,
      selectedCph,
      selectedHolding,
      holdingLinks,
      actionLinks,
      directPort: 3500,
      hubPath: buildMicrositePath(taxonomy.id, species.id)
    })
  }
}

/**
 * @param {string} cph holding identifier
 * @returns {{ text: string, url: string }[]} holding-scoped action links
 */
export function buildHoldingActionLinks(cph) {
  return [
    { text: 'Register sheep', taxonomyId: 'register' },
    { text: 'Move sheep', taxonomyId: 'move' },
    { text: 'Report a sheep death', taxonomyId: 'death' }
  ].map(({ text, taxonomyId }) => ({
    text,
    url: `${buildMicrositePath(taxonomyId, species.id)}/${cphPath(cph)}`
  }))
}

export const summaryController = {
  async handler(request, h) {
    const viewModel = await buildViewModel(request)

    return h.view('home/summary', {
      holdings: viewModel.holdings,
      totalSheep: viewModel.totalSheep,
      hubPath: buildMicrositePath(taxonomy.id, species.id)
    })
  }
}

export const summaryDataController = {
  async handler(request, h) {
    const viewModel = await buildViewModel(request)
    const homePath = buildMicrositePath(taxonomy.id, species.id)

    return h.response({
      species: {
        id: species.id,
        label: species.label,
        url: homePath
      },
      holdings: viewModel.holdings.map((holding) => ({
        farmName: holding.name,
        cph: holding.cph,
        postcode: holding.postcode,
        count: holding.sheepCount,
        url: `${homePath}/${cphPath(holding.cph)}`,
        animals: holding.sheep.map((animal) => ({
          id: animal.sheep_id ?? animal.sheepId ?? animal.eartag,
          earTag: animal.eartag,
          dateOfBirth: animal.date_of_birth ?? animal.dateOfBirth,
          dateRegistered: animal.date_registered ?? animal.dateRegistered,
          sex: animal.sex,
          breed: animal.breed,
          status: animal.status,
          statusLabel: animal.statusLabel
        }))
      })),
      actions: []
    })
  }
}

/**
 * @param {{ county?: string, parish?: string, holding?: string }} params route parameters
 * @returns {string|null} slash-separated CPH
 */
export function cphFromParams({ county, parish, holding } = {}) {
  return county && parish && holding ? `${county}/${parish}/${holding}` : null
}

/**
 * @param {string} cph holding identifier
 * @returns {string} encoded CPH path
 */
export function cphPath(cph) {
  return cph.split('/').map(encodeURIComponent).join('/')
}

async function buildViewModel(request) {
  const displayName =
    [request.app.hubAuth?.firstName, request.app.hubAuth?.lastName]
      .filter(Boolean)
      .join(' ') || null
  const userId = request.app.hubAuth?.email ?? request.app.hubAuth?.sub
  const signedInAs =
    request.app.hubAuth?.email ?? displayName ?? userId ?? 'Authenticated user'
  const traceId = request.headers[config.get('tracing.header')]
  const summary = await buildSheepHomeSummary({
    sheepHomeApi,
    userId,
    traceId
  })

  return { signedInAs, ...summary }
}
