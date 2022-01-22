module.exports = {
    bindDrive: (db, data) => {
        let Device = db.models.device;
        let DevicesManage = db.models.devicesmanage;

        if (!data.accounts || !data.devicetype || !data.language || !data.marker) return {
            error: {
                code: 4000191,
                message: "params error"
            }
        }

        let deviceid;
        let d;

        if (data.marker) {
            d = Device.oneSync({
                marker: data.marker,
            });
        }

        //根据标识新增/修改设备信息
        if (data.devicetype) {
            if (!d) {
                deviceid = Device.createSync({
                    marker: data.marker,
                    devicetype: data.devicetype,
                    devicetoken: data.devicetoken || '',
                    language: data.language,
                    extend: data.extend,
                }).id;
            } else {
                d.devicetype = data.devicetype;
                d.devicetoken = data.devicetoken || d.devicetoken;
                d.language = data.language;
                d.extend = data.extend;
                deviceid = d.saveSync().id;
            }
        }

        let activationtime = Date.now();

        data.accounts.forEach(account => {
            let dm = DevicesManage.oneSync({
                device_id: deviceid,
                account: account
            });

            if (deviceid && !dm) {
                DevicesManage.createSync({
                    account: account,
                    device_id: deviceid,
                    activationtime: activationtime,
                    activation: "yes"
                })
            } else {
                dm.activationtime = activationtime;
                dm.activation = "yes";
                dm.saveSync();
            }

        });

        return {
            success: {
                success: "bind drive success"
            }
        };
    },
    offLineOneDevice: (db, data) => {
        let Device = db.models.device;
        let DevicesManage = db.models.devicesmanage;

        if (!data.accounts || !data.marker) return {
            error: {
                code: 4000191,
                message: "params error"
            }
        }
        if (data.marker) {
            d = Device.oneSync({
                marker: data.marker,
            });
        }
        if (!d) return;
        //删除在该设备上的账号
        DevicesManage.offLineOneDevice(data.accounts, d.id);
        return {
            success: {
                success: "offLine Device success"
            }
        };

    }
}