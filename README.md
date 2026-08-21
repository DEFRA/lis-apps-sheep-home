# Home for Sheep

This project is based on the included CDP Node.js frontend template.

Role: Standalone spoke microsite.

Dependencies: @defra/lis-infra-ui-services, @defra/lis-species-sheep, @defra/lis-taxonomy-home

Port: `3500`

## Sheep home API

The application retrieves holding and sheep JSON from the `be4fe/sheep-home`
service. For local development, start that API on port `8086` and configure:

```text
SHEEP_HOME_API_URL=http://localhost:3525
```

`SHEEP_HOME_API_KEY`, `SHEEP_HOME_API_KEY_HEADER` and
`SHEEP_HOME_API_TIMEOUT` configure the optional API key and request timeout.

Primary URL path: `/sheep/home`

The root route renders the complete user-facing CPH list and uses the hub session
cookie. `GET /summary` renders the embeddable CPH sheep-count fragment used by
front-office and requires a hub-service bearer token. `GET /summary-data`
returns the structured species, holding-count and action data used by the
front-office dashboard and has the same hub-service authentication requirement.

Run locally with `npm run dev`.
Install dependencies locally with `npm install` from this project directory.
Use `.env.example` as the generated reference file and keep `.env` for your local values.
