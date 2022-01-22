module.exports = db => {
    /**
     * 锁仓解锁表
     */
    let Fibos_actions = db.models.fibos_actions;
    let Lockexpiration = db.define('lockexpiration', {
        expiration_to: {
            required: true,
            type: "date",
            time: true
        },
        is_exec: {
            required: true,
            type: "enum",
            values: ["yes", "no"],
            defaultValue: "no"
        }
    })

    Lockexpiration.hasOne("fibos_action", Fibos_actions, {});
    return Lockexpiration;
}