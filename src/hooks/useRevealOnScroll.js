// src/hooks/useRevealOnScroll.js
import { useEffect, useRef } from "react";

export const useRevealOnScroll = (delay = 0) => {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.add("hr-reveal");
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => el.classList.add("is-visible"), delay);
          observer.unobserve(el);
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);
  return ref;
};

export const useStaggerReveal = (staggerMs = 80) => {
  const containerRef = useRef(null);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const children = Array.from(container.children);
    children.forEach(child => child.classList.add("hr-reveal"));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            children.forEach((child, i) => {
              setTimeout(() => child.classList.add("is-visible"), i * staggerMs);
            });
            observer.unobserve(container);
          }
        });
      },
      { threshold: 0.05 }
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, [staggerMs]);
  return containerRef;
};

export const useCountUp = (target, duration = 900) => {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof target !== "number") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(el);
        let start = null;
        const easeOut = t => 1 - Math.pow(1 - t, 3);
        const step = timestamp => {
          if (!start) start = timestamp;
          const progress = Math.min((timestamp - start) / duration, 1);
          el.textContent = Math.round(easeOut(progress) * target);
          if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);
  return ref;
};

export const useParallax = (speed = 0.3) => {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          el.style.transform = `translateY(${window.scrollY * speed}px)`;
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [speed]);
  return ref;
};

export const useTilt = (maxDeg = 4) => {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = e => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width  - 0.5;
      const y = (e.clientY - rect.top)  / rect.height - 0.5;
      el.style.transform = `perspective(600px) rotateY(${x * maxDeg * 2}deg) rotateX(${-y * maxDeg * 2}deg) translateY(-3px)`;
      el.style.transition = "transform 0.1s ease";
    };
    const onLeave = () => {
      el.style.transform = "";
      el.style.transition = "transform 0.35s cubic-bezier(0.23,1,0.32,1)";
    };
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [maxDeg]);
  return ref;
};

export const useSidebarGlow = () => {
  const ref = useRef(null);
  useEffect(() => {
    const nav = ref.current;
    if (!nav) return;
    const glow = document.createElement("div");
    glow.style.cssText = "position:absolute;pointer-events:none;z-index:0;width:160px;height:80px;border-radius:50%;background:radial-gradient(ellipse,rgba(91,138,240,0.15) 0%,transparent 70%);transform:translate(-50%,-50%);transition:top 0.15s ease,opacity 0.2s;opacity:0;left:50%";
    nav.style.position = "relative";
    nav.style.overflow = "hidden";
    nav.appendChild(glow);
    const onMove = e => {
      const rect = nav.getBoundingClientRect();
      glow.style.opacity = "1";
      glow.style.top = (e.clientY - rect.top) + "px";
    };
    const onLeave = () => { glow.style.opacity = "0"; };
    nav.addEventListener("mousemove", onMove);
    nav.addEventListener("mouseleave", onLeave);
    return () => {
      nav.removeEventListener("mousemove", onMove);
      nav.removeEventListener("mouseleave", onLeave);
      if (glow.parentNode) glow.parentNode.removeChild(glow);
    };
  }, []);
  return ref;
};