var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

router.get("/cool", function(req, res, next){
	res.send("你好酷");
});

module.exports = router;//最后导出 router（就可以导入 app.js 了）
