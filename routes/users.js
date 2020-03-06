var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});
router.get('/draft/', function(req, res, next) {
  res.render('draft', { title: 'Express' });
});
module.exports = router;
