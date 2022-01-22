const os = require('os');
const http = require('http');
const Tracker = require("fibos-tracker");

let port = 8080;

let DBconnString = process.env.DBconnString;

if (!DBconnString) {
    throw Error("Config DBconnString not exist,please set as `export DBconnString='mysql://${username}:${password}@127.0.0.1/fibos_chain'`");
}

Tracker.Config.DBconnString = DBconnString;
const tracker = new Tracker();
[require("fibos-tokens"), require("./modules/wallets")].forEach(d => {
    tracker.use(d);
})

let walletApis = require("./modules/wallets/api");

var svr = new http.Server(port, [
    (req) => { req.session = {} },
    {
        "/ping": (req) => {
            req.response.json({
                data: "pong",
                date: new Date(),
                ram: (parseInt(os.freemem()) / 1024 / 1024 / 1024).toFixed(2) + "G"
            })
        },
        "/price": function (req) {
            req.response.json(walletApis.check.price());
        },
        '/swapmarket': (req) => {
            req.response.json(walletApis.check.swapmarket(req.query.tokenx, req.query.tokeny));
        },
        "/1.1": tracker.app,
        "/2.0/app": tracker.app,
        "/1.0/app/accounts/(.*)": function (req, method) {
            let data = req.json();
            let result = {};
            tracker.app.db(db => {
                result = walletApis.accounts[method](db, data);
            })
            if (!!result.error) {
                req.response.statusCode = 400;
                req.response.json(result.error);
            } else if (!!result.success) {
                req.response.json(result.success);
            }
        },
        "/v1/history/get_key_accounts": (req) => {
            let data = JSON.parse(req.data);
            let public_key = data.public_key;
            let account_names;
            tracker.app.db(db => {
                account_names = db.driver.execQuerySync(`select id from fibos_accounts where id in (select account_id from fibos_permissions where pub_key = "${public_key}" and expire_time is null)`).map(ac => { return ac.id });
            })
            req.response.json({ account_names: account_names });
        },
        "*": (req) => {
            req.response.statusCode = 404;
        }
    }, req => {
        if (!["ELB-HealthChecker/2.0"].includes(req.headers["User-Agent"])) {
            console.notice("%s %s %s [%s %s] %s", new Date(), req.protocol, req.headers["X-Forwarded-For"], req.method, req.address, req.headers["User-Agent"])
        }
    }]);

let netWork = os.networkInterfaces();
let ips = "";
for (var i in netWork) {
    let address = netWork[i][0].address;
    if (address.indexOf(".") !== -1) {
        ips += "http://" + address + ":" + port + "\n";
    }
}

console.notice("server run in:\n" + ips);

svr.enableCrossOrigin("DNT,X-Mx-ReqToken,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Authentication");

const version = process.version.split("-")[0].split(".")[1];
if (Number(version) < 29) {
	svr.run(() => { });
} else {
	svr.start();
}