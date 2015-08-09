var config = require(__dirname+"/../../config.js");
var Promise = require("bluebird");
var mmm = require('mmmagic'),
    Magic = mmm.Magic;
var md5 = require('MD5');

var AWS = require('aws-sdk');
AWS.config.update(config.aws);

function Uploader(type){
  if(!config.aws.bucket[type]){
    throw new Error("Invalid bucket type: ",type);
  }
  this.bucketName = config.aws.bucket[type];
  this.s3 = new AWS.S3({'params': {'Bucket': this.bucketName}});
  this.magic = new Magic(mmm.MAGIC_MIME_TYPE);
}

Uploader.prototype.upload = function(basePath, imageData){
  var self = this;
  var params = {
     ACL: 'public-read',
     Key: null,
     ContentType: null,
     Body: imageData
  };
  return self.getMime(imageData).then(function(mimeType){
    var ext = self.getExtension(mimeType);
    var imageMd5 = md5(imageData);
    params.Key = basePath+'/'+imageMd5+'.'+ext;
    params.ContentType = mimeType;

    return self.s3UploadFile(params);
  });
}

Uploader.prototype.s3UploadFile = function(params){
  var self = this
   return new Promise(function(resolve,reject){
      self.s3.upload(params, function(err, data) {
         if (err) return reject(err);
         console.log("Successfully uploaded data: ", params);
         var fullUrl = 'https://'+self.bucketName+'/'+params.Key;
         resolve(fullUrl);
      });
   });

}

Uploader.prototype.getMime = function(data){
  self = this
  return new Promise(function(resolve,reject){
    self.magic.detect(data, function(err, result) {
      if (err) {
        // how can i get in here
        // invalid buffer data seems to throw error
        console.log("GOT ERRR 1");
        return reject(err);
      }
      return resolve(result);
    });
  })
}

Uploader.prototype.getExtension = function(mimeType){
  var extensions = {
    'image/gif': 'gif',
    'image/png': 'png',
    'image/jpg': 'jpg',
    'image/jpeg': 'jpg',
  }

  if(!extensions[mimeType]){
    throw new Error("Invalid file type");
  }

  return extensions[mimeType];
}

module.exports = function(type){
  return new Uploader(type);
}
