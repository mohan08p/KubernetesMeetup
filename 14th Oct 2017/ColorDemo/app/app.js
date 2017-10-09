var express = require('express');
var app = require();

var port = process.env.PORT || 8080;
var color = process.env.COLOR;
var router = express.Router();

router.get('/', function(req, res) {
    res.json({'color': color});
});

app.use('/', router);

app.listen(port);
console.log('Server Started at'+ port);