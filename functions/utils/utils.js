const axios = require('axios').default;



exports.asyncForEach = async (array, callback) => {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
};

exports.makePostCashfreeAsyncCall = async (url, body) =>{

  let reqInstance = axios.create({
    headers: {
      "Content-Type" : "application/json",
      "x-api-version": "2022-01-01",
      "x-client-id" : process.env.CASHFREE_APP_ID,
      "x-client-secret" : process.env.CASHFREE_APP_SECRET
    }
    })
    return reqInstance.post(url, body).then((resp, err)=>{
      if(err){
        return false;
      }else{
        return resp.data
      }
    })
}


exports.makeGetCashfreeAsyncCall = async (url) =>{
  let reqInstance = axios.create({
    headers: {
      "Content-Type" : "application/json",
      "x-api-version": "2022-01-01",
      "x-client-id" : process.env.CASHFREE_APP_ID,
      "x-client-secret" : process.env.CASHFREE_APP_SECRET
    }
    })
    return reqInstance.get(url).then((resp, err)=>{
      if(err){
        return false;
      }else{
        return resp.data
      }
    })
}