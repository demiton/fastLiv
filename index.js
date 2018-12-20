const fs = require('fs-extra');
const path = require('path');
const copydir = require('copy-dir');
var set = require('set-value');
var jsonfile = require('jsonfile')
var argv = require('minimist')(process.argv.slice(2));

var fileName = argv.f;

if(fileName != undefined){
  console.log('RoadMap : '+ fileName);
  var road = require('./'+fileName);
  makeDelivery2(road);
}else{
  console.log( "Please give a roadMap and execute the script as : ");
  console.log( "node index.js -f [roadMap Name]");
}



function fileCopy(src,dest,filelist){
  for( var i in filelist){
    var filePath = src + '\\' + filelist[i];
    var destinationFilePath = dest  + '\\' + filelist[i];
    if(fs.existsSync(filePath)){
      fs.createReadStream(filePath).pipe(fs.createWriteStream(destinationFilePath));
    }else{
      console.log('Erreur : '+filePath+ ' not found');
    }

  }
}


function folderCopy(src,dest,folderlist){
  for( var i in folderlist){
    var folderPath = src + '\\' + folderlist[i];
    var destinationFolderPath = dest  + '\\' + folderlist[i];
    if(fs.existsSync(folderPath)){
      copydir.sync(folderPath, destinationFolderPath);
    }else{
      console.log('Erreur : '+folderPath+ ' not found');
    }

  }
}

function copyCustomizedFile(src,dest,customList,callback){
  var promises = [];
  for(var key in customList){
    var toChange = customList[key];
    promises.push(customizedFile(src,dest,key,toChange));
  }
  return Promise.all(promises).then(function(result) {
    callback(result);
  });
}

function customizedFile(src,dest,customFile,toChange){
  return new Promise((resolve, reject) => {
    var filePath = src + '\\' + customFile;
    var destinationFilePath = dest  + '\\' + customFile;
    if(fs.existsSync(filePath)){
      /// attributes to Customize
      var attributes = toChange;
      var keys = Object.keys(toChange);
      var newFile =  jsonfile.readFileSync(filePath);
      for(var j in attributes){
        var k = j;
        var att = attributes[j];
        set(newFile,k,att);
      }
      fs.writeFile(destinationFilePath, JSON.stringify(newFile, null, 2), function (err) {
        if (err) {return (
          console.log(err));
          reject();
        }
        else{
          resolve('is done');
        }
      });
    }
    else{
      console.log('Erreur : '+filePath+ ' not found');
      reject();
    }
  });
}

function makeDelivery(roadMap){
  console.log("makeDelivery");
  var promises = [];
  var userHome = process.env.HOME;
  console.log("User Profile : "+ process.env.HOME);
  var deliveryList  = roadMap.Builds;
  for(var key in deliveryList){
    promises.push(deliverBuilds(userHome,key,roadMap));
  }
  return Promise.all(promises).then(function(result) {
    var errorCount = 0;
    for( var i in result){
      if(result[i] != 'is done'){errorCount ++;}
    }
    if(errorCount == 0){
      console.log('                                                                ');
      console.log(' *************************** SUCCESS ***************************');
      console.log(' ***************************************************************');
    }else{
      console.log('                                                                ');
      console.log(' **************************** ERROR ****************************');
      console.log(' ********** '+ errorCount + ' errors during execution **********');
      console.log(' ***************************************************************');
    }

  });
}

function deliverBuilds(userHome,toDeliver,roadMap){
  console.log('--> deliverBuilds --> '+ toDeliver);
  return new Promise((resolve, reject) => {
    var PathIsFromUserHome = roadMap.Source.fromUserHome;
    var sourceFolder ='';
    if(PathIsFromUserHome){
      sourceFolder = userHome + '\\'+roadMap.Source.Path;
    }else{
      sourceFolder = roadMap.Source.Path;
    }
    console.log('SourceFolder : '+sourceFolder);
    var buildsToDeliver = roadMap.Builds[toDeliver];
    var DestPathIsFromUserHome = buildsToDeliver.fromUserHome;
    var destinationFolder ='';
    if(DestPathIsFromUserHome){
      destinationFolder = userHome + '\\'+buildsToDeliver.Destination;
    }else{
      destinationFolder = buildsToDeliver.Destination;
    }
    console.log('DestinationFolder : '+ destinationFolder);
    var commonFileList = roadMap.Source.Files;
    var commonFolderList = roadMap.Source.Folder;
    var customList = roadMap.Builds[toDeliver].Customize;
    /////
    fileCopy(sourceFolder,destinationFolder,commonFileList);
    folderCopy(sourceFolder,destinationFolder,commonFolderList);
    copyCustomizedFile(sourceFolder,destinationFolder,customList, function(res){
      resolve(res);
    });
  });
}


function copyMaps(userHome, toDeliver,roadMap){
  return new Promise((resolve, reject) => {
    var PathIsFromUserHome = roadMap.Source.fromUserHome;
    var sourceFolder ='';
    if(PathIsFromUserHome){
      sourceFolder = userHome + '\\'+roadMap.Source.Path;
    }else{
      sourceFolder = roadMap.Source.Path;
    }
    console.log('SourceFolder : '+sourceFolder);
    if(fs.existsSync(sourceFolder)){
      var buildsToDeliver = roadMap.Builds[toDeliver];
      var DestPathIsFromUserHome = buildsToDeliver.fromUserHome;
      var destinationFolder ='';
      if(DestPathIsFromUserHome){
        destinationFolder = userHome + '\\'+buildsToDeliver.Destination;
      }else{
        destinationFolder = buildsToDeliver.Destination;
      }
      console.log('DestinationFolder : '+ destinationFolder);
      var commonFileList = roadMap.Source.Files;
      var commonFolderList = roadMap.Source.Folder;
      var customList = roadMap.Builds[toDeliver].Customize;
      fs.ensureDir(destinationFolder)
      .then(() => {
        copyFiles(userHome,sourceFolder,destinationFolder,roadMap)
        .then(()=>{
          copyFolders(userHome,sourceFolder,destinationFolder,roadMap)
          .then(()=>{
            copyCustomizedFile(sourceFolder,destinationFolder,customList, function(res){
                //resolve(res);
            })
            .then(()=>{
                resolve('is done');
            });
          })
        })
      })
      .catch(err => {
       console.error(err);
       reject();
      })
    }else{
        console.log('Erreur : '+sourceFolder+ ' not found');
        reject();
    }
});
}



function copyFiles(userHome,src,dest,roadMap){
  console.log("copyFiles");
  var promises = [];
  var userHome = process.env.HOME;
  console.log("User Profile : "+ process.env.HOME);
  var fileList  = roadMap.Source.Files;
  for(var key in fileList){
    var file = fileList[key];
    promises.push(copyFileFromList(src,dest,file));
  }
  return Promise.all(promises).then(function(result) {
    var errorCount = 0;
    for( var i in result){
      if(result[i] != 'is done'){errorCount ++;}
    }
    if(errorCount == 0){
      console.log('                                                                ');
      console.log(' *************************** copyFiles SUCCESS *****************');
      console.log(' ***************************************************************');
    }else{
      console.log('                                                                ');
      console.log(' **************************** copyFiles ERROR *******************');
      console.log(' ********** '+ errorCount + ' errors during execution **********');
      console.log(' ***************************************************************');
    }

  });
}


function copyFolders(userHome,src,dest,roadMap){
//  console.log("copyFolders");
  var promises = [];
  var userHome = process.env.HOME;
//  console.log("User Profile : "+ process.env.HOME);
  var folderList  = roadMap.Source.Folders;
  for(var key in folderList){
    var folder = folderList[key];
    promises.push(copyFolderFromList(src,dest,folder));
  }
  return Promise.all(promises).then(function(result) {
    var errorCount = 0;
    for( var i in result){
      if(result[i] != 'is done'){errorCount ++;}
    }
    if(errorCount == 0){
      console.log('                                                                ');
      console.log(' *************************** copyFolders SUCCESS ***************');
      console.log(' ***************************************************************');
    }else{
      console.log('                                                                ');
      console.log(' **************************** copyFolders ERROR ****************');
      console.log(' ********** '+ errorCount + ' errors during execution **********');
      console.log(' ***************************************************************');
    }

  });
}


function copyFileFromList(src,dest,file){
  return new Promise((resolve, reject) => {
    fs.copy(src + path.sep + file, dest + path.sep + file)
    .then(() => resolve('is done'))
    .catch(err => reject())
    });
}


function copyFolderFromList(src,dest,folder){
  return new Promise((resolve, reject) => {
    copydir(src + path.sep + folder, dest + path.sep + folder, function(err){
    if(err){
      reject();
    } else {
      resolve('is done');
    }
  });
});
}



function makeDelivery2(roadMap){
  console.log("makeDelivery2");
  var promises = [];
  var userHome = process.env.HOME;
  console.log("User Profile : "+ process.env.HOME);
  var deliveryList  = roadMap.Builds;
  for(var key in deliveryList){
    promises.push(copyMaps(userHome,key,roadMap));
  }
  return Promise.all(promises).then(function(result) {
    var errorCount = 0;
    for( var i in result){
      if(result[i] != 'is done'){errorCount ++;}
    }
    if(errorCount == 0){
      console.log('                                                                ');
      console.log(' *************************** makeDelivery2 SUCCESS *************');
      console.log(' ***************************************************************');
    }else{
      console.log('                                                                ');
      console.log(' **************************** makeDelivery2 ERROR **************');
      console.log(' ********** '+ errorCount + ' errors during execution **********');
      console.log(' ***************************************************************');
    }

  });
}
