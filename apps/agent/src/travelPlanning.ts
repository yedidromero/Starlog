const cityTimeZones: Record<string, string> = {
  barcelona: "Europe/Madrid",
  lisboa: "Europe/Lisbon",
  lisbon: "Europe/Lisbon",
  madrid: "Europe/Madrid",
  valencia: "Europe/Madrid",
  valència: "Europe/Madrid",
};

function normalizeCity(city: string) {
  return city.trim().toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function getLocalDateTime(city: string) {
  const timeZone = cityTimeZones[normalizeCity(city)];
  if (!timeZone) {
    return {
      city,
      timeZone: null,
      note: "No local time-zone mapping is available for this city. Ask the traveler to confirm the destination's local date and time before filtering events for today or tonight.",
    };
  }

  const now = new Date();
  return {
    city,
    timeZone,
    localDateTime: new Intl.DateTimeFormat("sv-SE", {
      timeZone,
      dateStyle: "short",
      timeStyle: "short",
      hourCycle: "h23",
    }).format(now),
    localWeekday: new Intl.DateTimeFormat("es", { timeZone, weekday: "long" }).format(now),
    note: "Use this local date and time to interpret today, tonight, and current/upcoming guide entries. The knowledge guides are snapshots, not a live event feed.",
  };
}

export function compareIntercityOptions(from: string, to: string, date?: string) {
  return {
    route: `${from} → ${to}`,
    requestedDate: date ?? null,
    options: [
      {
        mode: "Tren",
        whenItMayFit: "Suele ser cómodo para viajar entre centros urbanos y evitar traslados largos a aeropuertos.",
        providers: [
          { name: "Renfe", url: "https://www.renfe.com/es/es" },
          { name: "iryo", url: "https://iryo.eu/" },
          { name: "OUIGO España", url: "https://www.ouigo.com/es/" },
        ],
      },
      {
        mode: "Autobús",
        whenItMayFit: "Puede ser una alternativa de menor coste; compara duración, estación y equipaje.",
        providers: [
          { name: "ALSA", url: "https://www.alsa.com/" },
          { name: "FlixBus", url: "https://www.flixbus.es/" },
        ],
      },
      {
        mode: "Coche compartido",
        whenItMayFit: "Puede ofrecer horarios flexibles; revisa punto de salida, reseñas, equipaje y condiciones del conductor.",
        providers: [{ name: "BlaBlaCar", url: "https://www.blablacar.es/" }],
      },
    ],
    dataLimit: "No hay un proveedor de transporte conectado para consultar salidas, duración exacta, tarifas ni plazas en tiempo real. Son enlaces a operadores y comparaciones generales entre medios, no cotizaciones ni disponibilidad confirmadas. Pregunta fecha y hora, número de viajeros, equipaje y presupuesto antes de concretar la recomendación.",
  };
}
