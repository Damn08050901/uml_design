import { getDiagramAiPrompt } from './diagramTemplates.js'

const STORAGE_KEY = 'diagram_ai_settings_v1'

export const AI_PRESETS = [
  {
    id: 'longcat',
    name: 'LongCat Flash Thinking',
    baseUrl: 'https://api.longcat.chat/openai',
    endpointPath: '/chat/completions',
    model: 'LongCat-Flash-Thinking',
    apiKey: ''
  },
  {
    id: 'zhipu',
    name: 'GLM-4.7',
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

export function loadDiagramAiSettings() {
  if (typeof window === 'undefined') {
    return { ...AI_PRESETS[0], presetId: AI_PRESETS[0].id, temperature: 0.3 }
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...AI_PRESETS[0], presetId: AI_PRESETS[0].id, temperature: 0.3 }
    const parsed = JSON.parse(raw)
    return {
      presetId: parsed.presetId || AI_PRESETS[0].id,
      name: parsed.name || AI_PRESETS[0].name,
      baseUrl: parsed.baseUrl || AI_PRESETS[0].baseUrl,
      endpointPath: parsed.endpointPath || AI_PRESETS[0].endpointPath,
      model: parsed.model || AI_PRESETS[0].model,
      apiKey: parsed.apiKey || '',
      temperature: typeof parsed.temperature === 'number' ? parsed.temperature : 0.3
    }
  } catch {
    return { ...AI_PRESETS[0], presetId: AI_PRESETS[0].id, temperature: 0.3 }
  }
}

export function saveDiagramAiSettings(settings) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

export function applyAiPreset(presetId, current = {}) {
  const preset = AI_PRESETS.find(item => item.id === presetId) || AI_PRESETS[0]
  return {
    presetId: preset.id,
    name: preset.name,
    baseUrl: preset.baseUrl,
    endpointPath: preset.endpointPath,
    model: preset.model,
    apiKey: current.apiKey || preset.apiKey || '',
    temperature: typeof current.temperature === 'number' ? current.temperature : 0.3
  }
}

function joinUrl(baseUrl, endpointPath) {
  const left = String(baseUrl || '').replace(/\/+$/, '')
  const right = String(endpointPath || '').trim()
  if (!right) return left
  if (/^https?:\/\//i.test(right)) return right
  return `${left}/${right.replace(/^\/+/, '')}`
}

function stripMarkdownFence(text) {
  const raw = String(text || '').trim()
  const fenced = raw.match(/^```(?:\w+)?\s*([\s\S]*?)```$/)
  return fenced ? fenced[1].trim() : raw
}

export function buildAiEndpoint(baseUrl, endpointPath) {
  return joinUrl(baseUrl, endpointPath)
}

export async function requestAiChatCompletion({ settings, body }) {
  const apiKey = String(settings.apiKey || '').trim()
  const baseUrl = String(settings.baseUrl || '').trim()
  const endpointPath = String(settings.endpointPath || '').trim() || '/chat/completions'

  if (!apiKey) throw new Error('请先填写 API Key')
  if (!baseUrl) throw new Error('请先填写 API 地址')
  if (!body?.model) throw new Error('请先填写模型名称')

  const endpoint = buildAiEndpoint(baseUrl, endpointPath)
  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  })

  if (!resp.ok) {
    const message = await resp.text()
    throw new Error(`API错误 ${resp.status}: ${message.slice(0, 220)}`)
  }

  return resp.json()
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
