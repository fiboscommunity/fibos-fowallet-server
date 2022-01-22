var http = require('http');
var ssl = require('ssl');

ssl.loadRootCerts();

let CONFIG = require("../../config");
const androidpush = CONFIG.androidpush;

var appid = androidpush.appid
var secret = androidpush.secret
var s1 = appid + ':' + secret
var auth = new Buffer(s1).toString('base64')

function push(device, payload) {
    var req = http.request('POST', `${androidpush.push_url}`, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic ' + auth,
        },
        body: JSON.stringify({
            platform: 'android',
            audience: {
                tag: [
                    device.uid
                ],
            },
            notification: {
                android: {
                    alert: payload.description,
                    title: payload.title,
                    builder_id: 1,
                    extras: {
                        'extends': payload
                    },
                },
            },
        })
    })
    return req;
}

module.exports = push;