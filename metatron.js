/* ============================================================
   Metatron — interactions & generated geometry
   Vanilla JS, no build step. Plain static-site friendly.
   ============================================================ */
(function () {
  "use strict";
  var SVGNS = "http://www.w3.org/2000/svg";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ----------------------------------------------------------
     1) METATRON'S CUBE geometry  (Fruit of Life — 13 centers)
        center + inner hexagon (radius d) + outer hexagon (2d),
        every pair of centers joined by a straight line.
     ---------------------------------------------------------- */
  function cubeNodes(cx, cy, d) {
    var pts = [{ x: cx, y: cy, ring: 0 }];
    for (var i = 0; i < 6; i++) {
      var a = (Math.PI / 180) * (60 * i - 90);
      pts.push({ x: cx + d * Math.cos(a), y: cy + d * Math.sin(a), ring: 1 });
    }
    for (var j = 0; j < 6; j++) {
      var b = (Math.PI / 180) * (60 * j - 90);
      pts.push({ x: cx + 2 * d * Math.cos(b), y: cy + 2 * d * Math.sin(b), ring: 2 });
    }
    return pts;
  }
  function cubeEdges(pts) {
    var edges = [];
    for (var i = 0; i < pts.length; i++)
      for (var k = i + 1; k < pts.length; k++)
        edges.push([pts[i], pts[k]]);
    return edges;
  }

  /* Build a cube SVG into `host`. opts: animate, pulse, nodeR */
  function buildCube(host, opts) {
    opts = opts || {};
    var size = opts.size || 400;
    var cx = size / 2, cy = size / 2, d = opts.d || size * 0.195;
    var pts = cubeNodes(cx, cy, d);
    var edges = cubeEdges(pts);

    var svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("viewBox", "0 0 " + size + " " + size);
    svg.setAttribute("fill", "none");

    var gWires = document.createElementNS(SVGNS, "g");
    gWires.setAttribute("class", "cube-wires");
    var gNodes = document.createElementNS(SVGNS, "g");
    gNodes.setAttribute("class", "cube-nodes");

    // central hexagram (the "lit" subset) = inner ring edges forming the star
    var lineEls = [];
    edges.forEach(function (e) {
      var ln = document.createElementNS(SVGNS, "line");
      ln.setAttribute("x1", e[0].x.toFixed(2));
      ln.setAttribute("y1", e[0].y.toFixed(2));
      ln.setAttribute("x2", e[1].x.toFixed(2));
      ln.setAttribute("y2", e[1].y.toFixed(2));
      ln.setAttribute("class", "cube-line");
      gWires.appendChild(ln);
      lineEls.push(ln);
    });

    pts.forEach(function (p, idx) {
      var r = opts.nodeR || (p.ring === 0 ? 7 : p.ring === 1 ? 6 : 5);
      var c = document.createElementNS(SVGNS, "circle");
      c.setAttribute("cx", p.x.toFixed(2));
      c.setAttribute("cy", p.y.toFixed(2));
      c.setAttribute("r", r);
      c.setAttribute("class", "cube-node");
      gNodes.appendChild(c);
      var core = document.createElementNS(SVGNS, "circle");
      core.setAttribute("cx", p.x.toFixed(2));
      core.setAttribute("cy", p.y.toFixed(2));
      core.setAttribute("r", Math.max(1.6, r * 0.32));
      core.setAttribute("class", "cube-node-core");
      gNodes.appendChild(core);
      if (opts.pulse && !reduceMotion) {
        var dur = (2.6 + (idx % 5) * 0.45).toFixed(2);
        var delay = (idx * 0.18).toFixed(2);
        core.style.transformOrigin = p.x + "px " + p.y + "px";
        core.style.animation = "nodePulse " + dur + "s ease-in-out " + delay + "s infinite";
        c.style.transformOrigin = p.x + "px " + p.y + "px";
        c.style.animation = "nodeHalo " + dur + "s ease-in-out " + delay + "s infinite";
      }
    });

    svg.appendChild(gWires);
    svg.appendChild(gNodes);
    host.appendChild(svg);

    // self-drawing stroke trace
    if (opts.animate && !reduceMotion) {
      lineEls.forEach(function (ln, i) {
        var len = ln.getTotalLength();
        ln.style.strokeDasharray = len;
        ln.style.strokeDashoffset = len;
        ln.style.transition = "stroke-dashoffset 1.1s cubic-bezier(.4,0,.2,1)";
        // order draw from center outwards-ish using index
        var delay = 120 + i * 14;
        setTimeout(function () { ln.style.strokeDashoffset = 0; }, delay);
      });
    }
    return { svg: svg, gWires: gWires, gNodes: gNodes, pts: pts, lineEls: lineEls };
  }

  /* inject animation keyframes (kept with the JS that needs them) */
  function injectKeyframes() {
    var css = [
      "@keyframes nodePulse{0%,100%{opacity:.55;transform:scale(.82)}50%{opacity:1;transform:scale(1.25)}}",
      "@keyframes nodeHalo{0%,100%{opacity:.5}50%{opacity:1}}",
      "@keyframes dashFlow{to{stroke-dashoffset:-64}}",
      "@keyframes spinSlow{to{transform:rotate(360deg)}}"
    ].join("");
    var st = document.createElement("style");
    st.textContent = css;
    document.head.appendChild(st);
  }

  /* ----------------------------------------------------------
     2) HERO — build cube, parallax, slow drift
     ---------------------------------------------------------- */
  function initHero() {
    var host = document.getElementById("heroCube");
    if (!host) return;
    var built = buildCube(host, { size: 400, d: 76, animate: true, pulse: true });
    var svg = built.svg;
    var wires = built.gWires, nodes = built.gNodes;

    if (reduceMotion) return;

    // gentle continuous rotation of the whole figure
    svg.style.transformOrigin = "50% 50%";
    svg.style.animation = "spinSlow 90s linear infinite";
    initCubePackets(built);

    // parallax on mouse (depth: nodes move more than wires)
    var tx = 0, ty = 0, cx = 0, cy = 0;
    var hero = host.closest(".hero");
    hero.addEventListener("mousemove", function (e) {
      var r = hero.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5);
      ty = ((e.clientY - r.top) / r.height - 0.5);
    });
    hero.addEventListener("mouseleave", function () { tx = 0; ty = 0; });
    (function loop() {
      cx += (tx - cx) * 0.06;
      cy += (ty - cy) * 0.06;
      wires.style.transform = "translate(" + (cx * 14) + "px," + (cy * 14) + "px)";
      nodes.style.transform = "translate(" + (cx * 26) + "px," + (cy * 26) + "px)";
      requestAnimationFrame(loop);
    })();
  }

  /* ----------------------------------------------------------
     2b) CUBE PACKETS — small packets riding Metatron's Cube edges
         (network-communication feel; two-way traffic)
     ---------------------------------------------------------- */
  function initCubePackets(built) {
    var lineEls = built.lineEls || [];
    if (!lineEls.length) return;

    var lengths = lineEls.map(function (ln) { return ln.getTotalLength(); });
    var N = 14, dots = [], conf = [];
    for (var i = 0; i < N; i++) {
      var c = document.createElementNS(SVGNS, "circle");
      c.setAttribute("r", (i % 3 === 0 ? 2.8 : i % 3 === 1 ? 2.2 : 1.7));
      c.setAttribute("class", "cube-packet" + (i % 4 === 0 ? " bright" : ""));
      built.gWires.appendChild(c);
      dots.push(c);
      conf.push({
        line: (i * 7 + (i % 5) * 3) % lineEls.length,
        phase: (i * 0.131) % 1,
        speed: (0.055 + (i % 4) * 0.018) * (i % 2 ? -1 : 1)
      });
    }

    function place(t) {
      for (var i = 0; i < dots.length; i++) {
        var cfg = conf[i];
        var ln = lineEls[cfg.line];
        var len = lengths[cfg.line];
        if (!ln || !len) continue;
        var d = (((cfg.phase + t * cfg.speed) % 1) + 1) % 1;
        var pt = ln.getPointAtLength(d * len);
        dots[i].setAttribute("cx", pt.x.toFixed(1));
        dots[i].setAttribute("cy", pt.y.toFixed(1));
      }
    }
    if (reduceMotion) { place(0); return; }   // static, spaced across cube edges
    var t0 = performance.now();
    (function loop(now) {
      place((now - t0) / 1000);
      requestAnimationFrame(loop);
    })(t0);
  }

  /* ----------------------------------------------------------
     3) brand marks + favicon (small static cubes)
     ---------------------------------------------------------- */
  function initMarks() {
    document.querySelectorAll("[data-cube-mark]").forEach(function (el) {
      buildCube(el, { size: 100, d: 19, nodeR: 3.4, animate: false, pulse: false });
    });
    // favicon is now a static asset wired in <head> (public/images/favicon*).
  }

  /* ----------------------------------------------------------
     4) PIPELINE — wires, traveling pulses, scroll reveal, cycle
     ---------------------------------------------------------- */
  function initPipeline() {
    var pipe = document.querySelector(".pipe");
    if (!pipe) return;
    var steps = Array.prototype.slice.call(pipe.querySelectorAll(".pstep:not(.pstep-mobile):not(.pstep-input)"));
    var inputRepo = pipe.querySelector(".input-repo");
    var inputIngest = pipe.querySelector(".input-ingest");

    // build the diagram wires + traveling pulses (desktop only)
    var wires = document.createElementNS(SVGNS, "svg");
    wires.setAttribute("class", "pipe-wires");
    wires.setAttribute("preserveAspectRatio", "none");
    var holder = document.querySelector(".pipe-stage");

    var vertices = null;   // pentagon vertex centers, in pipe coordinate space

    function addPath(d, className, delay) {
      var path = document.createElementNS(SVGNS, "path");
      path.setAttribute("d", d);
      path.setAttribute("class", className);
      if (className.indexOf("pulse") >= 0) {
        if (!reduceMotion) {
          path.style.strokeDasharray = "5 59";
          path.style.animation = "dashFlow 2.4s linear infinite";
          path.style.animationDelay = delay + "s";
        } else {
          path.style.opacity = "0.4";
        }
      }
      wires.appendChild(path);
      return path;
    }

    function addChevron(a, b) {   // small direction arrow at the midpoint of a→b
      var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      var ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
      var g = document.createElementNS(SVGNS, "path");
      g.setAttribute("d", "M -5 -4 L 4 0 L -5 4");
      g.setAttribute("class", "wire-chevron");
      g.setAttribute("transform", "translate(" + mx.toFixed(1) + " " + my.toFixed(1) + ") rotate(" + ang.toFixed(1) + ")");
      wires.appendChild(g);
    }

    function trimEnd(a, b, pad) {  // point `pad`px short of b, along a→b
      var dx = b.x - a.x, dy = b.y - a.y, L = Math.sqrt(dx * dx + dy * dy) || 1;
      return { x: b.x - dx / L * pad, y: b.y - dy / L * pad };
    }

    // place the 5 loop cards on the vertices of a regular pentagon (point up)
    function layoutPentagon() {
      if (window.innerWidth <= 820 || steps.length < 5) {
        steps.forEach(function (s) { s.style.left = ""; s.style.top = ""; });
        if (inputRepo) { inputRepo.style.left = ""; inputRepo.style.top = ""; }
        if (inputIngest) { inputIngest.style.left = ""; inputIngest.style.top = ""; }
        pipe.style.height = "";
        vertices = null;
        return;
      }
      var W = pipe.clientWidth;
      var halfW = (steps[0].offsetWidth || 200) / 2;
      var maxH = 0;
      steps.forEach(function (s) { maxH = Math.max(maxH, s.offsetHeight); });
      var halfH = (maxH || 170) / 2;

      var R = (W / 2 - halfW - 22) / 0.951;       // largest pentagon that fits the width
      R = Math.min(R, 270);
      R = Math.max(R, 165);

      var cx = W / 2;
      var cy = 28 + halfH + R + 200;               // shifted down by 200px to make room for inputs
      var H = cy + 0.809 * R + halfH + 16;
      pipe.style.height = H.toFixed(0) + "px";

      var ang = [-90, -18, 54, 126, 198];          // top, up-right, low-right, low-left, up-left
      vertices = ang.map(function (deg, i) {
        var t = deg * Math.PI / 180;
        var vx = cx + R * Math.cos(t);
        var vy = cy + R * Math.sin(t);
        var s = steps[i];
        s.style.left = (vx - s.offsetWidth / 2).toFixed(1) + "px";
        s.style.top = (vy - s.offsetHeight / 2).toFixed(1) + "px";
        return { x: vx, y: vy };
      });

      // Place the inputs above Candidate decisions (which is vertices[0])
      var Y0 = vertices[0].y;
      var inputY = Y0 - 200;
      if (inputRepo) {
        var w = inputRepo.offsetWidth || 200;
        var h = inputRepo.offsetHeight || 170;
        inputRepo.style.left = (cx - 120 - w / 2).toFixed(1) + "px";
        inputRepo.style.top = (inputY - h / 2).toFixed(1) + "px";
      }
      if (inputIngest) {
        var w = inputIngest.offsetWidth || 200;
        var h = inputIngest.offsetHeight || 170;
        inputIngest.style.left = (cx + 120 - w / 2).toFixed(1) + "px";
        inputIngest.style.top = (inputY - h / 2).toFixed(1) + "px";
      }
    }

    function drawWires() {
      var pw = pipe.getBoundingClientRect();
      wires.setAttribute("viewBox", "0 0 " + pw.width + " " + pw.height);
      wires.setAttribute("width", pw.width);
      wires.setAttribute("height", pw.height);
      while (wires.firstChild) wires.removeChild(wires.firstChild);
      if (window.innerWidth <= 820 || !vertices) return;
      var pts = vertices;

      // shared arrowhead marker
      var defs = document.createElementNS(SVGNS, "defs");
      var mk = document.createElementNS(SVGNS, "marker");
      mk.setAttribute("id", "fbArrow");
      mk.setAttribute("viewBox", "0 0 10 10");
      mk.setAttribute("refX", "8"); mk.setAttribute("refY", "5");
      mk.setAttribute("markerWidth", "7"); mk.setAttribute("markerHeight", "7");
      mk.setAttribute("orient", "auto");
      var mp = document.createElementNS(SVGNS, "path");
      mp.setAttribute("d", "M0 0 L10 5 L0 10 z");
      mp.setAttribute("class", "fb-arrow-head");
      mk.appendChild(mp); defs.appendChild(mk); wires.appendChild(defs);

      // Draw horizontal connection: Your codebase -> Parse & extract
      var halfW = (steps[0].offsetWidth || 200) / 2;
      var halfH = (steps[0].offsetHeight || 170) / 2;
      var cx = pw.width / 2;
      var Y0 = pts[0].y;
      var inputY = Y0 - 200;

      var rx1 = cx - 120 + halfW, ry1 = inputY;
      var rx2 = cx + 120 - halfW, ry2 = inputY;
      var d1 = "M " + rx1.toFixed(1) + " " + ry1.toFixed(1) + " L " + rx2.toFixed(1) + " " + ry2.toFixed(1);
      addPath(d1, "wire-base", 0);
      addPath(d1, "wire-pulse", 0);
      addChevron({x: rx1, y: ry1}, {x: rx2, y: ry2});

      // Draw diagonal connection: Parse & extract -> Candidate decisions
      var ix1 = cx + 80, iy1 = inputY + halfH;
      var ix2 = cx + 20, iy2 = Y0 - halfH;
      var d2 = "M " + ix1.toFixed(1) + " " + iy1.toFixed(1) + " L " + ix2.toFixed(1) + " " + iy2.toFixed(1);
      addPath(d2, "wire-base", 0);
      addPath(d2, "wire-pulse", 0.15);
      addChevron({x: ix1, y: iy1}, {x: ix2, y: iy2});

      // four forward sides: candidates → gate → canonical → serve → output
      var forward = [[0, 1], [1, 2], [2, 3], [3, 4]];
      forward.forEach(function (e, i) {
        var a = pts[e[0]], b = pts[e[1]];
        var d = "M " + a.x.toFixed(1) + " " + a.y.toFixed(1) + " L " + b.x.toFixed(1) + " " + b.y.toFixed(1);
        addPath(d, "wire-base", 0);
        addPath(d, "wire-pulse", (i + 1) * 0.3); // delay shifted by 1 index because of preceding input steps
        addChevron(a, b);
      });

      // closing side: output → candidates = feedback (submit_feedback over MCP)
      var oa = pts[4], ob = pts[0];
      var ea = trimEnd(ob, oa, 90);   // start near the output card
      var eb = trimEnd(oa, ob, 90);   // end near the candidates card (arrow lands here)
      var fd = "M " + ea.x.toFixed(1) + " " + ea.y.toFixed(1) + " L " + eb.x.toFixed(1) + " " + eb.y.toFixed(1);
      var fbBase = addPath(fd, "wire-feedback-base", 0);
      fbBase.setAttribute("marker-end", "url(#fbArrow)");
      var fbPulse = addPath(fd, "wire-feedback-pulse", 0);
      if (!reduceMotion) {
        fbPulse.style.strokeDasharray = "7 21";
        fbPulse.style.animation = "dashFlow 1.9s linear infinite";
      } else {
        fbPulse.style.opacity = "0.5";
      }

      // feedback label at the midpoint of that side
      var mx = (oa.x + ob.x) / 2, my = (oa.y + ob.y) / 2;
      var txt = document.createElementNS(SVGNS, "text");
      txt.setAttribute("x", mx.toFixed(1));
      txt.setAttribute("y", my.toFixed(1));
      txt.setAttribute("text-anchor", "middle");
      txt.setAttribute("class", "wire-label");
      txt.textContent = "↺ submit_feedback() · MCP";
      wires.appendChild(txt);
      try {
        var bb = txt.getBBox();
        var bg = document.createElementNS(SVGNS, "rect");
        bg.setAttribute("x", (bb.x - 9).toFixed(1));
        bg.setAttribute("y", (bb.y - 4).toFixed(1));
        bg.setAttribute("width", (bb.width + 18).toFixed(1));
        bg.setAttribute("height", (bb.height + 8).toFixed(1));
        bg.setAttribute("rx", "6");
        bg.setAttribute("class", "wire-label-bg");
        wires.insertBefore(bg, txt);
      } catch (err) { /* getBBox unavailable — label still renders */ }
    }
    holder.insertBefore(wires, pipe);

    function relayout() { layoutPentagon(); drawWires(); }
    relayout();
    var rt;
    window.addEventListener("resize", function () {
      clearTimeout(rt);
      rt = setTimeout(relayout, 150);
    });
    // card heights shift once webfonts load — realign then
    window.addEventListener("load", relayout);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);

    // staggered reveal on enter
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (en.isIntersecting) {
          var allSteps = [];
          if (inputRepo) allSteps.push(inputRepo);
          if (inputIngest) allSteps.push(inputIngest);
          allSteps = allSteps.concat(steps);
          allSteps.forEach(function (s, i) {
            setTimeout(function () { s.classList.add("in"); }, reduceMotion ? 0 : i * 110);
          });
          io.disconnect();
          if (!reduceMotion) startCycle();
        }
      });
    }, { threshold: 0.3 });
    io.observe(pipe);

    // cycle the "active" highlight along the pipeline
    function startCycle() {
      var allSteps = [];
      if (inputRepo) allSteps.push(inputRepo);
      if (inputIngest) allSteps.push(inputIngest);
      allSteps = allSteps.concat(steps);
      var cards = allSteps.map(function (s) { return s.querySelector(".pcard"); }).filter(Boolean);
      var i = 0;
      setInterval(function () {
        cards.forEach(function (c) { c.classList.remove("active"); });
        cards[i].classList.add("active");
        i = (i + 1) % cards.length;
      }, 1400);
    }
  }

  /* ----------------------------------------------------------
     5) ANATOMY — flip card + confidence meter
     ---------------------------------------------------------- */
  function initFlip() {
    var card = document.getElementById("decisionCard");
    if (!card) return;
    var fill = card.querySelector(".conf-fill");
    function flip() { card.classList.toggle("flipped"); }
    card.addEventListener("click", function (e) {
      if (e.target.closest(".flip-btn") || !e.target.closest(".flip-btn")) flip();
    });
    card.querySelectorAll(".flip-btn").forEach(function (b) {
      b.addEventListener("click", function (e) { e.stopPropagation(); flip(); });
    });
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (en.isIntersecting && fill) { fill.style.width = fill.dataset.val || "92%"; io.disconnect(); }
      });
    }, { threshold: 0.4 });
    io.observe(card);
  }

  /* ----------------------------------------------------------
     6) BEFORE / AFTER toggle
     ---------------------------------------------------------- */
  function initBeforeAfter() {
    var toggle = document.querySelector(".ba-toggle");
    if (!toggle) return;
    var btns = toggle.querySelectorAll("button");
    var swaps = document.querySelectorAll(".editor .swap");
    var stateEl = document.querySelector(".editor-state");
    function set(which) {
      btns.forEach(function (b) { b.classList.toggle("active", b.dataset.on === which); });
      swaps.forEach(function (s) { s.classList.toggle("show", s.dataset.swap === which); });
      if (stateEl) {
        stateEl.textContent = which === "bad" ? "convention violations" : "matches team decisions";
        stateEl.className = "editor-state " + which;
      }
    }
    btns.forEach(function (b) { b.addEventListener("click", function () { set(b.dataset.on); }); });
    set("bad");
    // auto-demo once when scrolled into view
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (en.isIntersecting && !reduceMotion) {
          setTimeout(function () { set("good"); }, 1700);
          io.disconnect();
        }
      });
    }, { threshold: 0.5 });
    io.observe(toggle.closest("section"));
  }

  /* ----------------------------------------------------------
     7) EMAIL capture  →  mailto fallback
        TODO(provider): replace mailto with a real POST, e.g.
        fetch("/api/subscribe", {method:"POST", body: JSON.stringify({email})})
     ---------------------------------------------------------- */
  var SIGNUP_TO = "kerbelp@gmail.com"; // <- swap for list provider later
  function initEmail() {
    document.querySelectorAll("form[data-signup]").forEach(function (form) {
      var ok = form.parentElement.querySelector(".email-ok");
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var input = form.querySelector("input[type=email]");
        var email = (input.value || "").trim();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
          input.focus(); input.style.borderColor = "var(--bad)"; return;
        }
        input.style.borderColor = "";
        // --- mailto fallback (clearly marked; swap for provider POST) ---
        var subject = encodeURIComponent("Metatron updates — sign me up");
        var body = encodeURIComponent("Please add this address to Metatron updates:\n\n" + email + "\n");
        window.location.href = "mailto:" + SIGNUP_TO + "?subject=" + subject + "&body=" + body;
        if (ok) { ok.textContent = "Thanks — your email app should open. We'll be in touch."; ok.classList.add("show"); }
        input.value = "";
      });
    });
  }

  /* ----------------------------------------------------------
     8) nav scroll state + mobile menu + generic reveals
     ---------------------------------------------------------- */
  function initChrome() {
    var nav = document.querySelector(".nav");
    function onScroll() { if (nav) nav.classList.toggle("scrolled", window.scrollY > 12); }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    var burger = document.querySelector(".nav-burger");
    var links = document.querySelector(".nav-links");
    if (burger && links) {
      burger.addEventListener("click", function () {
        var open = links.style.display === "flex";
        links.style.display = open ? "" : "flex";
        links.style.position = "absolute"; links.style.top = "100%"; links.style.left = "0";
        links.style.right = "0"; links.style.flexDirection = "column";
        links.style.background = "var(--bg-1)"; links.style.borderBottom = "1px solid var(--line)";
        links.style.padding = open ? "" : "18px var(--gut)"; links.style.gap = "16px";
        if (open) links.removeAttribute("style");
      });
      links.querySelectorAll("a").forEach(function (a) {
        a.addEventListener("click", function () { if (window.innerWidth <= 820) links.removeAttribute("style"); });
      });
    }

    var reveals = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    reveals.forEach(function (el) { io.observe(el); });
    // failsafe: anything already on/above the fold reveals immediately, and
    // nothing can ever stay permanently hidden if the observer misbehaves.
    function revealInView() {
      reveals.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.95) el.classList.add("in");
      });
    }
    revealInView();
    window.addEventListener("scroll", revealInView, { passive: true });
    setTimeout(function () { reveals.forEach(function (el) { el.classList.add("in"); }); }, 4000);
  }

  /* ---------------------------------------------------------- */
  function init() {
    injectKeyframes();
    initMarks();
    initHero();
    initPipeline();
    initFlip();
    initBeforeAfter();
    initEmail();
    initChrome();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
