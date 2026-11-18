import { test,expect } from '@playwright/test';
test('autenticação administrativa real',async({page})=>{
 if(!process.env.E2E_EMAIL||!process.env.E2E_PASSWORD)throw new Error('Configure E2E_EMAIL e E2E_PASSWORD fora do repositório.');
 await page.goto('/');await page.getByLabel('E-mail',{exact:true}).fill(process.env.E2E_EMAIL);await page.getByLabel('Senha',{exact:true}).fill(process.env.E2E_PASSWORD);await page.getByRole('button',{name:/Entrar na academia/}).click();await expect(page.getByRole('heading',{name:'Visão geral',exact:true})).toBeVisible();await page.context().storageState({path:process.env.E2E_AUTH_STATE??'/tmp/academia-auth.json'});
});
