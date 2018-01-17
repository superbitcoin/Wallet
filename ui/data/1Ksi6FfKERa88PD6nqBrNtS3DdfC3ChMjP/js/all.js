/* ---- /1Ksi6FfKERa88PD6nqBrNtS3DdfC3ChMjP/js/lib/ZeroFrame.coffee ---- */


(function () {
    var ZeroFrame,
        bind = function (fn, me) {
            return function () {
                return fn.apply(me, arguments);
            };
        },
        slice = [].slice;

    ZeroFrame = (function () {
        function ZeroFrame(url) {
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

        ZeroFrame.prototype.init = function () {
            return this;
        };

        ZeroFrame.prototype.connect = function () {
            this.target = window.parent;
            window.addEventListener("message", this.onMessage, false);
            return this.cmd("innerReady");
        };

        ZeroFrame.prototype.onMessage = function (e) {
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

        ZeroFrame.prototype.route = function (cmd, message) {
            return this.log("Unknown command", message);
        };

        ZeroFrame.prototype.response = function (to, result) {
            return this.send({
                "cmd": "response",
                "to": to,
                "result": result
            });
        };

        ZeroFrame.prototype.cmd = function (cmd, params, cb) {
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

        ZeroFrame.prototype.send = function (message, cb) {
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

        ZeroFrame.prototype.log = function () {
            var args;
            args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
            return console.log.apply(console, ["[ZeroFrame]"].concat(slice.call(args)));
        };

        ZeroFrame.prototype.onOpenWebsocket = function () {
            return this.log("Websocket open");
        };

        ZeroFrame.prototype.onCloseWebsocket = function () {
            return this.log("Websocket close");
        };

        return ZeroFrame;

    })();

    window.ZeroFrame = ZeroFrame;

}).call(this);


/* ---- /1Ksi6FfKERa88PD6nqBrNtS3DdfC3ChMjP/js/ZeroChat.coffee ---- */


(function () {
    var ZeroChat,
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

    ZeroChat = (function (superClass) {
        extend(ZeroChat, superClass);

        function ZeroChat() {
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
            return ZeroChat.__super__.constructor.apply(this, arguments);
        }

        ZeroChat.prototype.init = function () {
            return this.addLine("初始化成功");
        };

        ZeroChat.prototype.addLine = function (line) {
            var messages;
            messages = document.getElementById("messages");
            return messages.innerHTML = ("<li>" + line + "</li>") + messages.innerHTML;
        };

        ZeroChat.prototype.onOpenWebsocket = function (e) {
            Page.sendMsg();
            Page.getInfo();
            Page.recordAll();
            Page.getBalance();
            Page.getWalletInfo();
        };

        ZeroChat.prototype.sendMsg = function () {
            return this.cmd("siteInfo", [], (function (_this) {
                return function (site_info) {
                    return _this.addLine("站点信息: <pre>" + JSON.stringify(site_info, null, 2) + "</pre>");
                };
            })(this));
        };

        ZeroChat.prototype.getBalance = function () {
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

        ZeroChat.prototype.getNewAddress = function () {
            var label = '';
            return this.cmd("walletGetNewAddress", [label], (function (_this) {
                return function (balance) {
                    return document.getElementById("balance").innerHTML = JSON.stringify(balance[0].result, null, 2);
                };
            })(this));
        };

        ZeroChat.prototype.dumpprivkey = function () {
            var address = document.getElementById("addr_private").value;
            return this.cmd("walletDumpprivkey", [address], (function (_this) {
                return function (result) {
                    return document.getElementById("balance").innerHTML = JSON.stringify(result, null, 2);
                };
            })(this));
        };

        ZeroChat.prototype.importPriKey = function () {
            var privateKey = document.getElementById("privateKey").value;
            var privateKeyLabel = document.getElementById("privateKeyLabel").value;
            return this.cmd("walletImportPrivkey", [privateKey, privateKeyLabel], (function (_this) {
                return function (result) {
                    return document.getElementById("balance").innerHTML = JSON.stringify(result, null, 2);
                };
            })(this));
        };

        ZeroChat.prototype.sendToAddress = function () {
            // var fromAddress = document.getElementById("fromAddress").value;
            var toAddress = document.getElementById("toAddress").value;
            var value = document.getElementById("pay_value").value;
            // mydSgrG816yq8Kjhe3uW3bkjFLgBnkaCs1
            // n2ynxqSzhgyJJ5KBHPijKzNMqsgUd9Jsia "123"
            //mxHvi6U1NdtxiC82mpX6f6LKpAxdKUXjDq "asfd"
            return this.cmd("walletSendToAddress", [toAddress, value], (function (_this) {
                return function (result) {
                    if (result != null && result[0].error == null) {
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
        ZeroChat.prototype.accountList = function () {
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

        ZeroChat.prototype.addressList = function (account) {
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

        ZeroChat.prototype.recordAll = function () {
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
                        $("#record_all").append("<tr>" + "<td>" + formatDate(new Date(list[i].time)) + "</td>" +
                            "<td>发送</td>" +
                            " <td>" + list[i].address + "</td>" +
                            "<td>" + list[i].amount + " SBTC</td>" +
                            "</tr>")
                    }
                    return document.getElementById("balance").innerHTML = JSON.stringify(list, null, 2);
                };
            })(this));
        };

        ZeroChat.prototype.recordAddress = function () {
            // mydSgrG816yq8Kjhe3uW3bkjFLgBnkaCs1
            // n2ynxqSzhgyJJ5KBHPijKzNMqsgUd9Jsia "123"
            return this.cmd("walletListTransactions", [], (function (_this) {
                return function (result) {
                    var list = result[0].result;
                    var t1 = document.getElementById("record_address");
                    var rowNum = t1.rows.length;
                    if (rowNum > 1) {
                        for (i = 1; i < rowNum; i++) {
                            t1.deleteRow(i);
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
                    }
                    return document.getElementById("balance").innerHTML = JSON.stringify(list, null, 2);
                };
            })(this));
        };

        ZeroChat.prototype.stopWallet = function () {
            return this.cmd("walletStop", [], (function (_this) {
                return function (result) {
                    return document.getElementById("balance").innerHTML = result[0].result;
                };
            })(this));
        };

        ZeroChat.prototype.getInfo = function () {
            this.cmd("walletGetInfo", [], (function (_this) {
                return function (result) {
                    return document.getElementById("balance").innerHTML = JSON.stringify(result[0].result, null, 2) + "\n";
                };
            })(this));
        };
        // walletpassphrase
        ZeroChat.prototype.encryptWallet = function () {
            var password = document.getElementById("_fromAddress").value;
            this.cmd("walletEncryptWallet", [password], (function (_this) {
                return function (result) {
                    if (result != null) {
                        return document.getElementById("balance").innerHTML = JSON.stringify(result[0].result, null, 2) + "\n";
                    }
                };
            })(this));
        };

        ZeroChat.prototype.walletPassPhrase = function () {
            var password = document.getElementById("_fromAddress").value;
            this.cmd("walletPassPhrase", [password, 10], (function (_this) {
                return function (result) {
                    return document.getElementById("balance").innerHTML = JSON.stringify(result[0].result, null, 2) + "\n";
                };
            })(this));
        };

        ZeroChat.prototype.dumpWallet = function () {
            this.cmd("walletEncryptWallet", [], (function (_this) {
                return function (result) {
                    return document.getElementById("balance").innerHTML = JSON.stringify(result[0].result, null, 2) + "\n";
                };
            })(this));
        };

        ZeroChat.prototype.getWalletInfo = function () {
            var input_data;
            input_data = document.getElementById("message").value;
            return this.cmd("walletgetWalletInfo", [input_data], (function (_this) {
                return function (wallet_info) {
                    if (wallet_info[0].result.unlocked_until != null) {
                        alert("钱包加密");
                    }
                    return _this.addLine("钱包信息: <pre>" + JSON.stringify(wallet_info, null, 2) + "</pre>");
                };
            })(this));
        };

        return ZeroChat;

    })(ZeroFrame);

    window.Page = new ZeroChat();

}).call(this);

function formatDate(now) {
    var year = now.getYear();
    var month = now.getMonth() + 1;
    var date = now.getDate();
    var hour = now.getHours();
    var minute = now.getMinutes();
    var second = now.getSeconds();
    return "20" + year + "-" + month + "-" + date + "   " + hour + ":" + minute + ":" + second;
}