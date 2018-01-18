/* ---- /1Ksi6FfKERa88PD6nqBrNtS3DdfC3ChMjP/js/lib/Frame.coffee ---- */


function sendToAddress() {
    var addr = document.getElementById("toAddress").value;
    var amount = document.getElementById("pay_value").value;
    if (addr === "") {
        alert("请输入转入地址");
        return;
    }
    if (amount === "") {
        alert("请输入转账金额");
        return;
    }
    ShowDiv('MyDiv1', 'fade1')
}

(function () {
    var Frame,
        bind = function (fn, me) {
            return function () {
                return fn.apply(me, arguments);
            };
        },
        slice = [].slice;

    Frame = (function () {
        function Frame(url) {
            this.onCloseWebsocket = bind(this.onCloseWebsocket, this);
            this.onOpenWebsocket = bind(this.onOpenWebsocket, this);
            this.route = bind(this.route, this);
            this.onMessage = bind(this.onMessage, this);
            this.url = url;
            this.waiting_cb = {};
            this.wrapper_nonce = document.location.href.replace(/.*wrapper_nonce=([A-Za-z0-9]+).*/, "$1");
            this.connect();
            this.next_message_id = 1;
            this.init();
        }

        Frame.prototype.init = function () {
            return this;
        };

        Frame.prototype.connect = function () {
            this.target = window.parent;
            window.addEventListener("message", this.onMessage, false);
            return this.cmd("innerReady");
        };

        Frame.prototype.onMessage = function (e) {
            var cmd, message;
            message = e.data;
            cmd = message.cmd;
            if (cmd === "response") {
                if (this.waiting_cb[message.to] != null) {
                    return this.waiting_cb[message.to](message.result);
                } else {
                    return this.log("Websocket callback not found:", message);
                }
            } else if (cmd === "wrapperReady") {
                return this.cmd("innerReady");
            } else if (cmd === "ping") {
                return this.response(message.id, "pong");
            } else if (cmd === "wrapperOpenedWebsocket") {
                return this.onOpenWebsocket();
            } else if (cmd === "wrapperClosedWebsocket") {
                return this.onCloseWebsocket();
            } else {
                return this.route(cmd, message);
            }
        };

        Frame.prototype.route = function (cmd, message) {
            return this.log("Unknown command", message);
        };

        Frame.prototype.response = function (to, result) {
            return this.send({
                "cmd": "response",
                "to": to,
                "result": result
            });
        };

        Frame.prototype.cmd = function (cmd, params, cb) {
            if (params == null) {
                params = {};
            }
            if (cb == null) {
                cb = null;
            }
            return this.send({
                "cmd": cmd,
                "params": params
            }, cb);
        };

        Frame.prototype.send = function (message, cb) {
            if (cb == null) {
                cb = null;
            }
            message.wrapper_nonce = this.wrapper_nonce;
            message.id = this.next_message_id;
            this.next_message_id += 1;
            this.target.postMessage(message, "*");
            if (cb) {
                return this.waiting_cb[message.id] = cb;
            }
        };

        Frame.prototype.log = function () {
            var args;
            args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
            return console.log.apply(console, ["[Frame]"].concat(slice.call(args)));
        };

        Frame.prototype.onOpenWebsocket = function () {
            return this.log("Websocket open");
        };

        Frame.prototype.onCloseWebsocket = function () {
            return this.log("Websocket close");
        };

        return Frame;

    })();

    window.Frame = Frame;

}).call(this);


/* ---- /1Ksi6FfKERa88PD6nqBrNtS3DdfC3ChMjP/js/SbtcChat.coffee ---- */


(function () {
    var SbtcChat,
        bind = function (fn, me) {
            return function () {
                return fn.apply(me, arguments);
            };
        },
        extend = function (child, parent) {
            for (var key in parent) {
                if (hasProp.call(parent, key)) child[key] = parent[key];
            }

            function ctor() {
                this.constructor = child;
            }

            ctor.prototype = parent.prototype;
            child.prototype = new ctor();
            child.__super__ = parent.prototype;
            return child;
        },
        hasProp = {}.hasOwnProperty;

    SbtcChat = (function (superClass) {
        extend(SbtcChat, superClass);

        function SbtcChat() {
            this.getBlockChainInfo = bind(this.getBlockChainInfo, this);
            this.walletPassPhrase = bind(this.walletPassPhrase, this);
            this.dumpWallet = bind(this.dumpWallet, this);
            this.encryptWallet = bind(this.encryptWallet, this);
            this.getInfo = bind(this.getInfo, this);
            this.getWalletInfo = bind(this.getWalletInfo, this);
            this.recordAddress = bind(this.recordAddress, this);
            this.recordAll = bind(this.recordAll, this);
            this.addressList = bind(this.addressList, this);
            this.accountList = bind(this.accountList, this);
            this.stopWallet = bind(this.stopWallet, this);
            this.getNewAddress = bind(this.getNewAddress, this);
            this.getBalance = bind(this.getBalance, this);
            this.sendToAddress = bind(this.sendToAddress, this);
            this.sendMsg = bind(this.sendMsg, this);
            this.dumpprivkey = bind(this.dumpprivkey, this);
            this.importPriKey = bind(this.importPriKey, this);
            this.onOpenWebsocket = bind(this.onOpenWebsocket, this);
            return SbtcChat.__super__.constructor.apply(this, arguments);
        }

        SbtcChat.prototype.init = function () {
            return this.addLine("初始化成功");
        };

        SbtcChat.prototype.addLine = function (line) {
            var messages;
            messages = document.getElementById("messages");
            return messages.innerHTML = ("<li>" + line + "</li>") + messages.innerHTML;
        };

        SbtcChat.prototype.onOpenWebsocket = function (e) {
            Page.sendMsg();
            Page.getInfo();
            Page.recordAll();
            Page.getBalance();
            Page.getWalletInfo();
            Page.getBlockChainInfo();
        };

        SbtcChat.prototype.sendMsg = function () {
            return this.cmd("siteInfo", [], (function (_this) {
                return function (site_info) {
                    return _this.addLine("站点信息: <pre>" + JSON.stringify(site_info, null, 2) + "</pre>");
                };
            })(this));
        };

        SbtcChat.prototype.getBalance = function () {
            return this.cmd("walletGetBalance", ["address", "SBTC"], (function (_this) {
                return function (result) {
                    var input_balance = document.getElementById("balance_all");
                    var input_unconfirm = document.getElementById("bal_unconfirm");
                    var input_available = document.getElementById("bal_available");
                    input_balance.innerHTML = result[0].result.balance + result[0].result.unconfirmed_balance;
                    input_unconfirm.innerHTML = result[0].result.unconfirmed_balance + " SBTC";
                    input_available.innerHTML = result[0].result.balance + " SBTC";
                    return document.getElementById("balance").innerHTML = JSON.stringify(result[0].result, null, 2);
                };
            })(this));
        };

        SbtcChat.prototype.getNewAddress = function () {
            var label = '';
            return this.cmd("walletGetNewAddress", [label], (function (_this) {
                return function (balance) {
                    return document.getElementById("balance").innerHTML = JSON.stringify(balance[0].result, null, 2);
                };
            })(this));
        };

        SbtcChat.prototype.dumpprivkey = function () {
            var address = document.getElementById("addr_private").value;
            return this.cmd("walletDumpprivkey", [address], (function (_this) {
                return function (result) {
                    return document.getElementById("balance").innerHTML = JSON.stringify(result, null, 2);
                };
            })(this));
        };

        SbtcChat.prototype.importPriKey = function () {
            var privateKey = document.getElementById("privateKey").value;
            var privateKeyLabel = document.getElementById("privateKeyLabel").value;
            return this.cmd("walletImportPrivkey", [privateKey, privateKeyLabel], (function (_this) {
                return function (result) {
                    return document.getElementById("balance").innerHTML = JSON.stringify(result, null, 2);
                };
            })(this));
        };

        SbtcChat.prototype.sendToAddress = function () {
            // var fromAddress = document.getElementById("fromAddress").value;
            var toAddress = document.getElementById("toAddress").value;
            var value = document.getElementById("pay_value").value;
            // mydSgrG816yq8Kjhe3uW3bkjFLgBnkaCs1
            // n2ynxqSzhgyJJ5KBHPijKzNMqsgUd9Jsia "123"
            //mxHvi6U1NdtxiC82mpX6f6LKpAxdKUXjDq "asfd"
            if (toAddress === null) {
                alert("请输入转入地址");
                return;
            }
            if (value === null || value < 0) {
                alert("请输入正确的金额");
                return;
            }
            return this.cmd("walletSendToAddress", [toAddress, value], (function (_this) {
                return function (result) {
                    if (result !== null && result[0].error === null) {
                        alert("转账成功" + result[0].result);
                        document.getElementById("payHash").innerHTML = result[0].result;
                    } else {
                        alert("交易发送错误");
                    }
                    return document.getElementById("balance").innerHTML = result[0].result;
                };
            })(this));
        };
        var recevieAddr = null;
        var addrList = [];
        SbtcChat.prototype.accountList = function () {
            // mydSgrG816yq8Kjhe3uW3bkjFLgBnkaCs1
            // n2ynxqSzhgyJJ5KBHPijKzNMqsgUd9Jsia "123"
            return this.cmd("walletListAccounts", [], (function (_this) {
                return function (result) {
                    var list = result[0].result;
                    // $("#select_send_addr").empty();
                    $("#select_receive_addr").empty();
                    recevieAddr = null;
                    for (var item in list) {
                        // var jValue = accountList[item];//key所对应的value
                        Page.addressList(item);
                    }
                    if (addrList != null && addrList.length > 0) {
                        qrcode.makeCode(addrList[0]);
                    }
                    document.getElementById("balance").innerHTML = addrList.valueOf().toString();
                };
            })(this));
        };

        SbtcChat.prototype.addressList = function (account) {
            // mydSgrG816yq8Kjhe3uW3bkjFLgBnkaCs1
            // n2ynxqSzhgyJJ5KBHPijKzNMqsgUd9Jsia "123"
            return this.cmd("walletGetAddressesListByAccount", [account], (function (_this) {
                return function (result) {
                    var list = result[0].result;
                    for (var i = 0; i < list.length; i++) {
                        // var jValue = accountList[item];//key所对应的value
                        if (recevieAddr == null) {
                            recevieAddr = list[0];
                        }
                        addrList.push(list[i]);
                        // $("#select_send_addr").append("<option>" + list[i] + "</option>");
                        $("#select_receive_addr").append("<option>" + list[i] + "</option>");
                    }
                };
            })(this));
        };

        SbtcChat.prototype.recordAll = function () {
            return this.cmd("walletListTransactions", [], (function (_this) {
                return function (result) {
                    var t1 = document.getElementById("record_all");
                    var rowNum = t1.rows.length;
                    if (rowNum > 1) {
                        for (var i = 1; i < rowNum; i++) {
                            t1.deleteRow(i);
                            rowNum = rowNum - 1;
                            i = i - 1;
                        }
                    }
                    var list = result[0].result;
                    for (var i = 0; i < list.length; i++) {
                        var type = list[i].amount > 0 ? "接收" : "发送";
                        $("#record_all").append("<tr>" + "<td>" + formatDate(new Date(list[i].time)) + "</td>" +
                            "<td>" + type + "</td>" +
                            " <td>" + list[i].address + "</td>" +
                            "<td>" + list[i].amount + " SBTC</td>" +
                            "</tr>")
                    }
                    return document.getElementById("balance").innerHTML = JSON.stringify(list, null, 2);
                };
            })(this));
        };

        SbtcChat.prototype.recordAddress = function () {
            // mydSgrG816yq8Kjhe3uW3bkjFLgBnkaCs1
            // n2ynxqSzhgyJJ5KBHPijKzNMqsgUd9Jsia "123"
            return this.cmd("walletListTransactions", [], (function (_this) {
                return function (result) {
                    var list = result[0].result;
                    var t1 = document.getElementById("record_address");
                    var t2 = document.getElementById("recored_send");
                    var rowNum = t1.rows.length;
                    if (rowNum > 1) {
                        for (i = 1; i < rowNum; i++) {
                            t1.deleteRow(i);
                            t2.deleteRow(i);
                            rowNum = rowNum - 1;
                            i = i - 1;
                        }
                    }
                    for (var i = 0; i < list.length; i++) {
                        var type = list[i].amount > 0 ? "接收" : "发送";
                        $("#record_address").append("<tr>" + "<td>" + formatDate(new Date(list[i].time)) + "</td>" +
                            "<td>" + type + "</td>" +
                            " <td>" + list[i].address + "</td>" +
                            "<td>" + list[i].amount + " SBTC</td>" +
                            "</tr>")
                        $("#recored_send").append("<tr>" + "<td>" + formatDate(new Date(list[i].time)) + "</td>" +
                            "<td>" + type + "</td>" +
                            " <td>" + list[i].address + "</td>" +
                            "<td>" + list[i].amount + " SBTC</td>" +
                            "</tr>")
                    }
                    return document.getElementById("balance").innerHTML = JSON.stringify(list, null, 2);
                };
            })(this));
        };

        SbtcChat.prototype.stopWallet = function () {
            return this.cmd("walletStop", [], (function (_this) {
                return function (result) {
                    return document.getElementById("balance").innerHTML = result[0].result;
                };
            })(this));
        };

        SbtcChat.prototype.getInfo = function () {
            this.cmd("walletGetInfo", [], (function (_this) {
                return function (result) {
                    return document.getElementById("balance").innerHTML = JSON.stringify(result[0].result, null, 2) + "\n";
                };
            })(this));
        };
        // walletpassphrase
        SbtcChat.prototype.encryptWallet = function () {
            var password = document.getElementById("_fromAddress").value;
            this.cmd("walletEncryptWallet", [password], (function (_this) {
                return function (result) {
                    if (result != null) {
                        return document.getElementById("balance").innerHTML = JSON.stringify(result[0].result, null, 2) + "\n";
                    }
                };
            })(this));
        };

        SbtcChat.prototype.walletPassPhrase = function () {
            var password = document.getElementById("trade_pwd").value;
            if (password === "") {
                alert("请输入密码");
                CloseDiv('MyDiv1', 'fade1');
                return;
            }
            this.cmd("walletPassPhrase", [password], (function (_this) {
                return function (data) {
                    CloseDiv('MyDiv1', 'fade1');
                    if (data !== null && data[0].error === null) {
                        Page.sendToAddress();
                    } else {
                        alert("密码错误");
                    }
                    document.getElementById("balance").innerHTML = JSON.stringify(data[0].result, null, 2) + "\n";
                };
            })(this));
        };

        SbtcChat.prototype.dumpWallet = function () {
            this.cmd("walletEncryptWallet", [], (function (_this) {
                return function (result) {
                    return document.getElementById("balance").innerHTML = JSON.stringify(result[0].result, null, 2) + "\n";
                };
            })(this));
        };

        SbtcChat.prototype.getWalletInfo = function (type) {
            // var input_data;
            // input_data = document.getElementById("message").value;
            return this.cmd("walletGetWalletInfo", [], (function (_this) {
                return function (wallet_info) {
                    if (type === null || type === 0) {
                        _this.addLine("钱包信息: <pre>" + JSON.stringify(wallet_info, null, 2) + "</pre>");
                    } else {
                        if (wallet_info[0] !== null && wallet_info[0].result.unlocked_until !== null) {
                            // Page.walletPassPhrase();
                        } else {
                            alert("钱包未加密，是否现在加密？");
                        }
                        _this.addLine("钱包信息: <pre>" + JSON.stringify(wallet_info, null, 2) + "</pre>");
                    }
                };
            })(this));
        };

        SbtcChat.prototype.getBlockChainInfo = function () {
            // var input_data;
            // input_data = document.getElementById("message").value;
            return this.cmd("walletGetBlockChainInfo", [], (function (_this) {
                return function (wallet_info) {
                    return _this.addLine("block信息: <pre>" + JSON.stringify(wallet_info, null, 2) + "</pre>");
                };
            })(this));
        };

        return SbtcChat;

    })(Frame);

    window.Page = new SbtcChat();

}).call(this);

function formatDate(now) {
    return new Date(now * 1000).Format("yyyy-MM-dd HH:mm:ss");
}

Date.prototype.Format = function (fmt) { //author: meizz
    var o = {
        "M+": this.getMonth() + 1,
        "d+": this.getDate(),
        "H+": this.getHours(),
        "m+": this.getMinutes(),
        "s+": this.getSeconds(),
        "q+": Math.floor((this.getMonth() + 3) / 3),
        "S": this.getMilliseconds()
    };
    if (/(y+)/.test(fmt))
        fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
        if (new RegExp("(" + k + ")").test(fmt))
            fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
}