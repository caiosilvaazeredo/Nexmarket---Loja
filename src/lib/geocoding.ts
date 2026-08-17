/**
 * Endereço em texto → coordenadas, pelo Nominatim (busca oficial da
 * OpenStreetMap).
 *
 * Existe porque, até aqui, a única forma de marcar a loja no mapa era o botão
 * de GPS — que grava onde **quem clica** está. Quem configurasse a loja de
 * casa deixaria o pino na própria casa, e o entregador seria mandado para lá.
 *
 * Política de uso (nominatim.org/release-docs/latest/api/): gratuito, no
 * máximo 1 consulta por segundo, sem geocodificação em massa, e a aplicação
 * precisa se identificar. O uso aqui cabe: uma consulta quando o lojista
 * salva o endereço, não por pedido.
 *
 * A identificação vem do cabeçalho `Referer`, que o navegador manda sozinho —
 * definir `User-Agent` é proibido em código de página e ainda dispararia um
 * preflight de CORS.
 */

const ENDPOINT = 'https://nominatim.openstreetmap.org/search';

export interface GeoPoint {
  lat: number;
  lng: number;
}

/**
 * Devolve `null` quando não encontra, quando a rede falha ou quando o texto é
 * curto demais para valer uma consulta.
 *
 * Nunca lança: quem chama está salvando as configurações da loja, e uma falha
 * de geocodificação não pode impedir o salvamento — o endereço escrito
 * continua valendo, só fica sem o ponto.
 */
export async function geocodeAddress(query: string): Promise<GeoPoint | null> {
  const q = query.trim();
  if (q.length < 8) return null;

  const url =
    `${ENDPOINT}?q=${encodeURIComponent(q)}` +
    '&format=jsonv2&limit=1' +
    // Sem isto, "Rua São João, 100" acha resultado em Portugal antes do
    // brasileiro.
    '&countrycodes=br';

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;

    const body = await res.json();
    if (!Array.isArray(body) || body.length === 0) return null;

    // O Nominatim devolve as coordenadas como texto.
    const lat = Number.parseFloat(body[0]?.lat);
    const lng = Number.parseFloat(body[0]?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}
