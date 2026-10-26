"use client";

import { useEffect, useRef, useState } from "react";

type Locale = "es" | "en";
type Stage = { id: string; message: Record<Locale, string> };

const STEP = 10;
const STAGES: Stage[] = [
  { id: "inicio", message: { es: "¡Vamos!", en: "Let’s go!" } },
  { id: "viajes", message: { es: "Elige destino", en: "Choose a destination" } },
  { id: "mapa", message: { es: "Aquí hay meetups", en: "Meetups this way" } },
  { id: "crear-meetup", message: { es: "Crea el tuyo", en: "Create your own" } },
  { id: "como-funciona", message: { es: "¡Casi llegamos!", en: "Almost there!" } },
  { id: "site-footer", message: { es: "¡Casi llegamos!", en: "Almost there!" } },
];

export function JourneyStarMotion({ locale }: { locale: Locale }) {
  const routeRef = useRef<SVGPathElement>(null);
  const traceRef = useRef<SVGPathElement>(null);
  const characterRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState(STAGES[0].message[locale]);

  useEffect(() => {
    const route = routeRef.current;
    const trace = traceRef.current;
    const character = characterRef.current;
    const site = character?.closest(".starlog-site") as HTMLElement | null;
    if (!site || !route || !trace || !character) return;
    const mapSection = document.getElementById("mapa");
    const mapCanvas = document.querySelector<HTMLElement>(".map-canvas");

    const routeElement = route as SVGPathElement;
    const traceElement = trace as SVGPathElement;
    const characterElement = character as HTMLDivElement;
    const siteElement = site as HTMLElement;
    const routeSvg = routeElement.ownerSVGElement;
    const body = characterElement.querySelector<SVGGElement>(".journey-star-body");
    const leftLeg = characterElement.querySelector<SVGGElement>(".journey-leg-left");
    const rightLeg = characterElement.querySelector<SVGGElement>(".journey-leg-right");
    if (!routeSvg || !body || !leftLeg || !rightLeg) return;

    const page = document.documentElement;
    const documentBody = document.body;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let centerX = 0;
    let amplitude = 0;
    let period = 0;
    let routeLength = 0;
    let mapSectionTop = 0;
    let mapSectionBottom = 0;
    let mapRailX = 0;
    let cumulative: number[] = [];
    let sections: { top: number; message: string }[] = [];
    let x: number | null = null;
    let y = 0;
    let previousX = 0;
    let previousY = 0;
    let phase = 0;
    let stride = 0;
    let facing = 1;
    let lastMessage = "";
    let lastTraceIndex = -1;
    let layoutDirty = true;
    let mounted = true;
    let frame = 0;

    const routePhase = Math.PI / 2 - (0.33 / 1.5) * Math.PI * 2;
    const xAt = (pageY: number) => {
      if (mapRailX > 0 && pageY >= mapSectionTop && pageY <= mapSectionBottom) return mapRailX;
      return centerX + amplitude * Math.sin((pageY / period) * Math.PI * 2 + routePhase);
    };

    const rebuildRoute = () => {
      width = Math.max(1, page.clientWidth || window.innerWidth);
      height = Math.max(siteElement.scrollHeight, page.scrollHeight, documentBody.scrollHeight);
      centerX = width / 2;
      amplitude = Math.min(Math.max(width * 0.38, 120), 420);
      period = Math.max(1000, window.innerHeight * 1.5);
      if (mapSection && mapCanvas) {
        const mapBounds = mapSection.getBoundingClientRect();
        mapSectionTop = mapBounds.top + window.scrollY;
        mapSectionBottom = mapSectionTop + mapSection.offsetHeight;
        mapRailX = mapCanvas.getBoundingClientRect().right - 46;
      } else {
        mapSectionTop = 0;
        mapSectionBottom = 0;
        mapRailX = 0;
      }

      const points: string[] = [];
      cumulative = [0];
      let previousPoint: { x: number; y: number } | null = null;
      const steps = Math.ceil(height / STEP);
      for (let index = 0; index <= steps; index += 1) {
        const pointY = Math.min(index * STEP, height);
        const pointX = xAt(pointY);
        points.push(`${index === 0 ? "M" : "L"} ${pointX.toFixed(1)} ${pointY.toFixed(1)}`);
        if (previousPoint) {
          cumulative.push(cumulative[cumulative.length - 1] + Math.hypot(pointX - previousPoint.x, pointY - previousPoint.y));
        }
        previousPoint = { x: pointX, y: pointY };
      }

      const pathData = points.join(" ");
      routeSvg.setAttribute("viewBox", `0 0 ${width} ${height}`);
      routeSvg.setAttribute("width", String(width));
      routeSvg.setAttribute("height", String(height));
      routeSvg.style.width = `${width}px`;
      routeSvg.style.height = `${height}px`;
      routeElement.setAttribute("d", pathData);
      traceElement.setAttribute("d", pathData);
      routeLength = cumulative[cumulative.length - 1] ?? 0;
      sections = STAGES.flatMap((stage) => {
        const section = document.getElementById(stage.id);
        return section
          ? [{ top: section.getBoundingClientRect().top + window.scrollY, message: stage.message[locale] }]
          : [];
      }).sort((a, b) => a.top - b.top);
      x = null;
      lastTraceIndex = -1;
      layoutDirty = false;
    };

    const onLayoutChange = () => {
      layoutDirty = true;
    };

    const update = () => {
      if (!mounted) return;
      if (layoutDirty) rebuildRoute();

      if (routeLength > 0 && cumulative.length > 1) {
        const scrollY = window.scrollY;
        const viewportHeight = window.innerHeight;
        const maxScroll = Math.max(1, Math.max(page.scrollHeight, documentBody.scrollHeight) - viewportHeight);
        const progress = Math.min(1, Math.max(0, scrollY / maxScroll));
        // Start below the fixed navigation so the mascot and its speech bubble never cover it.
        const stagePositionY = Math.min(height, Math.max(0, scrollY + viewportHeight * (0.33 + 0.36 * progress)));
        let targetY = stagePositionY;
        let targetX = xAt(stagePositionY);
        const walkingMap = Boolean(mapCanvas && y >= mapSectionTop && y <= mapSectionBottom);
        if (walkingMap && mapCanvas) {
          const mapBounds = mapCanvas.getBoundingClientRect();
          const characterHeight = characterElement.offsetHeight || 84;
          // Keep the larger speech bubble away from the map toolbar and heading.
          const desiredTop = Math.max(viewportHeight * 0.4, mapBounds.top + 150);
          const lowerSafeTop = mapBounds.bottom - characterHeight - 35;
          const safeTop = lowerSafeTop >= mapBounds.top + 48 ? Math.min(desiredTop, lowerSafeTop) : desiredTop;
          targetY = Math.min(height, scrollY + safeTop + characterHeight);
          targetX = mapRailX;
        }

        if (x === null) {
          x = targetX;
          y = targetY;
          previousX = x;
          previousY = y;
        }

        const easing = reduceMotion ? 1 : 0.2;
        x += (targetX - x) * easing;
        y += (targetY - y) * easing;
        const deltaX = x - previousX;
        const deltaY = y - previousY;
        const distance = Math.hypot(deltaX, deltaY);
        if (Math.abs(deltaX) > 0.2) facing += ((deltaX > 0 ? 1 : -1) - facing) * 0.35;
        if (Math.abs(deltaY) > 0.08) characterElement.dataset.walkDirection = deltaY < 0 ? "backward" : "forward";

        const direction = Math.abs(deltaY) > 0.08 ? Math.sign(deltaY) : Math.sign(deltaX || 1);
        phase += Math.min(distance, 18) * 0.12 * direction;
        stride += ((distance > 0.5 ? 1 : 0) - stride) * 0.2;
        const legAngle = Math.sin(phase) * 34 * stride;
        leftLeg.setAttribute("transform", `rotate(${legAngle.toFixed(1)} 39 72)`);
        rightLeg.setAttribute("transform", `rotate(${(-legAngle).toFixed(1)} 61 72)`);
        const bob = reduceMotion ? 0 : -Math.abs(Math.cos(phase)) * 4 * stride;
        const tilt = reduceMotion ? 0 : Math.sin(phase) * 4 * stride;
        body.setAttribute("transform", `translate(0 ${bob.toFixed(1)}) rotate(${tilt.toFixed(1)} 50 60)`);

        characterElement.dataset.walking = stride > 0.05 ? "true" : "false";
        characterElement.dataset.facing = facing >= 0 ? "right" : "left";
        characterElement.dataset.side = walkingMap || x > width - 230 ? "right" : "left";
        const characterWidth = characterElement.offsetWidth || 68;
        const characterHeight = characterElement.offsetHeight || 84;
        characterElement.style.transform = `translate3d(${(x - characterWidth / 2).toFixed(1)}px, ${(y - scrollY - characterHeight).toFixed(1)}px, 0)`;

        const traceIndex = Math.min(cumulative.length - 1, Math.max(0, Math.floor(y / STEP)));
        if (traceIndex !== lastTraceIndex) {
          traceElement.style.strokeDasharray = `${cumulative[traceIndex] ?? routeLength} 999999`;
          lastTraceIndex = traceIndex;
        }

        let active = sections[0];
        for (const section of sections) {
          if (y >= section.top) active = section;
          else break;
        }
        const nextMessage = active?.message ?? STAGES[0].message[locale];
        characterElement.dataset.messageIndex = String(Math.max(0, sections.findIndex((section) => section.message === nextMessage)));
        if (nextMessage !== lastMessage) {
          lastMessage = nextMessage;
          setMessage(nextMessage);
        }

        previousX = x;
        previousY = y;
      }

      frame = window.requestAnimationFrame(update);
    };

    const observer = new ResizeObserver(onLayoutChange);
    observer.observe(siteElement);
    STAGES.forEach(({ id }) => {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    });
    window.addEventListener("resize", onLayoutChange, { passive: true });
    window.addEventListener("load", onLayoutChange);
    document.fonts?.ready.then(onLayoutChange);
    frame = window.requestAnimationFrame(update);

    return () => {
      mounted = false;
      window.removeEventListener("resize", onLayoutChange);
      window.removeEventListener("load", onLayoutChange);
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [locale]);

  return (
    <>
      <svg className="journey-trail" aria-hidden="true" focusable="false">
        <path className="journey-trail-base" ref={routeRef} />
        <path className="journey-trail-copper" ref={traceRef} />
      </svg>
      <div className="journey-star" ref={characterRef} data-walking="false" data-walk-direction="forward" data-facing="right" data-side="right" data-message-index="0" aria-hidden="true">
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
