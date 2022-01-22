module.exports = db => {
    let Messages = db.define('messages', {
        receive_account: {
            required: true,
            type: "text",
            size: 12
        },
        bigAction: {
            required: true,
            type: "text",
            size: 36
        },
        action: {
            required: true,
            type: "text",
            size: 36
        },
        extends: {
            required: true,
            type: "object"
        },
        is_exec: {
            required: true,
            type: "enum",
            values: ['yes', 'no']
        },
        is_read: {
            required: true,
            type: "enum",
            values: ['yes', 'no']
        }
    }, {
        functions: {
            readMessage: (req, data) => {
                if (!data.bigAction || !data.account || !["paymentNotice", "lockExpiration", "resourceManagement"].includes(data.bigAction)) return {
                    error: {
                        code: 4006001,
                        message: "params is error"
                    }
                }

                Messages.readAll(data.bigAction, data.account);

                return {
                    success: {
                        success: "change status success"
                    }
                }
            },
        },
        ACL: function(session) {
            return {
                "*": {
                    "readMessage": true,
                    "find": true,
                    "read": true
                }
            }
        }
    });

    Messages.updateExec = (id) => {
        db.driver.execQuerySync(`update messages set is_exec = "yes" where id = ? and is_exec = "no"`, [id]);
    }

    Messages.readAll = (bigAction, receive_account) => {
        db.driver.execQuerySync(`update messages set is_read = "yes" where receive_account = ? and bigAction = ? and is_read = "no"`, [receive_account, bigAction]);
    }

    return Messages;
}