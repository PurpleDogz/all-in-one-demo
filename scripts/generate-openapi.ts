// Run via: npm run openapi  (ts-node scripts/generate-openapi.ts)
// Requires tsconfig-paths to resolve @/ aliases:
//   npx ts-node -r tsconfig-paths/register scripts/generate-openapi.ts
// Or simply hit GET /api/openapi.json at runtime and pipe to public/openapi.json.
import * as path from 'path'
import * as fs from 'fs'

// Register path aliases so @/ resolves correctly
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('tsconfig-paths').register({
  baseUrl: path.resolve(__dirname, '..'),
  paths: { '@/*': ['src/*'] },
})

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { generateOpenApiDocument } = require('../src/lib/openapi')

const spec = generateOpenApiDocument()
const outPath = path.resolve(__dirname, '../public/openapi.json')

fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(spec, null, 2))

console.log(`OpenAPI spec written to ${outPath}`)
