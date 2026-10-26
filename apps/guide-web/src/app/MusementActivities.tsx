"use client";

import { useEffect, useState, type FormEvent } from "react";

type Activity = {
  id: string;
  title: string;
  description: string;
  image: string | null;
  url: string | null;
  price: string | null;
  currency: string | null;
  bookingType: string | null;
};

type Product = { id: string; type: string; name: string; price: string | null; holder: string | null };

export function MusementActivities({ locale }: { locale: "es" | "en" }) {
  const [query, setQuery] = useState("Madrid");
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selected, setSelected] = useState<Activity | null>(null);
  const [dates, setDates] = useState<{ day: string; sold_out?: boolean }[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [testOrdersEnabled, setTestOrdersEnabled] = useState(false);
  const [order, setOrder] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const es = locale === "es";
  const currentOrder = order?.order as Record<string, unknown> | undefined;
  const orderUuid = typeof currentOrder?.uuid === "string" ? currentOrder.uuid : "";
  const orderItems = Array.isArray(currentOrder?.items) ? currentOrder.items as Record<string, unknown>[] : [];
  const shouldPollOrder = Boolean(orderUuid && (currentOrder?.status === "PENDING" || orderItems.some((item) => item.status === "PENDING")));

  useEffect(() => {
    if (!shouldPollOrder) return;
    let active = true;
    const refresh = async () => {
      try {
        const response = await fetch(`/api/activities/orders/${encodeURIComponent(orderUuid)}`, { cache: "no-store" });
        const data = await response.json();
        if (active && response.ok && data.order) setOrder((previous) => previous ? { ...previous, order: data.order } : previous);
      } catch {
        // Keep the last known order state; the next poll retries.
      }
    };
    const timer = window.setInterval(() => { void refresh(); }, 10_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [orderUuid, shouldPollOrder]);

  const search = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setOrder(null);
    setSelected(null);
    setDates([]);
    setProducts([]);
    setSelectedDate("");
    setSelectedProduct("");
    try {
      const response = await fetch(`/api/activities/search?q=${encodeURIComponent(query.trim())}`);
      const data = await response.json();
      setConfigured(data.configured ?? true);
      setTestOrdersEnabled(data.testOrdersEnabled === true);
      if (!response.ok) throw new Error(data.error || (es ? "No se pudo buscar." : "Search failed."));
      setActivities(data.activities ?? []);
      if (!data.configured) setMessage(es ? `Faltan credenciales del sandbox: ${data.missing.join(", ")}.` : `Sandbox credentials are missing: ${data.missing.join(", ")}.`);
      else if (!data.activities?.length) setMessage(es ? "Musement no devolvió resultados para esa búsqueda." : "Musement returned no results for this search.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : (es ? "Error de conexión." : "Connection error."));
    } finally {
      setBusy(false);
    }
  };

  const loadAvailability = async (activity: Activity) => {
    setSelected(activity);
    setBusy(true);
    setMessage("");
    setDates([]);
    setProducts([]);
    setSelectedDate("");
    setSelectedProduct("");
    setOrder(null);
    try {
      const from = new Date(Date.now() + 35 * 86_400_000).toISOString().slice(0, 10);
      const to = new Date(Date.now() + 65 * 86_400_000).toISOString().slice(0, 10);
      const response = await fetch(`/api/activities/${encodeURIComponent(activity.id)}/dates?from=${from}&to=${to}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || (es ? "No se pudo consultar disponibilidad." : "Availability lookup failed."));
      const availableDates = (data.dates ?? []).filter((item: { day?: string; sold_out?: boolean }) => item.day && !item.sold_out);
      setDates(availableDates);
      if (!availableDates.length) setMessage(es ? "No hay fechas disponibles en los próximos 30–60 días." : "No dates available in the next 30–60 days.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : (es ? "No se pudo consultar disponibilidad." : "Availability lookup failed."));
    } finally {
      setBusy(false);
    }
  };

  const loadProducts = async (date: string) => {
    if (!selected) return;
    setSelectedDate(date);
    setBusy(true);
    setProducts([]);
    setSelectedProduct("");
    try {
      const response = await fetch(`/api/activities/${encodeURIComponent(selected.id)}/dates?date=${date}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || (es ? "No se pudieron cargar las entradas." : "Could not load ticket options."));
      setProducts(data.products ?? []);
      if (!data.products?.length) setMessage(es ? "La fecha está disponible, pero no aparecieron opciones de entrada reconocibles." : "The date is available, but no ticket options were returned.");
      else setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : (es ? "No se pudieron cargar las entradas." : "Could not load ticket options."));
    } finally {
      setBusy(false);
    }
  };

  const createTestOrder = async () => {
    if (!selected || !selectedDate || !selectedProduct) return;
    const product = products.find((item) => `${item.type}:${item.id}` === selectedProduct);
    if (!product) return;
    setBusy(true);
    setMessage("");
    setOrder(null);
    try {
      const response = await fetch(`/api/activities/${encodeURIComponent(selected.id)}/dates`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productIdentifier: product.id, productType: product.type, date: selectedDate, quantity: 1 }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || (es ? "No se pudo crear la orden de prueba." : "Could not create the test order."));
      setOrder(data);
      setMessage(data.paymentNeedsMerchantPermission
        ? (es ? "Orden de prueba creada; Musement aún debe habilitar el permiso de socio para cerrar el flujo no-payment." : "Test order created; Musement still needs to enable the partner no-payment permission to complete checkout.")
        : (es ? "Orden sandbox procesada. No hubo cargo ni tickets reales." : "Sandbox order processed. No charge or real tickets were issued."));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : (es ? "No se pudo crear la orden de prueba." : "Could not create the test order."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="musement-panel">
      <div className="musement-heading">
        <div><span className="section-kicker">{es ? "RESERVAS · SANDBOX" : "BOOKING · SANDBOX"}</span><h3>{es ? "Actividades que sí se pueden reservar." : "Activities you can actually book."}</h3></div>
        <span className="musement-badge">MUSEMENT · TEST</span>
      </div>
      <p className="musement-intro">{es ? "Integración del catálogo, disponibilidad y órdenes de prueba de Musement. El sandbox usa credenciales de socio y nunca emite entradas reales." : "Musement catalog, availability and test-order integration. The sandbox requires partner credentials and never issues real tickets."}</p>
      <form className="musement-search" onSubmit={search}>
        <label htmlFor="musement-query">{es ? "CIUDAD O ACTIVIDAD" : "CITY OR ACTIVITY"}</label>
        <input id="musement-query" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={es ? "Madrid, museo, tour…" : "Madrid, museum, tour…"} minLength={2} required />
        <button className="hard-button button-copper" type="submit" disabled={busy}>{busy ? (es ? "CARGANDO…" : "LOADING…") : (es ? "BUSCAR EN SANDBOX" : "SEARCH SANDBOX")}</button>
      </form>
      {message && <p className={configured === false ? "musement-message musement-setup" : "musement-message"} role="status">{message}</p>}
      {configured === false && <p className="musement-setup-note">{es ? "Solicita a Musement contrato y acceso sandbox; añade MUSEMENT_CLIENT_ID, MUSEMENT_CLIENT_SECRET y MUSEMENT_APPLICATION en apps/guide-web/.env.local. No uses claves de producción." : "Ask Musement for a partner contract and sandbox access; add MUSEMENT_CLIENT_ID, MUSEMENT_CLIENT_SECRET and MUSEMENT_APPLICATION to apps/guide-web/.env.local. Do not use production keys."}</p>}
      {activities.length > 0 && <div className="musement-results">
        {activities.map((activity) => <article className="musement-result" key={activity.id}>
          {activity.image && <img src={activity.image} alt="" loading="lazy" />}
          <div className="musement-result-body"><h4>{activity.title}</h4><p>{activity.description || (es ? "Experiencia disponible en el catálogo del proveedor." : "Experience listed in the provider catalog.")}</p>
            <div className="musement-result-meta">{activity.price && <strong>{activity.price}</strong>}{activity.bookingType && <span>{activity.bookingType}</span>}</div>
            <button type="button" onClick={() => void loadAvailability(activity)} disabled={busy}>{es ? "VER FECHAS Y PRECIO" : "CHECK DATES & PRICE"} ↗</button>
          </div>
        </article>)}
      </div>}
      {selected && <div className="musement-availability">
        <strong>{selected.title}</strong>
        {dates.length > 0 && <label>{es ? "FECHA DISPONIBLE" : "AVAILABLE DATE"}<select value={selectedDate} onChange={(event) => void loadProducts(event.target.value)}><option value="">{es ? "Elige fecha" : "Choose a date"}</option>{dates.map((item) => <option key={item.day} value={item.day}>{item.day}</option>)}</select></label>}
        {products.length > 0 && <label>{es ? "ENTRADA" : "TICKET"}<select value={selectedProduct} onChange={(event) => setSelectedProduct(event.target.value)}><option value="">{es ? "Elige entrada" : "Choose ticket"}</option>{products.map((item) => <option key={`${item.type}:${item.id}`} value={`${item.type}:${item.id}`}>{item.name}{item.price ? ` · ${item.price}` : ""}</option>)}</select></label>}
        {products.length > 0 && <button className="hard-button button-copper" type="button" onClick={() => void createTestOrder()} disabled={busy || !selectedProduct || !testOrdersEnabled}>{testOrdersEnabled ? (es ? "CREAR ORDEN SANDBOX" : "CREATE SANDBOX ORDER") : (es ? "ÓRDENES DE PRUEBA DESACTIVADAS" : "TEST ORDERS DISABLED")}{testOrdersEnabled ? " ↗" : ""}</button>}
        {order && <div className="musement-order-result" role="status">
          <strong>{es ? "ESTADO DE LA RESERVA" : "BOOKING STATUS"}: {String(currentOrder?.status ?? "PENDING")}</strong>
          {order.paymentNeedsMerchantPermission === true && <p>{es ? "Musement recibió la orden de prueba, pero aún falta el permiso merchant no-payment para marcarla pagada." : "Musement received the test order, but the merchant no-payment permission is still needed to mark it paid."}</p>}
          {orderItems.map((item, index) => {
            const itemProduct = item.product && typeof item.product === "object" ? item.product as Record<string, unknown> : {};
            const vouchers = Array.isArray(item.vouchers) ? item.vouchers as Record<string, unknown>[] : [];
            return <div className="musement-order-item" key={String(item.uuid ?? index)}><span>{String(itemProduct.title ?? (es ? "Entrada" : "Ticket"))} · {String(item.status ?? "PENDING")}</span>{vouchers.map((voucher, voucherIndex) => typeof voucher.url === "string" && <a href={voucher.url} key={voucherIndex} target="_blank" rel="noreferrer">{es ? "ABRIR VOUCHER" : "OPEN VOUCHER"} ↗</a>)}</div>;
          })}
          {shouldPollOrder && <small>{es ? "Esperando actualización del proveedor…" : "Waiting for provider update…"}</small>}
        </div>}
      </div>}
      <small className="musement-footnote">{es ? "El sandbox no prueba el pago en Stellar. Para habilitar órdenes sandbox, añade MUSEMENT_SANDBOX_ORDERS_ENABLED=true. Las reservas de prueba son datos ficticios; cancélalas según el procedimiento de Musement." : "The sandbox does not test Stellar payments. To enable sandbox orders, add MUSEMENT_SANDBOX_ORDERS_ENABLED=true. Test reservations are fictitious; cancel them under Musement's test procedure."}</small>
    </div>
  );
}
