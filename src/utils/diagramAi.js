import { getDiagramAiPrompt } from './diagramTemplates.js'

const STORAGE_KEY = 'diagram_ai_settings_v1'

export const LONGCAT_MODELS = [
  { id: 'LongCat-Flash-Thinking-2601', name: 'Flash Thinking 2601 (深度推理)', recommended: true },
  { id: 'LongCat-Flash-Thinking', name: 'Flash Thinking (深度推理)' },
  { id: 'LongCat-Flash-Chat-2602-Exp', name: 'Flash Chat 2602 Exp (高性能对话)' },
  { id: 'LongCat-Flash-Chat', name: 'Flash Chat (通用对话)' },
  { id: 'LongCat-Flash-Lite', name: 'Flash Lite (轻量高效)' },
  { id: 'LongCat-Flash-Omni-2603', name: 'Flash Omni 2603 (多模态)' }
]

const LONGCAT_DEFAULT_KEY = 'ak_1ie19p3vp8lL6ue9hv6hV7Rs6m35K'

export const AI_PRESETS = [
  {
    id: 'longcat',
    name: 'LongCat (推荐)',
    baseUrl: 'https://api.longcat.chat/openai',
    endpointPath: '/v1/chat/completions',
    model: 'LongCat-Flash-Thinking-2601',
    apiKey: LONGCAT_DEFAULT_KEY
  },
  {
    id: 'zhipu',
    name: 'GLM-4.7 (智谱)',
    baseUrl: 'https://open.bigmodel.cn/api/coding/paas/v4',
    endpointPath: '/chat/completions',
    model: 'glm-4.7',
    apiKey: ''
  },
  {
    id: 'custom',
    name: '自定义兼容接口',
    baseUrl: '',
    endpointPath: '/chat/completions',
    model: '',
    apiKey: ''
  }
]

function getAiPreset(presetId) {
  return AI_PRESETS.find(item => item.id === presetId) || AI_PRESETS[0]
}

export function normalizeAiSettings(settings = {}) {
  const preset = getAiPreset(settings.presetId)
  const next = {
    presetId: settings.presetId || preset.id,
    name: settings.name || preset.name,
    baseUrl: settings.baseUrl || preset.baseUrl,
    endpointPath: settings.endpointPath || preset.endpointPath,
    model: settings.model || preset.model,
    apiKey: settings.apiKey || preset.apiKey || '',
    temperature: typeof settings.temperature === 'number' ? settings.temperature : 0.3
  }

  if (next.presetId === 'longcat') {
    const normalizedBase = String(next.baseUrl || '').replace(/\/+$/, '')
    const normalizedPath = String(next.endpointPath || '').trim()
    const isLegacyPath = /^\/?chat\/completions$/i.test(normalizedPath)
    const isLongcatBase = normalizedBase === 'https://api.longcat.chat/openai'
    const isLongcatV1Base = normalizedBase === 'https://api.longcat.chat/openai/v1'

    if ((isLongcatBase || isLongcatV1Base) && isLegacyPath) {
      next.baseUrl = 'https://api.longcat.chat/openai'
      next.endpointPath = '/v1/chat/completions'
    }
  }

  return next
}

export function loadDiagramAiSettings() {
  if (typeof window === 'undefined') {
    return normalizeAiSettings({ ...AI_PRESETS[0], presetId: AI_PRESETS[0].id, temperature: 0.3 })
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return normalizeAiSettings({ ...AI_PRESETS[0], presetId: AI_PRESETS[0].id, temperature: 0.3 })
    const parsed = JSON.parse(raw)
    return normalizeAiSettings({
      presetId: parsed.presetId || AI_PRESETS[0].id,
      name: parsed.name || AI_PRESETS[0].name,
      baseUrl: parsed.baseUrl || AI_PRESETS[0].baseUrl,
      endpointPath: parsed.endpointPath || AI_PRESETS[0].endpointPath,
      model: parsed.model || AI_PRESETS[0].model,
      apiKey: parsed.apiKey || '',
      temperature: typeof parsed.temperature === 'number' ? parsed.temperature : 0.3
    })
  } catch {
    return normalizeAiSettings({ ...AI_PRESETS[0], presetId: AI_PRESETS[0].id, temperature: 0.3 })
  }
}

export function saveDiagramAiSettings(settings) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeAiSettings(settings)))
}

export function applyAiPreset(presetId, current = {}) {
  const preset = getAiPreset(presetId)
  return normalizeAiSettings({
    presetId: preset.id,
    name: preset.name,
    baseUrl: preset.baseUrl,
    endpointPath: preset.endpointPath,
    model: preset.model,
    apiKey: preset.apiKey || current.apiKey || '',
    temperature: typeof current.temperature === 'number' ? current.temperature : 0.3
  })
}

function joinUrl(baseUrl, endpointPath) {
  const left = String(baseUrl || '').replace(/\/+$/, '')
  const right = String(endpointPath || '').trim()
  if (!right) return left
  if (/^https?:\/\//i.test(right)) return right
  return `${left}/${right.replace(/^\/+/, '')}`
}

function stripMarkdownFence(text) {
  let raw = String(text || '').trim()
  raw = raw.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
  const fenced = raw.match(/^```(?:\w+)?\s*([\s\S]*?)```$/)
  return fenced ? fenced[1].trim() : raw
}

export function buildAiEndpoint(baseUrl, endpointPath) {
  return joinUrl(baseUrl, endpointPath)
}

export async function requestAiChatCompletion({ settings, body }) {
  const normalizedSettings = normalizeAiSettings(settings)
  const apiKey = String(normalizedSettings.apiKey || '').trim()
  const baseUrl = String(normalizedSettings.baseUrl || '').trim()
  const endpointPath = String(normalizedSettings.endpointPath || '').trim() || '/chat/completions'

  if (!apiKey) throw new Error('请先填写 API Key')
  if (!baseUrl) throw new Error('请先填写 API 地址')
  if (!body?.model) throw new Error('请先填写模型名称')

  const endpoint = buildAiEndpoint(baseUrl, endpointPath)
  console.log('[AI] 请求:', endpoint, '模型:', body.model)

  const controller = new AbortController()
  const timeoutMs = /thinking/i.test(String(body.model || '')) ? 180000 : 90000
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  let resp
  try {
    resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(body),
      signal: controller.signal
    })
  } catch (err) {
    clearTimeout(timeout)
    if (err.name === 'AbortError') throw new Error(`请求超时（${Math.round(timeoutMs / 1000)}秒），请检查网络、API 地址或模型响应速度`)
    throw new Error(`网络错误: ${err.message}（请检查 API 地址和网络连接）`)
  } finally {
    clearTimeout(timeout)
  }

  if (!resp.ok) {
    const message = await resp.text().catch(() => '')
    console.error('[AI] 错误:', resp.status, message)
    throw new Error(`API错误 ${resp.status}: ${message.slice(0, 220)}`)
  }

  const data = await resp.json()
  console.log('[AI] 响应成功')
  return data
}

export async function generateDiagramSpecWithAi({ diagramType, userPrompt, settings }) {
  const model = String(settings.model || '').trim()
  if (!model) throw new Error('请先填写模型名称')
  const data = await requestAiChatCompletion({
    settings,
    body: {
      model,
      temperature: typeof settings.temperature === 'number' ? settings.temperature : 0.3,
      messages: [
        { role: 'system', content: getDiagramAiPrompt(diagramType) },
        { role: 'user', content: userPrompt }
      ]
    }
  })
  const content = data?.choices?.[0]?.message?.content
    ?? data?.output_text
    ?? data?.data?.content
    ?? ''

  const text = stripMarkdownFence(content)
  if (!text) throw new Error('AI 返回为空')
  return text
}
