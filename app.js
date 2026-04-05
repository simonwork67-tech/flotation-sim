(() => {
  const canvas = document.getElementById('particleCanvas');
  const ctx = canvas.getContext('2d');

  let width = 800;
  let height = 600;
  let centerX = 400;
  let centerY = 300;
  let zoom = 1;
  let rotationX = -0.38;
  let rotationY = 0.82;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let faces = [];

  function add(a, b) {
    return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
  }

  function scale(v, s) {
    return { x: v.x * s, y: v.y * s, z: v.z * s };
  }

  function normalize(v) {
    const mag = Math.hypot(v.x, v.y, v.z) || 1;
    return { x: v.x / mag, y: v.y / mag, z: v.z / mag };
  }

  function baseOctahedron() {
    const p = [
      { x: 1, y: 0, z: 0 },
      { x: -1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
      { x: 0, y: -1, z: 0 },
      { x: 0, y: 0, z: 1 },
      { x: 0, y: 0, z: -1 }
    ];

    return [
      [p[0], p[2], p[4]],
      [p[4], p[2], p[1]],
      [p[1], p[2], p[5]],
      [p[5], p[2], p[0]],
      [p[0], p[4], p[3]],
      [p[4], p[1], p[3]],
      [p[1], p[5], p[3]],
      [p[5], p[0], p[3]]
    ];
  }

  function subdivide(tris) {
    const out = [];

    for (const [a, b, c] of tris) {
      const ab = normalize(scale(add(a, b), 0.5));
      const bc = normalize(scale(add(b, c), 0.5));
      const ca = normalize(scale(add(c, a), 0.5));

      out.push([a, ab, ca]);
      out.push([ab, b, bc]);
      out.push([ca, bc, c]);
      out.push([ab, bc, ca]);
    }

    return out;
  }

  function buildFaces() {
    let tris = baseOctahedron();
    const depth = 3;

    for (let i = 0; i < depth; i += 1) {
      tris = subdivide(tris);
    }

    faces = tris.map((tri) => ({
      tri,
      center: normalize(scale(add(add(tri[0], tri[1]), tri[2]), 1 / 3))
    }));
  }

  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    width = Math.max(320, Math.floor(rect.width));
    height = Math.max(420, Math.floor(rect.height));
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    centerX = width * 0.5;
    centerY = height * 0.54;
  }

  function rotate(v) {
    const cosy = Math.cos(rotationY);
    const siny = Math.sin(rotationY);
    const cosx = Math.cos(rotationX);
    const sinx = Math.sin(rotationX);

    const x1 = v.x * cosy + v.z * siny;
    const z1 = -v.x * siny + v.z * cosy;
    const y2 = v.y * cosx - z1 * sinx;
    const z2 = v.y * sinx + z1 * cosx;

    return { x: x1, y: y2, z: z2 };
  }

  function project(v, radius) {
    const cameraDistance = 4.1;
    const k = cameraDistance / (cameraDistance - v.z);

    return {
      x: centerX + v.x * radius * k,
      y: centerY - v.y * radius * k,
      z: v.z
    };
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);

    const radius = Math.min(width, height) * 0.27 * zoom;

    ctx.beginPath();
    ctx.ellipse(
      centerX,
      centerY + radius * 1.16,
      radius * 0.95,
      radius * 0.18,
      0,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = 'rgba(15, 23, 42, 0.10)';
    ctx.fill();

    const drawItems = [];

    for (const face of faces) {
      const r0 = rotate(face.tri[0]);
      const r1 = rotate(face.tri[1]);
      const r2 = rotate(face.tri[2]);
      const faceCenter = rotate(face.center);

      drawItems.push({
        p0: project(r0, radius),
        p1: project(r1, radius),
        p2: project(r2, radius),
        center: faceCenter,
        depth: (r0.z + r1.z + r2.z) / 3
      });
    }

    drawItems.sort((a, b) => a.depth - b.depth);

    for (const item of drawItems) {
      const light = normalize({ x: -0.55, y: 0.9, z: 1.2 });
      const diffuse = clamp(
        item.center.x * light.x + item.center.y * light.y + item.center.z * light.z,
        -1,
        1
      );
      const brightness = 0.62 + ((diffuse + 1) / 2) * 0.38;

      const red = Math.round(176 * brightness);
      const green = Math.round(120 * brightness);
      const blue = Math.round(42 * brightness);

      ctx.beginPath();
      ctx.moveTo(item.p0.x, item.p0.y);
      ctx.lineTo(item.p1.x, item.p1.y);
      ctx.lineTo(item.p2.x, item.p2.y);
      ctx.closePath();
      ctx.fillStyle = `rgb(${red}, ${green}, ${blue})`;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(17, 24, 39, 0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const highlight = ctx.createRadialGradient(
      centerX - radius * 0.34,
      centerY - radius * 0.42,
      radius * 0.05,
      centerX - radius * 0.18,
      centerY - radius * 0.24,
      radius * 0.85
    );
    highlight.addColorStop(0, 'rgba(255,255,255,0.55)');
    highlight.addColorStop(0.35, 'rgba(255,255,255,0.18)');
    highlight.addColorStop(1, 'rgba(255,255,255,0)');

    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = highlight;
    ctx.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);
    ctx.restore();
  }

  canvas.addEventListener('pointerdown', (event) => {
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    canvas.style.cursor = 'grabbing';
    if (canvas.setPointerCapture) {
      canvas.setPointerCapture(event.pointerId);
    }
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!dragging) {
      return;
    }

    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    rotationY += dx * 0.01;
    rotationX = clamp(rotationX + dy * 0.01, -1.35, 1.35);
    lastX = event.clientX;
    lastY = event.clientY;
    draw();
  });

  function endDrag() {
    dragging = false;
    canvas.style.cursor = 'grab';
  }

  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('pointerleave', endDrag);

  canvas.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      zoom *= event.deltaY < 0 ? 1.06 : 0.94;
      zoom = clamp(zoom, 0.65, 1.8);
      draw();
    },
    { passive: false }
  );

  window.addEventListener('resize', () => {
    resizeCanvas();
    draw();
  });

  buildFaces();
  resizeCanvas();
  draw();
})();
