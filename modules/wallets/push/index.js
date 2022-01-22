'use strict'

const coroutine = require('coroutine');
const conn = require("./ios");
const androidPush = require('./android');

const ssl = require("ssl");
ssl.ca.loadRootCerts();

function update(devices, data) {

    /*数据格式:
    data:{
        alert:"这是一条消息",
        params:{}//message 主体
    }
    */
   
    let alert = data.alert;

    if (!devices.length) return;


    function apnsPUSH(device) {
        let params = data.params.extends;
        params.receive_account = data.params.receive_account;
        params.bigAction = data.params.bigAction;
        params.action = data.params.action;
        params.is_exec = data.params.is_exec;
        params.is_read = data.params.is_read;
        params.id = data.params.id;
        params.newcreatedAt = data.params.newcreatedAt;
        params.title = data.params.title;
        params.description = data.params.description;

		let payload = {
			"aps": {
                alert: {
                    "title": data.params.title,
                    "body": data.params.description,
                },
				"badge": data.params.description,
				"sound": "bingbong.aiff"
			},
			"msg": {
				"uid": device.uid,
				"params": params
			}
		};


		let retry = 5;
		let count = 1;
		while (true) {
			try {
				conn.push(device.deviceToken, device.appVersion, payload);
				break;
			} catch (e) {
				if (count > retry) {
					console.error(device.deviceToken, `apns 推送失败`);
					break;
				}
				if (count % 2 === 0) coroutine.sleep(200);
				console.warn(device.deviceToken, `retry ${count} time`);
				count++;
			}
		}
    }

    function androidPUSH(device) {
        androidPush(device, data.params)
    }

    coroutine.start(() => {
        devices.forEach(device => {
            if (!device.deviceToken) throw new Error('deviceToken is not exists');

            if (["iPhone OS", "IOS"].includes(device.name) && device.appVersion) {
				// ios
				apnsPUSH(device);
            }else if (["ANDROID"].includes(device.name) && device.appVersion) {
                // android
                androidPUSH(device);
            }
        })
    })
}

module.exports = update;