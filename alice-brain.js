// Alice "brain": calls Claude from the server so the API key never reaches the phone.
// Netlify > Site settings > Environment variables: ANTHROPIC_API_KEY
const H={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"Content-Type","Content-Type":"application/json"};
exports.handler=async(e)=>{
  if(e.httpMethod==="OPTIONS")return{statusCode:204,headers:H,body:""};
  try{
    const{messages=[],mode,search}=JSON.parse(e.body||"{}");
    const system=messages.filter(m=>m.role==="system").map(m=>m.content).join("\n\n");
    const conv=[];
    for(const m of messages.filter(m=>m.role!=="system")){
      const t=typeof m.content==="string"?m.content:"";
      if(conv.length&&conv[conv.length-1].role===m.role)conv[conv.length-1].content+="\n"+t;
      else conv.push({role:m.role,content:t});
    }
    if(!conv.length||conv[0].role!=="user")conv.unshift({role:"user",content:"Hi"});
    const body={model:mode==="deep"?"claude-sonnet-5-5":"claude-haiku-4-5-20251001",max_tokens:1200,system,messages:conv};
    if(search)body.tools=[{type:"web_search_20250305",name:"web_search",max_uses:3}];
    const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"x-api-key":process.env.ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01","content-type":"application/json"},body:JSON.stringify(body)});
    const j=await r.json();
    if(!r.ok)return{statusCode:r.status,headers:H,body:JSON.stringify(j)};
    const text=(j.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("").trim();
    return{statusCode:200,headers:H,body:JSON.stringify({text})};
  }catch(err){return{statusCode:500,headers:H,body:JSON.stringify({error:String(err)})}}
};
