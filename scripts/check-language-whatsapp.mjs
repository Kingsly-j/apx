import { chromium, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

const exports={};
const js=ts.transpileModule(await readFile('lib/whatsapp.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
vm.runInNewContext(js,{exports,encodeURIComponent});
const link=exports.shipmentPaymentLink({trackingCode:'TEST & 123',customerName:'Receiver Test',customerEmail:'receiver@example.com',receiverPhone:'+123',receiverAddress:'Delivery address',senderName:'Sender Test',cargoDescription:'A parcel',weight:'12',origin:'Dubai',destination:'London',location:'Rome',status:'On The Way',eta:'2026-10-10'},'Storage Fee','$500.00');
const url=new URL(link),message=url.searchParams.get('text');
if(url.hostname!=='wa.me'||url.pathname!=='/19152019157')throw Error('Incorrect WhatsApp number');
for(const value of ['TEST & 123','Receiver Test','Sender Test','Storage Fee','$500.00','Dubai','London','Rome','Delivery address','receiver@example.com','On The Way'])if(!message.includes(value))throw Error(`Missing payment detail: ${value}`);
console.log('PASS WhatsApp payment URL includes fee and shipment details');
const browser=await chromium.launch({channel:'msedge'});
try {
  const context=await browser.newContext({viewport:{width:390,height:844}});
  await context.route('**/*',route=>new URL(route.request().url()).hostname==='localhost'?route.continue():route.abort());
  const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://localhost:3000/');
  await expect(page.getByRole('link',{name:'Chat on WhatsApp'})).toHaveAttribute('href',/^https:\/\/wa.me\/19152019157\?text=/);
  await page.getByRole('button',{name:'Change language'}).click();
  for(const language of ['English','Français','Español','العربية'])await expect(page.getByRole('button',{name:language,exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Français',exact:true}).click();
  await expect(page.locator('html')).toHaveAttribute('lang','fr');
  await expect(page.getByRole('link',{name:/Accueil/}).first()).toBeAttached();
  await page.goto('http://localhost:3000/track');
  await expect(page.getByRole('heading',{name:'Suivi de l’envoi',exact:true})).toBeVisible();
  await page.locator('.floating-language').click();await page.getByRole('button',{name:'Español',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Seguimiento del envío',exact:true})).toBeVisible();
  await page.locator('.floating-language').click();await page.getByRole('button',{name:'العربية',exact:true}).click();
  await expect(page.getByRole('heading',{name:'تتبع الشحنة',exact:true})).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('dir','rtl');
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Arabic mobile layout overflows');
  await page.reload();await expect(page.locator('html')).toHaveAttribute('lang','ar');
  await page.locator('.floating-language').click();await page.getByRole('button',{name:'English',exact:true}).click();
  await expect(page.locator('html')).toHaveAttribute('dir','ltr');
  for(const [name,heading] of [['Deutsch','Sendungsverfolgung'],['Portugu\u00eas','Rastreamento de envio'],['\u7b80\u4f53\u4e2d\u6587','\u8d27\u4ef6\u8ffd\u8e2a']]) {
    await page.locator('.floating-language').click();
    await page.getByRole('button',{name,exact:true}).click();
    await expect(page.getByRole('heading',{name:heading,exact:true})).toBeVisible();
  }
  if(await page.evaluate(()=>getComputedStyle(document.documentElement).fontSize)!=='14px')throw Error('Site font size was not reduced');
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Language selector causes mobile overflow');
  await page.goto('http://localhost:3000/admin?admin=1');
  await page.locator('.floating-language').click();await page.getByRole('button',{name:'Français',exact:true}).click();
  await expect(page.getByRole('button',{name:'Connexion',exact:true})).toBeVisible();
  if(errors.length)throw Error(errors.join('\n'));
  console.log('PASS floating WhatsApp, seven languages, persistence, public/admin labels, and Arabic mobile direction');
} finally {await browser.close();}
