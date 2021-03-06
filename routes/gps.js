'use strict'
const express = require('express');
const HashMap = require('hashmap');
const mysql = require('mysql');
const config = require('../config');
const router = express.Router();
const pool = mysql.createPool(config.MYSQL_CONFIG);


/*

정류장과 정류장 사이 노선에도 숫자 부여

- 송내
송내남부역 CU - 미추홀캠퍼스 - 송도캠퍼스
(1 2 3 4 5)

- 수원
수원역 4번출구 - 상록수역 1번출구 - 안산중앙역 버스정류장 - 안산역 통근버스 제1승차장 - 함현중학교 정문 - 미추홀캠퍼스 - 송도캠퍼스
(1 2 3 4 5 6 7 8 9 10 11 12 13)

- 일산
마두역 5번출구 - 대화역 4번출구 - 장기동 예가아파트 서문정류장 - 김포IC - 미추홀캠퍼스 - 송도캠퍼스
(1 2 3 4 5 6 7 8 9 10 11)

- 청라
검암역 1번출구 - 가정역 4번출구 - 미추홀캠퍼스 - 송도캠퍼스
(1 2 3 4 5 6 7)

- 광명
석수역 1번출구 - 미추홀캠퍼스 - 송도캠퍼스
(1 2 3 4 5)
*/
let map = new HashMap();
map.set("송내", {status : 0, location : 0, lat : 0, lng : 0, check : 0});
map.set("수원", {status : 0, location : 0, lat : 0, lng : 0, check : 0});
map.set("일산", {status : 0, location : 0, lat : 0, lng : 0, check : 0});
map.set("청라", {status : 0, location : 0, lat : 0, lng : 0, check : 0});
map.set("광명", {status : 0, location : 0, lat : 0, lng : 0, check : 0});

// gps값 수신
router.post('/', (req, res)=>{
  let status = req.body.status;
  let routeId = req.body.routeId;
  let lat = req.body.lat;
  let lng = req.body.lng;
  if(!(routeId || lat || lng)){
    res.sendStatus(404);
  } else {
    if(status == '0' || status == 0){
      map.set(routeId, {status : status, location : 0, lat : 0, lng : 0, check : 0});
      res.sendStatus(200);
    } else {
        findLocation(routeId, lat, lng, (err, location)=>{
          if(err) {
            res.sendStatus(500);
            console.log(err);
            return;
          }
          if(location == 0 && map.get(routeId).check == 0){
            location = map.get(routeId).location + 1;
            map.set(routeId, {status : status, location : location, lat : lat, lng : lng, check : 1});
          } else if(location){
            map.set(routeId, {status : status, location : location, lat : lat, lng : lng, check : 0});
          } else {
            map.set(routeId, {status : status, location : map.get(routeId).location , lat : lat, lng : lng, check : 1});
          }
          res.sendStatus(200);
        });
    }
  }
});

// 현재 위치 띄워주기
router.get('/', (req,res)=>{
  let data = [];
  map.forEach((value, key)=>{
    data.push({routeId : key, status : map.get(key).status*1, location : map.get(key).location, lat : map.get(key).lat*1, lng : map.get(key).lng*1});
  });
  res.status(200).send(data);
});

module.exports = router;


function findLocation(routeId, vlat, vlng, callback){
  let sql = 'SELECT *, (6371*acos(cos(radians('+vlat+'))*cos(radians(lat))*cos(radians(lng)'+
	'-radians('+vlng+'))+sin(radians('+vlat+'))*sin(radians(lat))))'+
	'AS distance '+
  'FROM location WHERE routeId = \"'+routeId+'\" '+
  'HAVING distance <= 0.1 '+ // 0.1km => 100m반경 검색
  'ORDER BY distance';
  pool.getConnection(function(err, connection){
    if(err){
      callback("DB_CONNECTION_ERROR", null);
    }else {
      connection.query(sql, function(err, results){
        if(!err){
          if(results.length == 0) {
            callback(null, 0);
          } else {
            callback(null, results[0].num);
          }
        }
        else {
          console.log(err);
          callback("DB_QUERY_ERROR", null);
        }
      });
      connection.release();
    }
  });
}
