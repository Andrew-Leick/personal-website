import { describe, expect, it } from 'vitest'
import { entryAssets } from '../lib/entry-assets.mjs'

describe('entryAssets', () => {
  it('collects module scripts, modulepreloads and stylesheets under assets/', () => {
    const html = `<head>
      <link rel="preload" href="/fonts/a.woff2" as="font" />
      <script type="module" crossorigin src="/base/assets/kart-1.js"></script>
      <link rel="modulepreload" crossorigin href="/base/assets/three-2.js">
      <link rel="stylesheet" crossorigin href="/base/assets/kart-3.css">
      <link rel="icon" href="/favicon.svg" />
      <script>/* inline */</script>
      <script type="module" src="/base/assets/kart-1.js"></script>
    </head>`
    expect(entryAssets(html)).toEqual(['assets/kart-1.js', 'assets/three-2.js', 'assets/kart-3.css'])
  })
})
