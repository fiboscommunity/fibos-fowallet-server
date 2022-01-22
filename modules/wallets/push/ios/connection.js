"use strict";

const util = require("util");
const ssl = require("ssl");
const crypto = require("crypto");
const coroutine = require("coroutine");
const SSL_TIME_OUT = 20 * 1000;

const notification = {
	identifier: 0,
	expire: 0,
	priority: 10,
	encoding: "utf8"
};

function socket(options, url) {
	const cert = crypto.loadCert(options.cert),
		key = crypto.loadPKey(options.key, "");

	// 加载自带的缺省根证书
	ssl.ca.loadRootCerts();
	ssl.max_version = ssl.tls1_1;
	ssl.setClientCert(cert, key);

	return ssl.connect(url, SSL_TIME_OUT);
}

function Connection(options, url) {
	if ((this instanceof Connection) === false) {
		return new Connection(options, url);
	}

	this.options = {
		production: "wallet.fo",
	};

	util.extend(this.options, options);

	switch (this.options.production) {
		case "wallet.fo":
			this.options.cert = this.options.cert || "pushs/apns/cert_wallet_debug/cert.pem";
			this.options.key = this.options.key || "pushs/apns/cert_wallet_debug/key.pem";
			break;
	}

	const sslconn = socket(this.options, url);

	this.pushNotification = (deviceToken, payload) => {
		let identifier = notification.identifier,
			expire = notification.expire,
			priority = notification.priority,
			encoding = notification.encoding || "utf8";

		if (!deviceToken || !payload) return "error";

		payload = JSON.stringify(payload);

		let payload_buffer = new Buffer(payload, encoding),
			token_buffer = new Buffer(deviceToken, "hex");

		// deviceToken 是 32 bytes, payload 可变 bytes, identifier 是 4 bytes
		let frameLen = 3 + token_buffer.length + 3 + payload_buffer.length + 3 + 4;

		if (expire > 0) frameLen += 3 + 4; // expire 是 4 bytes
		if (priority !== 10) frameLen += 3 + 1; // priority 是 1 bytes

		let data = new Buffer(5 + frameLen),
			position = 0;

		// Command : 1 byte
		data[position] = 2; // position = 0, command = 2mmm

		// Frame length : 4 bytes
		position += 1; // position = 1, frameLen
		data.writeUInt32BE(frameLen, position);

		// Frame data
		position += 4; // position = 5, frameData

		// item = itemId + itemDataLen + itemData
		// Token Item
		data[position] = 1; // tokenItem = itemId + tokenLen + token
		position += 1;
		data.writeUInt16BE(token_buffer.length, position);
		position += 2;
		position += token_buffer.copy(data, position, 0);

		// Payload Item
		data[position] = 2; // payloadItem = itemId + payloadLen + payload
		position += 1;
		data.writeUInt16BE(payload_buffer.length, position);
		position += 2;
		position += payload_buffer.copy(data, position, 0, -1);

		// Identifier Item
		data[position] = 3; // identifierItem = itemId + identifierLen + identifier
		position += 1;
		data.writeUInt16BE(4, position);
		position += 2;
		data.writeUInt32BE(identifier, position);
		position += 4;

		// Expiry Item
		if (expire > 0) {
			data[position] = 4; // expireItem = itemId + expireLen + expire
			position += 1;
			data.writeUInt16BE(4, position);
			position += 2;
			data.writeUInt32BE(expire, position);
			position += 4;
		}

		// Priority Item
		if (priority !== 10) {
			data[position] = 5; // priorityItem = itemId + priorityLen + priority
			position += 1;
			data.writeUInt16BE(1, position);
			position += 2;
			data[position] = priority;
			position += 1;
		}
		sslconn.write(data);
	};

	this.feedback = () => {
		let tokens = [];
		while (true) {
			let buf_response = sslconn.read();
			if (!buf_response) break;

			if (buf_response.readUInt16BE(4) === 32) {
				let token = buf_response.slice(6).toString('hex');
				tokens.push(token);
			}
			coroutine.sleep(500);
		}

		return tokens;
	};

	this.clear = () => {
		sslconn.clear();
	}
}

module.exports = Connection;