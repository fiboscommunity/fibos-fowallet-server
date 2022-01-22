const DB = require("db");
const Tracker = require("fibos-tracker");

let DBconnString = process.env.DBconnString || "mysql://${username}:${password}@127.0.0.1/fibos_chain";
Tracker.Config.DBconnString = DBconnString;
const tracker = new Tracker();
[require("fibos-tokens"), require("./modules/wallets")].forEach(d => {
	tracker.use(d);
})

var sqls = [];

try {
	console.notice("\n\n\n-------------------------------------------->");
	var DBconn = DB.open(DBconnString);
	var mysqlDBColumns = {};

	tracker.app.db(db => {
		var models = db.models;
		for (var table in models) {
			var allProperties = models[table].allProperties;

			DBconn.execute("show columns from " + table).map(function(o) {
				mysqlDBColumns[o.Field] = o.Type.toString();
			});
			for (var field in allProperties) {
				var v = allProperties[field];

				switch (v.type) {
					case "date":
						if (v.time !== true) {
							console.error("DB TYPE CHECK: %s %s date time is false!", table, field);
							process.exit();
						}
						break;
					case "number":
						console.error("DB TYPE CHECK: %s %s number not allowed!", table, field);
						process.exit();
						break
					case "text":
						if (v.specialType === true && mysqlDBColumns[field] !== "decimal(65,18)") {
							sqls.push("ALTER TABLE `" + table + "` CHANGE `" + field + "` `" + field + "` DECIMAL(65,18) NOT NULL DEFAULT 0;");
							DBconn.execute("ALTER TABLE `" + table + "` CHANGE `" + field + "` `" + field + "` DECIMAL(65,18) NOT NULL DEFAULT 0;");
							console.warn("[-]ALTER double to decimal(65,18): %s %s", table, field)
						} else {
							console.notice("[√]%s %s decimal(65,18)", table, field);
						}
				}
			}
		}
	});

	console.notice("DB TYPE ALERT SUCCESS!");
	console.notice("<--------------------------------------------\n\n\n");
} catch (e) {
	console.error(e.stack);
	process.exit();
} finally {
	if (DBconn) DBconn.close();
}

console.notice(sqls);

process.exit();