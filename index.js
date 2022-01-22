const fs = require("fs");

let setLogs = (logPath) => {
    if (!fs.exists(logPath)) fs.mkdir(logPath);

    console.add([{
        type: "console",
        levels: [console.FATAL, console.ALERT, console.CRIT, console.ERROR, console.WARN, console.NOTICE, console.INFO],
    }, {
        type: "file",
        levels: [console.FATAL, console.ALERT, console.CRIT, console.ERROR],
        path: logPath + "error.log",
        split: "hour",
        count: 128
    }, {
        type: "file",
        levels: [console.WARN],
        path: logPath + "warn.log",
        split: "hour",
        count: 128
    }, {
        type: "file",
        levels: [console.INFO, console.NOTICE],
        path: logPath + "access.log",
        split: "hour",
        count: 128
    }]);
}

setLogs("./logs/");

const fibos = require("fibos");
fibos.config_dir = "./data";
fibos.data_dir = "./data";
fibos.load("http", {
    "http-server-address": "0.0.0.0:8765",
    "access-control-allow-origin": "*",
    "http-validate-host": false,
    "verbose-http-errors": true
});

fibos.load("net", {
    "p2p-peer-address": [
        "p2p.mainnet.fibos.me:9870",
        "54.64.0.62:9876",
        "p2p.mainnet.hellofibos.com:9876",
        "seed.fibos.rocks:10100",
        "134.175.20.135:9870",
        "35.185.138.208:10443",
        "103.99.179.165:9870",
        "rpc.fiboso.com:9870",
        "mainnet.bitewd.com:9870",
        "fibos-peer.eosasia.one:9876",
        "34.85.111.150:9870",
        "api.xxq.pub:8888",
        "fibos-node.slowmist.io:9870",
        "114.67.81.155:9870",
        "39.98.64.192:9871",
        "218.106.135.134:10300"
    ],
    "p2p-listen-endpoint": "0.0.0.0:9870"
});

fibos.load("producer");
fibos.load("chain", {
    "contracts-console": true,
    "genesis-json": "genesis.json"
});

fibos.load("chain_api");

const Tracker = require("fibos-tracker");

let DBconnString = process.env.DBconnString;

if (!DBconnString) {
    throw Error("Config DBconnString not exist,please set as `export DBconnString='mysql://${username}:${password}@127.0.0.1/fibos_chain'`");
}

Tracker.Config.DBconnString = DBconnString;

const tracker = new Tracker();
[require("fibos-tokens"), require("./modules/wallets")].forEach(d => {
    tracker.use(d);
})
tracker.emitter();

fibos.load("ethash");
fibos.start();