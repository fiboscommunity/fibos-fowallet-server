# wallet.fo / FO wallet server

[English](README.md) | [简体中文](README.zh-CN.md)

## 1.Project Description

This project is a server for [WALLET.FO](https://wallet.fo/) and the FO wallet, make sure you have `npm` and `fibos` installed before using it.

implementation of the fibos off-chain data module using fibos-tracker.
Contains.

1. block browser data query service

2. FO wallet data query & push function


File description

```
├── README.md              
├── modules/wallets        # Wallet module related code
├── genesis.json           # mainnet genesis file
├── index.js               # Node sync file
├── nginx.conf             # nginx configuration file
└── server.js              #  server service file
```

Port descriptions

| Port | Descriptions |
| --- | --- |
| 8870 | port of chain api |
| 9870 | port of p2p |
| 8080 | port of http |


## 2.Configuration

 Using process.env to set & get

DBconnString mysql configuration file

Check: `echo $DBconnString`

Modify mysql configuration by modifying the local configuration under /package.json

Eg:`export DBconnString=mysql://${username}:${password}@127.0.0.1/fibos_chain`

## 3.Dependencies

Make sure you have `npm` and `fibos` installed locally before installing the environment dependencies.

## 4.Run

```
fibos alert.js      # Format the mysql
npm install         # Install the dependency files
fibos index.js      # Run node
fibos server.js     # Run server
npm run worker ./modules/wallets/worker/index.js # wallet's schedule service
```

