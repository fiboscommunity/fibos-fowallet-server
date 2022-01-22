const ssl = require("ssl");
const util = require("util");
const http = require("http");
const coroutine = require("coroutine");
const FIBOS = require("fibos.js");

let __config = require("../config");

ssl.loadRootCerts();

let cache = new util.LruCache(10, 45 * 60 * 1000);

let local_client = FIBOS({
    chainId: __config.chainId,
    httpEndpoint: __config.httpEndpoint
});

let price = {}

// 配置取价接口
module.exports = {
    price: () => {
        return cache.get("price", () => {
            let tokens = [
                { t: 'eos', n: 'eos' },
                { t: 'eth', n: 'ethereum' },
                { t: 'dai', n: 'dai' },
                { t: 'usdt', n: 'tether' },
                { t: 'usdk', n: 'usdk' }];
            try {
                price.price = http.get("").json().ticker.last;
            } catch (e) {
            }
            try {
                coroutine.parallel(tokens, (token) => {
                    let t = token.t.toUpperCase();
                    let p = http.get(``, {
                        headers: {
                            "Accepts": 'application/json',
                            "X-CMC_PRO_API_KEY": ''
                        },
                    }).json().data[t].quote.CNY.price;
                    price[token.n] = p;
                })
            } catch (e) {
            }
            return price;
        })
    },
    swapmarket: (tokenx, tokeny) => {
        let result = cache.get("swapmarket", () => {
            let swapmarket = {};
            let more = true;
            let lower_bound = 0;
            let producers = [];
            while (more) {
                let rs = local_client.getTableRowsSync({
                    json: true,
                    code: "eosio.token",
                    scope: "eosio.token",
                    table: "swapmarket",
                    lower_bound: lower_bound,
                    limit: 1000
                })

                let data = rs.rows;
                if (lower_bound === 0) {
                    producers = data;
                } else {
                    producers = producers.concat(data);
                }

                more = rs.more;
                lower_bound = producers.length;
            }
            producers.forEach(function (d) {
                let tokenx = d.tokenx.quantity.split(" ")[1] + "@" + d.tokenx.contract;
                let tokenx_quantity = d.tokenx.quantity.split(" ")[0];
                let tokeny = d.tokeny.quantity.split(" ")[1] + "@" + d.tokeny.contract;
                let tokeny_quantity = d.tokeny.quantity.split(" ")[0];

                swapmarket[[tokenx, tokeny].join("_")] = {
                    tokenx: tokenx,
                    tokenx_quantity: tokenx_quantity,
                    tokeny: tokeny,
                    tokeny_quantity: tokeny_quantity
                }
            });
            return swapmarket;
        })

        var reg = /^[\'\"]+|[\'\"]+$/g;
        tokenx = tokenx ? tokenx.replace(reg, "") : "";
        tokeny = tokeny ? tokeny.replace(reg, "") : "";
        let tokens = {};
        tokens[tokenx] = [];
        tokens[tokeny] = [];
        for (let i in result) {
            if (result[i].tokenx == tokenx || result[i].tokeny == tokenx) {
                tokens[tokenx].push(result[i]);
            }
            if (result[i].tokenx == tokeny || result[i].tokeny == tokeny) {
                tokens[tokeny].push(result[i]);
            }
        }
        return tokens;
    }

}

