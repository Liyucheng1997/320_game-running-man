// 构建：src/template.html + vendor/three.min.js + src/js/*.js → index.html（单文件，双击即玩）
// 用法：node build.js
const fs = require('fs');
const path = require('path');
const root = __dirname;
const tpl = fs.readFileSync(path.join(root, 'src/template.html'), 'utf8');
const three = fs.readFileSync(path.join(root, 'vendor/three.min.js'), 'utf8');
const dir = path.join(root, 'src/js');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort();
const game = files.map(f => `/* ===== ${f} ===== */\n` + fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
// 用函数替换，避免 three.min.js 里的 "$&" 等被当成替换模式
const out = tpl.replace('/*__THREE__*/', () => three).replace('/*__GAME__*/', () => game);
fs.writeFileSync(path.join(root, 'index.html'), out);
console.log(`index.html 已生成：${(out.length / 1024).toFixed(0)} KB，${files.length} 个模块`);
