/** @import { CheerioAPI } from 'cheerio' */
import { fileURLToPath } from 'node:url'
import path from 'path'
import nunjucks from 'nunjucks'
import { load } from 'cheerio'
import { camelCase } from 'lodash'

const JSON_INDENT_SPACES = 2

const dirname = path.dirname(fileURLToPath(import.meta.url))
const nunjucksTestEnv = nunjucks.configure(
  [
    '../node_modules/govuk-frontend/dist/',
    path.normalize(path.resolve(dirname, '../src/server/common/templates')),
    path.normalize(path.resolve(dirname, '../src/server/common/components'))
  ],
  {
    trimBlocks: true,
    lstripBlocks: true
  }
)

/**
 * @param {string} componentName
 * @param {object} params
 * @param {string} [callBlock]
 * @returns {CheerioAPI}
 */
export function renderComponent(componentName, params, callBlock) {
  const macroPath = `${componentName}/macro.njk`
  const macroName = `app${
    componentName.charAt(0).toUpperCase() + camelCase(componentName.slice(1))
  }`
  const macroParams = JSON.stringify(params, null, JSON_INDENT_SPACES)
  let macroString = `{%- from "${macroPath}" import ${macroName} -%}`

  if (callBlock) {
    macroString += `{%- call ${macroName}(${macroParams}) -%}${callBlock}{%- endcall -%}`
  } else {
    macroString += `{{- ${macroName}(${macroParams}) -}}`
  }

  return load(nunjucksTestEnv.renderString(macroString, {}))
}
