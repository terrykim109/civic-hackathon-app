import fs from 'node:fs'
import path from 'node:path'

const dir = 'src/data'
const files = [
  'city-wards.json',
  'city-wards.geojson',
  'members-of-toronto-city-council-voting-record.json',
  'notice8007.html',
  'park-and-recreation-facility-projects.geojson',
  'park-and-recreation-facility-projects.json',
  'parks-and-recreation-facilities.geojson',
  'parks-and-recreation-facilities.json',
  'profile.json',
  'report_requests.xlsx',
  'report-request-log-city-council-and-its-committees.json',
  'votes.csv',
]

function summarizeJson(filePath) {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  if (Array.isArray(data)) {
    console.log('array_len', data.length)
    console.log('keys0', data[0] ? Object.keys(data[0]) : null)
    console.log('sample', JSON.stringify(data.slice(0, 3)).slice(0, 1200))
    return
  }
  if (data && data.type === 'FeatureCollection') {
    const features = data.features || []
    const geoms = new Map()
    for (const feature of features) {
      const type = feature.geometry?.type || 'none'
      geoms.set(type, (geoms.get(type) || 0) + 1)
    }
    console.log('features', features.length)
    console.log('geoms', Object.fromEntries(geoms))
    console.log('propKeys', Object.keys(features[0]?.properties || {}))
    const samples = features.slice(0, 3).map((feature) => ({
      id: feature.id,
      properties: feature.properties,
    }))
    console.log('samples', JSON.stringify(samples).slice(0, 1400))
    return
  }
  console.log('object_keys', Object.keys(data))
  console.log('preview', JSON.stringify(data).slice(0, 1000))
}

for (const file of files) {
  const filePath = path.join(dir, file)
  console.log(`\n## ${file}`)
  if (!fs.existsSync(filePath)) {
    console.log('MISSING')
    continue
  }
  const stats = fs.statSync(filePath)
  console.log('bytes', stats.size)
  if (file.endsWith('.json') || file.endsWith('.geojson')) {
    summarizeJson(filePath)
  } else if (file.endsWith('.csv')) {
    const text = fs.readFileSync(filePath, 'utf8')
    const lines = text.split(/\r?\n/).filter(Boolean)
    console.log('lines', lines.length)
    console.log('header', lines[0]?.slice(0, 500))
    console.log('row1', lines[1]?.slice(0, 500))
    console.log('row2', lines[2]?.slice(0, 500))
  } else if (file.endsWith('.html')) {
    const text = fs.readFileSync(filePath, 'utf8')
    console.log('chars', text.length)
    const title = text.match(/<title[^>]*>([^<]*)/i)?.[1]
    const headings = [...text.matchAll(/<h[1-3][^>]*>([^<]*)/gi)]
      .slice(0, 10)
      .map((match) => match[1].trim())
    console.log('title', title)
    console.log('headings', headings)
  } else if (file.endsWith('.xlsx')) {
    console.log('xlsx_binary')
  }
}
