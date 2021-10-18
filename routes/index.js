var express = require('express');
var router = express.Router();
const path = require('path');
let dirname = __dirname.replace('\\routes', '')
dirname = dirname.replace('/routes', '')

/* GET home page. */
router.get('/', function(req, res, next) {
    res.sendFile(path.join(dirname, 'aclient', 'index.html'));

});

module.exports = router;
