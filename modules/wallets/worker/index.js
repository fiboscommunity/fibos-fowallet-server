// [http server]
const orm = require("@fxjs/orm");
const FIBOS = require("fibos.js");
const Tracker = require("fibos-tracker");

const utils = require("../utils");
const Pushs = require('../push/');
const __config = require("../config");
const pushTitle = require("../utils/pushTitle.json");

const bigNumber = utils.bigNumber;
const formatDate = utils.formatDate;

Tracker.Config.DBconnString = process.env.DBconnString;
const tracker = new Tracker();
[require("fibos-tokens"), require("../index")].forEach(d => {
    tracker.use(d);
})


let local_fibos = FIBOS({
    chainId: __config.chainId,
    httpEndpoint: __config.httpEndpoint,
    keyProvider: __config.contractConfig.keyProvider
});

/**
 * 计算锁仓到期服务
 */

setInterval(() => {
    tracker.app.db(db => {
        let Messages = db.models.messages;
        let ls = db.models.lockexpiration.find({
            is_exec: "no",
            expiration_to: orm.lte(new Date()),
        }).order("id").limit(100).runSync();

        ls.forEach(l => {
            l.saveSync({
                is_exec: "yes"
            })

            let action = db.models.fibos_actions.oneSync({ id: l.fibos_action_id });
            let data = action.rawData.act.data;
            data.created = formatDate(new Date(action.rawData.block_time), "yyyy-MM-ddThh:mm:ss");

            //跨链转账操作存储message
            Messages.createSync({
                receive_account: data.to,
                bigAction: "lockExpiration",
                action: "LockWarehouse",
                extends: data,
                is_exec: "yes",
                is_read: "no"
            });
        })
    })
}, 1000 * 5);
/**
 * 推送服务
 */
setInterval(() => {
    tracker.app.db(db => {
        let Fibos_accounts = db.models.fibos_accounts;
        let Device = db.models.device;
        let Messages = db.models.messages;
        let DevicesManage = db.models.devicesmanage;

        let ms = Messages.find({
            is_exec: "no"
        }).order("id").order("createdAt").limit(100).runSync();

        ms.forEach(m => {
            let account_name = m.receive_account;
            let account = Fibos_accounts.oneSync({
                id: account_name
            })

            //为了app使用createdAt，而createdAt字段又无法改变，故增加了一个newcreatedAt字段
            let newcreatedAt = formatDate(m.createdAt, "yyyy-MM-ddThh:mm:ss");
            m.newcreatedAt = newcreatedAt;

            Messages.updateExec(m.id);
            if (!account) return;

            //获取该用户下的所有设备
            let dms = DevicesManage.find({
                account: account_name,
                activation: "yes"
            }).order("-id").runSync();
            if (!dms) return;

            let is_android = false;
            dms.forEach(dm => {
                let PushDevices = [];

                let device = Device.oneSync({
                    id: dm.device_id
                });

                if (device && device.devicetoken) {
                    if (["IOS"].includes(device.devicetype)) {
                        PushDevices.push({
                            uid: account_name,
                            name: "IOS",
                            appVersion: "FOwallet",
                            deviceToken: device.devicetoken
                        });
                    } else if (["HUAWEI", "XIAOMI", "ANDROID"].includes(device.devicetype) && !is_android) {
                        PushDevices.push({
                            uid: account_name,
                            name: "ANDROID",
                            appVersion: "FOwallet",
                            deviceToken: device.devicetoken
                        });
                        is_android = true;
                    }
                }
                let language = device.language == 'en' ? "en" : "zh";
                let t = pushTitle[language][m.action];
                m.title = t.title;
                m.description = t.description;

                if (m.action == "insteadDelegatebw" || m.action == "insteadUndelegatebw") {
                    m.description = m.extends.from + m.description;
                } else if (m.action == "insteadBuyram" || m.action == "insteadBuyrambytes") {
                    m.description = m.extends.payer + m.description;
                }

                if (PushDevices.length > 0) Pushs(PushDevices, {
                    alert: '收到一条新消息',
                    params: m
                });
            })
        })
    })
}, 1000 * 5);