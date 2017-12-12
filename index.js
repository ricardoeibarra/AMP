const objRequest = require('http')
const jsdom = require('jsdom')
const { JSDOM }=jsdom
const ampify = require('ampify')

exports.handler = (event, context, callback) => {
    let responseCode = 200;
    console.log("inicia la funcion");
if (event.queryStringParameters !== null && event.queryStringParameters !== undefined) {
if (event.queryStringParameters.articleid !== undefined && 
            event.queryStringParameters.articleid !== null && 
            event.queryStringParameters.articleid !== "") {
    var objArticle;
                console.log("existen los query parametros");
    const postData = JSON.stringify({
            'size':50,
            'query':{
                "match":{
                    "code":event.queryStringParameters.articleid
                }
            },
            'sort':{
                "publishDate":{
                    "order":"desc"
                }
            }
          });
          console.log("inicializo la post data");
    const options = {
      hostname: 'proxy-elastic.**********.com',
      port: 8080,
      path: '/omnix_es/articles/_search?%3Ffilter_path=',
      method: 'POST',
      headers:{
            'authorization':'Basic **********',
            'cache-control': 'no-cache'
      }
    };
    console.log("va a hacer el request");
    const req = objRequest.request(options,(res)=>{
        if(res.statusCode!=200){
          console.log("error en la petición");
        }else{
            let rawData = '';
            res.on('data', (chunk) => { rawData += chunk; });
            res.on('end', () => {
                try {
                  const parsedData = JSON.parse(rawData);
        let objNoticia = parsedData.hits.hits[0];
          console.log(objNoticia._source);
          let contenido = quitarElementos(objNoticia._source.body);
          console.log("antes de ampify");
          console.log(contenido);
          contenido = ampify(contenido,{cwd: 'amp'});
          contenido = contenido + incluirBloques(objNoticia._source.blocks);
          console.log("llego acá");
          console.log(contenido);
          objArticle = {
            "title":objNoticia._source.title,
            "seotitle":objNoticia._source.seotitle,
            "contenido":contenido,
            "imagen":objNoticia._source.image,
            "publishdate":objNoticia._source.publishDate,
            "description":objNoticia._source.description,
            "tags":objNoticia._source.tags,
            "author":objNoticia._source.author.name,
            "amphtml":contenido
          };
                } catch (e) {
                  console.error("error:"+e.message);
                }
    var responseBody = {
        message: "greeting",
        article: objArticle
    };
    
    // The output from a Lambda proxy integration must be 
    // of the following JSON object. The 'headers' property 
    // is for custom response headers in addition to standard 
    // ones. The 'body' property  must be a JSON string. For 
    // base64-encoded payload, you must also set the 'isBase64Encoded'
    // property to 'true'.
    var response = {
        statusCode: responseCode,
        headers: {
            "x-custom-header" : "my custom header value"
        },
        body: JSON.stringify(responseBody)
    };
    console.log("response: " + JSON.stringify(response))
    callback(null, response);
            });
        console.log("termino la petici´ón");

          

        }
    });
    
    

req.write(postData);
req.end();
}
}else{
var responseBody = {
        message: "greeting",
        input: event
    };
    
    // The output from a Lambda proxy integration must be 
    // of the following JSON object. The 'headers' property 
    // is for custom response headers in addition to standard 
    // ones. The 'body' property  must be a JSON string. For 
    // base64-encoded payload, you must also set the 'isBase64Encoded'
    // property to 'true'.
    var response = {
        statusCode: responseCode,
        headers: {
            "x-custom-header" : "my custom header value"
        },
        body: JSON.stringify(responseBody)
    };
    console.log("response: " + JSON.stringify(response))
    callback(null, response);
}

};

function quitarElementos(html){
  var contenido = html;
  console.log(html);
  var dom = new JSDOM(html);
  //vienen imagenes con data:image, esas hay que quitarlas
  var lista1 = dom.window.document.getElementsByTagName("blockquote");
  var cantidad = lista1.length;
  console.log("cantidad de blockquote");
  console.log(lista1.length);
  for(var i=(cantidad-1);i>=0;i--){
    var obj = lista1[i];
    //obj.parentNode.removeChild(obj);
    var twitterExp = /twitter.com\/([a-z]|[_])+\/status\/[0-9]+/ig;
    var str = obj.innerHTML;
    var arrUrltw = twitterExp.exec(str);
    if(Array.isArray(arrUrltw)){
      var urltw = arrUrltw[0];
      var idtw = urltw.substr((urltw.lastIndexOf("/")+1));
      obj.innerHTML = '<amp-twitter width="200" height="200" layout="responsive" data-tweetid="'+idtw+'"></amp-twitter>';
    }else{
      console.log(arrUrltw);
      obj.innerHTML = '<a href="https://foxsports.com.gt" target="_blank">Haz click aquí para acceder al contenido multimedia</a>';
    }
  }
  console.log("sobrevivio al for");
  lista1 = dom.window.document.getElementsByTagName("script");
  cantidad = lista1.length;
  for(var i=(cantidad-1);i>=0;i--){
    var obj = lista1[i];
    obj.parentNode.removeChild(obj);
  }
  console.log("sobrevivio al 2 for");
  var contenido = limpiarcontenido(dom.serialize());
  return contenido;
}

function incluirBloques(arrBloques){
  var htmlBloques="";
  if(arrBloques.length>0){
    for(var i=0;i<arrBloques.length;i++){
      var bloque = arrBloques[i];
      if(bloque.type=="embed"){
        if(bloque.data.embed_code.indexOf("playbuzz.com/widget/feed.js")>0){
          console.log(bloque.data.embed_code);
          var playbuzzexpr = /data-item=\"([a-z]|[-]|[0-9])+\"/ig;
          var arrPlayid = playbuzzexpr.exec(bloque.data.embed_code);
          if(Array.isArray(arrPlayid)){
            var strplay = arrPlayid[0];
            strplay = strplay.replace("data-item=","");
            strplay = strplay.replace("\\","");
            strplay = strplay.replace(/\"/g,"");
            console.log(strplay);
            htmlBloques = htmlBloques + '<amp-playbuzz data-item="'+strplay+'" height="500" data-item-info="true"></amp-playbuzz>';
          }
        }else{
          console.log("no hay playbuzz");
        }
      }
    }
  }
  return htmlBloques;
}

function limpiarcontenido(html){
  var amphtml="";
  amphtml = html;
  amphtml = amphtml.replace(/<html.*<body>/gm,"");
  amphtml = amphtml.replace(/<\/body>.*<\/html>/gm,"");
  console.log("sobrevivio a limpiar");
  return amphtml;
}
