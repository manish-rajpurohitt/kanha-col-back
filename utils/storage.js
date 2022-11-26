const AWS = require('aws-sdk');

const keys = require('../config/keys');
const cloudinary = require("cloudinary").v2;
const { Readable } = require("stream");
let fs = require("fs");
const Datauri = require('datauri');



const bufferToStream = (buffer) => {
  const readable = new Readable({
    read() {
      this.push(buffer);
      this.push(null);
    },
  });
  return readable;
}

const uploadFronBuffer = (image) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "DEV" },
      (err, result) => {
        if (result) {
          resolve(result);
        } else {
          reject(error);
         }
      }
    );

    bufferToStream(image.buffer).pipe(stream)
  });
}

exports.s3Upload = async image => {
  let imageKey = '';
  let imageUrll = '';
  let imgObj = [];
  for(let i=0; i<image.length;i++){
    console.log("uploading...", image[i])
    if (image[i]) {
      let imageUrl = await uploadFronBuffer(image[i]);
      imageUrll = imageUrl.secure_url;
      imageKey = imageUrl.public_id;
      imgObj.push({imageUrll, imageKey});

    }
    console.log("upload complete...")

  }
  return { imgObj };
};
