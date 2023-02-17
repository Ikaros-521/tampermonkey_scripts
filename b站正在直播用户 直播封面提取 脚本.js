// ==UserScript==
// @name         b站正在直播用户 直播封面提取 脚本
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  来到用户个人页，点击直播间旁边“下载封面”按钮即可
// @author       You
// @match        https://space.bilibili.com/*
// @grant        none
// @icon         http://bilibili.com/favicon.ico
// @license MIT
// ==/UserScript==
 
window.addEventListener('load', function() {
	var img_src = document.getElementsByClassName("i-live-cover")[0].src;
	var live_div = document.getElementsByClassName("i-live")[0];
	var btn = document.createElement("button");
	btn.innerText = "下载封面";
	btn.style.width = "100px";
	btn.style.height = "30px";
	btn.onclick = function() {
		window.open(img_src, '_blank');
	};
	
	live_div.appendChild(btn);
})