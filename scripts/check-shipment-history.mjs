import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import { randomUUID } from 'node:crypto';

let record;
let fail = false;
const firestore = {
  doc: (_db,_collection,id)=>id,
  setDoc: async (_reference,value)=>{if(fail)throw Error('Write denied');record=structuredClone(value);},
  runTransaction: async (_db,callback)=>{
    let patch;
    const result=await callback({get:async()=>({exists:()=>!!record,data:()=>structuredClone(record)}),update:(_ref,value)=>{patch=value;}});
    if(fail)throw Error('Write denied');
    record={...record,...structuredClone(patch)};
    return result;
  },
};
const exports={};
const source=ts.transpileModule(await readFile('lib/shipments.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
vm.runInNewContext(source,{exports,require:name=>name==='firebase/firestore'?firestore:{db:{}},crypto:{randomUUID},setTimeout,clearTimeout,window:{localStorage:{getItem:()=> 'operator@example.com'}}});
const fixture={id:'unit-shipment',trackingCode:'UNIT-123',customerName:'Receiver',customerEmail:'receiver@example.com',cargoDescription:'Parcel',origin:'Dubai',destination:'London',location:'Dubai',status:'Booked',eta:'2026-10-10',progress:18,createdBy:'operator@example.com',createdAt:'2026-09-15T10:00:00.000Z',updatedAt:'2026-09-15T10:00:00.000Z'};
let rows=await exports.saveShipment(fixture);
assert.equal(record.history.length,1);
assert.match(record.history[0].description,/Shipment created/);
assert.equal(record.milestoneDates['Order Confirmed'],fixture.createdAt);
rows=await exports.updateShipmentRecord(fixture.id,{status:'On The Way',location:'Rome',customerName:'New receiver'},rows);
assert.equal(record.history.length,2);
assert.match(record.history[1].description,/Status updated to On The Way/);
assert.match(record.history[1].description,/Location updated to Rome/);
assert.match(record.history[1].description,/Receiver name/);
assert.equal(record.history[1].recordedBy,'operator@example.com');
assert.ok(record.milestoneDates['On The Way']);
rows=await exports.updateShipmentRecord(fixture.id,{status:'On The Way',location:'Rome'},rows);
assert.equal(record.history.length,2,'Saving unchanged values must not duplicate history');
const before=structuredClone(record);
fail=true;
await assert.rejects(exports.updateShipmentRecord(fixture.id,{status:'Delivered'},rows),/Write denied/);
assert.deepEqual(record,before,'Failed saves must not publish shipment or history changes');
fail=false;
record.history.push({id:'concurrent',date:'2026-09-15',status:'On The Way',location:'Rome',description:'Another operator update'});
await exports.updateShipmentRecord(fixture.id,{photoUrl:'https://example.com/photo.jpg'},rows);
assert.equal(record.history.length,4,'Preserve server history when another admin saves');
assert.ok(record.history.some(event=>event.id==='concurrent'));
assert.match(record.history.at(-1).description,/Shipment photo updated/);
await exports.updateShipmentRecord(fixture.id,{feeName:'Storage Fee',clearanceFee:'500'},[record]);
assert.match(record.history.at(-1).description,/Fee name, Fee amount updated/);
console.log('PASS creation, status/receiver/location/photo activity, milestone dates, no-op saves, failed writes, and concurrent history preservation');
