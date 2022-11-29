const express = require('express');
const router = express.Router();
const axios = require("axios");
const fs = require("fs");
// Imports dependencies and set up http server
const request = require("request");
const { Readable } = require("stream");
  const cloudinary = require("cloudinary").v2;

router.post("/webhook", async (req, res) => {
    // Parse the request body from the POST
    let body = req.body;
  
    // Check the Incoming webhook message
   // console.log(JSON.stringify(req.body, null, 2));
  
    // info on WhatsApp text message payload: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples#text-messages
    if (req.body.object) {
      if (
        req.body.entry &&
        req.body.entry[0].changes &&
        req.body.entry[0].changes[0] &&
        req.body.entry[0].changes[0].value.messages && 
        req.body.entry[0].changes[0].value.messages[0]
      ) {
        let msg_body = req.body.entry[0].changes[0].value.messages[0] // extract the message text from the webhook payload
        if(msg_body.type !== "image") return;
         let imgid = msg_body.image.id;
         console.log(msg_body.from)
          let respu = await axios({
            method: "GET",
            url: "https://graph.facebook.com/v12.0/"+imgid,
            headers: { "Authorization" : "Bearer " + process.env.WHATSAPP_TOKEN}
          }).then(async data=>{
              await axios({
              method: "GET",
              url: data.data.url,
              headers: { "Authorization" : "Bearer " + process.env.WHATSAPP_TOKEN},
              responseType: 'arraybuffer'
            }).then(async resData=>{
              const outputFilename = 'file.jpg'
              let reff = await Buffer.from(resData.data, 'binary').toString('base64');

              await fs.writeFileSync(outputFilename, Buffer.from(reff, 'base64'));
          
              await cloudinary.uploader
              .upload(outputFilename, {public_id: "WhatsappUploads"})
              .then(async result=>{
                console.log(result)
                let resup = await axios({
                  method: "POST",
                  url: " https://graph.facebook.com/v14.0/104708699097611/messages",
                  headers: {
                    "Authorization" : "Bearer " + process.env.WHATSAPP_TOKEN,
                    "Content-Type" : "application/json"
                 },
                 data: { "messaging_product": "whatsapp", "to": msg_body.from ? msg_body.from : "918297997256", "type": "template", "template": { "name": "link", "language": { "code": "en" }, "components":[{ "type": "body", "parameters" : [
                  {
                    "type" : "text", "text": result.url
                  }
                 ]}] } }
                });
                console.log(resup);
              });
            }).catch((err)=>{
              console.log("err " + err);
            });
            
          }).catch((err)=>{
            console.log("err " + err)
          });
      
      }
      res.sendStatus(200);
    } else {
      
      // Return a '404 Not Found' if event is not from a WhatsApp API
      res.sendStatus(404);
    }
  });

router.get("/webhook", (req, res) => {
    /**
     * UPDATE YOUR VERIFY TOKEN
     *This will be the Verify Token value when you set up webhook
    **/
    const verify_token = process.env.VERIFY_TOKEN;
  
    // Parse params from the webhook verification request
    let mode = req.query["hub.mode"];
    let token = req.query["hub.verify_token"];
    let challenge = req.query["hub.challenge"];
  
    // Check if a token and mode were sent
    if (mode && token) {
      // Check the mode and token sent are correct
      if (mode === "subscribe" && token === verify_token) {
        // Respond with 200 OK and challenge token from the request
        console.log("WEBHOOK_VERIFIED");
        res.status(200).send(challenge);
      } else {
        // Responds with '403 Forbidden' if verify tokens do not match
        res.sendStatus(403);
      }
    }
  });

module.exports = router;
