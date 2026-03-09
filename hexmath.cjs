const fs = require('fs');
const raw = fs.readFileSync('src/utils/hexGridData.ts', 'utf8');
const match = raw.match(/=\s*\{([\s\S]+)\}\s*;/);
const obj = eval('({' + match[1] + '})');

const RADIUS = 11;
const X_SPACING = Math.sqrt(3) * RADIUS;
const Y_SPACING = RADIUS * 1.5;

function getCenter(dot) {
  const cx = dot.x * X_SPACING + (dot.y % 2 === 1 ? X_SPACING / 2 : 0);
  const cy = dot.y * Y_SPACING;
  return { cx, cy };
}

console.log('Math test for PRK(26,6) and KOR(26,7)');
const prk = getCenter({x: 26, y: 6});
const kor = getCenter({x: 26, y: 7});
const dx = prk.cx - kor.cx;
const dy = prk.cy - kor.cy;
const dist = Math.sqrt(dx*dx + dy*dy);
console.log('Distance between PRK and KOR:', dist.toFixed(4));
console.log('Expected for perfect Pointy-Top adj:', (Math.sqrt(3) * RADIUS).toFixed(4));

console.log('Math test for KOR(26,7) and JPN(28,7)');
const jpn = getCenter({x: 28, y: 7});
const dx2 = kor.cx - jpn.cx;
const dy2 = kor.cy - jpn.cy;
const dist2 = Math.sqrt(dx2*dx2 + dy2*dy2);
console.log('Distance between KOR and JPN:', dist2.toFixed(4));
console.log('Horizontal Gap (measured as dist2 - target):', (dist2 - (X_SPACING * 2)).toFixed(4));
