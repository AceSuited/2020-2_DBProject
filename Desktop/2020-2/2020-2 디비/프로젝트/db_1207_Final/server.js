var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var path = require('path');


var session = require('express-session');
var FileStore = require('session-file-store')(session);

var fs = require("fs");
var dbs = require(__dirname + '/models/db');





app.set('views', [path.join(__dirname, 'views'),
                  path.join(__dirname, 'views/administrator/'), 
                  path.join(__dirname, 'views/evaluator/'),
                  path.join(__dirname, 'views/submitter/')]);
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);

var server = app.listen(3013, function(){
    console.log("Express server has started on port 3000");
});
var server = app.listen(3014, function(){
    console.log("Express server has started on port 3000");
});
var server = app.listen(3015, function(){
    console.log("Express server has started on port 3000");
});

app.use(express.static('public'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended : false}));
app.use(session({
    secret: '@#@$MYSIGN#@$#$',
    resave: false,
    saveUninitialized: true,
    store: new FileStore()
}));


var router = require('./router/main.js')(app,fs,dbs);




app.use("/evaluator", require('./router/evaluator.js'));
app.use("/submitter", require('./router/submitter.js'));
app.use("/administrator", require('./router/administrator.js'));
