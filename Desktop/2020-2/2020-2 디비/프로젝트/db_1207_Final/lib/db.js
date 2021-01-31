var mysql = require('mysql');
var db = mysql.createConnection({
    host: '165.132.105.46',
    user: 'team11',
    password: '414614',
    database : 'team11',
    multipleStatements: true
  });
  db.connect();
  module.exports = db;