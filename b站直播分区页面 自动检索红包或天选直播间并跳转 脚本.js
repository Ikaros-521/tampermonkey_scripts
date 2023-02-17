// ==UserScript==
// @name         b站直播分区页面 自动检索红包/天选直播间并跳转 脚本
// @namespace    http://tampermonkey.net/
// @version      4.3
// @description  配合 b站直播自动抽红包脚本使用。来到直播分区页面，如：https://live.bilibili.com/p/eden/area-tags?parentAreaId=9&areaId=0 按“F1”或“F2”开始运行，按“F9”删除页面的直播封面（低调摸鱼）
// @author       Ikaros
// @match        https://live.bilibili.com/p/eden/area-tags*
// @grant        unsafeWindow
// @grant        GM_openInTab
// @grant        GM_getValue
// @grant        GM_setValue
// @icon         http://bilibili.com/favicon.ico
// @namespace    https://greasyfork.org/scripts/447595
// @license MIT
// ==/UserScript==

/*
使用说明:
    配合 b站直播自动抽红包脚本使用。
    来到直播分区页面，如：https://live.bilibili.com/p/eden/area-tags?parentAreaId=9&areaId=0
    点击筛选按钮运行 或 按“F1”或“F2”开始运行
*/

window.addEventListener('load', function () {
    // 分区id
    let area_id = 9;
    // 打开页面时间间隔
    let open_time = 3000;
    // 最大打开直播间数量
    let max_num = 5;
    // 请求传入页面的参数
    let page = 1;
    let key_flag = 0;
    // roomid数组
    let roomid_list = [];
    // 弹窗定时器
    let interval_alert_div = null;
    // 配置数据
    let red_packet_data_json = null;
    // 打开页面类型 0红包+天选 1红包 2天选
    let page_type = 1;
    // 自动循环运行定时器
    let loop_run_interval = null;
    // 自动循环时间间隔 毫秒,默认15分钟
    let loop_run_time = 15 * 60 * 1000;

    // 尝试获取
    try {
        red_packet_data_json = JSON.parse(GM_getValue("red_packet_data_json"));
        area_id = red_packet_data_json["area_id"]
        open_time = red_packet_data_json["open_time"]
        max_num = red_packet_data_json["max_num"]
    } catch {
        red_packet_data_json = {"area_id": area_id, "open_time": open_time, "max_num": max_num}
        GM_setValue("red_packet_data_json", JSON.stringify(red_packet_data_json))
    }

    // 生成弹窗div
    function init_alert_div() {
        var body = document.getElementsByTagName("body")[0];
        var alert_div = document.createElement("div");
        var alert_content_span = document.createElement("span");

        alert_div.id = "alert_div";
        alert_div.style.zIndex = "66666";
        alert_div.style.top = "1%";
        alert_div.style.left = "30%";
        alert_div.style.width = "500px";
        alert_div.style.height = "50px";
        alert_div.style.padding = "5px";
        alert_div.style.position = "fixed"
        alert_div.style.background = "#4a4a4aaa";
        alert_div.style.display = "none";
        alert_content_span.id = "alert_content_span";
        alert_content_span.style.width = "280px";
        alert_content_span.style.fontSize = "16px";
        alert_content_span.style.color = "white";
        // alert_content_span.style.backgroundColor = "#4a4a4aaa";
        alert_content_span.innerText = "";

        alert_div.appendChild(alert_content_span);
        body.appendChild(alert_div);
    }

    init_alert_div();

    // 显示弹出框 传入显示的内容content
    function show_alert(content, auto_hide = true) {
        // 清除旧的定时
        clearTimeout(interval_alert_div);

        var alert_div = document.getElementById("alert_div");
        var alert_content_span = document.getElementById("alert_content_span");
        alert_content_span.innerText = content;
        alert_div.style.display = "block";

        // console.log(auto_hide);
        if (auto_hide) {
            // console.log("自动隐藏")
            // 5s后自动隐藏弹窗div
            interval_alert_div = setTimeout(() => {
                alert_div.style.display = "none";
            }, 5000);
        }
    }

    // 在页面左侧插入一个配置使用框
    function init_config_div() {
        // 在页面左侧插入一个用户筛选框
        var body = document.getElementsByTagName("body")[0];
        var br1 = document.createElement("br");
        var br2 = document.createElement("br");
        var br3 = document.createElement("br");
        var br4 = document.createElement("br");
        var div = document.createElement("div");
        var show_hide_div = document.createElement("div");
        var search_div = document.createElement("div");
        var area_id_span = document.createElement("span");
        var area_id_input = document.createElement("input");
        var open_time_span = document.createElement("span");
        var open_time_input = document.createElement("input");
        var max_num_span = document.createElement("span");
        var max_num_input = document.createElement("input");
        var search = document.createElement("button");
        var search1 = document.createElement("button");
        var search2 = document.createElement("button");
        var loop_btn = document.createElement("button");
        var describe_span = document.createElement("span");

        div.style.position = "fixed";
        div.style.top = "10%";
        div.style.width = "300px";
        div.style.left = "10px";
        div.style.zIndex = "6666";
        div.style.background = "#4a4a4abb";
        show_hide_div.style.width = "180px";
        show_hide_div.style.fontSize = "18px";
        show_hide_div.style.background = "#ef8400";
        show_hide_div.style.textAlign = "center";
        show_hide_div.style.padding = "5px";
        show_hide_div.style.cursor = "pointer";
        show_hide_div.innerText = "红包/天选检索☚";
        show_hide_div.onclick = function () { show_hide(); };
        search_div.setAttribute("id", "search_div");
        search_div.style.display = "none";
        search_div.style.color = "#c7ff00";
        search_div.style.padding = "0px 0px 10px 10px";

        area_id_span.innerText = "分区ID";
        area_id_input.setAttribute("id", "area_id");
        area_id_input.value = red_packet_data_json["area_id"];
        area_id_input.style.margin = "10px";
        area_id_input.setAttribute("placeholder", "输入分区的id，比如虚拟区的就是9，一共有（1,2,3,5,6,9,10,11,13,300）");
        open_time_span.innerText = "打开页面间隔";
        open_time_input.setAttribute("id", "open_time");
        open_time_input.value = red_packet_data_json["open_time"];
        open_time_input.style.margin = "10px";
        open_time_input.setAttribute("placeholder", "输入打开页面间隔,默认3000毫秒");
        max_num_span.innerText = "页面最大数量";
        max_num_input.setAttribute("id", "max_num");
        max_num_input.value = red_packet_data_json["max_num"];
        max_num_input.style.margin = "10px";
        max_num_input.setAttribute("placeholder", "输入打开页面最大数量,默认5个");

        search.innerText = "筛选红包+天选";
        search.style.background = "#61d0ff";
        search.style.border = "1px solid";
        search.style.borderRadius = "3px";
        search.style.fontSize = "18px";
        search.style.width = "200px";
        search.style.margin = "5px 10px";
        search.style.padding = "5px";
        search.style.cursor = "pointer";
        search.onclick = function () { go(0); };

        search1.innerText = "筛选红包";
        search1.style.background = "#61d0ff";
        search1.style.border = "1px solid";
        search1.style.borderRadius = "3px";
        search1.style.fontSize = "18px";
        search1.style.width = "100px";
        search1.style.margin = "5px 10px";
        search1.style.padding = "5px";
        search1.style.cursor = "pointer";
        search1.onclick = function () { go(1); };

        search2.innerText = "筛选天选";
        search2.style.background = "#61d0ff";
        search2.style.border = "1px solid";
        search2.style.borderRadius = "3px";
        search2.style.fontSize = "18px";
        search2.style.width = "100px";
        search2.style.margin = "5px 10px";
        search2.style.padding = "5px";
        search2.style.cursor = "pointer";
        search2.onclick = function () { go(2); };

        loop_btn.innerText = "每隔15分钟，自动筛选";
        loop_btn.setAttribute("placeholder", "默认读取上一次的筛选模式，要改循环运行时间的话，请自行修改源码loop_run_time的值");
        loop_btn.style.background = "#61d0ff";
        loop_btn.style.border = "1px solid";
        loop_btn.style.borderRadius = "3px";
        loop_btn.style.fontSize = "16px";
        loop_btn.style.width = "250px";
        loop_btn.style.margin = "5px 10px";
        loop_btn.style.padding = "5px";
        loop_btn.style.cursor = "pointer";
        loop_btn.onclick = function () {
            console.log("清除旧定时器")
            clearInterval(loop_run_interval);

            console.log("开启定时任务，每隔" + loop_run_time / 1000 + "秒运行一次")
            show_alert("开启定时任务，每隔" + loop_run_time / 1000 + "秒运行一次")

            setTimeout(() => {
                go(page_type);
            }, 3000);
            
            loop_run_interval = setInterval(() => {
                go(page_type);
            }, loop_run_time);
        };

        describe_span.innerText = "自动运行默认读取上一次的筛选模式。\n要改循环运行时间的话，请自行修改源码loop_run_time的值\n自动模式注意页面总数，避免爆炸"
        describe_span.style.fontSize = "13px";

        div.appendChild(show_hide_div);
        div.appendChild(search_div);
        search_div.appendChild(area_id_span);
        search_div.appendChild(area_id_input);
        search_div.appendChild(br1);
        search_div.appendChild(open_time_span);
        search_div.appendChild(open_time_input);
        search_div.appendChild(br2);
        search_div.appendChild(max_num_span);
        search_div.appendChild(max_num_input);
        search_div.appendChild(search);
        search_div.appendChild(br3);
        search_div.appendChild(search1);
        search_div.appendChild(search2);
        search_div.appendChild(loop_btn);
        search_div.appendChild(br4);
        search_div.appendChild(describe_span);
        body.appendChild(div);
    }

    init_config_div();

    // 显示隐藏筛选框
    function show_hide() {
        var search_div = document.getElementById("search_div");
        if (search_div.style.display == "none") search_div.style.display = "block";
        else search_div.style.display = "none";
    }

    // 传递传递参数event
    function keydown(event) {
        // “112”为按键F1，可根据需要修改为其他
        if (event.keyCode == 112 || event.keyCode == 113) {
            if (key_flag == 0) {
                // 按下后执行的代码
                go(page_type);
            }
            key_flag = 1;
            for (var i = 0; i < 100000; i++);
        } else if (event.keyCode == 120) { // 按f9删除一些无用的图片
            if(window.location.href.startsWith("https://live.bilibili.com/p/eden/area-tags")) {
                var len = document.getElementsByClassName("Item_3ysKErMC").length;
                for(var j = 0; j < len; j++) {
                    document.getElementsByClassName("Item_3ysKErMC")[j].getElementsByClassName("bg-bright-filter")[0].style.display = "none"
                    document.getElementsByClassName("Item_2onI5dXq")[j].style.display = "none";
                }
                document.getElementsByClassName("link-navbar-ctnr")[0].remove();
                document.getElementById("area-tags").remove();
            }
        }
    }

    document.addEventListener("keydown", keydown);

    // 请求分区列表，获取分区直播用户信息 传入分区id 和 页数page
    async function get_live_list(area_id, page) {
        return new Promise(function (resolve, reject) {
            var url = "https://api.live.bilibili.com/xlive/web-interface/v1/second/getList?platform=web&parent_area_id=" + area_id + "&page=" + page
            var xhr = new XMLHttpRequest();
            xhr.withCredentials = true;
            xhr.open('GET', url, true);
            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        resolve(xhr.responseText);
                    } else {
                        reject(xhr.statusText);
                    }
                }
            };
            xhr.send();
        });
    }

    // 获取红包/天选 用户数据
    async function requestData(area_id) {
        try {
            const data = await get_live_list(area_id, page);
            // console.log(data);
            var json = JSON.parse(data);
            console.log(json);

            // 判断是否需要继续请求数据
            if (json["code"] != 0) {
                console.log("code!=0，请求结束");
                open_page();
                return;
            }

            // console.log('json["data"]["list"].length=' + json["data"]["list"].length)

            // 遍历列表数据
            for(let i = 0; i < json["data"]["list"].length; i++) {
                // console.log(json["data"]["list"][i]["pendant_info"])
                // 检查JSON对象是否有内容
                if (Object.keys(json["data"]["list"][i]["pendant_info"]).length > 0) {
                    // 有内容，解析pendent_id
                    for (var key in json["data"]["list"][i]["pendant_info"]) {
                        if (json["data"]["list"][i]["pendant_info"].hasOwnProperty(key)) {
                            var pendent_id = json["data"]["list"][i]["pendant_info"][key].pendent_id;
                            // console.log(pendent_id);
                            if(page_type == 0) {
                                // 检索id 是否是红包 或 天选
                                if(pendent_id == 1096 || pendent_id == 504) {
                                    // 直播房间号追加入list
                                    roomid_list.push(json["data"]["list"][i]["roomid"])
                                    break
                                }
                            } else if(page_type == 1) {
                                // 检索id 是否是红包
                                if(pendent_id == 1096) {
                                    // 直播房间号追加入list
                                    roomid_list.push(json["data"]["list"][i]["roomid"])
                                    break
                                }
                            } else if(page_type == 2) {
                                // 检索id 是否是天选
                                if(pendent_id == 504) {
                                    // 直播房间号追加入list
                                    roomid_list.push(json["data"]["list"][i]["roomid"])
                                    break
                                }
                            }
                        }
                    }
                }
            }

            // 去重
            roomid_list = roomid_list.filter((value, index) => roomid_list.indexOf(value) === index);

            // 已经检索到足够数量的直播间，结束
            if(roomid_list.length >= max_num) {
                console.log("已经检索到足够数量的直播间，结束");
                show_alert("已经检索到足够数量的直播间，结束");
                open_page();
                return;
            }

            // 单页数据不足20说明到底了
            if(json["data"]["list"].length < 20) {
                console.log("单页数据不足20，结束");
                show_alert("单页数据不足20，结束");
                open_page();
                return;
            }

            // 继续请求数据
            page++;
            setTimeout(() => {
                requestData(area_id, page);
            }, 200); 
        } catch (error) {
            console.log(error);
            open_page();
            return;
        }
    }

    // 打开页面
    function open_page() {
        for(let i = 0; i < roomid_list.length; i++) {
            if(i >= max_num) {
                return;
            }
            setTimeout(function() {
                console.log("i:" + i + " 跳转房间号：" + roomid_list[i])
                show_alert("i:" + i + " 跳转房间号：" + roomid_list[i])
                let url = "https://live.bilibili.com/" + roomid_list[i]
                // window.open(roomid_list[i]).getAttribute("href"))
                // active:true，新标签页获取页面焦点
                // setParent :true:新标签页面关闭后，焦点重新回到源页面
                GM_openInTab(url, { active: false, setParent :true});
            }, open_time * i)
        }
    }

    function go(type) {
        console.log("开始运行喵~检索此分区所有数据或检索到足够数量的直播间后，才会打开链接，请耐心等待~")
        show_alert("开始运行喵~检索此分区所有数据或检索到足够数量的直播间后，才会打开链接，请耐心等待~")
        
        page_type = type
        // 清空旧数据
        roomid_list = []

        let temp_area_id = document.getElementById("area_id").value
        let temp_open_time = document.getElementById("open_time").value
        let temp_max_num = document.getElementById("max_num").value
        
        try {
            if (temp_area_id.length != 0) {
                area_id = parseInt(temp_area_id)
            }
    
            if (temp_open_time.length != 0) {
                open_time = parseInt(temp_open_time)
            }
    
            if (temp_max_num.length != 0) {
                max_num = parseInt(temp_max_num)
            }
        } catch (error) {
            console.log(error);
            show_alert(error)
        }

        red_packet_data_json["area_id"] = area_id
        red_packet_data_json["open_time"] = open_time
        red_packet_data_json["max_num"] = max_num
        GM_setValue("red_packet_data_json", JSON.stringify(red_packet_data_json))
        console.log("保存配置到本地")
        show_alert("保存配置到本地")
        

        console.log("当前配置：分区ID=" + area_id + " 打开页面间隔=" + open_time + " 最大页面数=" + max_num)
        show_alert("当前配置：分区ID=" + area_id + " 打开页面间隔=" + open_time + " 最大页面数=" + max_num)

        // 开始请求数据
        requestData(area_id);
    }

})