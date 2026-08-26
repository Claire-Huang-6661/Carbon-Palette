/**
 * Draws a sample banner so the editor can be tried without an upload.
 * It intentionally mixes a gradient backdrop, a headline, a subtitle, a badge
 * and a button — the shapes a real header image is usually made of.
 */
export function createDemoBanner(width = 1440, height = 540): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#0F2027');
  gradient.addColorStop(0.55, '#203A43');
  gradient.addColorStop(1, '#2C5364');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Soft light blooms.
  for (const [cx, cy, r, alpha] of [
    [width * 0.78, height * 0.24, height * 0.7, 0.22],
    [width * 0.12, height * 0.85, height * 0.55, 0.14],
  ] as const) {
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    glow.addColorStop(0, `rgba(217, 255, 0, ${alpha})`);
    glow.addColorStop(1, 'rgba(217, 255, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
  }

  const sans = '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif';
  const left = width * 0.075;

  // Badge
  ctx.fillStyle = 'rgba(217, 255, 0, 0.16)';
  const badgeWidth = 196;
  const badgeHeight = 42;
  const badgeY = height * 0.2;
  ctx.beginPath();
  ctx.roundRect(left, badgeY, badgeWidth, badgeHeight, 21);
  ctx.fill();
  ctx.fillStyle = '#D9FF00';
  ctx.font = `600 20px ${sans}`;
  ctx.textBaseline = 'middle';
  ctx.fillText('限时新品首发', left + 26, badgeY + badgeHeight / 2 + 1);

  // Headline
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `900 76px ${sans}`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('夏日焕新季', left, height * 0.52);

  // Subtitle
  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  ctx.font = `400 28px ${sans}`;
  ctx.fillText('全场好物低至五折 · 满 299 立减 50', left, height * 0.66);

  // Button
  const buttonY = height * 0.72;
  ctx.fillStyle = '#D9FF00';
  ctx.beginPath();
  ctx.roundRect(left, buttonY, 208, 58, 29);
  ctx.fill();
  ctx.fillStyle = '#0F2027';
  ctx.font = `700 24px ${sans}`;
  ctx.textBaseline = 'middle';
  ctx.fillText('立即抢购', left + 60, buttonY + 30);

  // Product placeholder
  const px = width * 0.74;
  const py = height * 0.5;
  const pr = height * 0.3;
  const sphere = ctx.createRadialGradient(px - pr * 0.3, py - pr * 0.35, pr * 0.1, px, py, pr);
  sphere.addColorStop(0, '#F7FFD1');
  sphere.addColorStop(0.5, '#D9FF00');
  sphere.addColorStop(1, '#7E9400');
  ctx.fillStyle = sphere;
  ctx.beginPath();
  ctx.arc(px, py, pr, 0, Math.PI * 2);
  ctx.fill();

  return canvas.toDataURL('image/png');
}
