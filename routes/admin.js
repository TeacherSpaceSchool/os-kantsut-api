var express = require('express');
var router = express.Router();
const path = require('path');
let  dirname1 = __dirname.replace('\\routes', '')
dirname1 = dirname1.replace('/routes', '')
/* GET home page. */
router.get('/', function(req, res, next) {
    res.sendFile(path.join(dirname1, 'admin', 'index.html'));
});

module.exports = router;
