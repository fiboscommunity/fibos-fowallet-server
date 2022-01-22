module.exports = db => {
    let Devices = db.models.device;
    let DevicesManage = db.define('devicesmanage', {
        account: {
            required: true,
            type: "text",
            size: 12
        },
        //激活状态
        activation: {
            type: "enum",
            values: ["yes", "no"],
            defaultValue: "no"
        },
        activationtime: {
            required: true,
            type: "text",
            defaultValue: 0
        }
    });

    DevicesManage.offLineOneDevice = (accounts, device_id) => {
        db.driver.execQuerySync(`update devicesmanage set activation = 'no' where account in ? and device_id = ? and activation = 'yes'`, [accounts, device_id]);
    }

    DevicesManage.hasOne("device", Devices, {

    });

    return DevicesManage;
}