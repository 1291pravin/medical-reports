import OpenAI from 'openai'

let _client: OpenAI | null = null

export function useAI() {
  if (!_client) {
    const config = useRuntimeConfig()
    _client = new OpenAI({
      apiKey: config.openaiApiKey,
      baseURL: config.openaiBaseUrl,
    })
  }
  return _client
}

export function getAIModel() {
  const config = useRuntimeConfig()
  return config.aiModel
}

export function getVisionModel() {
  const config = useRuntimeConfig()
  return config.aiVisionModel
}

export function getSummaryModel() {
  const config = useRuntimeConfig()
  return config.aiSummaryModel || config.aiModel
}
