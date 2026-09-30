// Yapay zekâ sağlayıcı kayıt defteri.
//
// Her sağlayıcı için: tür (istemci şekli), adres, anahtar ortam değişkenleri ve
// birden fazla model. Model listesi sırayla denenir; listede ilk çalışan kazanır.
// Bunun sebebi: ücretsiz katmanlarda duruma göre değişen modeller oluyor.
// Örnek: gemini-3.5-flash "high demand" verirken gemini-3.5-flash-lite çalışıyor,
//         mistral-medium "rate limit" verirken ministral-8b çalışıyor.
//
// TÜRLER
//   'gemini'    -> generateContent (REST)
//   'openai'    -> OpenAI uyumlu /chat/completions (Groq, Mistral, OpenRouter, OpenAI)
//   'anthropic' -> /v1/messages
//
// Not: model adları 29.09.2026'da canlı API çağrılarıyla doğrulanmıştır.

const SAGLAYICILAR = {
  gemini: {
    ad: 'gemini',
    adTR: 'Google Gemini',
    tur: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    // Anahtar tamamen anahtarsız (ücretsiz katman) olduğu için bu sağlayıcı
    // .env'de hiçbir şey tanımlı değilse bile havuza alınır.
    anahtarsizVarsayilan: true,
    anahtarOrtami: ['GEMINI_KEYS', 'GEMINI_API_KEY'],
    modelOrtami: 'GEMINI_MODELS',
    modeller: ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-flash-latest']
  },

  groq: {
    ad: 'groq',
    adTR: 'Groq',
    tur: 'openai',
    baseUrl: 'https://api.groq.com/openai/v1',
    anahtarOrtami: ['GROQ_KEYS', 'GROQ_API_KEY'],
    modelOrtami: 'GROQ_MODELS',
    modeller: ['qwen/qwen3.8-27b', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b']
  },

  mistral: {
    ad: 'mistral',
    adTR: 'Mistral',
    tur: 'openai',
    baseUrl: 'https://api.mistral.ai/v1',
    anahtarOrtami: ['MISTRAL_KEYS', 'MISTRAL_API_KEY'],
    modelOrtami: 'MISTRAL_MODELS',
    modeller: ['ministral-8b-latest', 'ministral-3b-latest', 'mistral-medium-latest']
  },

  openrouter: {
    ad: 'openrouter',
    adTR: 'OpenRouter',
    tur: 'openai',
    baseUrl: 'https://openrouter.ai/api/v1',
    // OpenRouter ücretsiz model adının sonunda ":free" olmasını istiyor.
    ekBasliklar: { 'HTTP-Referer': 'https://localhost', 'X-Title': 'OrdinemBot' },
    anahtarOrtami: ['OPENROUTER_KEYS', 'OPENROUTER_API_KEY'],
    modelOrtami: 'OPENROUTER_MODELS',
    modeller: ['nvidia/nemotron-3-super-120b-a12b:free', 'qwen/qwen3.8-27b:free', 'google/gemma-4-31b-it:free']
  },

  openai: {
    ad: 'openai',
    adTR: 'OpenAI',
    tur: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    anahtarOrtami: ['OPENAI_KEYS', 'OPENAI_API_KEY'],
    modelOrtami: 'OPENAI_MODELS',
    modeller: ['gpt-4o-mini']
  },

  anthropic: {
    ad: 'anthropic',
    adTR: 'Anthropic',
    tur: 'anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    anahtarOrtami: ['ANTHROPIC_KEYS', 'ANTHROPIC_API_KEY'],
    modelOrtami: 'ANTHROPIC_MODELS',
    modeller: ['claude-sonnet-5']
  }
};

// Anahtarı olmayan sağlayıcılar havuza girmesin. Gemini bunun istisnası:
// Google ücretsiz katmanı anahtar vermeden de çalıştırır.
const ANAHTARSIZ = new Set(['gemini']);

// Havuzun varsayılan sırası. Sıra önemli: ilk sıradaki doluysa hiçbiri
// yüklenmeden cevap verir, taşarsa sıradakine geçilir.
const VARSAYILAN_SIRA = ['gemini', 'groq', 'mistral', 'openrouter', 'openai', 'anthropic'];

module.exports = { SAGLAYICILAR, ANAHTARSIZ, VARSAYILAN_SIRA };
