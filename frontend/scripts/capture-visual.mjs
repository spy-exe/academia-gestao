import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
const browser=await chromium.launch();
const reports=[];
for(const [width,height] of [[360,800],[390,844],[768,1024],[1366,768],[1920,1080]]){
 const context=await browser.newContext({viewport:{width,height},storageState:process.env.E2E_AUTH_STATE??'/tmp/academia-auth.json',locale:'pt-BR',timezoneId:'America/Sao_Paulo'});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const [path,label] of [['/','dashboard'],['/alunos','alunos'],['/planos','planos'],['/professores','professores'],['/mensalidades','mensalidades'],['/treinos','treinos'],['/avaliacoes','avaliacoes'],['/alunos/1001','historico']]){
  await page.goto((process.env.E2E_BASE_URL??'http://127.0.0.1:4173')+path);await page.getByRole('heading',{level:1}).waitFor();await page.waitForLoadState('networkidle');await page.evaluate(()=>document.fonts.ready);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
  await page.screenshot({path:`../docs/evidence/${label}-${width}.png`,fullPage:true,animations:'disabled'});
  reports.push({label,width,height,overflow,errors:[...errors]});
 }
 await context.close();
}
await browser.close();await fs.writeFile('../docs/evidence/visual-runtime.json',JSON.stringify(reports,null,2));
console.log(JSON.stringify({screenshots:reports.length,overflow:reports.filter(r=>r.overflow),errors:reports.flatMap(r=>r.errors)}));
