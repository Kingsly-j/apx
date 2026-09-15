"use client";

import { cloneElement, createContext, isValidElement, useContext, useEffect, useMemo, useState, type ReactElement, type ReactNode } from "react";
import { languageNames, localeNames, translate, type Language } from "@/lib/languages";

const LanguageContext=createContext<{language:Language;setLanguage:(language:Language)=>void}>({language:'en',setLanguage:()=>{}});
export function LanguageProvider({children}:{children:ReactNode}) {
  const [language,setLanguage]=useState<Language>('en');
  useEffect(()=>{const timer=setTimeout(()=>{try{const saved=localStorage.getItem('site-language') as Language;if(saved in languageNames)setLanguage(saved);}catch{}},0);return()=>clearTimeout(timer);},[]);
  useEffect(()=>{document.documentElement.lang=language;document.documentElement.dir=language==='ar'?'rtl':'ltr';},[language]);
  const context=useMemo(()=>({language,setLanguage:(next:Language)=>{setLanguage(next);try{localStorage.setItem('site-language',next);}catch{}}}),[language]);
  return <LanguageContext.Provider value={context}>{children}</LanguageContext.Provider>;
}
export function useLanguage() {
  const {language,setLanguage}=useContext(LanguageContext);
  const t=(text:string)=>translate(text,language);
  function localize(children:ReactNode):ReactNode {
    if(language==='en')return children;
    if(Array.isArray(children))return children.map(child=>localize(child));
    const child=children;
    {
      if(typeof child==='string')return t(child);
      if(!isValidElement(child))return child;
      const element=child as ReactElement<Record<string,unknown>>;
      if(element.props.translate==='no'||element.type==='script'||element.type==='style')return element;
      const props:Record<string,unknown>={};
      for(const key of ['title','aria-label','placeholder','label'])if(typeof element.props[key]==='string')props[key]=t(element.props[key] as string);
      // Translating an option must never change the stored status / section value.
      if(element.type==='option'&&element.props.value===undefined&&typeof element.props.children==='string')props.value=element.props.children;
      if(element.props.children!==undefined)props.children=localize(element.props.children as ReactNode);
      return cloneElement(element,props);
    }
  }
  return {language,setLanguage,t,localize,locale:localeNames[language]};
}
