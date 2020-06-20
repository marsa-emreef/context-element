!function(t){"function"==typeof define&&define.amd?define(t):t()}((function(){"use strict";const t=t=>t+"Changed",e=t=>null!=t&&""!==t,a=t=>!e(t),s=(t,e)=>e.reduce((e,a)=>e||t.indexOf(a)>=0,!1);function i(){return t=>t.nodeType!==Node.TEXT_NODE||/\S/.test(t.textContent)}const r=["data","reducer"];class n{constructor(t,e,a,s){this.stateAttributeProperty=null,this.attributeStateProperty=null,this.eventStateAction=null,this.render=()=>{const t=this.activeNode,e=this.stateAttributeProperty,a=this.attributeStateProperty,s=this.dataGetter(),i=s.data["@state"],r=this.defaultAttributeValue;u(t,e,s,i),p(t,a,i,r)},this.activeNode=t,this.dataGetter=e,this.updateData=a,this.reducer=s,this.activeAttributeValue=c(t),this.defaultAttributeValue=function(t){const e=new Map;return t.getAttributeNames().forEach(a=>{e.set(a,t.getAttribute(a))}),e}(t),this.eventStateAction=o(this.activeAttributeValue),this.stateAttributeProperty=d(this.activeAttributeValue),this.attributeStateProperty=h(this.activeAttributeValue),l(t,this.eventStateAction,e,a,s)}}const o=t=>{const e=new Map;return t.forEach((t,a)=>{if(a.endsWith("action")){const s=a.split(".");let i="",r="";1===s.length?(i="click",r="*"):2===s.length?(i=s[0],r="*"):s.length>2&&(i=s[0],r=s[1]),e.has(i)||e.set(i,new Map),e.get(i).set(r,t)}}),e},d=t=>{const e=new Map;return t.forEach((t,a)=>{if(a.endsWith("watch")){const s=a.split(".");let i="",r="";1===s.length?(i="content",r="*"):2===s.length?(i=s[0],r="*"):s.length>2&&(i=s[0],r=s[1]),e.has(r)||e.set(r,new Map),e.get(r).set(i,t)}}),e},h=t=>{const e=new Map;return t.forEach((t,a)=>{if(a.endsWith("toggle")){const s=a.split(".");let i="",r="";if(3!==s.length)throw new Error('toggle require 3 parameters separated with dot(.) : \' eg <div class="my-div" class.disabled.toggle="disabledCss"></div>');i=s[0],r=s[1],e.has(i)||e.set(i,new Map),e.get(i).set(r,t)}}),e},c=t=>{const e=new Map;return t.getAttributeNames().filter(t=>s(t,["watch","action","toggle"])).forEach(a=>{e.set(a,t.getAttribute(a)),t.removeAttribute(a)}),e},l=(t,e,a,s,i)=>{e.forEach((e,r)=>{r=r.startsWith("on")?r.substring("on".length,r.length):r,t.addEventListener(r,t=>{"submit"===t.type&&(t.preventDefault(),t.stopImmediatePropagation(),t.stopPropagation());const r=a();let n=r.data["@state"];(e.has(n)||e.has("*"))&&s(a=>i(a,{type:e.get(n)||e.get("*"),data:r.data,event:t,key:r.key,index:r.index}))})})},u=(e,s,i,n)=>{const o=i.data,d=s.get(n)||s.get("*");a(d)||d.forEach((a,s)=>{const i=o[a];var n;if(n=s,r.indexOf(n)<0&&e.setAttribute(s,i),s in e){e[s]=i;const r=t(s);e[r]=t=>o[a]=t}"content"===s&&(e.innerHTML=i)})},p=(t,a,s,i)=>{a.forEach((a,r)=>{const n=[],o=i.get(r),d=a.get(s);e(o)&&n.push(o),e(d)&&n.push(d);const h=n.join(" ");t.getAttribute(r)!==h&&t.setAttribute(r,h)})};class f{constructor(t,e,a){this.render=t=>{this.dataGetter=t,this.attributeEvaluators.forEach(t=>t.render())},this.nodes=t,this.updateData=e,this.reducer=a;const s=["watch","action","toggle"],i=Array.from(m(s,this.nodes)),r=()=>this.dataGetter();this.attributeEvaluators=i.map(t=>new n(t,r,this.updateData,this.reducer))}}const m=(t,e)=>e.filter(i()).reduce((e,a)=>{if(!(a instanceof HTMLElement))return e;const i=a,r=i.getAttributeNames();for(const a of r)s(a,t)&&e.add(i);if(!s(i.tagName,["DATA-GROUP","DATA-ELEMENT"])){const a=m(t,Array.from(i.childNodes));Array.from(a).forEach(t=>e.add(t))}return e},new Set);class g extends HTMLElement{constructor(){super(),this.setData=t=>{this.dataSource=t(this.dataSource),this.render()},this.onMounted=t=>{this.onMountedCallback=t},this.updateDataCallback=e=>{this.setData(e);const a=t("data");a in this&&this[a].call(this,this.dataSource)},this.render=()=>{if(a(this.dataSource)||a(this.template))return;if(a(this.renderer)){const t=this.template.map(t=>t.cloneNode(!0));this.renderer=new f(t,this.updateDataCallback,this.reducer)}const t=[...this.renderer.nodes].reverse();let e=document.createElement("template");this.append(e);for(const a of t)e.previousSibling!==a&&this.insertBefore(a,e),e=a;const s=this.dataSource;this.renderer.render(()=>({data:s})),this.lastChild.remove()},this.initAttribute=()=>{},this.populateTemplate=()=>{this.template=Array.from(this.childNodes).filter(i()),this.innerHTML=""},this.template=null,this.renderer=null,this.reducer=t=>t}get data(){return this.dataSource}set data(t){this.setData(()=>t)}connectedCallback(){if(this.initAttribute(),a(this.template)){this.classList.add("data-element-hidden");requestAnimationFrame(()=>{this.populateTemplate(),this.classList.remove("data-element-hidden"),this.render(),e(this.onMountedCallback)&&(this.onMountedCallback(),this.onMountedCallback=null)})}}}const b=document.createElement("style");b.innerHTML=".data-element-hidden {display: none !important;}",document.head.appendChild(b),customElements.define("data-group",class extends g{constructor(){super(),this.setDataKeyPicker=t=>{this.dataKeyPicker=t},this.initAttribute=()=>{this.dataKeyField=this.getAttribute("data-key")},this.render=()=>{const t=this.dataSource,e=this.template,s=this.renderers;if(a(t)||a(e))return;this.removeExpiredData();let i=document.createElement("template");this.append(i);const r=t.length-1;[...t].reverse().forEach((t,a)=>{const n=this.dataKeyPicker(t);if(!s.has(n)){const t=e.map(t=>t.cloneNode(!0)),a=new f(t,this.updateDataCallback,this.reducer);s.set(n,a)}const o=s.get(n),d=[...o.nodes].reverse();for(const t of d)i.previousSibling!==t&&this.insertBefore(t,i),i=t;o.render(()=>({data:t,key:n,index:r-a}))}),this.lastChild.remove()},this.removeExpiredData=()=>{const t=this.renderers,e=this.dataSource.map(t=>this.dataKeyPicker(t));Array.from(t.keys()).filter(t=>e.indexOf(t)<0).forEach(e=>{t.get(e).nodes.forEach(t=>t.remove()),t.delete(e)})};this.renderers=new Map,this.dataKeyPicker=t=>{if(a(this.dataKeyField))throw new Error("'<data-group>' requires 'data-key' attribute. Data-key value should refer to the unique attribute of the data.");return t[this.dataKeyField]},this.reducer=t=>t}static get observedAttributes(){return["data-key"]}attributeChangedCallback(t,e,a){"data-key"===t&&(this.dataKeyField=a)}}),customElements.define("data-element",g)}));
