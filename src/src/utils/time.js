export const pad2 = n => String(n).padStart(2, '0');

export const hoursToAngle = (h, m) => (h % 12) * 30 + m * 0.5;

export const minutesToAngle = m => m * 6;

export const angleToMinutes = a => Math.round(((a % 360) + 360) % 360 / 6) % 60;

export const angleToHours12 = a => Math.round(((a % 360) + 360) % 360 / 30) % 12;

export const pointAngle = (cx, cy, x, y) =>
  (Math.atan2(x - cx, -(y - cy)) * 180 / Math.PI + 360) % 360;

export const svgPoint = (svg, clientX, clientY) => {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
};

export const handEndpoint = (angleDeg, length, cx = 100, cy = 100) => {
  const rad = angleDeg * Math.PI / 180;
  return { x: cx + length * Math.sin(rad), y: cy - length * Math.cos(rad) };
};
