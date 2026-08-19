import {
  homeController,
  summaryController,
  summaryDataController
} from './controller.js'

export const home = {
  plugin: {
    name: 'home',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/',
          ...homeController
        },
        {
          method: 'GET',
          path: '/{county}/{parish}/{holding}',
          ...homeController
        },
        {
          method: 'GET',
          path: '/summary',
          options: {
            app: { authMode: 'hub-service' }
          },
          ...summaryController
        },
        {
          method: 'GET',
          path: '/summary-data',
          options: {
            app: { authMode: 'hub-service' }
          },
          ...summaryDataController
        }
      ])
    }
  }
}
