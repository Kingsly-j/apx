"use client";

import { useLanguage } from "@/app/language-provider";
import { useEffect, useState } from "react";
import { shipmentRouteLocations, locateRoutePlace, type RouteLocation } from "@/lib/shipment-route";
import type { Shipment } from "@/lib/shipments";

export default function ShipmentRoute({shipment}:{shipment:Shipment}) {
  const { localize } = useLanguage();

  const [failed,setFailed]=useState(false);
  const signature=JSON.stringify(shipmentRouteLocations(shipment));
  const [resolved,setResolved]=useState<{signature:string;places:RouteLocation[]}>({signature:'',places:[]});
  useEffect(()=>{
    let active=true;
    const places:RouteLocation[]=JSON.parse(signature);
    (async()=>{
      const result:RouteLocation[]=[];
      for(const place of places){
        if(!active)return;
        const coordinates=Number.isFinite(place.latitude)&&Number.isFinite(place.longitude)?undefined:await locateRoutePlace(place.label);
        result.push({...place,...coordinates});
      }
      if(active)setResolved({signature,places:result});
    })();
    return()=>{active=false;};
  },[signature]);
  const places:RouteLocation[]=resolved.signature===signature?resolved.places:JSON.parse(signature);
  const stops=places.filter((stop):stop is RouteLocation & {latitude:number;longitude:number}=>Number.isFinite(stop.latitude)&&Number.isFinite(stop.longitude)&&Math.abs(stop.latitude!)<=85&&Math.abs(stop.longitude!)<=180);
  const missing=places.filter(place=>!stops.includes(place as typeof stops[number]));
  const routeLink=`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(shipment.origin)}&destination=${encodeURIComponent(shipment.destination)}&waypoints=${encodeURIComponent(places.filter(stop=>stop.kind!=='origin'&&stop.kind!=='destination').map(stop=>stop.label).join('|'))}`;
  if(!stops.length)return localize(<div className="p-5"><p>{resolved.signature===signature?'Map locations could not be found. Add coordinates in the admin route editor.':'Loading shipment route...'}</p><ol className="route-stop-list">{places.map(place=><li key={place.id}>{place.label}{place.kind==='current'?' (Current location)':''}</li>)}</ol><a href={routeLink} target="_blank" rel="noopener noreferrer">Open route in maps</a></div>);
  const width=900,height=450;
  const normalized=stops.map(stop=>{const sin=Math.sin(stop.latitude*Math.PI/180);return {...stop,x:(stop.longitude+180)/360,y:0.5-Math.log((1+sin)/(1-sin))/(4*Math.PI)};});
  for(let i=1;i<normalized.length;i++){while(normalized[i].x-normalized[i-1].x>0.5)normalized[i].x-=1;while(normalized[i].x-normalized[i-1].x< -0.5)normalized[i].x+=1;}
  const minX=Math.min(...normalized.map(p=>p.x)),maxX=Math.max(...normalized.map(p=>p.x));
  const minY=Math.min(...normalized.map(p=>p.y)),maxY=Math.max(...normalized.map(p=>p.y));
  const zoom=Math.max(1,Math.min(10,Math.floor(Math.log2(Math.min((width-120)/(256*Math.max(maxX-minX,0.001)),(height-120)/(256*Math.max(maxY-minY,0.001)))))));
  const scale=256*2**zoom,left=(minX+maxX)/2*scale-width/2,top=(minY+maxY)/2*scale-height/2;
  const tiles=[];
  const tileTemplate=process.env.NEXT_PUBLIC_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  for(let x=Math.floor(left/256);x<=Math.floor((left+width)/256);x++)for(let y=Math.floor(top/256);y<=Math.floor((top+height)/256);y++){if(y<0||y>=2**zoom)continue;const wrappedX=((x%2**zoom)+2**zoom)%2**zoom;tiles.push(<image key={`${x}-${y}`} href={tileTemplate.replace('{z}',String(zoom)).replace('{x}',String(wrappedX)).replace('{y}',String(y))} x={x*256-left} y={y*256-top} width="256" height="256" onError={()=>setFailed(true)}/>);}
  const colors={origin:'#2563eb',stop:'#64748b',current:'#f59e0b',destination:'#22c55e'};
  return localize(<div><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Shipment route: ${stops.map(stop=>stop.label).join(' to ')}`} className="block w-full bg-[#e9f0f4]"><title>Complete shipment route</title>{tiles}<polyline points={normalized.map(p=>`${p.x*scale-left},${p.y*scale-top}`).join(' ')} fill="none" stroke="#2563eb" strokeWidth="5" strokeLinejoin="round"/>{normalized.map((stop,index)=><g key={stop.id}><circle cx={stop.x*scale-left} cy={stop.y*scale-top} r="12" fill={colors[stop.kind]} stroke="white" strokeWidth="3"/><text x={stop.x*scale-left} y={stop.y*scale-top+4} textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">{index+1}</text><title>{stop.label} ({stop.kind})</title></g>)}</svg><div className="route-caption"><span>© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors</span><a href={routeLink} target="_blank" rel="noopener noreferrer">Open route in maps</a></div>{missing.length>0&&<p className="px-5 text-sm text-slate-600">Locations awaiting map coordinates: {missing.map(place=>place.label).join(", ")}</p>}{failed&&<p className="px-5 text-sm text-slate-600">Map tiles are unavailable. Route markers and the stop list remain visible.</p>}<ol className="route-stop-list">{stops.map((stop,index)=><li key={stop.id}><span style={{background:colors[stop.kind]}}>{index+1}</span><div><strong>{stop.label}</strong><small>{stop.kind === 'current' ? 'Current location' : stop.kind}</small></div></li>)}</ol><p className="px-5 pb-3 text-sm text-slate-600">Estimated distance: {shipment.estimatedDistance || "Not provided"}</p><p className="px-5 pb-4 text-xs text-slate-500">Route markers show recorded locations, not continuous GPS tracking.</p></div>);
}
