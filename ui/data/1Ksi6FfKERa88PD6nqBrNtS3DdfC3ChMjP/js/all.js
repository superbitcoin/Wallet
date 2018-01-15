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
            this.cmd("serverInfo", {}, (function (_this) {
                return function (server_info) {
                    return _this.addLine("服务器信息: <pre>" + JSON.stringify(server_info, null, 2) + "</pre>");
                };
            })(this));
            this.cmd("walletGetInfo", [], (function (_this) {
                return function (result) {
                    return document.getElementById("balance").innerHTML = JSON.stringify(result[0].result, null, 2) +"\n";
                };
            })(this));
            return this.cmd("walletGetBalance", ["address", "SBTC"], (function (_this) {
                return function (result) {
                    var input_balance = document.getElementById("balance_all");
                    var input_unconfirm = document.getElementById("bal_unconfirm");
                    var input_available = document.getElementById("bal_available");
                    input_balance.innerHTML = result[0].result.balance + result[0].result.unconfirmed_balance;
                    input_unconfirm.innerHTML = result[0].result.unconfirmed_balance + " SBTC";
                    input_available.innerHTML = result[0].result.balance + " SBTC";
                    return document.getElementById("balance").innerHTML += JSON.stringify(result[0].result, null, 2);
                };
            })(this));
        };

        ZeroChat.prototype.sendMsg = function () {
            var input_data;
            input_data = document.getElementById("message").value;
            return this.cmd("siteInfo", [input_data], (function (_this) {
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
            var fromAddress = document.getElementById("fromAddress").value;
            var toAddress = document.getElementById("toAddress").value;
            var value = document.getElementById("pay_value").value;
            // mydSgrG816yq8Kjhe3uW3bkjFLgBnkaCs1
            // n2ynxqSzhgyJJ5KBHPijKzNMqsgUd9Jsia "123"
            return this.cmd("walletSendToAddress", [fromAddress, toAddress, value], (function (_this) {
                return function (result) {
                    if (result[0].error == null) {
                        document.getElementById("payHash").innerHTML = result[0].result;
                    }else {
                        alert("交易发送错误");
                    }
                    return document.getElementById("balance").innerHTML = result[0].result;

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

        return ZeroChat;

    })(ZeroFrame);

    window.Page = new ZeroChat();

}).call(this);
