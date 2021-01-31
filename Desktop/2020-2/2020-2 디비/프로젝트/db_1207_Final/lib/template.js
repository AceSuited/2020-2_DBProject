var bodyParser = require('body-parser')

module.exports = {
    submit_post:function(title, tname, select_schema){
        var code = `
        <!DOCTYPE html>

        <html lang="en">
        <link rel="stylesheet" href="/css/style.css">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${title}</title>
        </head>
            <body>
                <h1><a href="/submitter">Site</a></h1>
                <form action="/submitter/task/submit/${tname}/submit_process" method = post>
                    <h2>${tname} 로그 수집</h2>
                    <div>원본 데이터 타입 스키마 선택</div>
                    <p>${select_schema}</p>
                    <p>원본 데이터 시퀀스 파일 첨부 (csv)</p>
                    <p><input type="file" name="file"></p>
                    <p><div>회차</div></p>
                    <p><input type="text" name="nth" placeholder = "숫자를 입력해주세요"></p>
                    <p>기간</p>
                    <p><input type="date" name="start_date"> ~ <input type="date" name="end_date"></p>
                    <br>
                    <div><input type="submit" onclick = "submit_button()" value = "제출하기"></div>
                    <br>
                </form>
                <a href="/logout">로그아웃</a>
                <a href="/userInfo">내 계정</a>
            </body>
        </html>

        <script>
        function submit_button(){
        var message = "성공적으로 제출했습니다"
        alert("성공적으로 제출했습니다")
    }
        `
        return code
    },
    backtoMain:function(ID, role, name){
        return code = `
        <html>
        <head>
            <title>CrowdSourcing</title>
        </head>
        <body>
            <h1>Site</h1>


            <ul>
                Welcome To Site.
            </ul>
            
            <h2>Welcome! ( ${role}  ${name} 님)</h2>
            <a href="/logout">로그아웃 </a>
            <a href="/userInfo">   내 계정</a>
            <a href="/submitter/task">태스크</a>
        </body>
        </html>
        `
    },
        /*수정*/
        list_for_admin:function(items){
            if (items.length === 0){
                return '현재 열린 테스크가 없습니다.'
              }
            
            var list = '<ul>';
            var i = 0;
            while(i < items.length){
                list = list + `<li><a href = '/administrator/task_summary_task?id=${items[i].TName}' > ${items[i].TName}</a></li>`;
                i = i+1;
            }
            list = list+'</ul>';
            return list
        },
    
        list_for_admin_2:function(items){
            if (items.length === 0){
                return '현재 열린 테스크가 없습니다.'
              }
            
            var list = '<ul>';
            var i = 0;
            while(i < items.length){
                list = list + `<li><a href = '/administrator/task_summary_task?id=${items[i].Task_Name}' > ${items[i].Task_Name}</a></li>`;
                i = i+1;
            }
            list = list+'</ul>';
            return list
        },
    
        list_for_admin_task_mng:function(items){
            if (items.length === 0){
                return '현재 열린 테스크가 없습니다.'
              }
            
            var list = '<ul>';
            var i = 0;
            while(i < items.length){
                list = list + `<li><a href = '/administrator/task_mng_task?id=${items[i].TName}' > ${items[i].TName}</a></li>`;
                i = i+1;
            }
            list = list+'</ul>';
            return list
        },
    
        list_for_admin_task_summary_submiter:function(items){
            if (items.length === 0){
                return '참여중인 제출자가 없습니다.'
              }
            var list = '<ul>';
            var i = 0;
            console.log(items);
            while(i < items.length){
                list = list + `<li><a href = 'task_summary_submitter?id_submitter=${items[i].Sub_ID}' > ${items[i].Sub_ID}</a></li>`;
                i = i+1;
            }
            list = list+'</ul>';
            return list
        },
    /*수정*/

    list:function(items){
        var list = '<ul>';
        var i = 0;
        while(i < items.length){
            list = list + `<li><a href = "/submitter/task/submit/${items[i].Task_Name}">${items[i].Task_Name}</a></li>`;
            i = i+1;
        }
        list = list+'</ul>';
        return list
    },
    pick:function(items){
        var tag  = ''
        if(items.length === 0){
            return '아직 등록되지 않았습니다. 관리자에게 문의해보세요.'
        }
        else{
            tag+=`<option value='' style='display:none' selected disabled hidden></option>`
            for(i = 0; i < items.length; i++){
                var parsed = JSON.parse(items[i].Og_Schema)
                var name = parsed.OGDT_name
                tag+= `<option value="${name}">${name}</option>`
            }
            return `<select required name='options'>
            ${tag}
            </select>`
        }
      },
      list_status:function(items){
        var list = '<ul>';
        var i = 0;
        while(i < items.length){
            list = list + `<li><a href = "/submitter/status/${items[i].Task_Name}">${items[i].Task_Name}</a></li>`;
            i = i+1;
        }
        list = list+'</ul>';
        return list
    },
    status_main_table:function(items, id){
        if (items.length === 0){
          return '참여 중인 태스크가 없습니다.'
        }
        var table = '<table> <tbody> <tr> <td> 제출한 스키마 </td> <td> 제출한 파일 수</td> </tr>';
        var i = 0;
        while(i < items.length){
            db.query(`SELECT COUNT(*) FROM participates, odsequencefile WHERE odsequencefile.AccountID = '${id}' AND odsequencefile.AccountID = participates.Sub_ID AND participates.Task_Name = '${items[i].Task_Name}';`, function(error, count){
              table = table + `<tr>
                                <td><a href = "/submitter/task/status/${items[i].Task_Name}">${items[i].Task_Name}</a></td>
                                <td> ${count} </td>
                              </tr>`;
              i = i+1;

            })
        }
        table = table +'</tbody> </table>';
        return table
      },

      ogtype_table:function(tname, name, countlist){
          var table = '<table> <tbody> <tr> <td> 원본 데이터 타입 </td> <td> 제출 파일 수</td> <td> 저장된 파일 수 </td> </tr>';
          var i = 0;
          while(i < name.length){
                table = table + `<tr>
                                  <td> <a href = "/submitter/status/${tname}/${name[i]}"> ${name[i]} </td>
                                  <td> ${countlist[i]} </td>
                                  <td> 저장 된 파일 수 </td>
                                </tr>`;
                i = i+1;
          }
          table = table +'</tbody> </table>';
          return table
        },
        orquery: function(id_name, id_list){
            var result_string = ""
            for(var i = 0; i < id_list.length; i++){
                result_string = result_string + id_name + "=" + id_list[i]
                if(i != id_list.length - 1){
                    result_string += " OR "
                }
            }
            return result_string 
        },

        eval_monitoring_td: function(items_list){
            var result = ""
            for(var i = 0; i < items_list.length; i++){
                result+= "<tr>"
                for(var j = 0; j < items_list[i].length; j++){
                    result += "<td>"
                    result += items_list[i][j]
                    result += "</td>"
                }
                result+= "</tr>"
            }
            return result
        }
}