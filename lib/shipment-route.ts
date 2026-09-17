import type { Shipment, RouteStop } from './shipments';
export type RouteLocation = { id:string; label:string; kind:RouteStop['kind']; latitude?:number; longitude?:number };
export function shipmentRouteLocations(shipment:Shipment):RouteLocation[] {
  const key=(label:string)=>label.trim().toLocaleLowerCase();
  const manual=shipment.routeStops ?? [];
  const locations:RouteLocation[]=[];
  function add(label:string,kind:RouteStop['kind'],id:string) {
    if(!label?.trim())return;
    const coordinates=manual.find(stop=>key(stop.label)===key(label));
    const previous=locations[locations.length-1];
    if(previous&&key(previous.label)===key(label)){if(kind==='current')previous.kind='current';return;}
    locations.push({id,label:label.trim(),kind,...(coordinates?{latitude:coordinates.latitude,longitude:coordinates.longitude}:{})});
  }
  add(shipment.origin,'origin','origin');
  const history=[...(shipment.history??[])].sort((a,b)=>Date.parse(a.date)-Date.parse(b.date));
  for(const event of history)add(event.location,'stop','event-'+event.id);
  for(const stop of manual)if(stop.kind!=='origin'&&stop.kind!=='destination'&&key(stop.label)!==key(shipment.location)&&!locations.some(p=>key(p.label)===key(stop.label)))add(stop.label,'stop',stop.id);
  add(shipment.location,'current','current');
  add(shipment.destination,'destination','destination');
  return locations;
}
const cache=new Map<string,Promise<{latitude:number;longitude:number}|undefined>>();
export function locateRoutePlace(label:string) {
  const key=label.trim().toLowerCase();
  if(!cache.has(key))cache.set(key,(async()=>{
    try {
      const stored=sessionStorage.getItem('route-place:'+key);
      if(stored)return JSON.parse(stored) as {latitude:number;longitude:number};
    }catch{}
    try {
      const response=await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(label)}&limit=1`,{signal:AbortSignal.timeout(8000)});
      if(!response.ok)return;
      const data=await response.json();
      const point=data.features?.[0]?.geometry?.coordinates;
      if(!Array.isArray(point)||!Number.isFinite(point[0])||!Number.isFinite(point[1])||Math.abs(point[0])>180||Math.abs(point[1])>85)return;
      const result={longitude:point[0],latitude:point[1]};
      try{sessionStorage.setItem('route-place:'+key,JSON.stringify(result));}catch{}
      return result;
    }catch{return;}
  })());
  return cache.get(key)!;
}
