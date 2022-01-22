"use strict";

const Pool = require("fib-pool");
const Connection = require('./connection');
let CONFIG = require("../../config");
const PUSHConn = {};
const iospush = CONFIG.iospush;

module.exports = {
	push: (deviceToken, appVersion, payload) => {
		if (!PUSHConn[appVersion]) {
			PUSHConn[appVersion] = Pool({
				create: () => {
					const url = iospush;
					return new Connection({
						production: appVersion,
						cert: __dirname + "/cert_wallet_debug/cert.pem",
						key: __dirname + "/cert_wallet_debug/key.pem"
					}, url);
				},
				maxsize: 10
			});
		}

		// payload.aps.alert = Emoji.fromTxtEmoji(payload.aps.alert);
		PUSHConn[appVersion](conn => {
			conn.pushNotification(deviceToken, payload);
			console.log("send ok:", deviceToken, payload);
		});
	},
	feedback: appVersion => {
		const pool = Pool({
			create: () => {
				const url = "ssl://feedback.push.apple.com";
				return new Connection({
					production: appVersion
				}, url);
			},
			maxsize: 1
		});

		return pool(conn => conn.feedback());
	},
	clear: appVersion => {
		if (!PUSHConn[appVersion]) {
			console.log("当前不存在ssl连接");
			return;
		}

		console.log("ssl连接关闭成功");
		PUSHConn[appVersion].clear();
	}
};