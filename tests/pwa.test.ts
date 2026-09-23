import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

function read(rel: string): string {
  const p = fileURLToPath(new URL(`../${rel}`, import.meta.url))
  if (!existsSync(p)) throw new Error(`Файл не знайдено: ${rel}`)
  return readFileSync(p, 'utf8')
}

describe('PWA — файли та лінки не мають зникати', () => {
  it('manifest.webmanifest — валідний JSON з очікуваними полями', () => {
    const manifest = JSON.parse(read('public/manifest.webmanifest'))
    expect(typeof manifest.name).toBe('string')
    expect(typeof manifest.short_name).toBe('string')
    expect(manifest.display).toBe('standalone')
    expect(manifest.start_url).toBe('./')
    const icons = manifest.icons as { src: string; purpose: string }[]
    expect(icons.some((i) => i.src === './favicon.svg' && i.purpose.includes('any'))).toBe(true)
    expect(icons.some((i) => i.purpose.includes('maskable'))).toBe(true)
  })

  it('sw.js — містить ключові кроки офлайн-керування', () => {
    const sw = read('public/sw.js')
    expect(sw).toContain('CACHE_NAME')
    expect(sw).toContain("addEventListener('install'")
    expect(sw).toContain("addEventListener('activate'")
    expect(sw).toContain("addEventListener('fetch'")
    expect(sw).toContain("req.mode === 'navigate'")
  })

  it('apple-touch-icon.png — валідний PNG', () => {
    const bytes = readFileSync(fileURLToPath(new URL('../public/apple-touch-icon.png', import.meta.url)))
    expect([...bytes.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  })

  it('index.html посилається на manifest, тему, іконки', () => {
    const html = read('index.html')
    expect(html).toContain('rel="manifest" href="/manifest.webmanifest"')
    expect(html).toContain('rel="apple-touch-icon"')
    expect(html).toContain('name="theme-color"')
    expect(html).toContain('name="mobile-web-app-capable"')
  })

  it('src/main.tsx реєструє service worker лише в PROD', () => {
    const main = read('src/main.tsx')
    expect(main).toContain("import.meta.env.PROD")
    expect(main).toContain("navigator.serviceWorker.register('./sw.js')")
  })
})