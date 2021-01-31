const session = require("express-session");
const accounts = require("../models/accounts");
const db = require("../lib/db");
var express = require("express");
const template = require("../lib/template");
var router = express.Router()
const csv = require("csvtojson")
var multer = require('multer');
const fs = require('fs');
const { count } = require("console");
  

var upload = multer({
    dest: 'uploads/'
})

router.get('/',function(req,res){
    var sess = req.session;
    /*세션정보확인*/
    var is_logined = sess.is_logined;
    if(!is_logined){
        res.redirect('/login');
        return;
    }else if(sess.role != 'submitter'){
        res.redirect('/login');
        return;
    }
    /*세션정보확인*/
    
        
    var role = sess.role;
            
    res.render(`${role}/mainPage`,{
        title: "CrowdSourcing",
        AccID: sess.AccID,
        name: sess.name,
        role:sess.role
    });
    return;
});


router.post('/task/submit/:tname/submit_process', upload.single('file'), function(req, res){
    var sess = req.session
    var user_id = sess.AccID
    var role = sess.role
    var user_name = sess.name
    var post = req.body
    var task_name = post.tname
    var file = req.file
    var schema_name = post.options
    var reason = ""

    /*세션정보확인*/
    var is_logined = sess.is_logined;
    if(!is_logined){
        res.redirect('/login');
        return;
    }else if(sess.role != 'submitter'){
        res.redirect('/login');
        return;
    }
    /*세션정보확인*/

    csv()
    .fromFile(file.path)
    .then((jsonObj)=>{
        fs.unlink(file.path, function(err){
            if(err){
                throw err;
            }
            else{
                
                db.query(`SELECT TDT_Schema FROM task WHERE TName = '${task_name}'` , function(error, result){
                    var tdt_schema = JSON.parse(result[0].TDT_Schema)
                    var inner_json = []
                    var types = []
                    var constraints = []
                    var tdt_schema_keys = Object.keys(tdt_schema)
                    var tdt_attribute_keys = []
                    for(var i = 0; i < tdt_schema_keys.length; i++){
                        if(tdt_schema_keys[i] != "pk_name" && tdt_schema_keys[i] != "TaskDataTableName"){
                            tdt_attribute_keys.push(tdt_schema_keys[i])
                        }
                    }
                    for(var i = 0; i < tdt_attribute_keys.length; i++){
                        inner_json[i] = tdt_schema[tdt_attribute_keys[i]]
                    }
                    for(var i = 0; i < inner_json.length; i++){
                        types[i] = inner_json[i].type
                        if(inner_json[i].constraint != "not null" && inner_json[i].constraint != "unique" && inner_json[i].constraint != ""){
                            constraints[i] = "both"
                        }
                        else{
                            constraints[i] = inner_json[i].constraint
                        }
                    }
                    
                    db.query(`SELECT Og_Schema, ID FROM ogdatatype WHERE Og_Schema LIKE '%"OGDT_name":"${schema_name}"%'`, function(error, result1){
                        
                        
                        var string_json = JSON.stringify(jsonObj)
                        var json_data = jsonObj
                        var json_schema = JSON.parse(result1[0].Og_Schema)
                        var og_pk = json_schema['og_pk_name']
                        var ogtype_id = result1[0].ID
                        var data_columns = Object.keys(json_data[0])
                        var good_data = true
                        var schema_data_keys = []
                        var ogdt_columns = []
                        var mapping = []
                        for(var key in json_schema){
                            if(key != "OGDT_name" && key != "og_pk_name"){
                                schema_data_keys.push(key)
                            }
                        }

                        
                        for(var i = 0; i<schema_data_keys.length; i++){
                            var current_key = schema_data_keys[i]
                            ogdt_columns.push(json_schema[current_key].OG_name)
                            mapping.push(json_schema[current_key].TD_mapping_name)
                        }
                        if(ogdt_columns.length != data_columns.length){
                            good_data = false
                            reason = "열의 수가 맞지 않습니다." + `제출 파일의 열의 수 : ${data_columns.length} 원본데이터스키마의 열의 수 : ${ogdt_columns.length} \n (만일 계속 안된다면 새로운 엑셀 csv파일을 만들어 시도해주세요)`;
                        }
                        else{
                            for(var i = 0; i< ogdt_columns.length; i++){
                                if(!(data_columns.includes(ogdt_columns[i]))){
                                    good_data = false
                                    reason = `어떤 열의 제목이 맞지 않습니다.`
                                }
                            }
                        }
                        if(good_data){
                            var problem_occurred = false
                            for(var i = 0; i< json_data.length; i++){
                                var test_row = json_data[i]
                                if(problem_occurred){
                                    break;
                                }
                                for(var j = 0; j < data_columns.length; j++){
                                    var needed_type = types[j]
                                    var needed_constraint = constraints[j]
                                    var test_value = test_row[data_columns[j]]
                                    if(needed_type === "int"){
                                        if(isNaN(test_value) && test_value != ""){
                                            problem_occurred = true;
                                            good_data = false;
                                            reason = "맞지 않는 형식의 값이 있습니다"
                                            break
                                        }
                                    }
                                    else{
                                        if(!isNaN(test_value) && test_value != ""){
                                            problem_occurred = true
                                            good_data = false
                                            reason = "맞지 않는 형식의 값이 있습니다"
                                            break
                                        }
                                    }
                                    if(needed_constraint === "not null" || needed_constraint === "both"){
                                        if(test_value === ""){
                                            problem_occurred = true
                                            good_data = false
                                            reason = "빈칸으로 남겨두면 안 되는 열에 빈칸이 있습니다."
                                            break
                                        }
                                    }
                                }
                            }
                            if(good_data){
                                var unique_column = []
                                for(var i = 0; i < constraints.length; i++){
                                    if(constraints[i] === 'unique' || constraints[i] === 'both'){
                                        unique_column.push(data_columns[i])
                                    }
                                }
                                for(var i = 0; i < unique_column.length; i++){
                                    var seen = []
                                    if(problem_occurred){
                                        break
                                    }
                                    for(var j = 0; j < json_data.length; j++){
                                        var test_value = json_data[j][unique_column[i]]
                                        if(seen.includes(test_value)){
                                            problem_occurred = true
                                            good_data = false
                                            reason = "중복되면 안 되는 열에 중복된 값이 있습니다"
                                            break
                                        }
                                        seen.push(test_value)
                                    }
                                }
                            }
                        }
                        if(good_data){
                            var total_tuples = json_data.length
                            var duplicate_count = 0;
                            var seen_data = []
                            var change_pk_data = []
                            var null_ratio = []
                            var null_ratio_string = ''
                            for(var i = 0; i< total_tuples; i++){
                                change_pk_data.push(json_data[i])
                                change_pk_data[i][og_pk] = '1'
                            }
                            for(var i = 0; i<total_tuples; i++){
                                var to_check = JSON.stringify(change_pk_data[i])
                                if(seen_data.includes(to_check)){
                                    duplicate_count++
                                }
                                seen_data.push(to_check)
                            }
                            for(var i = 0; i < data_columns.length; i++){
                                var null_count = 0
                                for(var j = 0; j < total_tuples; j++){
                                    if(json_data[j][data_columns[i]] === ''){
                                        
                                        null_count++
                                    }
                                }
                                null_ratio[i] = (null_count/total_tuples).toFixed(2)
                            }
                            null_ratio_string += '{'
                            for(var i = 0; i < mapping.length; i++){
                                null_ratio_string += '"' + mapping[i] + '":' + null_ratio[i]
                                if(i != mapping.length - 1){
                                    null_ratio_string += ','
                                }
                            }
                            null_ratio_string += '}'
                            null_ratio_string = null_ratio_string.replace("'", "")
                            var parsed_data = json_data
                            for(var i = 0; i < total_tuples; i++){
                                for(var j = 0; j < data_columns.length; j++){
                                    parsed_data[i][mapping[j]] = parsed_data[i][data_columns[j]]
                                    delete parsed_data[i][data_columns[j]]
                                }
                            }
                            var string_parsed_data = JSON.stringify(parsed_data)
                            db.query(`ALTER TABLE odsequencefile AUTO_INCREMENT = 1;`, function(error, result2){
                                db.query(`INSERT INTO odsequencefile (AccountID, OGDT_ID,OD_FILE) VALUES ('${user_id}', ${ogtype_id},'${string_json}');`, function(error, result3){
                                    db.query(`SELECT COUNT(*) AS CNT FROM pdsequencefile`, function(error, result4){
                                        pd_count = result4[0].CNT
                                        pd_id = pd_count + 1
                                        db.query(`INSERT INTO pdsequencefile (PD_ID, SubmitterId, TaskName, Ogdata_Id, TotalTuple, DuplicatedTuple, NullRatio, Evaluated, PD_FILE) VALUES (${pd_id},'${user_id}','${task_name}', ${ogtype_id}, ${total_tuples}, ${duplicate_count}, '${null_ratio_string}', '0','${string_parsed_data}');`, function(error, result5){
                                           db.query(`SELECT AccID_Eval FROM evaluator ORDER BY RAND() LIMIT 1`, function(err, result10){
                                                var random = result10[0].AccID_Eval
                                                var date = "1000-01-01 00:00:00"
                                                db.query(`SELECT TD_ID FROM task WHERE TName=?`, [task_name], function(error, result8){
                                                    var TaskD_ID = result8[0].TD_ID
                                                    db.query(`INSERT INTO evaluation_info values( ?, ?, ?, -1, "N", ?)`, [pd_id, random, date, TaskD_ID ], function(err, result9){
                                                        if(error) {console.log(result9)}
                                                        console.log(result9);
                                                        console.log(pd_id)
                                                        console.log(random)
                                                        console.log(date)
                                                        console.log(TaskD_ID)
                                                        
                                                        db.query(`INSERT INTO evaluating VALUES (?, ?, ?)`, [random, pd_id, date], function(error, result7){
                                                            
                                                            res.render('after_submit',{
                                                                title: 'CrowdSourcing',
                                                                errormessage: '성공적으로 제출했습니다.',
                                                                AccID: user_id,
                                                                role: role,
                                                                name: user_name
                                                            })
                                                        })
                                                        
                                                    })
                                                })
                                                    
                                             
                                           })
                                        })
                                    })
                                })
                            })
                        }
                        else{
                            res.render('after_submit',{
                                title: 'CrowdSourcing',
                                errormessage: '제출에 실패 했습니다. 제출 형식에 맞는 파일을 업로드 해주세요' + '\n\n  ***사유: ' + reason + '***',
                                AccID: user_id,
                                role: role,
                                name: user_name
                            })
                        }
                    })
                })
            }
        })
    })
})

router.get('/task', function(req,res){
    var sess = req.session
    /*세션정보확인*/
    var is_logined = sess.is_logined;
    if(!is_logined){
        res.redirect('/login');
        return;
    }else if(sess.role != 'submitter'){
        res.redirect('/login');
        return;
    }
    /*세션정보확인*/
    res.render('task', {
        title: "Task"
    })
})



router.get('/task/submit/:tname', function(req, res){
    var sess = req.session
    var user_id = sess.AccID
    var tname = req.params.tname
    /*세션정보확인*/
    var is_logined = sess.is_logined;
    if(!is_logined){
        res.redirect('/login');
        return;
    }else if(sess.role != 'submitter'){
        res.redirect('/login');
        return;
    }
    /*세션정보확인*/
    db.query(`SELECT Og_Schema FROM participates, task, ogdatatype WHERE participates.Sub_ID = '${user_id}' AND task.TName = '${tname}' AND task.TName = participates.Task_Name AND participates.Task_Name = ogdatatype.TaskName;`, function(error, schema){
        var select_button = template.pick(schema)
        var title = "Submission Form"
        var code = template.submit_post(title, tname, select_button)
        var select = template.pick(schema)
        res.render('submit', {
            title:title,
            tname:tname,
            select:select
        })
    })
})


router.get('/task/submit', function(req, res){
    var sess = req.session
    var user_id = req.session.AccID
    /*세션정보확인*/
    var is_logined = sess.is_logined;
    if(!is_logined){
        res.redirect('/login');
        return;
    }else if(sess.role != 'submitter'){
        res.redirect('/login');
        return;
    }
    /*세션정보확인*/
    db.query(`SELECT distinct Task_Name FROM participates WHERE Sub_ID = '${user_id}' AND Approved = 1;`, function(error, tasks){
        var list = template.list(tasks)
        res.render('choose', {
            title: "Submit a task",
            list: list
        })
    })
})


router.get(`/task/participate`,function(req,res){
    var sess = req.session;
    /*세션정보확인*/
    var is_logined = sess.is_logined;
    if(!is_logined){
        res.redirect('/login');
        return;
    }else if(sess.role != 'submitter'){
        res.redirect('/login');
        return;
    }
    /*세션정보확인*/
    var role = sess.role;
    db.query(`SELECT Task_Name FROM participates WHERE Sub_ID =?`, req.session.AccID , function(error,tasks){
        
        if(tasks.length == 0){
            db.query(`SELECT TName FROM task`, function(error,result){
                res.render(`${role}/participate`,{
                    title: "CrowdSourcing",
                    AccID: sess.AccId,
                    name: sess.name,
                    role: sess.role,
                    task: result
                });
            })
        }
        else{
            db.query(`SELECT TName FROM task where TName NOT IN (SELECT Task_Name FROM participates WHERE Sub_ID =?)`, req.session.AccID, function(error,result){
    
                res.render(`${role}/participate`,{
                    title: "CrowdSourcing",
                    AccID: sess.AccId,
                    name: sess.name,
                    role: sess.role,
                    task: result
                });
            })
        }
        return;
    })
    
});

router.post(`/task/agree`,function(req,res){
    var sess = req.session;
    /*세션정보확인*/
    var is_logined = sess.is_logined;
    if(!is_logined){
        res.redirect('/login');
        return;
    }else if(sess.role != 'submitter'){
        res.redirect('/login');
        return;
    }
    /*세션정보확인*/

    var post = req.body;
    var taskName = req.body.TaskName;
    console.log(`INSERT INTO participates VALUES (?, ${taskName}, 0)`);
    
    db.query(`INSERT INTO participates VALUES (?,?,0)`,[req.session.AccID, taskName], function(error,tasks){
        var result = {};
        result['Succ'] = 'True';
        result['Msg'] = '참여 신청이 완료되었습니다.';
        res.send(result);
    })
});



router.get('/status', function(req, res){
    var sess = req.session
    /*세션정보확인*/
    var is_logined = sess.is_logined;
    if(!is_logined){
        res.redirect('/login');
        return;
    }else if(sess.role != 'submitter'){
        res.redirect('/login');
        return;
    }
    /*세션정보확인*/
    var user_id = req.session.AccID
    db.query(`SELECT distinct Task_Name FROM participates WHERE Sub_ID = '${user_id}';`, function(error, tasks){
        var list = template.list_status(tasks)
        res.render('choose_status', {
            title: "Submit_status",
            list: list
        })
    })
})


router.get('/status/:tname', function(req, res){
    var sess = req.session
    /*세션정보확인*/
    var is_logined = sess.is_logined;
    if(!is_logined){
        res.redirect('/login');
        return;
    }else if(sess.role != 'submitter'){
        res.redirect('/login');
        return;
    }
    /*세션정보확인*/
    var user_id = sess.AccID
    var tname = req.params.tname
    var original_name = []
    var query1 = `select count(*) as filecount, ID as original_ID, Og_Schema as og_schema from ogdatatype Where ID in (select OGDT_ID from odsequencefile Where AccountID = '${user_id}' AND ogdatatype.TaskName = '${tname}') group by ID ORDER BY ID ASC`;
    var query2 = `select count(*) as original_pass, OGDT_ID as original_ID from ODSEQUENCEFILE left join Evaluation_Info on Parsing_ID = PDS_ID Where P_NP = "P" AND TaskD_ID = (select TD_ID from task where TName ='${tname}') group by OGDT_ID ORDER BY OGDT_ID ASC`;
    db.query(query1, function(error, result){
        console.log(result)
        db.query(query2, function(error, result1){
            console.log(result1)
            if(!error){
                for (var i = 0; i < result[0].length; i++){
                  var current_schema = JSON.parse(result[0][i].og_schema);
                  for (var key in current_schema){
                    if (key == "OGDT_name"){
                      original_name.push(current_schema[key]);
                    }
                  }
                }
                res.render('task_status', {
                  title:"task_status",
                  original_submit: result1,
                  original_pass: result,
                  task: tname,
                  namelist: original_name
                })
              }
              else{
                console.log(err);
              }
        })
    })/*
    db.query(query1 + query2,
    function(err, result){
      if(!err){
        for (var i = 0; i < result[0].length; i++){
          var current_schema = JSON.parse(result[0][i].og_schema);
          for (var key in current_schema){
            if (key == "OGDT_name"){
              original_name.push(current_schema[key]);
            }
          }
        }
        res.render('task_status', {
          title:"task_status",
          original_submit: result[0],
          original_pass: result[1],
          task: tname,
          namelist: original_name
        })
      }
      else{
        console.log(err);
      }
    })*/
});



router.get('/status/:tname/:ogdataid', function(req, res){
    var sess = req.session
    /*세션정보확인*/
    var is_logined = sess.is_logined;
    if(!is_logined){
        res.redirect('/login');
        return;
    }else if(sess.role != 'submitter'){
        res.redirect('/login');
        return;
    }
    /*세션정보확인*/
    var user_id = sess.AccID
    var tname = req.params.tname
    var od_id = req.params.ogdataid

    db.query(`select Parsing_ID as P_ID, P_NP as PNP from Evaluation_info left join on odsequencefile on Parsing_ID = PDS_ID Where OGDT_ID = '${od_id}' AND AccountID = '${user_id}'ORDER BY Parsing_ID ASC`,
    function(err, result1){
      if(!err){
        res.render('pd_status', {
          title:"parsed_status",
          parsed: result1,
          task: tname
        })
      }
      else{
        console.log(err);
      }
    })
    return;
})

/*
router.get('/status/:tname', function(req, res){
    var sess = req.session
    var user_id = sess.AccID
    var tname = req.params.tname
    db.query(`SELECT Og_Schema, ID from ogdatatype, odsequencefile WHERE ogdatatype.TaskName = '${tname}' AND ID = OGDT_ID AND AccountID = '${user_id}';`, function(error, result){
      var ogdatatype_id = []
      var ogdt_name = []
      var ogdt_schema = []
      var countlist = []
      console.log(result)
      for (var i = 0; i < result.length; i++){
        db.query(`SELECT COUNT(*) FROM odsequencefile WHERE OGDT_ID = ${result[i].ID};`, function(error, count){
          countlist.push(count)
          console.log(result[i])
          console.log(i)
          var current_schema = JSON.parse(result[i].Og_Schema)
          ogdatatype_id.push(result[i].ID)
          ogdt_schema.push(current_schema)
          for (var key in current_schema){
            if (key == "OGDT_name"){
              ogdt_name.push(current_schema[key])
            }
          }
        })
    }
    var table = template.ogtype_table(tname, ogdt_name, countlist);
    res.render('status', {
        title:`${tname} status`,
        task_name: tname,
        table : table
      })
  })
})

*/
module.exports = router