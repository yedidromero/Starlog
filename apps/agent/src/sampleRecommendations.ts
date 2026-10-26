type SampleRecommendation = {
  title: string;
  kind: "route" | "food" | "outdoors";
  summary: string;
  areas: string[];
};

const recommendations: Record<string, SampleRecommendation[]> = {
  madrid: [
    { title: "Centro histórico al atardecer", kind: "route", summary: "Idea de paseo: Puerta del Sol, Plaza Mayor y Palacio Real por fuera; termina en el mirador del Templo de Debod.", areas: ["Sol", "Austrias", "Debod"] },
    { title: "Arte y parque", kind: "outdoors", summary: "Combina una visita al Paseo del Prado con un paseo por El Retiro. Revisa por separado horarios y entradas de los museos.", areas: ["Prado", "Retiro"] },
    { title: "Tapas entre barrios", kind: "food", summary: "Recorrido de muestra por La Latina y Lavapiés, con paradas para probar tapas. Restaurantes y precios dependen del día.", areas: ["La Latina", "Lavapiés"] },
  ],
  valencia: [
    { title: "Centro histórico a pie", kind: "route", summary: "Idea de paseo: Mercado Central, La Lonja y plazas del centro; confirma horarios antes de entrar a monumentos.", areas: ["Ciutat Vella", "Mercado Central"] },
    { title: "Turia y arquitectura", kind: "outdoors", summary: "Sigue a pie o en bici el Jardín del Turia hasta el exterior de la Ciudad de las Artes y las Ciencias.", areas: ["Jardín del Turia", "Ciudad de las Artes"] },
    { title: "Tarde junto al mar", kind: "outdoors", summary: "Paseo de muestra por la Marina y la playa de la Malvarrosa; el transporte y cualquier actividad contratada tienen coste aparte.", areas: ["Marina", "Malvarrosa"] },
  ],
  barcelona: [
    { title: "Modernismo por el Eixample", kind: "route", summary: "Paseo exterior de muestra por Passeig de Gràcia y las fachadas modernistas; las visitas interiores requieren revisar entradas oficiales.", areas: ["Eixample", "Passeig de Gràcia"] },
    { title: "Barri Gòtic y El Born", kind: "route", summary: "Recorre calles y plazas históricas a pie, y añade un museo o una visita guiada solo si compruebas horario y disponibilidad.", areas: ["Barri Gòtic", "El Born"] },
    { title: "Miradores de Montjuïc", kind: "outdoors", summary: "Idea de tarde entre jardines y miradores de Montjuïc; comprueba horarios y tarifas de museos o transportes turísticos.", areas: ["Montjuïc", "Poble-sec"] },
  ],
};

function normalizeCity(value: string) {
  const normalized = value.trim().toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (normalized.includes("madrid")) return "madrid";
  if (normalized.includes("valencia")) return "valencia";
  if (normalized.includes("barcelona")) return "barcelona";
  return null;
}

export function searchSampleRecommendations(destination: string) {
  const city = normalizeCity(destination);
  if (!city) {
    return {
      destination,
      ideas: [],
      note: "There are no sample recommendations for this destination yet. Do not invent a city-specific list.",
    };
  }

  return {
    destination: city === "valencia" ? "València" : city === "barcelona" ? "Barcelona" : "Madrid",
    ideas: recommendations[city],
    note: "These are fictional Starlog demo itinerary ideas, not real or scheduled events. They have no confirmed tickets, availability, or live prices. Label them as sample recommendations and keep any dated event separate, sourced, and verified.",
  };
}
