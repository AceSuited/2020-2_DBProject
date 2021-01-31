const session = require("express-session");
const accounts = require("../models/accounts");
const db = require("../lib/db");
var express = require("express")
var router = express.Router()
var template = require("../lib/template")



router.get('/',function(req,res){
    var sess = req.session;
    /*세션정보 확인*/
    var is_logined = sess.is_logined;
    if(!is_logined){
        res.redirect('/login');
        return;
    }else if(sess.role != 'evaluator'){
        res.redirect('/login');
        return;
    }
        
    var role = sess.role;
            
    res.render(`${role}/mainPage`,{
        title: `CrowdSourcing - ${role}`,
        AccID: sess.AccId,
        name: sess.name,
        role:sess.role
    });
    return;
    
});

router.get('/evaluate', function(req,res){
    var sess = req.session;
    /*세션정보 확인*/
    var is_logined = sess.is_logined;
    if(!is_logined){
        res.redirect('/login');
        return;
    }else if(sess.role != 'evaluator'){
        res.redirect('/login');
        return;
    }

    var role = sess.role;
    var ParsingDS_ID = 0;
    db.query('SELECT PDS_ID from evaluating WHERE Eval_Time = "1000-01-01 00:00:00" AND Evaluator_ID = ?', req.session.AccID, function(err, result){
        if (result.length == 0){
            res.render('evaluating', {
                title: `CrowdSourcing - ${role}`,
                AccID: sess.AccId,
                name: sess.name,
                role: sess.role,
                msg: '평가할 파싱 데이터 시퀀스 파일이 존재하지 않습니다.',
                pd_PD_File: []
            })
    
        }else{
            
            ParsingDS_ID = result[0].PDS_ID;
            console.log(ParsingDS_ID);
            db.query('SELECT PD_ID, SubmitterId, TaskName, TotalTuple, DuplicatedTuple, NullRatio,PD_File FROM pdsequencefile WHERE Evaluated = 0 AND PD_ID= ?', ParsingDS_ID, function(err, task){
                console.log(task);
                db.query('SELECT Guideline FROM task where TName =?', task[0].TaskName ,function(error, Guide){
                    res.render('evaluating', {
                        title: `CrowdSourcing - ${role}`,
                        AccID: sess.AccId,
                        name: sess.name,
                        role: sess.role,
                        msg: '아래 파싱 데이터 시퀀스 파일을 평가해주세요.',
                        pd_parsingID: task[0].PD_ID,
                        pd_SubmitterId: task[0].SubmitterId,
                        pd_TaskName: task[0].TaskName,
                        pd_TotalTuple: task[0].TotalTuple,
                        pd_DuplicatedTuple: task[0].DuplicatedTuple,
                        pd_NullRatio: task[0].NullRatio,
                        pd_PD_File: task[0].PD_File,
                        pd_Guide: Guide[0].Guideline
                    })
                })
            })   
        }
    })
})

router.post('/evaluating_process', function(req, res){
    var sess = req.session;
    var role = sess.role;
    var post = req.body;
    console.log(post);
    var PD_ID = post.PD_ID;
    var PNP = post.PNP;
    var Score = post.Score;
    if(PNP == 'approved'){
        PNP="P";
    }
    else{
        PNP ="N";
    }
    db.query('UPDATE evaluation_info SET Evaluation_Time = NOW(), QualityScore = ?, `P_NP` = ? WHERE Parsing_ID = ? and Evaluator_ID = ? and Evaluation_Time = "1000-01-01 00:00:00"', [Score, PNP, PD_ID, req.session.AccID], function(err, result1){
        db.query('UPDATE pdsequencefile SET Evaluated = ? WHERE PD_ID = ?', [1, PD_ID], function(err, result2){
            db.query('SELECT SubmitterId, TaskName,PD_File from pdsequencefile WHERE PD_ID = ?', PD_ID, function(err, result3){
                db.query('SELECT TD_ID FROM task WHERE TName =?', result3[0].TaskName, function(err, result4){
                    db.query('SELECT COUNT(*) FROM pdsequencefile WHERE SubmitterId =? and Evaluated = 1', result3[0].SubmitterId, function(err, result6){
                        var participateNum = result6[0]['COUNT(*)']
                        db.query('UPDATE submitter SET Evaluation = (Evaluation*?+?)/? WHERE AccID_Submit =?', [participateNum-1, Score, participateNum, result3[0].SubmitterId] ,function(err, result7){
                            if(PNP =='P'){
                                db.query('INSERT INTO taskdatatable(TD_ID, Submitter_ID, TD_File) values (?, ? ,?)', [result4[0].TD_ID, result3[0].SubmitterId, result3[0].PD_File], function(err, result5){
                                    var result0 = {};
                                    result0['Succ'] = 'True';
                                    result0['Msg'] = '평가가 완료되었습니다.';
                                    res.send(result0);
                                })
                            }else{
                                var result0 = {};
                                result0['Succ'] = 'True';
                                result0['Msg'] = '평가가 완료되었습니다.';
                                res.send(result0);
                            }
                        })
                    })
                })
            })
        })    
    })
})

router.get('/monitoring', function(req,res){
    var sess = req.session;
    /*세션정보 확인*/
    var is_logined = sess.is_logined;
    if(!is_logined){
        res.redirect('/login');
        return;
    }else if(sess.role != 'evaluator'){
        res.redirect('/login');
        return;
    }     
    var role = sess.role;
    var user_id = sess.AccID
    db.query(`SELECT Parsing_ID FROM evaluation_info WHERE Evaluator_ID = '${user_id}'`, function(error, result){
        if(result.length === 0){
            res.render('monitoring', {
                title: `CrowdSourcing - ${role}`,
                AccID: sess.AccId,
                name: sess.name,
                role:sess.role,
                data:""
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
                    //console.log(result1)
                    //console.log(result2)
                    var td_id = result2[0].TD_ID
                    
                    var upload = result2[0].Upload_Interval
                    for(var i= 0; i < result1.length; i++){
                        result1_data[i] = []
                    
                        for(var j = 0; j < result1_keys.length; j++){
                            if(result1_keys[j] === "TotalTuple"){
                                var temp = []
                                temp.push(i+1)
                                result1_data[i].push(temp)
                            }
                            result1_data[i].push(result1[i][result1_keys[j]])
                            //console.log(result1_data)
                        }
                    }
                    db.query(`SELECT QualityScore, P_NP FROM evaluation_info WHERE Evaluator_ID = '${user_id}'`, function(error, result3){
                        console.log(result3)
                        for(var i = 0; i < result3.length; i++){
                            result1_data[i].push(result3[i].QualityScore)
                            result1_data[i].push(result3[i].P_NP)
                        }
                        var data = template.eval_monitoring_td(result1_data)
                        res.render('monitoring', {
                            title: `CrowdSourcing - ${role}`,
                            AccID: sess.AccId,
                            name: sess.name,
                            role:sess.role,
                            data:data
                        })
                    })
                })
            })
        }
    })
})


module.exports = router