
const GEMINI_API_KEY = import.meta.env.API_KEY || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const INFO_CACHE = new Map();

const buildSpeciesPrompt = (scientificName, commonName, taxonomy) => {
  return `En el contexto de la biología, genera información completa sobre la especie especificada: ${scientificName}${commonName ? ` (${commonName})` : ''}.
La información debe presentarse en un lenguaje claro, común y comprensible para todo público.

El resultado debe ser EXCLUSIVAMENTE un objeto JSON, sin explicaciones ni texto adicional.
Usa exactamente las siguientes claves dentro del objeto JSON:

{
  "nombre_cientifico": "${scientificName}",
  "Descripcion": "",
  "Alimentacion": "",
  "reproduccion": "",
  "Habitat_natural": "",
  "Distribucion_geografica": "",
  "Importancia_ecologica": "",
  "Comportamiento": "",
  "Relacion_con_humanos": "",
  "Estado_de_conservacion": "",
  "Amenazas": "",
  "Curiosidades": [
    "Primer dato curioso",
    "Segundo dato curioso",
    "Tercer dato curioso"
  ]
}

Asegúrate de que el JSON sea válido, que todos los campos estén completos y que "Curiosidades" sea un arreglo de cadenas de texto.`;
};

/**
 * Limpia y parsea la respuesta de Gemini
 */
const parseGeminiResponse = (text) => {
  try {
    // Limpiar posibles caracteres de markdown
    let cleaned = text.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7);
    }
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3);
    }
    cleaned = cleaned.trim();
    
    return JSON.parse(cleaned);
  } catch (error) {
    console.error('Error parsing Gemini response:', error);
    return null;
  }
};

/**
 * Obtiene información detallada de una especie usando Gemini AI
 */
export const getSpeciesDetailedInfo = async (scientificName, commonName = null, taxonomy = null, options = {}) => {
  const { signal } = options;
  
  if (!scientificName) {
    return { error: 'Nombre científico requerido' };
  }

  // Verificar cache
  const cacheKey = scientificName.toLowerCase().trim();
  if (INFO_CACHE.has(cacheKey)) {
    return INFO_CACHE.get(cacheKey);
  }

  // Verificar API key
  if (!GEMINI_API_KEY) {
    console.warn('Gemini API key not configured');
    return {
      error: 'API de Gemini no configurada',
      fallback: true,
      Descripcion: `${scientificName} es una especie que pertenece al mundo natural. Para obtener información más detallada, se requiere configurar la API de Gemini.`,
      Curiosidades: [
        'La biodiversidad es fundamental para el equilibrio de los ecosistemas',
        'Cada especie cumple un rol único en su hábitat',
        'La conservación de especies es vital para el futuro del planeta'
      ]
    };
  }

  try {
    const prompt = buildSpeciesPrompt(scientificName, commonName, taxonomy);
    
    console.log('[Gemini] Iniciando petición para:', scientificName);
    console.log('[Gemini] API Key presente:', !!GEMINI_API_KEY);
    
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096,
        }
      }),
      signal
    });

    console.log('[Gemini] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Gemini] API error:', response.status, errorText);
      throw new Error(`Error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('[Gemini] Response data:', data);
    
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!generatedText) {
      console.error('[Gemini] No text in response');
      throw new Error('No se recibió respuesta de Gemini');
    }

    console.log('[Gemini] Generated text:', generatedText.substring(0, 200) + '...');

    const parsedInfo = parseGeminiResponse(generatedText);
    
    if (parsedInfo) {
      // Guardar en cache
      INFO_CACHE.set(cacheKey, parsedInfo);
      return parsedInfo;
    }

    throw new Error('No se pudo parsear la respuesta');
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw error;
    }
    console.error('Error fetching species info from Gemini:', error);
    return {
      error: error.message || 'Error al obtener información',
      fallback: true,
      Descripcion: `${scientificName} es una especie que forma parte de la biodiversidad de nuestro planeta. Lamentablemente no pudimos obtener información detallada en este momento.`,
      Curiosidades: [
        'La biodiversidad incluye millones de especies en todo el mundo',
        'Cada especie tiene adaptaciones únicas a su ambiente',
        'La investigación científica nos ayuda a conocer mejor las especies'
      ]
    };
  }
};

export const clearInfoCache = () => {
  INFO_CACHE.clear();
};

export default {
  getSpeciesDetailedInfo,
  clearInfoCache
};
