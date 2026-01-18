"use client";

import React, { useEffect, useRef, useState, forwardRef } from 'react';
import { motion, HTMLMotionProps, Transition } from 'framer-motion';
import { ArrowRight, Layout, Pointer, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@radix-ui/react-tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// ==================== AETHER HERO SECTION ====================

const DEFAULT_FRAG = `#version 300 es
precision highp float;
out vec4 O;
uniform float time;
uniform vec2 resolution;
#define FC gl_FragCoord.xy
#define R resolution
#define T time
#define S smoothstep
#define MN min(R.x,R.y)
float pattern(vec2 uv) {
  float d=.0;
  for (float i=.0; i<3.; i++) {
    uv.x+=sin(T*(1.+i)+uv.y*1.5)*.2;
    d+=.005/abs(uv.x);
  }
  return d;	
}
vec3 scene(vec2 uv) {
  vec3 col=vec3(0);
  uv=vec2(atan(uv.x,uv.y)*2./6.28318,-log(length(uv))+T);
  for (float i=.0; i<3.; i++) {
    int k=int(mod(i,3.));
    col[k]+=pattern(uv+i*6./MN);
  }
  return col;
}
void main() {
  vec2 uv=(FC-.5*R)/MN;
  vec3 col=vec3(0);
  float s=12., e=9e-4;
  col+=e/(sin(uv.x*s)*cos(uv.y*s));
  uv.y+=R.x>R.y?.5:.5*(R.y/R.x);
  col+=scene(uv);
  O=vec4(col,1.);
}`;

const VERT_SRC = `#version 300 es
precision highp float;
in vec2 position;
void main(){ gl_Position = vec4(position, 0.0, 1.0); }
`;

function AetherHero() {
  const title = "Build launch-grade UI in hours.";
  const subtitle = "Animated WebGL backdrop, crisp type, and accessible CTAs. Drop it into any Next.js page.";
  const ctaLabel = "Explore Docs";
  const ctaHref = "#about";
  const secondaryCtaLabel = "GitHub";
  const secondaryCtaHref = "https://github.com/rahil1202";
  const align = 'center';
  const maxWidth = 960;
  const overlayGradient = "linear-gradient(180deg, #000000bb 0%, #00000055 40%, transparent)";
  const textColor = '#ffffff';
  const fragmentSource = DEFAULT_FRAG;
  const dprMax = 2;
  const clearColor: [number, number, number, number] = [0, 0, 0, 1];
  const height = '100vh';

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const glRef = useRef<WebGL2RenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const bufRef = useRef<WebGLBuffer | null>(null);
  const uniTimeRef = useRef<WebGLUniformLocation | null>(null);
  const uniResRef = useRef<WebGLUniformLocation | null>(null);
  const rafRef = useRef<number | null>(null);

  const compileShader = (gl: WebGL2RenderingContext, src: string, type: number) => {
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(sh) || 'Unknown shader error';
      gl.deleteShader(sh);
      throw new Error(info);
    }
    return sh;
  };

  const createProgram = (gl: WebGL2RenderingContext, vs: string, fs: string) => {
    const v = compileShader(gl, vs, gl.VERTEX_SHADER);
    const f = compileShader(gl, fs, gl.FRAGMENT_SHADER);
    const prog = gl.createProgram()!;
    gl.attachShader(prog, v);
    gl.attachShader(prog, f);
    gl.linkProgram(prog);
    gl.deleteShader(v);
    gl.deleteShader(f);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(prog) || 'Program link error';
      gl.deleteProgram(prog);
      throw new Error(info);
    }
    return prog;
  };

  useEffect(() => {
    const canvas = canvasRef.current!;
    const gl = canvas.getContext('webgl2', { alpha: true, antialias: true });
    if (!gl) return;
    glRef.current = gl;

    let prog: WebGLProgram;
    try {
      prog = createProgram(gl, VERT_SRC, fragmentSource);
    } catch (e) {
      console.error(e);
      return;
    }
    programRef.current = prog;

    const verts = new Float32Array([-1, 1, -1, -1, 1, 1, 1, -1]);
    const buf = gl.createBuffer()!;
    bufRef.current = buf;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);

    gl.useProgram(prog);
    const posLoc = gl.getAttribLocation(prog, 'position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    uniTimeRef.current = gl.getUniformLocation(prog, 'time');
    uniResRef.current = gl.getUniformLocation(prog, 'resolution');

    gl.clearColor(clearColor[0], clearColor[1], clearColor[2], clearColor[3]);

    const fit = () => {
      const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, dprMax));
      const rect = canvas.getBoundingClientRect();
      const cssW = Math.max(1, rect.width);
      const cssH = Math.max(1, rect.height);
      const W = Math.floor(cssW * dpr);
      const H = Math.floor(cssH * dpr);
      if (canvas.width !== W || canvas.height !== H) {
        canvas.width = W; canvas.height = H;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    fit();
    const onResize = () => fit();
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);
    window.addEventListener('resize', onResize);

    const loop = (now: number) => {
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      if (uniResRef.current) gl.uniform2f(uniResRef.current, canvas.width, canvas.height);
      if (uniTimeRef.current) gl.uniform1f(uniTimeRef.current, now * 1e-3);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', onResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (bufRef.current) gl.deleteBuffer(bufRef.current);
      if (programRef.current) gl.deleteProgram(programRef.current);
    };
  }, [fragmentSource, dprMax, clearColor]);

  const justify = 'flex-start';
  const textAlign = 'left' as const;

  return (
    <section
      style={{ height, position: 'relative', overflow: 'hidden' }}
      aria-label="Hero"
    >
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&display=swap" rel="stylesheet" />
      
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Aurora hero background"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          display: 'block',
          userSelect: 'none',
          touchAction: 'none',
        }}
      />

      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: overlayGradient,
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 2,
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: justify,
          padding: 'min(6vw, 64px)',
          color: textColor,
          fontFamily: "'Space Grotesk', ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial",
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth,
            textAlign,
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: 'clamp(2.2rem, 6vw, 4.5rem)',
              lineHeight: 1.04,
              letterSpacing: '-0.02em',
              fontWeight: 700,
              textShadow: '0 6px 36px rgba(0,0,0,0.45)',
            }}
          >
            {title}
          </h1>

          <p
            style={{
              marginTop: '1rem',
              fontSize: 'clamp(1rem, 2vw, 1.25rem)',
              lineHeight: 1.6,
              opacity: 0.9,
              textShadow: '0 4px 24px rgba(0,0,0,0.35)',
              maxWidth: 900,
              margin: '1rem auto 0',
            }}
          >
            {subtitle}
          </p>

          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '12px',
              marginTop: '2rem',
              flexWrap: 'wrap',
            }}
          >
            <a
              href={ctaHref}
              style={{
                padding: '12px 18px',
                borderRadius: 12,
                background: 'linear-gradient(180deg, rgba(255,255,255,.18), rgba(255,255,255,.06))',
                color: textColor,
                textDecoration: 'none',
                fontWeight: 600,
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.28), 0 10px 30px rgba(0,0,0,.2)',
                backdropFilter: 'blur(6px) saturate(120%)',
              }}
            >
              {ctaLabel}
            </a>

            <a
              href={secondaryCtaHref}
              style={{
                padding: '12px 18px',
                borderRadius: 12,
                background: 'transparent',
                color: textColor,
                opacity: 0.85,
                textDecoration: 'none',
                fontWeight: 600,
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.28)',
                backdropFilter: 'blur(2px)',
              }}
            >
              {secondaryCtaLabel}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

// ==================== TIMELINE ANIMATION ====================

interface TimelineContentProps extends HTMLMotionProps<"div"> {
  animationNum: number;
  timelineRef: React.RefObject<HTMLDivElement>;
  customVariants?: {
    visible: (i: number) => object;
    hidden: object;
  };
  as?: keyof JSX.IntrinsicElements;
}

function TimelineContent({
  children,
  animationNum,
  timelineRef,
  customVariants,
  className,
  as = "div",
  ...props
}: TimelineContentProps) {
  const defaultVariants = {
    visible: (i: number) => ({
      y: 0,
      opacity: 1,
      transition: {
        delay: i * 0.2,
        duration: 0.5,
      },
    }),
    hidden: {
      y: 40,
      opacity: 0,
    },
  };

  const variants = customVariants || defaultVariants;
  const MotionComponent = motion[as as keyof typeof motion] as any;

  return (
    <MotionComponent
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      custom={animationNum}
      variants={variants}
      {...props}
    >
      {children}
    </MotionComponent>
  );
}

// ==================== VERTICAL CUT REVEAL ====================

interface VerticalCutRevealProps {
  children: React.ReactNode;
  splitBy?: "words" | "characters";
  staggerDuration?: number;
  staggerFrom?: "first" | "last" | "center";
  transition?: Transition;
  containerClassName?: string;
}

function VerticalCutReveal({
  children,
  splitBy = "words",
  staggerDuration = 0.2,
  staggerFrom = "first",
  transition = { type: "spring", stiffness: 250, damping: 30 },
  containerClassName,
}: VerticalCutRevealProps) {
  const text = typeof children === "string" ? children : children?.toString() || "";
  const words = text.split(" ");

  const getStaggerDelay = (index: number, total: number) => {
    if (staggerFrom === "first") return index * staggerDuration;
    if (staggerFrom === "last") return (total - 1 - index) * staggerDuration;
    const center = Math.floor(total / 2);
    return Math.abs(center - index) * staggerDuration;
  };

  return (
    <span className={cn("inline-flex flex-wrap", containerClassName)}>
      {words.map((word, i) => (
        <span key={i} className="overflow-hidden inline-block mr-[0.25em]">
          <motion.span
            className="inline-block"
            initial={{ y: "100%", opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{
              ...transition,
              delay: getStaggerDelay(i, words.length),
            }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

// ==================== ABOUT SECTION ====================

function AboutSection() {
  const heroRef = useRef<HTMLDivElement>(null);
  
  const revealVariants = {
    visible: (i: number) => ({
      y: 0,
      opacity: 1,
      filter: "blur(0px)",
      transition: { delay: i * 0.3, duration: 0.7 },
    }),
    hidden: { filter: "blur(10px)", y: 40, opacity: 0 },
  };
  
  const revealVariants2 = {
    visible: (i: number) => ({
      y: 0,
      opacity: 1,
      filter: "blur(0px)",
      transition: { delay: i * 0.3, duration: 0.7 },
    }),
    hidden: { filter: "blur(10px)", y: -40, opacity: 0 },
  };
  
  const revealVariants3 = {
    visible: (i: number) => ({
      y: 0,
      opacity: 1,
      transition: { delay: i * 0.3, duration: 0.7 },
    }),
    hidden: { opacity: 0 },
  };

  return (
    <section
      id="about"
      className="relative py-32 px-4 bg-gray-50 overflow-hidden"
      ref={heroRef}
    >
      <svg className="absolute -top-[999px] -left-[999px] w-0 h-0">
        <defs>
          <clipPath id="clip-squiggle" clipPathUnits="objectBoundingBox">
            <path d="M0.434125 0.00538712C0.56323 -0.00218488 0.714575 -0.000607013 0.814404 0.00302954L0.802642 0.163537C0.813884 0.167475 0.824927 0.172002 0.835358 0.177236C0.869331 0.194281 0.909224 0.225945 0.90824 0.27348C0.907177 0.324883 0.858912 0.354946 0.822651 0.36933C0.857426 0.376783 0.894591 0.387558 0.925837 0.404287C0.968002 0.426862 1.00569 0.464702 0.999287 0.515878C0.993163 0.564818 0.950731 0.597642 0.904098 0.615682C0.88204 0.624216 0.858239 0.62992 0.834803 0.633808C0.858076 0.639299 0.881603 0.646639 0.90267 0.656757C0.946271 0.677698 0.986875 0.715485 0.978905 0.768037C0.972241 0.811979 0.93615 0.843109 0.895204 0.862035C0.858032 0.879217 0.815169 0.887544 0.778534 0.892219C0.704792 0.901628 0.614366 0.901003 0.535183 0.899176C0.508115 0.898551 0.482286 0.89779 0.45773 0.897065C0.404798 0.895504 0.357781 0.894117 0.317008 0.894657C0.301552 0.894862 0.289265 0.895348 0.279749 0.895976C0.251913 0.937168 0.226467 0.980907 0.216015 1L0 0.941216C0.0140558 0.915539 0.051354 0.851547 0.0902557 0.797766C0.118421 0.758828 0.1722 0.745373 0.200402 0.740217C0.168437 0.733484 0.134299 0.723597 0.105102 0.708076C0.0614715 0.684884 0.0263696 0.64687 0.0325498 0.596965C0.0385804 0.548267 0.0803829 0.515256 0.12709 0.496909C0.146901 0.489127 0.168128 0.483643 0.189242 0.479724C0.163739 0.476035 0.137977 0.471053 0.115188 0.463936C0.0874831 0.455285 0.00855855 0.424854 0.016569 0.357817C0.0231721 0.302559 0.0838593 0.276249 0.116031 0.266164C0.149646 0.255625 0.188201 0.2505 0.221821 0.247468C0.208809 0.243824 0.195905 0.239492 0.183801 0.234287C0.152543 0.220846 0.101565 0.189547 0.105449 0.136312C0.108467 0.0949629 0.144168 0.0682612 0.171101 0.0543099C0.197578 0.0405945 0.227933 0.032236 0.25348 0.0267029C0.305656 0.0154021 0.370636 0.00911076 0.434125 0.00538712Z" fill="black" />
          </clipPath>
        </defs>
      </svg>
      <svg className="absolute -top-[999px] -left-[999px] w-0 h-0">
        <defs>
          <clipPath id="differentone16" clipPathUnits="objectBoundingBox">
            <path d="M0.911218 0.329658C0.917139 0.29671 0.914994 0.262818 0.904967 0.23088C0.894939 0.198941 0.877327 0.169906 0.853635 0.146256C0.829944 0.122605 0.800878 0.105043 0.768923 0.0950708C0.736967 0.0850983 0.703072 0.083012 0.670134 0.0889901C0.651042 0.0615242 0.625587 0.0390856 0.595943 0.0235895C0.566299 0.00809344 0.533346 0 0.499896 0C0.466446 0 0.433493 0.00809344 0.403849 0.0235895C0.374204 0.0390856 0.34875 0.0615242 0.329658 0.0889901C0.29675 0.0830893 0.262904 0.0852337 0.231005 0.0952406C0.199106 0.105248 0.1701 0.12282 0.14646 0.14646C0.12282 0.1701 0.105248 0.199106 0.0952406 0.231005C0.0852337 0.262904 0.0830893 0.29675 0.0889901 0.329658C0.0615242 0.34875 0.0390856 0.374204 0.0235895 0.403849C0.00809344 0.433493 0 0.466446 0 0.499896C0 0.533346 0.00809344 0.566299 0.0235895 0.595943C0.0390856 0.625587 0.0615242 0.651042 0.0889901 0.670134C0.0830405 0.703077 0.0851562 0.73697 0.0951563 0.768917C0.105156 0.800864 0.122744 0.829915 0.146414 0.853586C0.170085 0.877256 0.199136 0.894844 0.231083 0.904844C0.26303 0.914844 0.296923 0.916959 0.329866 0.91101C0.348958 0.938476 0.374413 0.960914 0.404057 0.97641C0.433701 0.991907 0.466654 1 0.500104 1C0.533554 1 0.566507 0.991907 0.596151 0.97641C0.625796 0.960914 0.65125 0.938476 0.670343 0.91101C0.70327 0.916921 0.737139 0.914776 0.769057 0.904759C0.800976 0.894741 0.829997 0.877149 0.853642 0.853483C0.877287 0.829818 0.894854 0.800782 0.904844 0.768854C0.914834 0.736927 0.916949 0.703056 0.91101 0.670134C0.938476 0.651042 0.960914 0.625587 0.97641 0.595943C0.991907 0.566299 1 0.533346 1 0.499896C1 0.466446 0.991907 0.433493 0.97641 0.403849C0.960914 0.374204 0.938476 0.34875 0.91101 0.329658H0.911218Z" fill="black" />
          </clipPath>
        </defs>
      </svg>
      <svg className="absolute -top-[999px] -left-[999px] w-0 h-0">
        <defs>
          <clipPath id="differentone8" clipPathUnits="objectBoundingBox">
            <path d="M0.830625 0.5C0.883908 0.453139 0.926579 0.395449 0.955787 0.330781C0.984995 0.266114 1.00007 0.195958 1 0.125C1 0.0918481 0.98683 0.0600539 0.963388 0.0366119C0.939946 0.0131698 0.908152 2.32816e-07 0.875 2.32816e-07C0.725625 2.32816e-07 0.591667 0.0654169 0.5 0.169375C0.453139 0.116092 0.395449 0.0734212 0.330781 0.0442131C0.266114 0.0150049 0.195958 -6.83243e-05 0.125 2.32816e-07C0.0918481 2.32816e-07 0.0600539 0.0131698 0.0366119 0.0366119C0.0131698 0.0600539 2.32816e-07 0.0918481 2.32816e-07 0.125C2.32816e-07 0.274375 0.0654169 0.408333 0.169375 0.5C0.116092 0.546861 0.0734212 0.604551 0.0442131 0.669219C0.0150049 0.733887 -6.83243e-05 0.804042 2.32816e-07 0.875C2.32816e-07 0.908152 0.0131698 0.939946 0.0366119 0.963388C0.0600539 0.98683 0.0918481 1 0.125 1C0.274375 1 0.408333 0.934583 0.5 0.830625C0.546861 0.883908 0.604551 0.926579 0.669219 0.955787C0.733887 0.984995 0.804042 1.00007 0.875 1C0.908152 1 0.939946 0.98683 0.963388 0.963388C0.98683 0.939946 1 0.908152 1 0.875C1 0.725625 0.934583 0.591667 0.830625 0.5Z" fill="black" />
          </clipPath>
        </defs>
      </svg>
      <svg className="absolute -top-[999px] -left-[999px] w-0 h-0">
        <defs>
          <clipPath id="clip-rect" clipPathUnits="objectBoundingBox">
            <path d="M0.5 0L0.550709 0.0460541C0.541963 0.0640581 0.528578 0.0791151 0.513027 0.0917341C0.520456 0.0907291 0.527892 0.0897201 0.535322 0.0887131C0.611493 0.0783851 0.687008 0.0681471 0.74727 0.0620541C0.784018 0.0583381 0.81958 0.0556691 0.848085 0.0560471C0.861663 0.0562271 0.879579 0.0571111 0.897003 0.0610981C0.909779 0.0640211 0.953305 0.0757431 0.966627 0.113912C0.981722 0.157163 0.941632 0.185488 0.934622 0.19038C0.921226 0.199729 0.905329 0.206897 0.892499 0.212115C0.870649 0.221001 0.842659 0.230142 0.811999 0.239254C0.83681 0.236656 0.861008 0.235257 0.882435 0.23621C0.898377 0.236918 0.921559 0.239201 0.943733 0.24826C0.970081 0.259024 0.995291 0.280051 0.999439 0.311122C1.00342 0.340933 0.985349 0.363373 0.972847 0.375304C0.959707 0.387843 0.943414 0.397844 0.928912 0.405582C0.908422 0.416516 0.883341 0.427176 0.856112 0.437447C0.864364 0.436866 0.872329 0.436539 0.879902 0.436521C0.894726 0.436485 0.918867 0.437439 0.942277 0.446087C0.955191 0.450858 0.970509 0.458949 0.982453 0.472319C0.994857 0.486205 0.999891 0.501633 0.999891 0.515923C0.999891 0.545114 0.979611 0.565612 0.967435 0.575746C0.953994 0.586934 0.937862 0.595927 0.923325 0.603007C0.898842 0.614932 0.868113 0.626538 0.834975 0.637664C0.839838 0.637396 0.844565 0.637223 0.849131 0.637157C0.862911 0.636959 0.885294 0.637431 0.907315 0.644301C0.91929 0.648037 0.935423 0.654982 0.948734 0.667909C0.96307 0.681831 0.969583 0.69831 0.969583 0.714241C0.969583 0.756168 0.930027 0.781711 0.913544 0.791403C0.891777 0.804203 0.864569 0.815187 0.838085 0.824629C0.790903 0.84145 0.729751 0.858922 0.669115 0.876246C0.66103 0.878556 0.652955 0.880864 0.644923 0.883166C0.574356 0.903398 0.504814 0.923898 0.447288 0.945539C0.385857 0.968649 0.354123 0.98743 0.343618 0.999097L0.202975 0.923461C0.215492 0.909559 0.231313 0.896865 0.249116 0.885256C0.245423 0.885811 0.241771 0.886347 0.238165 0.886862C0.198801 0.892483 0.158749 0.89657 0.125136 0.895416C0.10872 0.894852 0.0869431 0.892883 0.0658381 0.885656C0.0427861 0.877762 0.014566 0.861068 0.00449603 0.831173C-0.00578897 0.800641 0.00946505 0.775473 0.0227 0.761104C0.035552 0.747151 0.0521941 0.73661 0.0660451 0.729015C0.0763781 0.723348 0.0879781 0.717821 0.10046 0.712441C0.0918191 0.7114 0.0828791 0.709795 0.0740171 0.70737C0.0519021 0.701317 0.021352 0.687312 0.00720103 0.65819C-0.00776397 0.627392 0.00549305 0.600161 0.018904 0.584108C0.03142 0.569125 0.048329 0.557944 0.061925 0.550133C0.0899171 0.534051 0.127869 0.51891 0.167323 0.504992C0.189196 0.497276 0.213195 0.489371 0.238664 0.48135C0.201179 0.486283 0.163943 0.489581 0.131973 0.488597C0.114641 0.488064 0.0935231 0.486164 0.0730311 0.480032C0.0519071 0.47371 0.024429 0.460566 0.00936805 0.434874C-0.00727695 0.406482 0.000740049 0.379077 0.014172 0.360311C0.026036 0.343734 0.043174 0.331657 0.0566 0.32353C0.084167 0.306842 0.121704 0.291789 0.159992 0.278421C0.179936 0.271457 0.2017 0.264408 0.224764 0.257328C0.191619 0.258997 0.158935 0.259269 0.131101 0.256364C0.115367 0.254721 0.0954681 0.251528 0.0765251 0.244134C0.0569951 0.236512 0.030269 0.220901 0.019911 0.192566C0.00630305 0.155339 0.028173 0.125216 0.050968 0.10819C0.070358 0.0937081 0.094464 0.0847721 0.112073 0.0791001C0.142823 0.0691931 0.183388 0.0604071 0.219871 0.0525041C0.226304 0.0511111 0.232611 0.0497451 0.238714 0.0484051C0.283575 0.0385571 0.323527 0.0289901 0.35429 0.0175781L0.5 0Z" fill="black" />
          </clipPath>
        </defs>
      </svg>

      <TimelineContent
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `radial-gradient(125% 125% at 50% 90%, #ffffff00 40%, #13131300 100%)`,
          backgroundSize: "100% 100%",
        }}
        animationNum={2}
        customVariants={revealVariants3}
        timelineRef={heroRef}
      />
      <TimelineContent
        className="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#a3a3a32e_1px,transparent_1px),linear-gradient(to_bottom,#a3a3a32e_1px,transparent_1px)] bg-[size:70px_70px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_100%,#000_70%,transparent_110%)]"
        animationNum={3}
        customVariants={revealVariants3}
        timelineRef={heroRef}
      />
      
      <div className="relative z-10 max-w-2xl mx-auto">
        <div className="text-blue-600 text-sm font-semibold uppercase mb-6 flex items-center justify-center gap-2">
          About
        </div>

        <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-gray-900 mb-6">
          <VerticalCutReveal
            splitBy="words"
            staggerDuration={0.2}
            staggerFrom="last"
            transition={{ type: "spring", stiffness: 250, damping: 30, delay: 0.2 }}
            containerClassName="text-[#00000] leading-[120%] text-center justify-center items-center"
          >
            A Legacy of Excellence, How Our Dedication Fuels Everything We Do
          </VerticalCutReveal>
        </h2>

        <TimelineContent
          as="p"
          animationNum={0}
          customVariants={revealVariants}
          timelineRef={heroRef}
          className="text-gray-600 text-center sm:text-lg text-sm mb-8 leading-relaxed"
        >
          From day one, our mission has been to create solutions that inspire, empower, and make a difference. With a commitment to quality and creativity.
        </TimelineContent>

        <TimelineContent
          as="button"
          animationNum={1}
          customVariants={revealVariants3}
          timelineRef={heroRef}
          className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/30 border border-blue-600 flex w-fit mx-auto gap-2 hover:gap-4 transition-all duration-300 ease-in-out text-white px-5 py-3 rounded-full cursor-pointer"
        >
          Explore Our Services <ArrowRight />
        </TimelineContent>
      </div>
      
      <div className="max-w-6xl mx-auto grid grid-cols-4 gap-4 pt-20 lg:h-[26rem] md:h-[22rem] sm:h-[16rem] h-[14rem]">
        <TimelineContent
          as="figure"
          animationNum={2}
          timelineRef={heroRef}
          customVariants={revealVariants}
          className="w-full h-full rounded-lg overflow-hidden"
          style={{ clipPath: "url(#clip-squiggle)" }}
        >
          <img
            src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=687&auto=format&fit=crop"
            alt="Team member"
            className="object-cover w-full h-full rotate-6"
          />
        </TimelineContent>
        
        <TimelineContent
          as="figure"
          animationNum={3}
          timelineRef={heroRef}
          customVariants={revealVariants2}
          className="w-full h-full rounded-lg overflow-hidden"
          style={{ clipPath: "url(#differentone16)" }}
        >
          <img
            src="https://images.unsplash.com/photo-1609179242555-1d7b4b0a568c?q=80&w=687&auto=format&fit=crop"
            alt="Team member"
            className="object-cover w-full h-full -rotate-6"
          />
        </TimelineContent>

        <TimelineContent
          as="figure"
          animationNum={4}
          timelineRef={heroRef}
          customVariants={revealVariants2}
          className="w-full h-full rounded-lg overflow-hidden"
          style={{ clipPath: "url(#differentone8)" }}
        >
          <img
            src="https://images.unsplash.com/photo-1611695434398-4f4b330623e6?q=80&w=735&auto=format&fit=crop"
            alt="Team member"
            className="object-cover w-full h-full -rotate-6"
          />
        </TimelineContent>

        <TimelineContent
          as="figure"
          animationNum={5}
          timelineRef={heroRef}
          customVariants={revealVariants2}
          className="w-full h-full rounded-lg overflow-hidden"
          style={{ clipPath: "url(#clip-rect)" }}
        >
          <img
            src="https://images.unsplash.com/photo-1567934872913-aacea74458b7?q=80&w=687&auto=format&fit=crop"
            alt="Team member"
            className="object-cover w-full h-full rotate-6"
          />
        </TimelineContent>
      </div>
    </section>
  );
}

// ==================== SKILLS SECTION ====================

const defaultSkills = [
  { name: "React & Next.js", level: 95 },
  { name: "TypeScript", level: 90 },
  { name: "Node.js", level: 85 },
  { name: "UI/UX Design", level: 88 },
  { name: "Database Design", level: 82 },
  { name: "Cloud & DevOps", level: 78 },
];

function SkillsSection() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <section className="py-32 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <span className="text-blue-600 text-sm font-semibold uppercase">Skills</span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-foreground mt-4">
            Technical Expertise
          </h2>
          <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
            A curated collection of technologies and skills I've mastered over the years.
          </p>
        </div>

        <div className="max-w-xl mx-auto">
          <div className="space-y-1">
            {defaultSkills.map((skill, index) => (
              <div key={skill.name}>
                <div
                  className="group flex items-center justify-between py-4 px-4 -mx-4 rounded-lg transition-colors duration-300 cursor-pointer hover:bg-muted/50"
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <div className="relative flex items-center gap-4">
                    <div
                      className={cn(
                        "h-5 w-0.5 rounded-full transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
                        hoveredIndex === index ? "bg-blue-600 scale-y-100 opacity-100" : "bg-border scale-y-50 opacity-0"
                      )}
                    />
                    <span
                      className={cn(
                        "text-base font-medium tracking-tight transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
                        hoveredIndex === index ? "text-foreground translate-x-0" : "text-muted-foreground -translate-x-5"
                      )}
                    >
                      {skill.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="relative w-24 h-1 rounded-full overflow-hidden bg-border/50">
                      <div className="absolute inset-0 bg-muted/50" />
                      <div
                        className={cn(
                          "absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
                          "bg-gradient-to-r from-blue-500/80 to-blue-600"
                        )}
                        style={{
                          width: hoveredIndex === index ? `${skill.level}%` : "0%",
                          transitionDelay: hoveredIndex === index ? "100ms" : "0ms",
                        }}
                      />
                      <div
                        className={cn(
                          "absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent",
                          "transition-transform duration-700 ease-out",
                          hoveredIndex === index ? "translate-x-full" : "-translate-x-full"
                        )}
                        style={{ transitionDelay: hoveredIndex === index ? "300ms" : "0ms" }}
                      />
                    </div>

                    <div className="relative w-10 overflow-hidden">
                      <span
                        className={cn(
                          "block text-sm font-mono tabular-nums text-right",
                          "transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
                          hoveredIndex === index
                            ? "text-foreground opacity-100 translate-y-0 blur-0"
                            : "text-muted-foreground/40 opacity-0 translate-y-3 blur-sm"
                        )}
                      >
                        {skill.level}%
                      </span>
                    </div>
                  </div>
                </div>

                {index < defaultSkills.length - 1 && (
                  <div
                    className={cn(
                      "mx-4 h-px transition-all duration-500",
                      hoveredIndex === index || hoveredIndex === index + 1
                        ? "bg-transparent"
                        : "bg-border/30"
                    )}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 mt-10 pt-6 border-t border-border/30">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-600/60 animate-pulse" />
            <p className="text-[11px] text-muted-foreground tracking-wide">Hover to explore</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ==================== FEATURE TABS SECTION ====================

const featureTabs = [
  {
    value: "tab-1",
    icon: <Zap className="h-auto w-4 shrink-0" />,
    label: "Boost Revenue",
    content: {
      badge: "Modern Tactics",
      title: "Make your site a true standout.",
      description: "Discover new web trends that help you craft sleek, highly functional sites that drive traffic and convert leads into customers.",
      buttonText: "See Plans",
      imageSrc: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop",
      imageAlt: "Analytics dashboard",
    },
  },
  {
    value: "tab-2",
    icon: <Pointer className="h-auto w-4 shrink-0" />,
    label: "Higher Engagement",
    content: {
      badge: "Expert Features",
      title: "Boost your site with top-tier design.",
      description: "Use stellar design to easily engage users and strengthen their loyalty. Create a seamless experience that keeps them coming back for more.",
      buttonText: "See Tools",
      imageSrc: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop",
      imageAlt: "Design tools",
    },
  },
  {
    value: "tab-3",
    icon: <Layout className="h-auto w-4 shrink-0" />,
    label: "Stunning Layouts",
    content: {
      badge: "Elite Solutions",
      title: "Build an advanced web experience.",
      description: "Lift your brand with modern tech that grabs attention and drives action. Create a digital experience that stands out from the crowd.",
      buttonText: "See Options",
      imageSrc: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&h=600&fit=crop",
      imageAlt: "Modern layouts",
    },
  },
];

function FeatureSection() {
  return (
    <section className="py-32 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <Badge variant="outline">Features</Badge>
          <h1 className="max-w-2xl text-3xl font-semibold md:text-4xl text-foreground">
            A Collection of Components Built With Shadcn & Tailwind
          </h1>
          <p className="text-muted-foreground">Join us to build flawless web solutions.</p>
        </div>
        <Tabs defaultValue={featureTabs[0].value} className="mt-8">
          <TabsList className="container flex flex-col items-center justify-center gap-4 sm:flex-row md:gap-10">
            {featureTabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-muted-foreground data-[state=active]:bg-muted data-[state=active]:text-primary"
              >
                {tab.icon} {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="mx-auto mt-8 max-w-screen-xl rounded-2xl bg-muted/70 p-6 lg:p-16">
            {featureTabs.map((tab) => (
              <TabsContent
                key={tab.value}
                value={tab.value}
                className="grid place-items-center gap-20 lg:grid-cols-2 lg:gap-10"
              >
                <div className="flex flex-col gap-5">
                  <Badge variant="outline" className="w-fit bg-background">
                    {tab.content.badge}
                  </Badge>
                  <h3 className="text-3xl font-semibold lg:text-5xl text-foreground">
                    {tab.content.title}
                  </h3>
                  <p className="text-muted-foreground lg:text-lg">
                    {tab.content.description}
                  </p>
                  <Button className="mt-2.5 w-fit gap-2" size="lg">
                    {tab.content.buttonText}
                  </Button>
                </div>
                <img
                  src={tab.content.imageSrc}
                  alt={tab.content.imageAlt}
                  className="rounded-xl"
                />
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </div>
    </section>
  );
}

// ==================== PROJECTS SECTION ====================

const ContainerScroll = forwardRef<HTMLDivElement, React.HTMLProps<HTMLDivElement>>(
  ({ children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("relative w-full", className)}
        style={{ perspective: "1000px", ...props.style }}
        {...props}
      >
        {children}
      </div>
    );
  }
);
ContainerScroll.displayName = "ContainerScroll";

interface CardStickyProps extends HTMLMotionProps<"div"> {
  index: number;
  incrementY?: number;
  incrementZ?: number;
}

const CardSticky = forwardRef<HTMLDivElement, CardStickyProps>(
  ({ index, incrementY = 10, incrementZ = 10, children, className, style, ...props }, ref) => {
    const y = index * incrementY;
    const z = index * incrementZ;

    return (
      <motion.div
        ref={ref}
        layout="position"
        style={{ top: y, z, backfaceVisibility: "hidden", ...style }}
        className={cn("sticky", className)}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
CardSticky.displayName = "CardSticky";

const WORK_PROJECTS = [
  {
    id: "work-project-3",
    title: "YCF DEV",
    services: ["Portfolio", "Partnership", "UI UX Design"],
    imageUrl: "https://images.unsplash.com/photo-1607799279861-4dd421887fb3?q=80&w=2670&auto=format&fit=crop",
  },
  {
    id: "work-project-1",
    title: "Stridath Ecommerce",
    services: ["E-Commerce", "Branding", "UI UX Design", "Development"],
    imageUrl: "https://images.unsplash.com/photo-1688561808434-886a6dd97b8c?q=80&w=2670&auto=format&fit=crop",
  },
  {
    id: "work-project-2",
    title: "Marketing Agency",
    services: ["Partnership", "UI UX Design", "Development"],
    imageUrl: "https://images.unsplash.com/photo-1683803055067-1ca1c17cb2b9?q=80&w=2342&auto=format&fit=crop",
  },
];

function ProjectsSection() {
  return (
    <section className="min-h-screen bg-slate-900 p-12 text-stone-50">
      <div className="container mx-auto">
        <div className="text-center">
          <h5 className="text-xs uppercase tracking-wide">latest projects</h5>
          <h2 className="mb-4 mt-1 text-4xl font-bold tracking-tight">
            Get a glimpse of <span className="text-indigo-500">our work</span>
          </h2>
          <p className="mx-auto max-w-prose text-sm text-muted/80">
            From ecommerce to startup landing pages and single/multi page websites, building fully responsive and functional websites that showcase your product and your unique identity.
          </p>
        </div>
        <ContainerScroll className="min-h-[500vh] py-12">
          {WORK_PROJECTS.map((project, index) => (
            <CardSticky
              key={project.id}
              index={index}
              className="w-full overflow-hidden rounded-sm border border-x-indigo-900 border-y-indigo-500 bg-indigo-950"
              incrementY={60}
              incrementZ={5}
            >
              <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
                <h2 className="text-2xl font-bold tracking-tighter">{project.title}</h2>
                <div className="flex flex-wrap gap-1">
                  {project.services.map((service) => (
                    <div key={service} className="flex rounded-xl bg-indigo-900 px-2 py-1">
                      <span className="text-xs tracking-tighter text-muted">{service}</span>
                    </div>
                  ))}
                </div>
              </div>
              <img className="size-full object-cover" src={project.imageUrl} alt={project.title} />
            </CardSticky>
          ))}
        </ContainerScroll>
      </div>
    </section>
  );
}

// ==================== TESTIMONIALS SECTION ====================

const testimonials = [
  {
    id: 1,
    testimonial: "I feel like I've learned as much from X as I did completing my masters. It's the first thing I read every morning.",
    author: "Jenn F. - Marketing Director @ Square",
  },
  {
    id: 2,
    testimonial: "My boss thinks I know what I'm doing. Honestly, I just read this newsletter.",
    author: "Adrian Y. - Product Marketing @ Meta",
  },
  {
    id: 3,
    testimonial: "Can not believe this is free. If X was $5,000 a month, it would be worth every penny. I plan to name my next child after X.",
    author: "Devin R. - Growth Marketing Lead @ OpenAI",
  },
];

interface TestimonialCardProps {
  handleShuffle: () => void;
  testimonial: string;
  position: string;
  id: number;
  author: string;
}

function TestimonialCard({ handleShuffle, testimonial, position, id, author }: TestimonialCardProps) {
  const dragRef = useRef(0);
  const isFront = position === "front";

  return (
    <motion.div
      style={{ zIndex: position === "front" ? "2" : position === "middle" ? "1" : "0" }}
      animate={{
        rotate: position === "front" ? "-6deg" : position === "middle" ? "0deg" : "6deg",
        x: position === "front" ? "0%" : position === "middle" ? "33%" : "66%",
      }}
      drag={true}
      dragElastic={0.35}
      dragListener={isFront}
      dragConstraints={{ top: 0, left: 0, right: 0, bottom: 0 }}
      onDragStart={(e: any) => {
        dragRef.current = e.clientX;
      }}
      onDragEnd={(e: any) => {
        if (dragRef.current - e.clientX > 150) {
          handleShuffle();
        }
        dragRef.current = 0;
      }}
      transition={{ duration: 0.35 }}
      className={`absolute left-0 top-0 grid h-[450px] w-[350px] select-none place-content-center space-y-6 rounded-2xl border-2 border-slate-700 bg-slate-800/20 p-6 shadow-xl backdrop-blur-md ${
        isFront ? "cursor-grab active:cursor-grabbing" : ""
      }`}
    >
      <img
        src={`https://i.pravatar.cc/128?img=${id}`}
        alt={`Avatar of ${author}`}
        className="pointer-events-none mx-auto h-32 w-32 rounded-full border-2 border-slate-700 bg-slate-200 object-cover"
      />
      <span className="text-center text-lg italic text-slate-400">"{testimonial}"</span>
      <span className="text-center text-sm font-medium text-indigo-400">{author}</span>
    </motion.div>
  );
}

function TestimonialsSection() {
  const [positions, setPositions] = useState(["front", "middle", "back"]);

  const handleShuffle = () => {
    const newPositions = [...positions];
    newPositions.unshift(newPositions.pop()!);
    setPositions(newPositions);
  };

  return (
    <section className="py-32 bg-slate-900 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <span className="text-indigo-400 text-sm font-semibold uppercase">Testimonials</span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-white mt-4">
            What Our Clients Say
          </h2>
        </div>
        <div className="relative h-[450px] w-full max-w-[350px] mx-auto">
          {testimonials.map((t, index) => (
            <TestimonialCard
              key={t.id}
              {...t}
              handleShuffle={handleShuffle}
              position={positions[index]}
            />
          ))}
        </div>
        <p className="text-center text-slate-500 mt-8 text-sm">Drag to shuffle cards</p>
      </div>
    </section>
  );
}

// ==================== CONTACT SECTION ====================

function ContactSection() {
  const contactMethods = [
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
        </svg>
      ),
      contact: "Support@example.com",
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
        </svg>
      ),
      contact: "+1 (555) 000-000",
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
        </svg>
      ),
      contact: "Mountain View, California, United State.",
    },
  ];

  return (
    <section className="py-14 bg-background">
      <div className="max-w-screen-xl mx-auto px-4 text-gray-600 md:px-8">
        <div className="max-w-lg mx-auto gap-12 justify-between lg:flex lg:max-w-none">
          <div className="max-w-lg space-y-3">
            <h3 className="text-indigo-600 font-semibold">Contact</h3>
            <p className="text-gray-800 text-3xl font-semibold sm:text-4xl">
              Let us know how we can help
            </p>
            <p>
              We're here to help and answer any question you might have. We look forward to hearing from you! Please fill out the form, or use the contact information below.
            </p>
            <div>
              <ul className="mt-6 flex flex-wrap gap-x-10 gap-y-6 items-center">
                {contactMethods.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-x-3">
                    <div className="flex-none text-gray-400">{item.icon}</div>
                    <p>{item.contact}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="flex-1 mt-12 sm:max-w-lg lg:max-w-md">
            <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
              <div>
                <label className="font-medium">Full name</label>
                <input
                  type="text"
                  required
                  className="w-full mt-2 px-3 py-2 text-gray-500 bg-transparent outline-none border focus:border-indigo-600 shadow-sm rounded-lg"
                />
              </div>
              <div>
                <label className="font-medium">Email</label>
                <input
                  type="email"
                  required
                  className="w-full mt-2 px-3 py-2 text-gray-500 bg-transparent outline-none border focus:border-indigo-600 shadow-sm rounded-lg"
                />
              </div>
              <div>
                <label className="font-medium">Company</label>
                <input
                  type="text"
                  required
                  className="w-full mt-2 px-3 py-2 text-gray-500 bg-transparent outline-none border focus:border-indigo-600 shadow-sm rounded-lg"
                />
              </div>
              <div>
                <label className="font-medium">Message</label>
                <textarea
                  required
                  className="w-full mt-2 h-36 px-3 py-2 resize-none appearance-none bg-transparent outline-none border focus:border-indigo-600 shadow-sm rounded-lg"
                ></textarea>
              </div>
              <button className="w-full px-4 py-2 text-white font-medium bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-600 rounded-lg duration-150">
                Submit
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

// ==================== MAIN INDEX PAGE ====================

const Index = () => {
  return (
    <div className="min-h-screen">
      <AetherHero />
      <AboutSection />
      <SkillsSection />
      <FeatureSection />
      <ProjectsSection />
      <TestimonialsSection />
      <ContactSection />
    </div>
  );
};

export default Index;
