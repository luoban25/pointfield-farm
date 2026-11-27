import fs from 'node:fs/promises';
const html=await fs.readFile('dist/index.html','utf8');
const js=html.match(/<script type="module" crossorigin src="([^"]+)"><\/script>/);
const css=html.match(/<link rel="stylesheet" crossorigin href="([^"]+)">/);
if(!js||!css)throw new Error('Cannot locate build assets');
const script=await fs.readFile(`dist/${js[1]}`,'utf8');
let style=await fs.readFile(`dist/${css[1]}`,'utf8');
// Fonts live in the same built assets directory as the stylesheet. Embed them
// so file:// keeps the same typography without any adjacent assets or network.
const fontUrls=[...new Set([...style.matchAll(/url\((?:"|')?([^\s)"']+\.woff2)(?:"|')?\)/g)].map(m=>m[1]))];
for(const url of fontUrls){
  const path=new URL(url,new URL(`dist/${css[1]}`,`file://${process.cwd().replaceAll('\\','/')}/`));
  const font=await fs.readFile(path);
  style=style.replaceAll(url,`data:font/woff2;base64,${font.toString('base64')}`);
}
const fontLicense=await fs.readFile('licenses/NotoSansSC-OFL.txt','utf8');
const favicon=await fs.readFile('public/favicon.svg','utf8');
const result=html.replace(js[0],()=>`<script type="module">${script.replaceAll('</script','<\\/script')}</script>`).replace(css[0],()=>`<style>${style}</style>`).replace('href="./favicon.svg"',()=>`href="data:image/svg+xml,${encodeURIComponent(favicon)}"`).replace('</head>',()=>`<!-- Pointfield UI: subset of Noto Sans SC; font license follows.\n${fontLicense}\n--></head>`);
await fs.writeFile('丘陵农场-双击打开.html',result);await fs.writeFile('点域-全场景-双击打开.html',result);console.log('Ten-scene offline HTML written');
