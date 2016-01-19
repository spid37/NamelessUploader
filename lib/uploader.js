var Promise = require("bluebird");
var mmm = require('mmmagic'),
  Magic = mmm.Magic;

var AWS = require('aws-sdk');

function Uploader(awsConfig, bucketName) {
  if (!bucketName) {
    throw new Error("No bucket name given");
  }
  this.bucketName = bucketName;
  // set aws config
  AWS.config.update(awsConfig);
  // initiate aws with the bucket
  this.s3 = new AWS.S3({
    'params': {
      'Bucket': this.bucketName
    }
  });
  // just need mimetypes from magic
  this.magic = new Magic(mmm.MAGIC_MIME_TYPE);
}

// batch upload files
// [{ filePath: "path/to/file.ext", fileData: "the file contents" }]
//
Uploader.prototype.batchUpload = function(uploadData) {
  var self = this;
  var uploadPromises = [];
  // upload the files - all must be successful
  uploadData.forEach(function(item) {
    uploadPromises.push(self.upload(item.filePath, item.fileData));
  });

  if (uploadPromises.length === 0) {
    throw new Error("Nothing to upload");
  }
  return Promise.all(uploadPromises);
};

Uploader.prototype.upload = function(filePath, fileData) {
  var self = this;
  var params = {
    ACL: 'public-read',
    Key: filePath,
    ContentType: null,
    Body: fileData
  };
  return self.getMime(fileData).then(function(mimeType) {
    params.ContentType = mimeType;
    return self.s3UploadFile(params);
  });
};

Uploader.prototype.s3UploadFile = function(params) {
  var self = this;
  return new Promise(function(resolve, reject) {
    self.s3.upload(params, function(err, data) {
      if (err) return reject(err);
      var fullUrl = 'https://' + self.bucketName + '/' + params.Key;
      resolve(fullUrl);
    });
  });

};

Uploader.prototype.getMime = function(data) {
  self = this;
  return new Promise(function(resolve, reject) {
    self.magic.detect(data, function(err, result) {
      if (err) return reject(err);
      return resolve(result);
    });
  });
};

module.exports = function(awsConfig, bucketName) {
  return new Uploader(awsConfig, bucketName);
};

//module.exports = Uploader;
