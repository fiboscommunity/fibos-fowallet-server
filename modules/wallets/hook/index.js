const utils = require("../utils");
const bigNumber = utils.bigNumber;
const formatDate = utils.formatDate;

let config = {
    maxCnt: 500,
    maxQuantitys: 100000,
    averQuantity: 1000
};

let system_token = "FO@eosio";
let system_account = [''];


let save_actions = (db, params) => {
    let trx_id = params.trx_id;
    let token_from_name = params.token_from_name;
    let token_to_name = params.token_to_name;
    let account_from_name = params.account_from_name;
    let account_to_name = params.account_to_name;
    let global_sequence = params.global_sequence;
    let token_from_id = params.token_from_id;
    let token_to_id = params.token_to_id;
    let contract_action = params.contract_action;

    let action_id = db.driver.execQuerySync(`select id from fibos_actions where trx_id = ? and global_sequence = ?`, [trx_id, global_sequence])[0].id;

    let ta = db.driver.execQuerySync(`select id from fibos_tokens_action where action_id = ?`, [action_id])[0];
    if (ta && ta.id) return;

    if (!!token_from_name) {
        token_from_id = db.driver.execQuerySync(`select id from fibos_tokens where token_name = ? and token_status = "on"`, [token_from_name])[0].id;
    }

    if (!!token_to_name) {
        token_to_id = db.driver.execQuerySync(`select id from fibos_tokens where token_name = ? and token_status = "on"`, [token_to_name])[0].id;
    }

    db.driver.execQuerySync(`insert into fibos_tokens_action(account_from_id,account_to_id,token_from_id,token_to_id,contract_action,action_id,createdAt,updatedAt) values(?,?,?,?,?,?,now(),now())`, [account_from_name,
        account_to_name, token_from_id, token_to_id, contract_action, action_id]);
}

/**
 * 存储推送用到的消息
 */
let savePushMessage = (db, params) => {
    let Messages = db.models.messages;
    let _save = (d) => {
        let extend = d.message.act.data;
        extend.trx_id = d.message.trx_id;
        extend.created = formatDate(new Date(d.message.block_time), "yyyy-MM-ddThh:mm:ss");
        Messages.createSync({
            receive_account: d.receive_account,
            bigAction: d.bigAction,
            action: d.action,
            extends: extend,
            is_exec: "no",
            is_read: "no"
        });
    }

    if (Array.isArray(params)) {
        params.forEach(d => { _save(d) });
    } else {
        _save(params);
    }
};

/**
 * 转账hooks
 */
let transferHook = (db, messages) => {
    messages.forEach((msg) => {
        try {
            if (msg.parent) return;

            let data = msg.act.data;

            if (!system_account.includes(data.from) && !system_account.includes(data.to)) {
                //链上普通转账收付款存储message
                savePushMessage(db, [{
                    receive_account: data.to,
                    bigAction: "paymentNotice",
                    action: "transferReceive",
                    message: msg
                }, {
                    receive_account: data.from,
                    bigAction: "paymentNotice",
                    action: "transferPay",
                    message: msg
                }]);
            }
        } catch (e) {
            console.error("hook error:", e.stack, msg);
        }
    });
}


module.exports = {
    "eosio.token/transfer": transferHook,
    "eosio.token/extransfer": transferHook,
    "eosio.token/exlocktrans": (db, messages) => {
        messages.forEach(message => {
            if (message.parent) return;
            let Lockexpiration = db.models.lockexpiration;

            var data = message.act.data;
            savePushMessage(db, [{
                receive_account: data.to,
                bigAction: "paymentNotice",
                action: "exlocktransReceive",
                message: message
            }, {
                receive_account: data.from,
                bigAction: "paymentNotice",
                action: "exlocktransPay",
                message: message
            }]);

            let action_id = db.driver.execQuerySync(`select id from fibos_actions where trx_id = ? and global_sequence = ?`, [message.trx_id, message.receipt.global_sequence])[0].id;
            Lockexpiration.createSync({
                fibos_action_id: action_id,
                expiration_to: data.expiration_to
            })
        })
    },
    "eosio.token/exchange": (db, messages) => {
        messages.forEach(message => {
            let data = message.act.data;

            let receipt_data = {};
            if (message.inline_traces.length <= 0) {
                receipt_data = {
                    in: data.quantity,
                    out: {
                        quantity: data.tosym.sym,
                        contract: data.tosym.contract
                    }
                };
            } else {
                var rs = [];
                var uniswaprs = [];
                let owner = data.owner;

                message.inline_traces.forEach(d => {
                    var inline_data = d.act.data;
                    let contract_action = d.act.name + "@" + d.act.account
                    if (contract_action == "receipt@eosio.token") {
                        rs.push(inline_data);
                    } else if (contract_action == "traderecord@eosio.token"
                        && owner === d.act.data.owner
                        && inline_data.from.quantity.split(" ")[1] === data.quantity.quantity.split(" ")[1]) {
                        uniswaprs.push(inline_data);
                    }
                });

                if (!rs.length && !uniswaprs.length) return;

                receipt_data = rs.length === 2 ? {
                    in: rs[0].in,
                    out: rs[1].out
                } : rs[0];

                if (uniswaprs.length > 0) {
                    receipt_data = uniswaprs[0];

                    let from_quantity = 0;
                    let to_quantity = 0;
                    let from_precision = 0;
                    let to_precision = 0;

                    uniswaprs.forEach(urs => {
                        from_precision = urs.from.quantity.split(" ")[0].indexOf(".") === -1 ? 0 : urs.from.quantity.split(" ")[0].split(".")[1].length;
                        to_precision = urs.to.quantity.split(" ")[0].indexOf(".") === -1 ? 0 : urs.to.quantity.split(" ")[0].split(".")[1].length;

                        from_quantity = bigNumber.toFixed(bigNumber["+"](from_quantity, urs.from.quantity.split(" ")[0]), from_precision);
                        to_quantity = bigNumber.toFixed(bigNumber["+"](to_quantity, urs.to.quantity.split(" ")[0]), to_precision);
                    });

                    receipt_data.from.quantity = [from_quantity, receipt_data.from.quantity.split(" ")[1]].join(" ");
                    receipt_data.to.quantity = [to_quantity, receipt_data.to.quantity.split(" ")[1]].join(" ");

                    receipt_data = {
                        in: receipt_data.from,
                        out: receipt_data.to
                    }
                }
            }

            //更新 fibos_actions 里面的 data 值,替换 fibos_action 中 exchange 的值
            let Fibos_actions = db.models.fibos_actions;
            let fibos_action = Fibos_actions.oneSync({
                global_sequence: message.receipt.global_sequence,
                trx_id: message.trx_id
            })

            let rawData = JSON.parse(JSON.stringify(fibos_action.rawData));
            rawData.act.data.in = receipt_data.in;
            rawData.act.data.out = receipt_data.out;
            fibos_action.saveSync({
                rawData: rawData
            })

            message.act.data.in = receipt_data.in;
            message.act.data.out = receipt_data.out;
            savePushMessage(db, [{
                receive_account: data.owner,
                bigAction: "paymentNotice",
                action: "exchangeReceive",
                message: message
            }, {
                receive_account: data.owner,
                bigAction: "paymentNotice",
                action: "exchangePay",
                message: message
            }])
        })
    },
    "eosio/buyram": (db, messages) => {
        messages.forEach(message => {
            let data = message.act.data;
            let inserts = [];
            save_actions(db, {
                account_from_name: data.payer,
                account_to_name: data.to,
                token_from_name: system_token,
                trx_id: message.trx_id,
                global_sequence: message.receipt.global_sequence,
                contract_action: message.act.account + "/" + message.act.name
            })
            if (data.payer !== data.receiver) {
                inserts.push({
                    receive_account: data.payer,
                    bigAction: "paymentNotice",
                    action: "buyramforOther",
                    message: message
                });
                inserts.push({
                    receive_account: data.receiver,
                    bigAction: "resourceManagement",
                    action: "insteadBuyram",
                    message: message
                });
            } else {
                inserts.push({
                    receive_account: data.payer,
                    bigAction: "paymentNotice",
                    action: "buyram",
                    message: message
                });
            }
            savePushMessage(db, inserts);
        })
    },
    "eosio/buyrambytes": (db, messages) => {
        messages.forEach(message => {
            let data = message.act.data;
            save_actions(db, {
                account_from_name: data.payer,
                account_to_name: data.receiver,
                token_from_name: system_token,
                trx_id: message.trx_id,
                global_sequence: message.receipt.global_sequence,
                contract_action: message.act.account + "/" + message.act.name
            })
            let inserts = [];
            if (data.payer !== data.receiver) {
                inserts.push({
                    receive_account: data.payer,
                    bigAction: "paymentNotice",
                    action: "buyrambytesforOther",
                    message: message
                });
                inserts.push({
                    receive_account: data.receiver,
                    bigAction: "resourceManagement",
                    action: "insteadBuyrambytes",
                    message: message
                });
            } else {
                //购买内存的时候给自己发一条购买内存通知
                inserts.push({
                    receive_account: data.payer,
                    bigAction: "paymentNotice",
                    action: "buyrambytes",
                    message: message
                });
            }
            savePushMessage(db, inserts);
        })
    },
    "eosio/sellram": (db, messages) => {
        messages.forEach(message => {
            let data = message.act.data;
            save_actions(db, {
                account_from_name: data.account,
                account_to_name: data.account,
                token_from_name: system_token,
                trx_id: message.trx_id,
                global_sequence: message.receipt.global_sequence,
                contract_action: message.act.account + "/" + message.act.name
            })
            savePushMessage(db, {
                receive_account: data.account,
                bigAction: "paymentNotice",
                action: "sellram",
                message: message
            });
        })
    },
    "eosio/delegatebw": (db, messages) => {
        messages.forEach(message => {
            let data = message.act.data;
            save_actions(db, {
                account_from_name: data.from,
                account_to_name: data.receiver,
                token_from_name: system_token,
                trx_id: message.trx_id,
                global_sequence: message.receipt.global_sequence,
                contract_action: message.act.account + "/" + message.act.name
            })

            let inserts = [];
            if (data.from !== data.receiver) {
                inserts.push({
                    receive_account: data.receiver,
                    bigAction: "resourceManagement",
                    action: "insteadDelegatebw",
                    message: message
                });
                inserts.push({
                    receive_account: data.from,
                    bigAction: "paymentNotice",
                    action: "delegatebwforOther",
                    message: message
                });
            } else {
                inserts.push({
                    receive_account: data.from,
                    bigAction: "paymentNotice",
                    action: "delegatebw",
                    message: message
                });
            }
            savePushMessage(db, inserts);
        });
    },
    "eosio/undelegatebw": (db, messages) => {
        messages.forEach(message => {
            let data = message.act.data;
            save_actions(db, {
                account_from_name: data.from,
                account_to_name: data.receiver,
                token_from_name: system_token,
                trx_id: message.trx_id,
                global_sequence: message.receipt.global_sequence,
                contract_action: message.act.account + "/" + message.act.name
            })
            if (data.from === data.receiver) return;
            savePushMessage(db, {
                receive_account: data.receiver,
                bigAction: "resourceManagement",
                action: "insteadUndelegatebw",
                message: message
            });
        })
    },
    "eosio/refund": (db, messages) => {
        messages.forEach(message => {
            var data = message.act.data;

            var inline_traces_data = message.inline_traces[0].act.data;

            save_actions(db, {
                account_from_name: inline_traces_data.from,
                account_to_name: inline_traces_data.to,
                token_from_name: system_token,
                trx_id: message.trx_id,
                global_sequence: message.receipt.global_sequence,
                contract_action: message.act.account + "/" + message.act.name
            })
            message.act.data = inline_traces_data;
            savePushMessage(db, {
                receive_account: data.owner,
                bigAction: "paymentNotice",
                action: "undelegatebw",
                message: message
            });
        })
    },
    "eosio/claimbonus": (db, messages) => {
        messages.forEach(message => {
            var inline_traces_data = message.inline_traces[0].act.data;

            save_actions(db, {
                account_from_name: inline_traces_data.from,
                account_to_name: inline_traces_data.to,
                token_from_name: system_token,
                trx_id: message.trx_id,
                global_sequence: message.receipt.global_sequence,
                contract_action: message.act.account + "/" + message.act.name
            })

            message.act.data = inline_traces_data;

            savePushMessage(db, {
                receive_account: message.act.data.to,
                bigAction: "paymentNotice",
                action: "claimbonus",
                message: message
            });
        })
    },
    "eosio/pushblk": (db, messages) => {
        messages.forEach(message => {
            if (!message.inline_traces || !message.inline_traces.length) return;

            let exissue_inline_traces;
            let i = message.inline_traces.some(inline_trace => {
                if ("eosio.token/exissue" === inline_trace.act.account + "/" + inline_trace.act.name) {
                    exissue_inline_traces = inline_trace.inline_traces;
                    return true;
                }
            })
            if (!i) return;
            let data;
            let j = exissue_inline_traces.some(inline_trace => {
                if ("eosio.token/extransfer" === inline_trace.act.account + "/" + inline_trace.act.name) {
                    data = inline_trace.act.data;
                    return true;
                }
            })
            if (!j) return;

            data.from = data.from === "fibos" ? "eosio.cross" : data.from;

            save_actions(db, {
                token_from_name: system_token,
                trx_id: message.trx_id,
                global_sequence: message.receipt.global_sequence,
                contract_action: message.act.account + "/" + message.act.name
            })

            let pushMessage = {};
            message.act.data = data;
            if (data.to === 'eosio.cross') {
                pushMessage = {
                    receive_account: data.from,
                    bigAction: "paymentNotice",
                    action: "acrossChainPay",
                    message: message
                }
            } else if (data.from === 'eosio.cross') {
                pushMessage = {
                    receive_account: data.to,
                    bigAction: "paymentNotice",
                    action: "acrossChainReceive",
                    message: message
                }
            }
            savePushMessage(db, pushMessage);
        })
    }
}