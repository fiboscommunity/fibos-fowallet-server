# wallet.fo / FO钱包 服务端

[English](README.md) | [简体中文](README.zh-CN.md)

## 1.项目说明

本项目为 [WALLET.FO](https://wallet.fo/) 和 FO 钱包的服务端，在使用前请确保已安装好 `npm` 和 `fibos` ；

使用 fibos-tracker  实现 fibos 的链下数据模块；
包含：

1、 区块浏览器数据查询服务

2、 FO 钱包数据查询&推送功能


文件说明

```
├── README.md              
├── modules/wallets        # 钱包模块相关代码
├── genesis.json           # 主网genesis文件
├── index.js               # 节点同步文件
├── nginx.conf             # nginx 配置文件
└── server.js              # server 服务文件
```

端口说明

| 端口 | 说明 |
| --- | --- |
| 8870 | chain api 端口 |
| 9870 | p2p 地址 |
| 8080 | http 服务地址 |


## 2.配置

配置文件方式: 使用 process.env 设置&获取

DBconnString mysql 配置文件

查看: `echo $DBconnString`

通过修改 /package.json 下的 local 配置修改 mysql 配置

实例:`export DBconnString=mysql://${username}:${password}@127.0.0.1/fibos_chain`

## 3.环境依赖

在安装环境依赖前请确保本地已安装了 `npm` 和 `fibos`

## 4.运行

```
fibos alert.js      # 格式化数据库
npm install         # 安装依赖文件
fibos index.js      # 启动节点文件
fibos server.js     # 启动服务文件
npm run worker ./modules/wallets/worker/index.js # 启动钱包的定时服务
```

