"use client";

import { useEffect, useRef, useState } from "react";

type Locale = "es" | "en";
type Waypoint = { x: number; y: number; message: string; stage: number };

const MESSAGES: Record<Locale, string[]> = {
  es: ["¡Vamos!", "Elige destino", "Aquí hay meetups", "Crea el tuyo", "¡Casi llegamos!"],
  en: ["Let’s go!", "Choose a destination", "Meetups this way", "Create your own", "Almost there!"],
};

const SECTION_IDS = ["inicio", "viajes", "mapa", "crear-meetup", "como-funciona", "site-footer"];

export function JourneyStar({ locale }: { locale: Locale }) {
  const routeRef = useRef<SVGPathElement>(null);
  const traceRef = useRef<SVGPathElement>(null);
  const characterRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState(MESSAGES[locale][0]);

  useEffect(() => {
    const route = routeRef.current;
    const trace = traceRef.current;
    const character = characterRef.current;
    const site = character?.closest(".starlog-site") as HTMLElement | null;
    if (!site || !route || !trace || !character) return;

    const routeElement = route as SVGPathElement;
    const traceElement = trace as SVGPathElement;
    const characterElement = character as HTMLDivElement;
    const siteElement = site as HTMLElement;
    const messages = MESSAGES[locale];

    let waypoints: Waypoint[] = [];
    let routeLength = 0;
    let frame = 0;
    let layoutDirty = true;
    let idleTimer = 0;
    let lastScrollY = window.scrollY;

    const queueFrame = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    const rebuildRoute = () => {
      const width = siteElement.clientWidth || window.innerWidth;
      const inset = width <= 760
        ? Math.min(18, Math.max(12, width * 0.045))
        : Math.min(32, Math.max(18, width * 0.045));
      const pageHeight = Math.max(siteElement.scrollHeight, document.documentElement.scrollHeight);
      const sections = SECTION_IDS.map((id) => document.getElementById(id));
      const available = sections.filter((section): section is HTMLElement => section !== null);
      if (available.length < 2) return;

      waypoints = available.flatMap((section, index) => {
        const bounds = section.getBoundingClientRect();
        const top = bounds.top + window.scrollY;
        const entryY = index === 0
          ? top + Math.min(110, Math.max(90, bounds.height * 0.2))
          : top + Math.min(30, Math.max(18, bounds.height * 0.025));
        const sectionBottom = top + bounds.height;
        const exitY = index === available.length - 1
          ? Math.min(pageHeight - 36, Math.max(entryY + 24, sectionBottom - 36))
          : Math.min(pageHeight - 36, Math.max(entryY + 24, sectionBottom + 12));
        const x = width <= 760
            ? inset + (index % 2 === 0 ? 0 : 9)
            : index % 2 === 0 ? width - inset : inset;
        const message = messages[index] ?? messages[messages.length - 1];
        return [
          { x, y: Math.min(pageHeight - 36, entryY), message, stage: index },
          { x, y: exitY, message, stage: index },
        ];
      });

      const pathData = waypoints.reduce((data, point, index) => {
        if (index === 0) return `M ${point.x} ${point.y}`;
        const previous = waypoints[index - 1];
        const middleY = (previous.y + point.y) / 2;
        return `${data} C ${previous.x} ${middleY}, ${point.x} ${middleY}, ${point.x} ${point.y}`;
      }, "");

      const svg = routeElement.ownerSVGElement;
      if (svg) {
        svg.setAttribute("viewBox", `0 0 ${width} ${pageHeight}`);
        svg.setAttribute("height", String(pageHeight));
      }
      routeElement.setAttribute("d", pathData);
      traceElement.setAttribute("d", pathData);
      routeLength = routeElement.getTotalLength();
      traceElement.style.strokeDasharray = `0 ${routeLength}`;
      layoutDirty = false;
    };

    const pointAtPageY = (pageY: number) => {
      let low = 0;
      let high = routeLength;
      for (let index = 0; index < 20; index += 1) {
        const middle = (low + high) / 2;
        if (routeElement.getPointAtLength(middle).y < pageY) low = middle;
        else high = middle;
      }
      return (low + high) / 2;
    };

    function update() {
      frame = 0;
      if (layoutDirty) rebuildRoute();
      if (!routeLength || waypoints.length < 2) return;

      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const scrollProgress = Math.max(0, Math.min(1, window.scrollY / maxScroll));
      const startViewportY = Math.min(
        Math.max(window.innerHeight * 0.26, waypoints[0].y),
        window.innerHeight * 0.45,
      );
      const viewportY = startViewportY + (window.innerHeight * 0.78 - startViewportY) * scrollProgress;
      const targetY = Math.min(
        waypoints[waypoints.length - 1].y,
        Math.max(waypoints[0].y, window.scrollY + viewportY),
      );
      const length = pointAtPageY(targetY);
      const point = routeElement.getPointAtLength(length);
      const before = routeElement.getPointAtLength(Math.max(0, length - 2));
      const after = routeElement.getPointAtLength(Math.min(routeLength, length + 2));
      const tangent = Math.atan2(after.y - before.y, after.x - before.x) * (180 / Math.PI);
      const lean = Math.max(-30, Math.min(30, 90 - tangent));

      characterElement.style.left = `${point.x}px`;
      characterElement.style.top = `${point.y}px`;
      characterElement.style.setProperty("--walk-lean", `${lean}deg`);
      characterElement.dataset.side = point.x > (siteElement.clientWidth || window.innerWidth) / 2 ? "right" : "left";
      characterElement.dataset.facing = after.x < before.x ? "left" : "right";
      traceElement.style.strokeDasharray = `${Math.min(length, routeLength)} ${routeLength}`;

      let messageIndex = waypoints[0].stage;
      for (const waypoint of waypoints) {
        if (targetY >= waypoint.y) messageIndex = waypoint.stage;
        else break;
      }
      const nextMessage = messages[messageIndex] ?? messages[messages.length - 1];
      characterElement.dataset.messageIndex = String(messageIndex);
      setMessage((current) => current === nextMessage ? current : nextMessage);

      const currentScrollY = window.scrollY;
      if (Math.abs(currentScrollY - lastScrollY) > 0.5) {
        characterElement.dataset.walkDirection = currentScrollY < lastScrollY ? "backward" : "forward";
        lastScrollY = currentScrollY;
      }
    }

    const onScroll = () => {
      characterElement.dataset.walking = "true";
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => {
        characterElement.dataset.walking = "false";
      }, 180);
      queueFrame();
    };

    const onLayoutChange = () => {
      layoutDirty = true;
      queueFrame();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onLayoutChange, { passive: true });
    const observer = new ResizeObserver(onLayoutChange);
    observer.observe(siteElement);
    SECTION_IDS.forEach((id) => {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    });
    queueFrame();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onLayoutChange);
      observer.disconnect();
      window.clearTimeout(idleTimer);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [locale]);

  return (
    <>
      <svg className="journey-trail" aria-hidden="true" focusable="false">
        <path className="journey-trail-base" ref={routeRef} />
        <path className="journey-trail-copper" ref={traceRef} />
      </svg>
      <div className="journey-star" ref={characterRef} data-walking="false" data-walk-direction="forward" data-facing="right" data-message-index="0" aria-hidden="true">
        <span className="journey-bubble">{message}</span>
        <svg className="journey-star-art" viewBox="0 0 100 120" fill="none">
          <g className="journey-star-body">
            <path className="journey-star-shadow" d="m50 4 11 27 30 2-23 19 7 29-25-16-25 16 7-29L9 33l30-2L50 4Z" />
            <g className="journey-limbs">
              <path className="journey-arm journey-arm-left" d="M19 51Q8 55 13 66" />
              <path className="journey-arm journey-arm-right" d="M81 51q11 4 6 15" />
              <circle className="journey-hand" cx="13" cy="66" r="4" />
              <circle className="journey-hand" cx="87" cy="66" r="4" />
              <g className="journey-leg journey-leg-left">
                <path d="M39 72q-6 10-2 19l-6 8" />
                <path className="journey-shoe" d="M25 98q7 1 13-3l4 5q-7 6-17 3Z" />
              </g>
              <g className="journey-leg journey-leg-right">
                <path d="M61 72q6 10 2 19l6 8" />
                <path className="journey-shoe" d="M60 100q8 2 16-3l4 5q-8 7-19 4Z" />
              </g>
            </g>
            <path className="journey-star-shape" d="m50 4 11 27 30 2-23 19 7 29-25-16-25 16 7-29L9 33l30-2L50 4Z" />
            <ellipse className="journey-eye" cx="40" cy="46" rx="3.3" ry="5" />
            <ellipse className="journey-eye" cx="60" cy="46" rx="3.3" ry="5" />
            <circle className="journey-blush" cx="31" cy="55" r="4" />
            <circle className="journey-blush" cx="69" cy="55" r="4" />
            <path className="journey-smile" d="M43 56q7 8 14 0" />
          </g>
        </svg>
      </div>
    </>
  );
}
