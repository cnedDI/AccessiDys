/**
 * Created by user on 14/07/15.
 */



var mongoose = require('mongoose'),
  UserAccount = mongoose.model('User');


function createClones(number){

  var theOne = {
    dropbox : {
      "accessToken" : "-_FTWHsPBLoAAAAAAAAANTEdQbmayqH_BYf0g3Z-fX53L5uGb_EYfpDCBRBornxU",
      "country" : "MA",
      "display_name" : "mohamed elmandoubi",
      "emails" : "mandouprog@gmail.com",
      "referral_link" : "https://db.tt/3W4arMLP",
      "uid" : "311485215"
    },
    local : {
      authorisations : {
        audio : false,
        ocr : false
      },
      email : "agent@gmail.com",
      nom : "smith",
      password : "0b4e7a0e5fe84ad35fb5f95b9ceeac79",
      prenom : "agent",
      role : "user",
      token : "",
      tokenTime : 0
    }
  };
  var tmp =theOne;
  console.log('starting the cloning process');
  console.log('email have this form is [agent(number)@gmail.com');
  console.log('password for all users is [aaaaaa]');
  console.log('all users shares the same dropbox account');
  console.log('dropbox account email '+theOne.dropbox.emails);

  for(var i=0;i<number;i++){
    tmp.local.email = 'agent'+i+'@gmail.com';
    UserAccount.create(tmp,function(data){
    });
  }
  console.log(number+' clones created');
}



function killClones(){
  console.log('about to wipe all clones');
  UserAccount.remove({"local.email":{$regex : "agent*"}},function(clones){
    console.log('removed created clones');
  });
}

//killClones();

//createClones(3);
