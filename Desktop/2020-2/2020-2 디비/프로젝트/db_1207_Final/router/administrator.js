const session = require("express-session");
const accounts = require("../models/accounts");
const db = require("../lib/db");
const dbs = require("../models/db"); // sequelize db
const template = require("../lib/template");
var dateFormat = require('dateformat');
var util = require('util');
var mime = require('mime');
var path = require('path');
var getDownloadFilename = require('../lib/getDownloadFilename').getDownloadFilename;
var fs = require("fs");
var express = require("express")
var router = express.Router()

var role = "administrator";

router.get('/',function(req,res){
    var sess = req.session;
    /*세션정보확인*/
    var is_logined = sess.is_logined;
    sess.current_task = undefined;
    if(!is_logined){
        res.redirect('/login');
        return;
    }else if(sess.role != 'administrator'){
        res.redirect('/login');
        return;
    }
    
    var role = sess.role;
    
    res.render(`${role}/mainPage`,{
        title: "CrowdSourcing",
        AccID: sess.AccId,
        name: sess.name,
        role:sess.role
    });
    return;
    
});

router.get('/createTask', function(req,res){
    var sess = req.session;
    
    /*세션정보확인*/
    var is_logined = sess.is_logined;
    sess.current_task = undefined;
    if(!is_logined){
        res.redirect('/login');
        return;
    }else if(sess.role != 'administrator'){
        res.redirect('/login');
        return;
    }

    res.render(`${role}/createTask`,{
        title: "CrowdSourcing - 태스크 생성",
        AccID: sess.AccId,
        name: sess.name,
        role:sess.role
    });
    return;
})

router.post('/createTask_process', function(req,res){
    var sess = req.session;
    /*세션정보확인*/
    var is_logined = sess.is_logined;

    if(!is_logined){
        res.redirect('/login');
        return;
    }else if(sess.role != 'administrator'){
        res.redirect('/login');
        return;
    }

    var num = parseInt(req.body["NumAttributes"]);
   
    var td_attributes = {}
    for(var i=0; i < num; i++){   
        td_attributes[`attribute_${i}`] = req.body[`attribute_${i}`];
            }
    td_attributes[`pk_name`] = req.body["pk_name"];
    td_attributes[`TaskDataTableName`] = req.body["TaskDataTableName"];
    var temp = JSON.stringify(td_attributes);
    var result = {};

    
    db.query(`INSERT INTO task (TName, Explanation, Upload_Interval, TDT_SChema) VALUES (?,?,?,?);`,
            [req.body["TaskName"], req.body["TaskExplanation"], parseInt(req.body["MinmalTerm"]), temp], 
            function(err, data){
        if(err){throw err;}     
        
    });

    var og_attributes = {}
    for(var i = 0; i< num; i++){
        og_attributes[`OG_attribute_${i}`] = req.body[`OG_attribute_${i}`];

    }
    og_attributes[`og_pk_name`] = req.body["og_pk_name"];
    og_attributes[`OGDT_name`] = req.body["OGDT_name"];
     var temp = JSON.stringify(og_attributes);

    db.query(`INSERT INTO ogdatatype (TaskName, Og_Schema) VALUES (?,?);`,
            [req.body["TaskName"], temp], 
            function(err, data){
        if(err){throw err;}     
        
    });


 

    result["success"] = 1;
    result["message"] = "태스크 생성이 완료되었습니다."
    
   
    res.json(result);

      
})

router.post('/createTask_checkTaskName', function(req,res){
    var sess = req.session;
    /*세션정보확인*/
    var is_logined = sess.is_logined;

    if(!is_logined){
        res.redirect('/login');
        return;
    }else if(sess.role != 'administrator'){
        res.redirect('/login');
        return;
    }

    var name = req.body["name"]
    var result ={}
    db.query(`select TName from  task where TName = ?;`,[name], function(err, data){
        if(err){
            throw err;
        }

        if(data.length !== 0 ){
            result["duplicate"] = true;
            result["message"] = "중복된 태스크입니다.";
        }else{
            result["duplicate"] = false;
            result["message"] = "사용 가능한 태스크 이름입니다.";
        }
        

        res.json(result);
    });   
})

/* ------------------------- */
/* | 회원관리(신동윤) START | */
/* ------------------------- */
router.get('/member_mng', function(req, res){
    var sess = req.session;
    /*세션정보확인*/
    var is_logined = sess.is_logined;
    sess.current_task = undefined;
    if(!is_logined){
        res.redirect('/login');
        return;
    }else if(sess.role != 'administrator'){
        res.redirect('/login');
        return;
    }

    db.query('select * from account left join administrator on AccID=AccID_Admin left join evaluator on AccID=AccID_Eval left join submitter on AccID=AccID_Submit'
        , function(err, rows, fields){
        if(!err){
            // date format
            for(var i = 0; i < rows.length; i ++){
                rows[i]['DOB'] = dateFormat(rows[i]['DOB'], "yyyy-mm-dd");
            }

            db.query('select TName from task', function(err, tasks, fields){
                if(!err){
                    console.log(rows);
                    res.render(`${role}/member_mng`, {
                        title: "CrowdSourcing",
                        AccID: sess.AccId,
                        name: sess.name,
                        role:sess.role,
                        data: rows,
                        tasks: tasks
                    })
                }
                else{
                    console.log(err);
                }
            });

           
        }
        else{
            console.log(err);
        }

    });
});

router.post('/member_process', function(req, res){
    var sess = req.session;
    var is_logined = sess.is_logined;

    if(!is_logined){
        res.redirect('/login');
        return;
    }else if(sess.role != 'administrator'){
        res.redirect('/login');
        return;
    }
    
    var result = {};

    // id
    if(req.body['id'] != undefined){
        db.query(`select * from account left join administrator on AccID=AccID_Admin left join evaluator on AccID=AccID_Eval left join submitter on AccID=AccID_Submit where AccID=?`, req.body['id'],
        function(err, rows){
            if(!err){
                if(rows.length == 0){
                    result["success"] = false;
                    result["message"] = "검색 조건에 맞는 결과가 없습니다!";
                }else{
                    result["success"] = true;
                    result["search_result"] = rows[0];
                }
            }else{
                console.log(err);
            }
            res.json(result);
        })
    }

    // gender
    else if(req.body['gender'] != undefined){
        db.query(`select * from account left join administrator on AccID=AccID_Admin left join evaluator on AccID=AccID_Eval left join submitter on AccID=AccID_Submit where GENDER=?`, req.body['gender'],
        function(err, rows){
            if(!err){
                if(rows.length == 0){
                    result["success"] = false;
                    result["message"] = "검색 조건에 맞는 결과가 없습니다!";
                }else{
                    result["success"] = true;
                    result["search_result"] = rows[0];
                    console.log(result["search_result"]);
                }
            }else{
                console.log(err);
            }
            res.json(result);
        })
    }

    // age
    else if(req.body['age'] != undefined){
        // ~20s
        if(req.body['age'] == 20){
            db.query(`select * from account where DATE(DOB) >= '1991-01-01'`,
            function(err, rows){
                if(!err){
                    if(rows.length == 0){
                        result["success"] = false;
                        result["message"] = "검색 조건에 맞는 결과가 없습니다!";
                    }else{
                        result["success"] = true;
                        result["search_result"] = rows[0];
                        console.log(result["search_result"]);
                    }
                }else{
                    console.log(err);
                }
                res.json(result);
            })
        }
        // 30s
        else if(req.body['age'] == 30){
            db.query(`select * from account where DATE(DOB) BETWEEN '1981-01-01' AND '1990-12-31'`,
            function(err, rows){
                if(!err){
                    if(rows.length == 0){
                        result["success"] = false;
                        result["message"] = "검색 조건에 맞는 결과가 없습니다!";
                    }else{
                        result["success"] = true;
                        result["search_result"] = rows[0];
                        console.log(result["search_result"]);
                    }
                }else{
                    console.log(err);
                }
                res.json(result);
            })
        }
        // 40s~
        else if(req.body['age'] == 40){
            db.query(`select * from account where DATE(DOB) <= '1980-12-31'`,
            function(err, rows){
                if(!err){
                    if(rows.length == 0){
                        result["success"] = false;
                        result["message"] = "검색 조건에 맞는 결과가 없습니다!";
                    }else{
                        result["success"] = true;
                        result["search_result"] = rows[0];
                        console.log(result["search_result"]);
                    }
                }else{
                    console.log(err);
                }
                res.json(result);
            })
        }
    }

    // role
    else if(req.body['role'] != undefined){
        if(req.body['role'] == '관리자'){
            db.query(`select * from account natural join administrator where AccID=AccID_Admin`,
            function(err, rows){
                if(!err){
                    if(rows.length == 0){
                        result["success"] = false;
                        result["message"] = "검색 조건에 맞는 결과가 없습니다!";
                    }else{
                        result["success"] = true;
                        result["search_result"] = rows[0];
                        console.log(result["search_result"]);
                    }
                }else{
                    console.log(err);
                }
                res.json(result);
            })
        }
        else if(req.body['role'] == '제출자'){
            db.query(`select * from account natural join submitter where AccID=AccID_Submit`,
            function(err, rows){
                if(!err){
                    if(rows.length == 0){
                        result["success"] = false;
                        result["message"] = "검색 조건에 맞는 결과가 없습니다!";
                    }else{
                        result["success"] = true;
                        result["search_result"] = rows[0];
                        console.log(result["search_result"]);
                    }
                }else{
                    console.log(err);
                }
                res.json(result);
            })
        }else{
            db.query(`select * from account natural join evaluator where AccID=AccID_Eval`,
            function(err, rows){
                if(!err){
                    if(rows.length == 0){
                        result["success"] = false;
                        result["message"] = "검색 조건에 맞는 결과가 없습니다!";
                    }else{
                        result["success"] = true;
                        result["search_result"] = rows[0];
                        console.log(result["search_result"]);
                    }
                }else{
                    console.log(err);
                }
                res.json(result);
            })
        }
    }

    // task
    else if(req.body['task'] != undefined){
        db.query(`select * from participates where Task_Name=?`, req.body['task'],
        function(err, rows){
            if(!err){
                if(rows.length == 0){
                    result["success"] = false;
                    result["message"] = "검색 조건에 맞는 결과가 없습니다!";
                }else{
                    result["success"] = true;
                    result["search_result"] = rows[0];
                }
            }else{
                console.log(err);
            }
            res.json(result);
        })
    }
})

router.get('/member_result', function(req, res, next){
    var sess = req.session;
    /*세션정보확인*/
    var is_logined = sess.is_logined;

    if(!is_logined){
        res.redirect('/login');
        return;
    }else if(sess.role != 'administrator'){
        res.redirect('/login');
        return;
    }

    //console.log(req.query['id']);
    if(req.query['id'] != undefined){
        db.query(`select * from account left join administrator on AccID=AccID_Admin left join evaluator on AccID=AccID_Eval left join submitter on AccID=AccID_Submit where AccID=?`, req.query['id'],
        function(err, rows){
            if(!err){
                // date format
                for(var i = 0; i < rows.length; i ++){
                    rows[i]['DOB'] = dateFormat(rows[i]['DOB'], "yyyy-mm-dd");
                }

                res.render(`administrator/member_result`, {
                    title: "CrowdSourcing",
                    AccID: sess.AccId,
                    name: sess.name,
                    role:sess.role,
                    data: rows,
                    task: null
                })
            }
            else{
                console.log(err);
            }
        })
    }
    // gender
    else if(req.query['gender'] != undefined){
        db.query(`select * from account left join administrator on AccID=AccID_Admin left join evaluator on AccID=AccID_Eval left join submitter on AccID=AccID_Submit where Gender=?`, req.query['gender'],
        function(err, rows){
            if(!err){
                // date format
                for(var i = 0; i < rows.length; i ++){
                    rows[i]['DOB'] = dateFormat(rows[i]['DOB'], "yyyy-mm-dd");
                }

                res.render(`administrator/member_result`, {
                    title: "CrowdSourcing",
                    AccID: sess.AccId,
                    name: sess.name,
                    role:sess.role,
                    data: rows,
                    task: null
                })
            }
            else{
                console.log(err);
            }
        })
    }

    // age
    else if(req.query['age'] != undefined){
        if(req.query['age'] == '20s'){
            db.query(`select * from account left join administrator on AccID=AccID_Admin left join evaluator on AccID=AccID_Eval left join submitter on AccID=AccID_Submit where DATE(DOB) >= '1991-01-01'`,
            function(err, rows){
                if(!err){
                    // date format
                    for(var i = 0; i < rows.length; i ++){
                        rows[i]['DOB'] = dateFormat(rows[i]['DOB'], "yyyy-mm-dd");
                    }

                    res.render(`administrator/member_result`, {
                        title: "CrowdSourcing",
                        AccID: sess.AccId,
                        name: sess.name,
                        role:sess.role,
                        data: rows,
                        task: null
                    })
                }else{
                    console.log(err);
                }
            })
        }
        else if(req.query['age'] == '30s'){
            db.query(`select * from account left join administrator on AccID = AccID_Admin left join evaluator on AccID=AccID_Eval left join submitter on AccID=AccID_Submit where DATE(DOB) BETWEEN '1981-01-01' AND '1990-12-31'`,
            function(err, rows){
                if(!err){
                    // date format
                    for(var i = 0; i < rows.length; i ++){
                        rows[i]['DOB'] = dateFormat(rows[i]['DOB'], "yyyy-mm-dd");
                    }

                    res.render(`administrator/member_result`, {
                        title: "CrowdSourcing",
                        AccID: sess.AccId,
                        name: sess.name,
                        role:sess.role,
                        data: rows,
                        task: null
                    })
                }else{
                    console.log(err);
                }
            })
        }else if(req.query['age'] == '40s'){
            db.query(`select * from account left join administrator on AccID = AccID_Admin left join evaluator on AccID=AccID_Eval left join submitter on AccID=AccID_Submit where DATE(DOB) <= '1980-12-31'`,
            function(err, rows){
                if(!err){
                    // date format
                    for(var i = 0; i < rows.length; i ++){
                        rows[i]['DOB'] = dateFormat(rows[i]['DOB'], "yyyy-mm-dd");
                    }

                    res.render(`administrator/member_result`, {
                        title: "CrowdSourcing",
                        AccID: sess.AccId,
                        name: sess.name,
                        role:sess.role,
                        data: rows,
                        task: null
                    })
                }else{
                    console.log(err);
                }
            })
        }
    }

    //task
    else if(req.query['task'] != undefined){
        db.query(`select * from account left join submitter on AccID=AccID_Submit HAVING AccID_Submit=ANY(select Sub_ID from participates where Task_Name = ?)`, req.query['task'],
        function(err, rows){
            if(!err){
                // date format
                for(var i = 0; i < rows.length; i ++){
                    rows[i]['DOB'] = dateFormat(rows[i]['DOB'], "yyyy-mm-dd");
                }

                res.render(`administrator/member_result`, {
                    title: "CrowdSourcing",
                    AccID: sess.AccId,
                    name: sess.name,
                    role:sess.role,
                    data: rows,
                    task: req.query['task']
                })
            }
            else{
                console.log(err);
            }
        })
    }

    // role
    else{
        if(req.query['role'] == 'admin'){
            db.query(`select * from account natural join administrator where AccID=AccID_Admin`,
            function(err, rows){
                if(!err){
                    // date format
                    for(var i = 0; i < rows.length; i ++){
                        rows[i]['DOB'] = dateFormat(rows[i]['DOB'], "yyyy-mm-dd");
                    }

                    res.render(`administrator/member_result`, {
                        title: "CrowdSourcing",
                        AccID: sess.AccId,
                        name: sess.name,
                        role:sess.role,
                        data: rows,
                        task: null
                    })
                }else{
                    console.log(err);
                }
            })
        }
        else if(req.query['role'] == 'submit'){
            db.query(`select * from account natural join submitter where AccID=AccID_Submit`,
            function(err, rows){
                if(!err){
                    // date format
                    for(var i = 0; i < rows.length; i ++){
                        rows[i]['DOB'] = dateFormat(rows[i]['DOB'], "yyyy-mm-dd");
                    }

                    res.render(`administrator/member_result`, {
                        title: "CrowdSourcing",
                        AccID: sess.AccId,
                        name: sess.name,
                        role:sess.role,
                        data: rows,
                        task: null
                    })
                }else{
                    console.log(err);
                }
            })
        }else if(req.query['role'] == 'eval'){
            db.query(`select * from account natural join evaluator where AccID=AccID_Eval`,
            function(err, rows){
                if(!err){
                    // date format
                    for(var i = 0; i < rows.length; i ++){
                        rows[i]['DOB'] = dateFormat(rows[i]['DOB'], "yyyy-mm-dd");
                    }

                    res.render(`administrator/member_result`, {
                        title: "CrowdSourcing",
                        AccID: sess.AccId,
                        name: sess.name,
                        role:sess.role,
                        data: rows,
                        task: null
                    })
                }else{
                    console.log(err);
                }
            })
        }
    }

});

router.get('/member_detail', function(req, res){
    var sess = req.session;
    /*세션정보확인*/
    var is_logined = sess.is_logined;

    if(!is_logined){
        res.redirect('/login');
        return;
    }else if(sess.role != 'administrator'){
        res.redirect('/login');
        return;
    }

    var id = req.query['id'];
    db.query(`select * from account left join administrator on AccID=AccID_Admin left join evaluator on AccID=AccID_Eval left join submitter on AccID=AccID_Submit where AccID=?`,
    id,
    function(err, data){
        // date format
        data[0]['DOB'] = dateFormat(data[0]['DOB'], "yyyy-mm-dd");
        // 관리자일 때
        if(data[0]['AccID_Admin']!=undefined){
            res.render(`administrator/member_detail`, {
                title: "CrowdSourcing",
                AccID:  data[0]["AccID"],
                Name:  data[0]["Name"],
                Gender:  data[0]["Gender"],
                Phone:  data[0]["Phone_Number"],
                Address:  data[0]["Address"],
                DOB:  data[0]["DOB"],
                type: 'administrator'
            })
        }
        // 제출자일 때
        else if(data[0]['AccID_Submit']!=undefined){
            db.query(`select Task_Name from participates where Sub_ID=? AND Approved=1`, id,
            function(err, tasks){
                db.query(`select Task_Name from participates where Sub_ID=? AND Approved=0`, id, 
                function(err, not_tasks){
                    /* 수정 */
                    db.query(`SELECT COUNT(*) as numsubmit from odsequencefile where AccountID=?`, id, 
                    function(err, numSubmit){
                        db.query(`SELECT COUNT(*) as numpass from taskdatatable where Submitter_ID=?`, id,
                        function(err, numPass){
                            if(!err){
                                res.render(`administrator/member_detail`, {
                                    title: "CrowdSourcing",
                                    AccID:  data[0]["AccID"],
                                    Name:  data[0]["Name"],
                                    Gender:  data[0]["Gender"],
                                    Phone:  data[0]["Phone_Number"],
                                    Address:  data[0]["Address"],
                                    DOB:  data[0]["DOB"],
                                    type: 'submitter',
                                    tasks: tasks,
                                    not_tasks:not_tasks,
                                    numSubmit: numSubmit[0]['numsubmit'],
                                    numPass: numPass[0]['numpass']
                                })
                            }else{
                                console.log(err);
                            }
                        })
                    });
                });
            });
            
        }
        // 평가자일 때
        else if(data[0]['AccID_Eval']!=undefined){
            db.query(`select PDS_ID from evaluating where Evaluator_ID=?`, id,
            function(err, pds_ids){
                if(!err){
                    res.render(`administrator/member_detail`, {
                        title: "CrowdSourcing",
                        AccID:  data[0]["AccID"],
                        Name:  data[0]["Name"],
                        Gender:  data[0]["Gender"],
                        Phone:  data[0]["Phone_Number"],
                        Address:  data[0]["Address"],
                        DOB:  data[0]["DOB"],
                        type: 'evaluator',
                        pds_ids: pds_ids
                    })
                }
                else{
                    console.log(err);
                }
            })
            
        }
    })
    
    
});


router.get('/member_evaluator_detail', function(req,res){
    var sess = req.session;
    /*세션정보 확인*/
    var is_logined = sess.is_logined;
    if(!is_logined){
        res.redirect('/login');
        return;
    }else if(sess.role != 'administrator'){
        res.redirect('/login');
        return;
    }     
    var role = sess.role;
    var user_id = sess.AccID
    db.query(`SELECT Parsing_ID FROM evaluation_info WHERE Evaluator_ID = ?`,req.query['id'], function(error, result){
        if(result.length === 0){
            res.render('administrator/member_evaluator_detail', {
                title: `CrowdSourcing - ${role}`,
                AccID: sess.AccId,
                name: sess.name,
                role:sess.role,
                data:"",
                evaluator:req.query['id']
            })
        }
        else{
            var pd_id_list = []
            for(var i = 0; i < result.length; i++){
                pd_id_list[i] = result[i].Parsing_ID
            }
            var or_query = template.orquery("PD_ID", pd_id_list)
            db.query(`SELECT PD_ID, TaskName, Ogdata_ID, SubmitterId, TotalTuple, DuplicatedTuple, NullRatio FROM pdsequencefile WHERE ${or_query}`, function(error, result1){
                var task_name = result1[0].TaskName
                var result1_data = []
                result1_keys = Object.keys(result1[0])
                db.query(`SELECT TD_ID FROM task WHERE TName = '${task_name}'`, function(error, result2){
                    var td_id = result2[0].TD_ID
                    for(var i= 0; i < result1.length; i++){
                        result1_data[i] = []
                        for(var j = 0; j < result1_keys.length; j++){
                            if(result1_keys[j] === "TotalTuple"){
                                result1_data[i].push(i+1)
                            }
                            result1_data[i].push(result1[i][result1_keys[j]])
                        }
                    }
                    db.query(`SELECT QualityScore, P_NP FROM evaluation_info WHERE Evaluator_ID = '${user_id}'`, function(error, result3){
                        for(var i = 0; i < result3.length; i++){
                            result1_data[i].push(result3[i].QualityScore)
                            result1_data[i].push(result3[i].P_NP)
                            console.log(result3[i].QualityScore)
                            console.log(result3[i].P_NP)
                           
                        }
                        var data = template.eval_monitoring_td(result1_data)
                        console.log(data);
                        res.render('administrator/member_evaluator_detail', {
                            title: `CrowdSourcing - ${role}`,
                            AccID: sess.AccId,
                            name: sess.name,
                            role:sess.role,
                            data:data,
                            evaluator:req.query['id']
                        })
                    })
                })
            })
        }
    })
})


router.get('/member_submit_detail', function(req, res){
    var sess = req.session;
    /*세션정보 확인*/
    var is_logined = sess.is_logined;
    if(!is_logined){
        res.redirect('/login');
        return;
    }else if(sess.role != 'administrator'){
        res.redirect('/login');
        return;
    }     
    var role = sess.role;
    var user_id = sess.AccID
    
    var urlQuery = req.query['id'];
    var id = urlQuery.split('?')[0];
    var task = urlQuery.split('=')[1]

    db.query(`SELECT COUNT(*) as numsubmit from participates where Sub_ID=? AND Task_Name=?`, [id, task],
    function(err, numSubmit){
        if(!err){
            db.query(`SELECT COUNT(*) as numpass from taskdatatable left join task on task.td_id = taskdatatable.td_id where Submitter_ID=? AND TName=?`,
            [id, task],
            function(err, numPass){
                if(!err){
                    res.render(`administrator/member_submit_detail`, {
                        title: "CrowdSourcing",
                        AccID:  id,
                        numSubmit: numSubmit[0]['numsubmit'],
                        numPass: numPass[0]['numpass'],
                        taskName:task
                    })
                }else{
                    console.log(err);
                }
            })
        }
        else{
            console.log(err);
        }
    })
})
/* ------------------------- */
/* | 회원관리(신동윤)   END | */
/* ------------------------- */

/* 태스크통계 */
router.get('/task_summary', function(req,res, next){
    var sess = req.session;
    /*세션정보확인*/
    var is_logined = sess.is_logined;
    sess.current_task = undefined;
    if(!is_logined){
        res.redirect('/login');
        return;
    }else if(sess.role != 'administrator'){
        res.redirect('/login');
        return;
    }
    
    
    db.query(`SELECT TName FROM task;`, function(error, tasks){
        var list = template.list_for_admin(tasks)
        res.render('administrator/task_summary', {
            title: "CrowdSourcing",
            list: list
        })
    })
    
    return;
})

router.get('/task_summary_task', function(req,res,next){
    var sess = req.session;
    /*세션정보확인*/
    var is_logined = sess.is_logined;

    if(!is_logined){
        res.redirect('/login');
        return;
    }else if(sess.role != 'administrator'){
        res.redirect('/login');
        return;
    }
    console.log(req.query['id']);
    var query1 = "select DISTINCT Sub_ID from participates where Approved = 1 AND Task_Name= '" + String(req.query['id']) + "';";
    //var query2 = `select count(*) as pass_task from evaluation_info Where P_NP = "P" AND TaskD_ID = (select TD_ID from task where TName = '${req.query['id']}') group by TaskD_ID ;`;
    //var query3 = `select count(*) as task_submit from ODSEQUENCEFILE Where OGDT_ID in (select ID from OGDATATYPE Where TaskName = ${req.query['id']});`;
    //var query4 = `select count(*) as original_submit, OGDT_ID as original_ID, Og_Schema from ODSEQUENCEFILE join ogdatatype on ID = OGDT_ID Where OGDT_ID in (select ID from OGDATATYPE Where TaskName = "${req.query['id']}" group by OGDT_ID;`;
    //var query5 = `select count(*) as original_pass, OGDT_ID as original_ID, Og_Schema from ODSEQUENCEFILE join ogdatatype on ID = OGDT_ID left join evaluation_info on Parsing_ID = PDS_ID Where P_NP = "P" AND TaskD_ID = (select TD_ID from task where TName = "${req.query['id']}") group by OGDT_ID`;

    db.query(query1,
    function(err, rows){
        var list = template.list_for_admin_task_summary_submiter(rows)
        if(!err){
            db.query(`select count(*) as pass_task from evaluation_info Where P_NP = "P" AND TaskD_ID = (select TD_ID from task where TName = '` + String(req.query['id']) + `') group by TaskD_ID`,
            function(err, task_pass){
                if(!err){
                   // db.query(`select count(*) as task_submit from ODSEQUENCEFILE Where OGDT_ID in (select ID from OGDATATYPE Where TaskName = ${req.query['id']})`,
                    //function(err, task_submit){
                      //  if(!err){
                        //    db.query(`select count(*) as original_submit, OGDT_ID as original_ID, Og_Schema from ODSEQUENCEFILE join ogdatatype on ID = OGDT_ID Where OGDT_ID in (select ID from OGDATATYPE Where TaskName = "${req.query['id']}" group by OGDT_ID`,
                          //  function(err, original_submit){
                            //    if(!err){
                              //      db.query(`select count(*) as original_pass, OGDT_ID as original_ID, Og_Schema from ODSEQUENCEFILE join ogdatatype on ID = OGDT_ID left join evaluation_info on Parsing_ID = PDS_ID Where P_NP = "P" AND TaskD_ID = (select TD_ID from task where TName = "${req.query['id']}") group by OGDT_ID`,
                                //    function(err, original_pass){
                                  //      if(!err){
            res.render(`administrator/task_summary_task`, {
                title: "CrowdSourcing",
                AccID: sess.AccId,
                name: sess.name,
                role:sess.role,
                list: list,
                task_pass : task_pass,
                //task_submit : task_submit,
                //original_submit : original_submit,
                //original_pass : original_pass,
                task: String(req.query['id'])
            })
        }
        //else {
        //    console.log(err);
        //}})
        //}
        //else {
        //    console.log(err);
        //}})
        //}
        //else {
        //    console.log(err);
        //}})
        //}
        else {
            console.log(err);
        }})
        }
        else{
            console.log(err);
        }
    })

    return;
})

router.get('/task_summary_submitter', function(req,res){
    var sess = req.session;
    /*세션정보확인*/
    var is_logined = sess.is_logined;

    if(!is_logined){
        res.redirect('/login');
        return;
    }else if(sess.role != 'administrator'){
        res.redirect('/login');
        return;
    }


    db.query(`select DISTINCT Task_Name from participates where Sub_ID=? AND Approved = 1`, String(req.query['id_submitter']), function(error, tasks){
        var list = template.list_for_admin_2(tasks)
        res.render('administrator/task_summary_submitter', {
            title: "CrowdSourcing",
            list: list,
            id_submitter: String(req.query['id_submitter'])
        })
    })

    
    return;
})

router.post('/task_process', function(req, res){
    var sess = req.session;
    /*세션정보확인*/
    var is_logined = sess.is_logined;

    if(!is_logined){
        res.redirect('/login');
        return;
    }else if(sess.role != 'administrator'){
        res.redirect('/login');
        return;
    }

    var result = {};
       
    db.query(`select Sub_ID from participates where Task_Name=? AND Approved = 1`, String(req.body['id']),

        function(err, rows){
            
            if(!err){
                if(rows.length == 0){
                    result["success"] = false;
                    result["message"] = "잘못된 task 이름이거나 참여 중인 제출자가 없습니다!";
                }else{
                    result["success"] = true;
                    result["search_result"] = rows[0];

                }
            }else{
                console.log(err);
            }
            res.json(result);
            
        })


})

router.post('/task_summary_task_process', function(req, res){
    var sess = req.session;
    /*세션정보확인*/
    var is_logined = sess.is_logined;

    if(!is_logined){
        res.redirect('/login');
        return;
    }else if(sess.role != 'administrator'){
        res.redirect('/login');
        return;
    }
    
    var result = {};
       
    db.query(`select Task_Name from participates where Sub_ID=?`, String(req.body['id_submitter']),

        function(err, rows){
            
            if(!err){
                if(rows.length == 0){
                    result["success"] = false;
                    result["message"] = "잘못된 제출자 이름입니다!";
                }else{
                    result["success"] = true;
                    result["search_result"] = rows[0];
                }
            }else{
                console.log(err);
            }
            res.json(result);
            
        })


})

/* 태스크관리 */
router.get('/task_mng', function(req, res){
    var sess = req.session;
    /*세션정보확인*/
    var is_logined = sess.is_logined;
    sess.current_task = undefined;
    if(!is_logined){
        res.redirect('/login');
        return;
    }else if(sess.role != 'administrator'){
        res.redirect('/login');
        return;
    }

    db.query(`SELECT TName FROM task;`, function(error, tasks){
        var list = template.list_for_admin_task_mng(tasks)
        res.render(`administrator/task_mng`, {
            title: "CrowdSourcing - 태스크 관리",
            list: list
        })
    })
});
    

router.get('/task_mng_task', function(req,res,next){
    var sess = req.session;
    /*세션정보확인*/
    var is_logined = sess.is_logined;
    sess.current_task = String(req.query['id']);
    if(!is_logined){
        res.redirect('/login');
        return;
    }else if(sess.role != 'administrator'){
        res.redirect('/login');
        return;
    }

    var query = `select Explanation from task where TName = '${sess.current_task}'`
    
    db.query(query, function(err, dat){
        if(err){
            console.log(err);
            
           
        }else{
            if(dat.length == 0){
                dbs.tasks.task.findAll({
                    attributes: ['TName'],
                }).then((data) =>{
                
                res.render(`${role}/task_mng`,{
                    title: "CrowdSourcing - 태스크 관리",
                    AccID: sess.AccId,
                    name: sess.name,
                    role:sess.role,
                    data
                })
                return;
            });
            }else{
            temp = dat[0];
         
            res.render(`${role}/task_mng_funcList`,{
                title: "CrowdSourcing - 태스크 관리",
                AccID: sess.AccId,
                name: sess.name,
                role:sess.role,
                current_task: sess.current_task,
                explanation: temp["Explanation"]
                
            });
        }
            
        }
    })

    
    return;
})

router.post('/task_mng_submitter_list', function(req,res,next){
    var sess = req.session;
    /*세션정보확인*/
    var is_logined = sess.is_logined;
    var current_task = sess.current_task;
    if(!is_logined){
        res.redirect('/login');
        return;
    }else if(sess.role != 'administrator'){
        res.redirect('/login');
        return;
    }
    
    var query1 = `select Sub_ID, Approved  from participates where Task_Name= '` + current_task + `';`;
   
    var result = {};
    db.query(query1 ,
    function(err, rows){
        if(!err){
            if(rows.length != 0 ){
            result["data"] = (rows);
            result["success"] = true;
            result["message"] = "";
            
            
            }else{
                result["success"] = false;
                result["message"] = "참여자 정보가 없습니다.";
                
            }
        }else{
            console.log(err);
        }
        res.json(result);
        
    })
    
    
    
    return;
})

router.post('/task_mng_submitter_list_approve', function(req,res,next){
    var sess = req.session;
    var current_task = sess.current_task;
    var sub_id = req.body["Sub_ID"];
    var query1 = `update participates set Approved = 1 where Sub_ID = '${sub_id}' and Task_Name = '${current_task}'`;
    console.log(sub_id);
    var result = {};
    db.query(query1 ,
        function(err, rows){
            if(!err){
                result["data"] = (rows);
                result["success"] = true;
                result["message"] = "참가 승인 완료";
                
                
            }else{
                result["success"] = false;
                    result["message"] = "에러";
                console.log(err);
            }
            res.json(result);
            
        });
});

router.post('/task_mng_submitter_list_refuse', function(req,res,next){
    var sess = req.session;
    var current_task = sess.current_task;
    var sub_id = req.body["Sub_ID"];
    var query1 = `delete from participates where Sub_ID = '${sub_id}' and Task_Name = '${current_task}'`;
    console.log(sub_id);
    var result = {};
    db.query(query1 ,
        function(err, rows){
            if(!err){
                result["data"] = (rows);
                result["success"] = true;
                result["message"] = "참가 거절 완료";
                
                
            }else{
                result["success"] = false;
                result["message"] = "에러";
                console.log(err);
            }
            res.json(result);
            
        });
});

router.post('/task_mng_addOGDT', function(req,res){
    var sess = req.session;
    /*세션정보확인*/
    var is_logined = sess.is_logined;
    var current_task = sess.current_task;
    if(!is_logined){
        res.redirect('/login');
        return;
    }else if(sess.role != 'administrator'){
        res.redirect('/login');
        return;
    }

    result = {};
    var query = `select TDT_SChema from task where TName = '${current_task}'`;
    db.query(query, function(err, data){
        
        var schema = JSON.parse(data[0]["TDT_SChema"]);
       
        var numAttributes = Object.keys(schema).length - 2;
        var temp = [];
        var names = [];
        for(var i = 0; i < numAttributes; i++){
            temp.push(schema[`attribute_${i}`]);
        }
        for(var i = 0; i < numAttributes; i++){
            names.push(temp[i].name);
        }
        
        result.num = numAttributes;
        result.tdt_name = schema["TaskDataTableName"];
        result.attributeNames = names;
        result.container = schema;
        res.json(result);
    });
    
   

});

router.post('/task_mng_createOGDT', function(req,res){
    var sess = req.session;
    /*세션정보확인*/
    var is_logined = sess.is_logined;

    if(!is_logined){
        res.redirect('/login');
        return;
    }else if(sess.role != 'administrator'){
        res.redirect('/login');
        return;
    }

    var current_task = sess.current_task;
    
    
    var num = req.body["num"];
    var og_attributes = {}
    for(var i = 0; i< num; i++){
        og_attributes[`OG_attribute_${i}`] = req.body[`OG_attribute_${i}`];

    }
    og_attributes[`og_pk_name`] = req.body["og_pk_name"];
    og_attributes[`OGDT_name`] = req.body["OGDT_name"];
     var temp = JSON.stringify(og_attributes);

    db.query(`INSERT INTO ogdatatype (TaskName, Og_Schema) VALUES (?,?);`,
            [current_task, temp], 
            function(err, data){
        if(err){throw err;}     
        
    });


 

    result["success"] = 1;
    result["message"] = "원본데이터 타입이 완료되었습니다."
    
   
    res.json(result);

      
})

/* NEW 가이드라인 설정 */
router.put('/task_mng_guideline', function(req, res){
    var sess = req.session;
    /*세션정보확인*/
    var is_logined = sess.is_logined;
    

    var result ={};
    if(!is_logined){
        res.redirect('/login');
        return;
    }else if(sess.role != 'administrator'){
        res.redirect('/login');
        return;
    }

    var current_task = sess.current_task;
    if(req.body["guideline"] == ""){
        result["success"] = 0;
        result["message"] = "패스 기준 설정 지침을 입력해 주세요";
        return res.json(result);
    }
    dbs.tasks.task.update({Guideline: req.body["guideline"]}, {where: {TName: current_task }})
    .then((data) => {
       
        
        result["success"] = 1;
        result["message"] = "패스 기준 설정 지침이 입력되었습니다.";
        return res.json(result);
     });

})

router.get('/task_mng_default_guideline', function(req, res){
    var sess = req.session;
    /*세션정보확인*/
    var is_logined = sess.is_logined;
    
    var result ={};
    if(!is_logined){
        res.redirect('/login');
        return;
    }else if(sess.role != 'administrator'){
        res.redirect('/login');
        return;
    }

    var current_task = sess.current_task;
    
    dbs.tasks.task.findAll({
        attributes: ['Guideline'], 
        where: {TName: current_task }
    })
    .then((data) => {
       
        
        result.data = data;
        return res.json(result);
     });

})

router.get('/task_mng_tdt_download', function(req, res){
    var sess = req.session;
    var is_logined = sess.is_logined;
    
    
    if(!is_logined){
        res.redirect('/login');
        return;
    }
    var current_task = sess.current_task;

    var query1 = `SELECT TD_File FROM taskdatatable LEFT JOIN task ON task.TD_ID = taskdatatable.TD_ID WHERE task.TName = '${current_task}'`;
    db.query(query1, function(err, datas){
        if(err){
            console.log(err);
        }
     
        if(datas.length == 0){
        
            return res.send(`<script type="text/javascript">alert("아직까지 저장된 데이터가 없습니다!"); window.location.href = '/administrator/task_mng'</script>`);
        }
       
        var StringWrite = ""
        for(var p = 0; p < datas.length; p++){
            var temp = (datas[p].TD_File);
            var data = JSON.parse(temp);
           
            for(var i = 0; i < data.length; i++){
                var temp = JSON.stringify(data[i]);
                var index = temp.length -1
                temp = temp.substring(1,index);
                StringWrite += temp + `\n`;
                
            }
        }
        fs.writeFile(`./download/${current_task}.csv`, StringWrite, 'utf8', function(error){
            console.log("write complete");
            return res.redirect('/administrator/download');
        })
        
    });

})

router.get('/download', function(req, res){
    var sess = req.session;
    var is_logined = sess.is_logined;
    
    
    if(!is_logined){
        res.redirect('/login');
        return;
    }
    var current_task = sess.current_task;
    var upload_folder = "/home/team11/db_1205/download/";
    var file = upload_folder + current_task + '.csv'; // ex) /upload/files/sample.txt
    console.log(file);
  try {
    if (fs.existsSync(file)) { // 파일이 존재하는지 체크
      var filename = path.basename(file); // 파일 경로에서 파일명(확장자포함)만 추출
      var mimetype = mime.getType(file); // 파일의 타입(형식)을 가져옴
    
      res.setHeader('Content-disposition', 'attachment; filename=' + filename); // 다운받아질 파일명 설정
      res.setHeader('Content-type', mimetype); // 파일 형식 지정
    

      
      var filestream = fs.createReadStream(file);
      filestream.pipe(res);
    } else {
      res.send('해당 파일이 없습니다.');  
      return;
    }
  } catch (e) { // 에러 발생시
    console.log(e);
    res.send('파일을 다운로드하는 중에 에러가 발생하였습니다.');
    return;
  }

})

/*추가*/
router.get('/member_evaluator_detail', function(req,res){
    var sess = req.session;
    /*세션정보 확인*/
    var is_logined = sess.is_logined;
    if(!is_logined){
        res.redirect('/login');
        return;
    }else if(sess.role != 'administrator'){
        res.redirect('/login');
        return;
    }     
    var role = sess.role;
    var user_id = sess.AccID
    db.query(`SELECT Parsing_ID FROM evaluation_info WHERE Evaluator_ID = ?`,req.query['id'], function(error, result){
        if(result.length === 0){
            res.render('administrator/member_evaluator_detail', {
                title: `CrowdSourcing - ${role}`,
                AccID: sess.AccId,
                name: sess.name,
                role:sess.role,
                data:"",
                evaluator:req.query['id']
            })
        }
        else{
            var pd_id_list = []
            for(var i = 0; i < result.length; i++){
                pd_id_list[i] = result[i].Parsing_ID
            }
            var or_query = template.orquery("PD_ID", pd_id_list)
            db.query(`SELECT PD_ID, TaskName, Ogdata_ID, SubmitterId, TotalTuple, DuplicatedTuple, NullRatio FROM pdsequencefile WHERE ${or_query}`, function(error, result1){
                var task_name = result1[0].TaskName
                var result1_data = []
                result1_keys = Object.keys(result1[0])
                
                db.query(`SELECT TD_ID, Upload_Interval FROM task WHERE TName = '${task_name}'`, function(error, result2){
                    
                    var td_id = result2[0].TD_ID
                    //var upload = result2[0].Upload_Interval
                    for(var i= 0; i < result1.length; i++){
                        result1_data[i] = []
                        for(var j = 0; j < result1_keys.length; j++){
                            if(result1_keys[j] === "TotalTuple"){
                                var temp = []
                                temp.push(i+1)
                                result1_data[i].push(temp)
                            }
                            result1_data[i].push(result1[i][result1_keys[j]])
                        }
                    }
                   
                    db.query(`SELECT QualityScore, P_NP FROM evaluation_info WHERE Evaluator_ID = '${req.query['id']}`, function(error, result3){
                        console.log("^^")
                        console.log(result3)
                        for(var i = 0; i < result1_data.length; i++){
                            result1_data[i].push(result3[i].QualityScore)
                            result1_data[i].push(result3[i].P_NP)
                        }
                        console.log(result1_data[0])
                        var data = template.eval_monitoring_td(result1_data)
                        res.render('administrator/member_evaluator_detail', {
                            title: `dCrowdSourcing - ${role}`,
                            AccID: sess.AccId,
                            name: sess.name,
                            role:sess.role,
                            data:data,
                            evaluator:req.query['id']
                        })
                    })
                })
            })
        }
    })
})
/*추가*/

module.exports = router

