/* ============ NET TRANSPORT: PeerJS room adapter ============ */
/* Implements the part of the claude.ai `room` capability the game uses (join, presence, peers,
   onPeers, leave) on top of PeerJS (WebRTC). Star topology: the first player to join a room
   registers the room id on the PeerJS broker and becomes the hub; everyone else connects to it
   and the hub relays presence between members. Used only when `window.claude` has no room. */
function loadPeerJs(){
  if(window.Peer)return Promise.resolve();
  return new Promise((res,rej)=>{
    const s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js';
    s.onload=res;s.onerror=()=>rej(new Error('PeerJS failed to load'));
    document.head.appendChild(s);
    setTimeout(()=>rej(new Error('PeerJS load timeout')),8000);
  });
}
function makePeerRoomApi(PeerCtor){
  const PREFIX='blackorder-v1-';
  const rid=()=>Math.random().toString(36).slice(2,10);
  async function join(name){
    const me=rid(),hubId=PREFIX+name;
    const members=new Map([[me,{presence:{},updatedAt:0}]]);
    const handlers=[],conns=new Map();
    let peer=null,hubConn=null,isHub=false,closed=false;
    const view=()=>[...members].map(([id,m])=>Object.freeze({peer:id,by:null,isMe:id===me,sameTab:id===me,kind:'viewer',guest:false,presence:m.presence,updatedAt:m.updatedAt}));
    let cache=view();
    const notify=()=>{cache=view();handlers.slice().forEach(h=>{try{h({peers:cache,joined:[],left:[],updated:[]});}catch(e){console.error(e);}});};
    const apply=(id,patch)=>{
      let m=members.get(id);if(!m){m={presence:{},updatedAt:0};members.set(id,m);}
      const merged=Object.assign({},m.presence,patch);
      for(const k in patch)if(patch[k]===null)delete merged[k];
      m.presence=merged;m.updatedAt++;
    };
    const bcast=(msg,except)=>{for(const [id,c] of conns)if(id!==except&&c.open)c.send(msg);};
    const dropMember=id=>{if(!members.has(id))return;conns.delete(id);members.delete(id);if(isHub)bcast({t:'left',id});notify();};
    function onGuest(conn){
      let cid=null;
      conn.on('data',d=>{
        if(!d)return;
        if(d.t==='hello'&&!cid&&d.id&&!members.has(d.id)){
          cid=d.id;conns.set(cid,conn);members.set(cid,{presence:{},updatedAt:0});
          conn.send({t:'snap',peers:[...members].map(([id,m])=>[id,m.presence,m.updatedAt])});
          bcast({t:'join',id:cid},cid);notify();
        } else if(d.t==='pres'&&cid){apply(cid,d.patch);bcast({t:'pres',id:cid,patch:d.patch},cid);notify();}
      });
      conn.on('close',()=>{if(cid)dropMember(cid);});
    }
    function onHubData(d){
      if(!d)return;
      if(d.t==='snap'){
        const mine=members.get(me);members.clear();
        for(const [id,p,u] of d.peers)members.set(id,id===me?mine:{presence:p,updatedAt:u});
        if(!members.has(me))members.set(me,mine);
      } else if(d.t==='join'){if(!members.has(d.id))members.set(d.id,{presence:{},updatedAt:0});}
      else if(d.t==='pres'&&d.id!==me)apply(d.id,d.patch);
      else if(d.t==='left')members.delete(d.id);
      else return;
      notify();
    }
    const start=(attempt)=>new Promise((resolve,reject)=>{
      let settled=false;
      const fail=(code)=>{if(settled)return;settled=true;try{peer&&peer.destroy();}catch(e){}reject(Object.assign(new Error('room: '+code),{code}));};
      const done=()=>{if(!settled){settled=true;resolve();}};
      const timer=setTimeout(()=>fail('timeout'),10000);
      const asHub=()=>{
        peer=new PeerCtor(hubId);
        peer.on('open',()=>{isHub=true;peer.on('connection',onGuest);clearTimeout(timer);done();});
        peer.on('error',e=>{
          if(settled)return;
          if(e&&e.type==='unavailable-id'){try{peer.destroy();}catch(x){}asGuest();}
          else{clearTimeout(timer);fail((e&&e.type)||'error');}
        });
      };
      const asGuest=()=>{
        peer=new PeerCtor();
        peer.on('open',()=>{
          hubConn=peer.connect(hubId,{reliable:true,serialization:'json'});
          hubConn.on('open',()=>{hubConn.send({t:'hello',id:me});clearTimeout(timer);done();});
          hubConn.on('data',onHubData);
          hubConn.on('close',()=>{if(closed)return;for(const id of [...members.keys()])if(id!==me)members.delete(id);notify();});
        });
        peer.on('error',e=>{
          if(settled)return;
          if(e&&e.type==='peer-unavailable'&&attempt<2){clearTimeout(timer);try{peer.destroy();}catch(x){}start(attempt+1).then(resolve,reject);settled=true;}
          else{clearTimeout(timer);fail(e&&e.type==='peer-unavailable'?'no-room':((e&&e.type)||'error'));}
        });
      };
      asHub();
    });
    await start(1);
    return {
      name,emit:async()=>{},on:()=>()=>{},connected:()=>true,onConnection:h=>{h(true);return()=>{};},
      presence:async patch=>{
        const c=JSON.parse(JSON.stringify(patch));apply(me,c);
        if(isHub)bcast({t:'pres',id:me,patch:c});else if(hubConn&&hubConn.open)hubConn.send({t:'pres',patch:c});
        notify();
      },
      peers:()=>cache,
      onPeers:h=>{handlers.push(h);return()=>{const i=handlers.indexOf(h);if(i>=0)handlers.splice(i,1);};},
      leave:async()=>{closed=true;try{for(const c of conns.values())c.close();if(hubConn)hubConn.close();if(peer)peer.destroy();}catch(e){}members.clear();members.set(me,{presence:{},updatedAt:0});conns.clear();notify();},
    };
  }
  return {join};
}
