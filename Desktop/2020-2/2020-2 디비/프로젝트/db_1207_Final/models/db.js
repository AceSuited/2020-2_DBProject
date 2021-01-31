const db = {};
const Sequelize = require('sequelize');
const sequelize = new Sequelize(
    'team11', 'team11', '414614',{
        dialect: 'mariadb',
        host: '165.132.105.46',
        port: 3306
    });


db.tasks = require('./tasks.js')(sequelize,Sequelize);
db.accounts = require('./accounts.js')(sequelize, Sequelize);
var account = db.accounts.account;
var submitter = db.accounts.submitter;
var evaluator = db.accounts.evaluator;
var administrator = db.accounts.administrator;

account.hasOne(submitter,{foreignKey:'AccID_Submit', targetKey: 'AccID'});
account.hasOne(evaluator,{foreignKey:'AccID_Eval', targetKey: 'AccID'});
account.hasOne(administrator,{foreignKey:'AccID_Admin', targetKey: 'AccID'});
module.exports = db;
