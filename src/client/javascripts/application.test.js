const govukFrontend = vi.hoisted(() => ({
  createAll: vi.fn(),
  Button: class Button {},
  Checkboxes: class Checkboxes {},
  ErrorSummary: class ErrorSummary {},
  Radios: class Radios {},
  ServiceNavigation: class ServiceNavigation {},
  SkipLink: class SkipLink {},
  Tabs: class Tabs {}
}))

vi.mock('govuk-frontend', () => govukFrontend)

describe('GOV.UK Frontend application', () => {
  test('Initialises all interactive components', async () => {
    await import('./application.js')

    expect(govukFrontend.createAll.mock.calls).toEqual([
      [govukFrontend.Button],
      [govukFrontend.Checkboxes],
      [govukFrontend.ErrorSummary],
      [govukFrontend.Radios],
      [govukFrontend.ServiceNavigation],
      [govukFrontend.SkipLink],
      [govukFrontend.Tabs]
    ])
  })
})
