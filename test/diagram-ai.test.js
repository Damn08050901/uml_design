import test from 'node:test'
import assert from 'node:assert/strict'

import { AI_PRESETS, LONGCAT_MODELS, applyAiPreset, buildAiEndpoint, normalizeAiSettings } from '../src/utils/diagramAi.js'

test('normalizeAiSettings migrates legacy longcat endpoint path', () => {
  const settings = normalizeAiSettings({
    presetId: 'longcat',
    baseUrl: 'https://api.longcat.chat/openai',
    endpointPath: '/chat/completions',
    model: 'LongCat-Flash-Thinking',
    apiKey: 'test-key'
  })

  assert.equal(settings.baseUrl, 'https://api.longcat.chat/openai')
  assert.equal(settings.endpointPath, '/v1/chat/completions')
  assert.equal(buildAiEndpoint(settings.baseUrl, settings.endpointPath), 'https://api.longcat.chat/openai/v1/chat/completions')
})

test('applyAiPreset uses the current longcat endpoint', () => {
  const settings = applyAiPreset('longcat', { apiKey: 'test-key', temperature: 0.4 })

  assert.equal(settings.presetId, 'longcat')
  assert.equal(settings.endpointPath, '/v1/chat/completions')
  assert.equal(settings.temperature, 0.4)
})

test('longcat preset has default api key and recommended model', () => {
  const longcat = AI_PRESETS.find(p => p.id === 'longcat')
  assert.ok(longcat.apiKey, 'longcat preset should have a default apiKey')
  assert.equal(longcat.model, 'LongCat-Flash-Thinking-2601')
})

test('LONGCAT_MODELS has multiple models with one recommended', () => {
  assert.ok(LONGCAT_MODELS.length >= 4, 'should have at least 4 models')
  const rec = LONGCAT_MODELS.filter(m => m.recommended)
  assert.equal(rec.length, 1, 'exactly one recommended model')
  assert.equal(rec[0].id, 'LongCat-Flash-Thinking-2601')
})

test('normalizeAiSettings fills default apiKey from preset when empty', () => {
  const settings = normalizeAiSettings({ presetId: 'longcat', apiKey: '' })
  assert.ok(settings.apiKey, 'should fallback to preset default key')
})

test('applyAiPreset prefers preset apiKey over current', () => {
  const settings = applyAiPreset('longcat', { apiKey: 'old-key' })
  const longcat = AI_PRESETS.find(p => p.id === 'longcat')
  assert.equal(settings.apiKey, longcat.apiKey, 'should use preset key')
})
