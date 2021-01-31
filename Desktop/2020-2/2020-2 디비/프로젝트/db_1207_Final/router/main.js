const session = require("express-session");
const accounts = require("../models/accounts");
const db = require("../models/db");

module.exports = function(app, fs, db)
{
    app.get('/',function(req,res){
        var sess = req.session;
        var is_logined = sess.is_logined;
        
            res.render('mainPage', {
                title: "CrowdSourcing",
                AccID: sess.AccID,
                name: sess.name,
                role : sess.role,
            });
            return;
        
      

    
    });

    app.get('/login', function(req,res){
        var sess = req.session;
        res.render("loginPage", {
          title: "CrowdSourcing",
       
         
        });
    });
    
    app.post('/login_process', function(req, res){

        var result = {};
        var post = req.body;
        
        var id_in = post.ID;
        var password_in = post.PASSWORD;

        var sess;
        sess = req.session;
        db.accounts.account.findAll({
            include:[
                {model: db.accounts.submitter, 
                 attributes: ['AccID_Submit']
                },
                {
                    model:db.accounts.evaluator,
                    attributes:['AccID_Eval']
                },
                {
                    model:db.accounts.administrator,
                    attributes: ['AccID_Admin']
                }
                ],
                where: {AccID : id_in}
        }).then((data)=>{
           
            if(data.length == 0){
                result["success"] = false;
                result["message"] =  "INVALID ID";
            }else if(password_in == data[0]["dataValues"]["Password"]){

               
                sess.is_logined = true;
                sess.AccID = data[0]["dataValues"]["AccID"];
                sess.name =  data[0]["dataValues"]["Name"];
                if(data[0]["dataValues"]["submitter"]){
                    sess.role = "submitter";
                    result["type"] = "submitter";
      
                }else if(data[0]["dataValues"]["evaluator"]){
                    sess.role = "evaluator";
                    result["type"] = "evaluator";
                }
                else if(data[0]["dataValues"]["administrator"]){
                    sess.role = "administrator";
                    result["type"] = "administrator";
                }
                sess.save();
                result["success"] = true;
                result["message"] =  "-";
            }else if(password_in !=  data[0]["dataValues"]["Password"]){
                result["success"] = false;
                result["message"] =  "INVALID PASSWORD";
                }
            
                res.json(result);
         
        })
       
 

    });

    app.get('/logout', function(req, res){
        req.session.destroy(function(err){
                  
            req.session;
           });
           
           res.redirect('/');
    });

    app.get('/personal_information', function(req, res){
        res.render('personal_information', {});
    });

    app.get('/join_gate', function(req, res){
        res.render('join_gate', {});
    });

    app.get('/join', function(req, res){
        res.render('join', {});
    });

    app.post('/ID_Check', function(req,res){
        var result = {  };
       

        db.accounts.account.findAll({
            attributes: ['AccID'],
            where: {AccID : req.body["ID"]}
        }).then((data) =>{
            if(data.length != 0 ){
                result["duplicate"] = true;
                result["message"] = "중복된 아이디입니다.";
            }else{
                result["duplicate"] = false;
                result["message"] = "사용 가능한 아이디입니다.";
            }
            
            res.json(result);
        });
       
    });

    app.post('/join_process', function(req, res){
        var result = {};
    
  
  
        db.accounts.account.create({
            AccID: req.body["ID"],
            Password: req.body["PASSWORD"],
            Name: req.body["NAME"],
            Gender: req.body["GENDER"],
            Address: req.body["ADDRESS"],
            DOB: req.body["BIRTHDATE"],
            Phone_Number: req.body["PHONENUMBER"]


        })
        console.log(req.body["ID"]);
        if(req.body["TYPE"] == "E"){

            db.accounts.evaluator.create({
                AccID_Eval: req.body["ID"]
            }).then((data) => {

                result["success"] = 1;
                result["message"] = "환영합니다   " + req.body["NAME"] + " 평가자님";
                return res.json(result);
            })
        }
        else if(req.body["TYPE"] == "S"){
            db.accounts.submitter.create({
                AccID_Submit: req.body["ID"]
            }).then((data) => {
                result["success"] = 1;
                result["message"] = "환영합니다   " + req.body["NAME"] + " 제출자님";
                return res.json(result);
            });
        }      

        
        
    });
     
    app.get('/userInfo', function(req, res){
        var sess = req.session;
        var ID = sess.AccID
        db.accounts.account.findAll({
            attributes: ['AccID', 'Password', 'Name', 'Gender', 'Phone_Number', 'Address', 'DOB'],
            where: {AccID : ID}
        }).then((data)=>{
            console.log(data[0]["dataValues"]["AccID"]);
            res.render('userInfo',{
                title: 'CrowdSourcing',
                AccID:  data[0]["dataValues"]["AccID"],
                Password:  data[0]["dataValues"]["Password"],
                Name:  data[0]["dataValues"]["Name"],
                Gender:  data[0]["dataValues"]["Gender"],
                Phone:  data[0]["dataValues"]["Phone_Number"],
                Address:  data[0]["dataValues"]["Address"],
                DOB:  data[0]["dataValues"]["DOB"],
                type: sess.role

            });
        })
       
        return;
    });
    
    app.get('/revise', function(req, res){
        var sess = req.session; 
        res.render('revise', {
            title: 'CrowdSourcing - 회원정보변경',
            type: sess.role
        });
        return;
    });
   
    app.put('/C_ID', function(req,res){
        var sess = req.session;
        var C_ID = req.body["C_ID"];
        var result = {}
        
        db.accounts.account.update({AccID: C_ID}, {where: {AccID: sess.AccID }})
        .then((data) => {
            sess.AccID = C_ID;
            sess.save();
            result["success"] = 1;
            result["message"] = "변경되었습니다";
            return res.json(result);
         });
    });

    app.put('/C_PASSWORD', function(req,res){
        
        var sess = req.session;
        var C_PASSWORD = req.body["C_PASSWORD"];
        var result = {}
        
        db.accounts.account.update({Password: C_PASSWORD}, {where: {AccID: sess.AccID }})
        .then((data) => {
            
            if(data[0] == 1){
            result["success"] = 1;
            result["message"] = "변경되었습니다";
            return res.json(result);
            }else{
                result["success"] = 0;
                result["message"] = "다시 입력해 주세요";
            }
         });
    });

    app.put('/C_NAME', function(req,res){
        
        var sess = req.session;
        var C_Item = req.body["C_NAME"];
        var result = {}
        
        db.accounts.account.update({Name: C_Item }, {where: {AccID: sess.AccID }})
        .then((data) => {
            sess.name = C_Item;
            sess.save();
            if(data[0] == 1){
            result["success"] = 1;
            result["message"] = "변경되었습니다";
            return res.json(result);
            }else{
                result["success"] = 0;
                result["message"] = "다시 입력해 주세요";
                return res.json(result);
            }
         });
    });

    app.put('/C_GENDER', function(req,res){
        
        var sess = req.session;
        var C_Item = req.body["C_GENDER"];
        var result = {}
        
        db.accounts.account.update({Gender: C_Item }, {where: {AccID: sess.AccID }})
        .then((data) => {
            if(data[0] == 1){
            result["success"] = 1;
            result["message"] = "변경되었습니다";
            return res.json(result);
            }else{
       
                result["success"] = 0;
                result["message"] = "다시 입력해 주세요";
                return res.json(result);
            }
         });
    });

    app.put('/C_ADDRESS', function(req,res){
        
        var sess = req.session;
        var C_Item = req.body["C_ADDRESS"];
        var result = {}
        console.log(C_Item);
        db.accounts.account.update({Address: C_Item }, {where: {AccID: sess.AccID }})
        .then((data) => {
            if(data[0] == 1){
            result["success"] = 1;
            result["message"] = "변경되었습니다";
            return res.json(result);
            }else{
       
                result["success"] = 0;
                result["message"] = "다시 입력해 주세요";
                return res.json(result);
            }
         });
    });

    app.put('/C_PHONENUMBER', function(req,res){
        
        var sess = req.session;
        var C_Item = req.body["C_PHONENUMBER"];
        var result = {}

        db.accounts.account.update({Phone_Number: C_Item }, {where: {AccID: sess.AccID }})
        .then((data) => {
            if(data[0] == 1){
            result["success"] = 1;
            result["message"] = "변경되었습니다";
            return res.json(result);
            }else{
       
                result["success"] = 0;
                result["message"] = "다시 입력해 주세요";
                return res.json(result);
            }
         });
    });

    app.put('/C_DOB', function(req,res){
        
        var sess = req.session;
        var C_Item = req.body["C_DOB"];
        var result = {}
   
        db.accounts.account.update({DOB: C_Item }, {where: {AccID: sess.AccID }})
        .then((data) => {
            if(data[0] == 1){
            result["success"] = 1;
            result["message"] = "변경되었습니다";
            return res.json(result);
            }else{
       
                result["success"] = 0;
                result["message"] = "다시 입력해 주세요";
                return res.json(result);
            }
         });
    });
    
    app.get('/deleteUser', function(req, res){
        var result = { };
        var sess = req.session;
        db.accounts.account.destroy({where:{AccID: sess.AccID}})
        .then((data)=>{
          
        });
        req.session.destroy(function(err){
            res.redirect("/");
           });
           return;
    });
    app.get('/done', function(req, res){
        var result = { };
        var sess = req.session;
        result["role"] = sess.role;
      
        res.json(result);
    })
}