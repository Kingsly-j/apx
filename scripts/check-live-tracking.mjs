import { chromium, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';

const marker = `Bluecrest integration test ${randomUUID()}`;
const base = `https://firestore.googleapis.com/v1/projects/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/databases/(default)/documents`;
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const browser = await chromium.launch({channel:'msedge',headless:true});
let record;
let uploadWorked=false;
async function findTestRecord() {
  const response=await fetch(`${base}:runQuery?key=${apiKey}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({structuredQuery:{from:[{collectionId:'shipments'}],where:{fieldFilter:{field:{fieldPath:'customerName'},op:'EQUAL',value:{stringValue:marker}}}}}),signal:AbortSignal.timeout(20000)});
  if(!response.ok) throw Error(`Verification query failed: ${response.status}`);
  return (await response.json()).find(row=>row.document)?.document;
}
try {
  await mkdir('artifacts',{recursive:true});
  const admin=await browser.newPage();
  admin.setDefaultTimeout(25000);
  await admin.goto('http://localhost:3000/admin?admin=1');
  await admin.getByLabel('Email',{exact:true}).fill('support@bluecrestlogistics.com');
  await admin.getByLabel('Password',{exact:true}).fill(process.env.BLUECREST_SUPER_ADMIN_PASSWORD);
  await admin.getByRole('button',{name:'Login',exact:true}).click();
  await expect(admin.getByRole('heading',{name:'New cargo file'})).toBeVisible();
  // Let the initial cloud read finish before creating a test record.
  await admin.waitForTimeout(2500);
  const form=admin.locator('form').filter({has:admin.getByRole('heading',{name:'New cargo file'})});
  const fields={'Customer name':marker,'Customer email':'integration-test@example.com','Cargo description':'Temporary test cargo — remove after verification','Departure location':'Lagos, Nigeria','Destination':'London, United Kingdom','Current location':'Murtala Muhammed International Airport, Lagos, Nigeria','ETA':'2026-10-01'};
  for(const [name,value] of Object.entries(fields)) await form.getByLabel(name,{exact:true}).fill(value);
  await expect(form.getByLabel('ETA',{exact:true})).toHaveAttribute('type','date');
  await form.getByLabel('Tracking note (optional)',{exact:true}).fill('Please call on arrival.\nReception accepts deliveries until 5 PM.');
  await form.locator('input[type=file]').setInputFiles('public/testimonials/portrait-1.jpg');
  await form.getByRole('button',{name:'Create and generate code'}).click();
  await expect(form.getByRole('button',{name:'Create and generate code'})).toBeEnabled();
  record=await findTestRecord();
  if(!record) {
    await expect(form.getByText(/row-level security policy/)).toBeVisible();
    console.log('CONFIRMED: actual browser upload to blue is blocked by Supabase RLS.');
    await form.locator('input[type=file]').setInputFiles([]);
    await form.getByRole('button',{name:'Create and generate code'}).click();
    await expect(form.getByText(/Shipment created\. Tracking code:/)).toBeVisible();
    record=await findTestRecord();
  } else uploadWorked=true;
  if(!record) throw Error('Admin-created shipment not found in Firebase.');
  const code=record.fields.trackingCode.stringValue;
  console.log('PASS: shipment created in dashboard and independently found in Firebase.');
  const visitor=await browser.newPage();
  await visitor.goto(`http://localhost:3000/track?code=${encodeURIComponent(code)}`);
  await expect(visitor.getByRole('heading',{name:'Booked',exact:true})).toBeVisible({timeout:25000});
  await expect(visitor.getByText('Lagos, Nigeria',{exact:true})).toBeVisible();
  await expect(visitor.getByText('London, United Kingdom',{exact:true})).toBeVisible();
  await expect(visitor.getByText('2026-10-01',{exact:true})).toBeVisible();
  await expect(visitor.getByRole('region',{name:'Shipment note'})).toContainText('Reception accepts deliveries until 5 PM.');
  if(uploadWorked) {
    const photo=visitor.getByRole('img',{name:'Shipment cargo',exact:true});
    await expect(photo).toBeVisible();
    await expect(photo).toHaveAttribute('src',record.fields.photoUrl.stringValue);
    await expect.poll(()=>photo.evaluate(image=>image.complete && image.naturalWidth>0)).toBe(true);
    console.log('PASS: uploaded Supabase photo is stored in Firebase and loads on public tracking.');
  }
  const editor=admin.locator('section').filter({has:admin.getByText('Update shipment',{exact:true})}).last();
  await expect(editor.getByLabel('ETA',{exact:true})).toHaveAttribute('type','date');
  await editor.getByLabel('ETA',{exact:true}).fill('2026-10-02');
  await expect(visitor.getByText('2026-10-02',{exact:true})).toBeVisible({timeout:25000});
  await editor.getByLabel('Tracking note',{exact:true}).fill('Delivery rescheduled. Please contact the receiving desk.');
  await editor.getByRole('button',{name:'Save note',exact:true}).click();
  await expect(visitor.getByRole('region',{name:'Shipment note'})).toContainText('Delivery rescheduled.',{timeout:25000});
  record=await findTestRecord();
  if(record.fields.note.stringValue!=='Delivery rescheduled. Please contact the receiving desk.' || record.fields.eta.stringValue!=='2026-10-02') throw Error('ETA/note not persisted in Firebase');
  await editor.getByLabel('Tracking note',{exact:true}).fill('');
  await editor.getByRole('button',{name:'Save note',exact:true}).click();
  await expect(visitor.getByRole('region',{name:'Shipment note'})).toHaveCount(0,{timeout:25000});
  console.log('PASS: both ETA date pickers, note creation/editing, Firebase persistence, live display, and hiding a cleared note.');
  await expect(visitor.locator('iframe[title="Shipment current location map"]')).toHaveAttribute('src',/Murtala/);
  await editor.getByLabel('Current location',{exact:true}).fill('Heathrow Airport, London, United Kingdom');
  await expect(visitor.locator('iframe[title="Shipment current location map"]')).toHaveAttribute('src',/Heathrow/,{timeout:25000});
  await expect(visitor.getByRole('link',{name:'View route'})).toHaveAttribute('href',/origin=Lagos/);
  console.log('PASS: live Firebase location update changes the map without a page refresh.');
  await editor.getByRole('combobox').selectOption('Delivered');
  await expect(admin.getByText('Shipment update saved to Firebase.')).toBeVisible();
  await expect(visitor.getByRole('heading',{name:'Delivered',exact:true})).toBeVisible({timeout:25000});
  await expect(visitor.getByRole('progressbar')).toHaveAttribute('aria-valuenow','100');
  await visitor.setViewportSize({width:390,height:844});
  await visitor.screenshot({path:'artifacts/live-tracking-mobile.png',fullPage:true});
  if(await visitor.evaluate(()=>document.documentElement.scrollWidth>innerWidth)) throw Error('Mobile tracking overflow');
  await visitor.goto('http://localhost:3000/');
  const track=visitor.locator('form').filter({has:visitor.locator('button',{hasText:'Track Shipment'})}).last();
  await track.locator('input[name=trackingnumber]').fill(code);
  await track.locator('button[type=submit]').click();
  await visitor.waitForURL('**/track?code=*');
  await expect(visitor.getByRole('heading',{name:'Delivered',exact:true})).toBeVisible({timeout:25000});
  console.log('PASS: separate visitor session sees Firebase data, status updates, ETA, route, 100% progress, and homepage tracking navigation.');
  await visitor.getByRole('textbox',{name:'Tracking code'}).fill('BC-NOT-A-REAL-SHIPMENT');
  await visitor.getByRole('button',{name:'Track shipment',exact:true}).click();
  await expect(visitor.getByRole('status')).toContainText('No matching shipment was found');
  await expect(visitor.getByRole('region',{name:'Shipment details'})).toHaveCount(0);
  console.log(`PASS: unknown code clears the previous result. Photo upload verified: ${uploadWorked}.`);
  process.exitCode = uploadWorked ? 0 : 1;
} finally {
  try {
    record ||= await findTestRecord();
    if(record) {
      const deleted=await fetch(`https://firestore.googleapis.com/v1/${record.name}?key=${apiKey}`,{method:'DELETE',signal:AbortSignal.timeout(20000)});
      if(!deleted.ok) throw Error(`Delete failed: ${deleted.status}`);
      if(await findTestRecord()) throw Error('Test record remained after delete.');
      console.log('Removed and verified removal of the temporary Firebase shipment.');
      if(record.fields.photoPath) {
        const path=record.fields.photoPath.stringValue;
        const response=await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/blue`,{method:'DELETE',headers:{apikey:process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},body:JSON.stringify({prefixes:[path]})});
        if(!response.ok) console.log(`Photo cleanup required: ${path}`);
      }
    }
  } finally {await browser.close();}
}
