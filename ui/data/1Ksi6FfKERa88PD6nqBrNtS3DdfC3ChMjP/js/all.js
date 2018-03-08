/* ---- /1Ksi6FfKERa88PD6nqBrNtS3DdfC3ChMjP/js/lib/Frame.coffee ---- */

var record_index = 0;
var info;
var blockChainInfo;
var phraseType = 0;

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
    if (isWalletLocked) {
        ShowDiv('MyDiv1', 'fade1')
    } else {
        Page.sendToAddress();
    }
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
            this.signMsg = bind(this.signMsg, this);
            this.updateWalletUi = bind(this.updateWalletUi, this);
            this.checkUpdate = bind(this.checkUpdate, this);
            this.backupWallet = bind(this.backupWallet, this);
            this.walletPassphraseChange = bind(this.walletPassphraseChange, this);
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
            // return this.addLine("init");
        };

        SbtcChat.prototype.addLine = function (line) {
            var messages;
            messages = document.getElementById("messages");
            return messages.innerHTML = ("<li>" + line + "</li>") + messages.innerHTML;
        };

        SbtcChat.prototype.onOpenWebsocket = function (e) {
            // Page.sendMsg();
            Page.getInfo();
            Page.recordAddress(0, 'record_address')
            // Page.getBalance();
            Page.getWalletInfo();
            Page.getBlockChainInfo();
            Page.checkUpdate();
        };

        SbtcChat.prototype.sendMsg = function () {
            return this.cmd("siteInfo", [], (function (_this) {
                return function (site_info) {
                };
            })(this));
        };

        SbtcChat.prototype.getBalance = function () {
            return this.cmd("walletGetWalletInfo", [], (function (_this) {
                return function (result) {
                    var input_balance = document.getElementById("balance_all");
                    var input_unconfirm = document.getElementById("bal_unconfirm");
                    var input_available = document.getElementById("bal_available");
                    var balance_send = document.getElementById("balance_send");

                    var balance_all = result[0].result.balance + result[0].result.unconfirmed_balance;

                    input_balance.innerHTML = balance_all;
                    input_unconfirm.innerHTML = result[0].result.unconfirmed_balance + " SBTC";
                    input_available.innerHTML = result[0].result.balance + " SBTC";

                    balance_send.innerHTML = "余额：" + balance_all + " SBTC";
                };
            })(this));
        };

        SbtcChat.prototype.getNewAddress = function () {
            var label = document.getElementById("label_newAddr").value;
            return this.cmd("walletGetNewAddress", [label], (function (_this) {
                return function (data) {
                    CloseDiv('MyDiv', 'fade');
                    if (data !== null && data[0].result !== null) {
                        alert("获得新地址：" + data[0].result);
                        Page.accountList();
                        // Page.recordAddress();
                    }
                };
            })(this));
        };

        SbtcChat.prototype.dumpprivkey = function () {
            // var address = document.getElementById("addr_private").value;
            var address = $("#select_export_addr option:selected").text();
            return this.cmd("walletDumpprivkey", [address], (function (_this) {
                return function (result) {
                    CloseDiv('MyDiv12', 'fade');
                    if (result != null && result[0].result != null) {
                        document.getElementById("privateKeyTx").download = Date.parse(new Date());
                        document.getElementById("privateKeyTx").href = "data:text/plain,{\"version\":0.1,\"content\":" + JSON.stringify(result[0].result, null, 2) + "}"
                        ShowDiv('MyDiv14', 'fade');
                        // alert(address + '的私钥是：' + result[0].result);
                    } else {
                        alert("导出私钥出错");
                    }
                };
            })(this));
        };

        SbtcChat.prototype.importPriKey = function () {
            // var privateKey = document.getElementById("privateKey").value;
            // var privateKeyLabel = document.getElementById("privateKeyLabel").value;
            var privateKey = document.getElementById("tx_priKey").value;
            var privateKeyLabel = 'outKey';
            return this.cmd("walletImportPrivkey", [privateKey, privateKeyLabel], (function (_this) {
                return function (result) {
                    document.getElementById("tx_priKey").innerHTML = "";
                    document.getElementById("tx_priKey").value = "";
                    CloseDiv('MyDiv12', 'fade');
                    if (result != null && result[0].error == null) {
                        alert('私钥导入成功');
                    } else {
                        alert('私钥导入失败：' + JSON.stringify(result[0].error));
                    }
                };
            })(this));
        };

        SbtcChat.prototype.sendToAddress = function () {
            var toAddress = document.getElementById("toAddress").value;
            var value = document.getElementById("pay_value").value;
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
                        alert("转账成功： " + result[0].result);
                        document.getElementById("payHash").innerHTML = result[0].result;
                        Page.getBalance();
                    } else {
                        alert("转账失败： " + result[0].error.message);
                    }
                    return document.getElementById("balance").innerHTML = result[0].result;
                };
            })(this));
        };
        var recevieAddr = null;
        var addrList = [];
        SbtcChat.prototype.accountList = function (type) {
            return this.cmd("walletListAccounts", [], (function (_this) {
                return function (result) {
                    var list = result[0].result;
                    $("#select_receive_addr").empty();
                    $("#select_export_addr").empty();
                    $("#select_sign_addr").empty();
                    recevieAddr = null;
                    for (var item in list) {
                        Page.addressList(item, type);
                    }
                    if (addrList !== null && addrList.length > 0) {
                        // qrcode.makeCode(addrList[0]);
                        showQR(addrList[0]);
                        if (type == 1) {
                            ShowDiv('MyDiv12', 'fade');
                        } else if (type == 2) {
                            ShowDiv('MyDiv15', 'fade');
                        }
                    }
                };
            })(this));
        };

        SbtcChat.prototype.addressList = function (account, type) {
            // mydSgrG816yq8Kjhe3uW3bkjFLgBnkaCs1
            // n2ynxqSzhgyJJ5KBHPijKzNMqsgUd9Jsia "123"
            return this.cmd("walletGetAddressesListByAccount", [account], (function (_this) {
                return function (result) {
                    var list = result[0].result;
                    for (var i = 0; i < list.length; i++) {
                        if (recevieAddr === null) {
                            recevieAddr = list[0];
                        }
                        addrList.push(list[i]);
                        // $("#select_send_addr").append("<option>" + list[i] + "</option>");
                        $("#select_receive_addr").append("<option>" + list[i] + "</option>");
                        $("#select_export_addr").append("<option>" + list[i] + "</option>");
                        $("#select_sign_addr").append("<option>" + list[i] + "</option>");
                    }
                    if (addrList !== null && addrList.length > 0) {
                        qrcode.makeCode(addrList[0]);
                        if (type == 1) {
                            ShowDiv('MyDiv12', 'fade');
                        } else if (type == 2) {
                            ShowDiv('MyDiv15', 'fade');
                        }
                        // showQR(addrList[0]);
                    }
                };
            })(this));
        };

        SbtcChat.prototype.recordAll = function (index, _type) {
            var params = [0];
            if (index == "front") {
                if (record_index >= 1) {
                    record_index -= 1;
                }
                params = [record_index];
            } else if (index == "next") {
                record_index += 1;
                params = [record_index];
            } else {
                record_index = 0;
            }
            return this.cmd("walletListTransactions", params, (function (_this) {
                return function (result) {
                    var t1 = document.getElementById("record_all");
                    // var t2 = document.getElementById("record_address");
                    var rowNum = t1.rows.length;
                    if (rowNum > 1) {
                        for (var i = 1; i < rowNum; i++) {
                            t1.deleteRow(i);
                            // t2.deleteRow(i);
                            rowNum = rowNum - 1;
                            i = i - 1;
                        }
                    }
                    var list = result[0].result;
                    for (var j = 0; j < list.length; j++) {
                        var type = list[j].amount > 0 ? "接收" : "发送";
                        $("#record_all").append("<tr>" + "<td>" + formatDate(new Date(list[j].time)) + "</td>" +
                            "<td>" + type + "</td>" +
                            " <td>" + list[j].address + "</td>" +
                            "<td>" + list[j].amount + " SBTC</td>" +
                            "</tr>");
                        // $("#record_address").append("<tr>" + "<td>" + formatDate(new Date(list[j].time)) + "</td>" +
                        //     "<td>" + type + "</td>" +
                        //     " <td>" + list[j].address + "</td>" +
                        //     "<td>" + list[j].amount + " SBTC</td>" +
                        //     "</tr>");
                    }
                };
            })(this));
        };

        SbtcChat.prototype.recordAddress = function (index, _type) {
            var params = [0];
            if (index == "front") {
                if (record_index >= 1) {
                    record_index -= 1;
                }
                params = [record_index];
            } else if (index == "next") {
                record_index += 1;
                params = [record_index];
            } else {
                record_index = 0;
            }
            return this.cmd("walletListTransactions", params, (function (_this) {
                return function (result) {
                    var list = result[0].result;
                    var t;
                    if (_type == "record_address") {
                        t = document.getElementById("record_address");
                    } else if (_type == "record_all") {
                        t = document.getElementById("record_all");
                    }
                    var rowNum = t.rows.length;
                    if (rowNum > 1) {
                        for (i = 1; i < rowNum; i++) {
                            t.deleteRow(i);
                            rowNum = rowNum - 1;
                            i = i - 1;
                        }
                    }
                    for (var i = 0; i < list.length; i++) {
                        var type = list[i].amount > 0 ? "接收" : "发送";
                        if (_type == "record_address") {
                            $("#record_address").append("<tr>" + "<td>" + formatDate(new Date(list[i].time)) + "</td>" +
                                "<td>" + type + "</td>" +
                                " <td>" + list[i].address + "</td>" +
                                "<td>" + list[i].amount + " SBTC</td>" +
                                "</tr>");
                        } else if (_type == "record_all") {
                            $("#record_all").append("<tr>" + "<td>" + formatDate(new Date(list[i].time)) + "</td>" +
                                "<td>" + type + "</td>" +
                                " <td>" + list[i].address + "</td>" +
                                "<td>" + list[i].amount + " SBTC</td>" +
                                "</tr>");
                        }
                    }
                };
            })(this));
        };

        SbtcChat.prototype.stopWallet = function () {
            return this.cmd("walletStop", [], (function (_this) {
                return function (result) {
                };
            })(this));
        };

        SbtcChat.prototype.backupWallet = function () {
            return this.cmd("backupWallet", [], (function (_this) {
                return function (result) {
                    // return document.getElementById("balance").innerHTML = JSON.stringify(result[0].result, null, 2) + "\n";
                };
            })(this));
        };

        SbtcChat.prototype.getInfo = function () {
            this.cmd("walletGetInfo", [], (function (_this) {
                return function (_info) {
                    if (_info != null) {
                        info = _info[0].result;
                    } else {
                        alert("获取钱包信息失败，请刷新页面或重启钱包");
                    }
                };
            })(this));
        };
        // walletpassphrase
        SbtcChat.prototype.encryptWallet = function () {
            var password = document.getElementById("pwd").value;
            var confirm = document.getElementById("pwd_confirm").value;
            if (password === "") {
                alert("请输入密码");
                return;
            }
            if (confirm === "") {
                alert("请输入确认密码");
                return;
            }
            if (password !== confirm) {
                alert("两次密码不一致");
                return;
            }
            document.getElementById("pwd_confirm").innerHTML = "";
            document.getElementById("pwd").innerHTML = "";
            this.cmd("walletEncryptWallet", [password], (function (_this) {
                // alert("正在设置密码，请勿刷新");
                return function (result) {
                    CloseDiv("MyDiv4", "fade");

                    if (result != null) {
                        alert("设置成功，请重启钱包");
                        // return document.getElementById("balance").innerHTML = JSON.stringify(result[0].result, null, 2) + "\n";
                    } else {
                        alert("设置密码失败，请稍后重试");
                    }
                };
            })(this));
        };

        SbtcChat.prototype.walletPassPhrase = function (type) {
            var password;
            if (type == 0) {
                password = document.getElementById("trade_pwd").value;
                CloseDiv('MyDiv1', 'fade1');
            } else if (type == 1) {
                password = document.getElementById("signPwd").value;
            } else if (type == 2) {
                password = document.getElementById("pwd_dumpprikey").value;
                CloseDiv('MyDiv16', 'fade1');
            } else if (type == 3) {
                password = document.getElementById("pwd_importprikey").value;
                CloseDiv('MyDiv17', 'fade1');
            } else {
                password = document.getElementById("_trade_pwd").value;
                CloseDiv('MyDiv11', 'fade1');
            }
            if (password === "") {
                alert("请输入密码");
                // CloseDiv('MyDiv1', 'fade1');
                return;
            }
            this.cmd("walletPassPhrase", [password], (function () {
                return function (result) {
                    document.getElementById("trade_pwd").innerHTML = "";
                    document.getElementById("_trade_pwd").innerHTML = "";
                    document.getElementById("pwd_dumpprikey").value = "";
                    document.getElementById("pwd_importprikey").value = "";
                    if (result !== null && result[0].error === null) {
                        if (type == 0) {
                            Page.sendToAddress();
                        } else if (type == 1) {
                            Page.signMsg();
                        } else if (type == 2) {
                            Page.dumpprivkey();
                        } else if (type == 3) {
                            Page.importPriKey();
                        }
                    } else {
                        alert("密码错误");
                    }
                    // document.getElementById("balance").innerHTML = JSON.stringify(result[0].result, null, 2) + "\n";
                };
            })(this));
        };

        SbtcChat.prototype.walletPassphraseChange = function () {
            var pwd_current = document.getElementById("pwd_current").value;
            var pwd_new = document.getElementById("pwd_new").value;
            var pwd_new_confirm = document.getElementById("pwd_new_confirm").value;
            if (pwd_current === "") {
                alert("请输入密码");
                return;
            }
            if (pwd_new === "") {
                alert("请输入新密码");
                return;
            }
            if (pwd_new_confirm === "") {
                alert("请输入确认密码");
                return;
            }
            if (pwd_new !== pwd_new_confirm) {
                alert("两次密码不一致");
                return;
            }
            document.getElementById("pwd_current").innerHTML = "";
            document.getElementById("pwd_new").innerHTML = "";
            document.getElementById("pwd_new").innerHTML = "";
            this.cmd("walletPassphraseChange", [pwd_current, pwd_new], (function (_this) {
                // alert("正在设置密码，请稍等");
                return function (data) {
                    CloseDiv('MyDiv0', 'fade');
                    if (data !== null && data[0].error === null) {
                        alert("修改成功");
                    } else {
                        alert("密码错误");
                    }
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

        var walletInfo;
        SbtcChat.prototype.getWalletInfo = function (type) {
            return this.cmd("walletGetWalletInfo", [], (function (_this) {
                return function (wallet_info) {
                    if (type === null || type === 0) {
                    } else {
                        // _this.addLine("钱包信息: <pre>" + JSON.stringify(wallet_info, null, 2) + "</pre>");
                        walletInfo = wallet_info[0].result;
                        if (wallet_info[0] != null && wallet_info[0].result.unlocked_until != null) {
                            isWalletLocked = true;
                        } else {
                            // alert("钱包未加密，是否现在加密？");
                        }
                        // _this.addLine("钱包信息: <pre>" + JSON.stringify(wallet_info, null, 2) + "</pre>");
                    }
                };
            })(this));
        };

        SbtcChat.prototype.getBlockChainInfo = function () {
            return this.cmd("walletGetBlockChainInfo", [], (function (_this) {
                return function (_blockChainInfo) {
                    blockChainInfo = _blockChainInfo[0];
                    document.getElementById("process").style.width = ((info.blocks / blockChainInfo.result.headers ) * 100) + "%";
                    var _leftTime = blockChainInfo.result.headers - info.blocks;
                    // document.getElementById("leftTime").innerHTML = "Left：" + leftTime(_leftTime * 10);
                    if (_leftTime > 0) {
                        document.getElementById("leftTime").innerHTML = "剩余：" + _leftTime + " 个块没有同步";
                    } else {
                        document.getElementById("loading").innerHTML = "网络同步";
                        clearInterval(loadingTimer);
                        document.getElementById("leftTime").innerHTML = "同步完成";
                    }
                    Page.getBalance();
                };
            })(this));
        };

        SbtcChat.prototype.signMsg = function () {
            // var message = "123";
            // var address = addrList[0];
            var message = document.getElementById("singTx").value;
            var address = $("#select_sign_addr option:selected").text();
            return this.cmd("signMsg", [address, message], (function (_this) {
                return function (_result) {
                    if (_result != null && _result[0].result != null) {
                        // alert(_result[0].result);
                        document.getElementById("signResult").innerHTML = "签名结果：" + _result[0].result;
                    } else {
                        alert('签名错误');
                    }
                };
            })(this));
        };

        SbtcChat.prototype.checkUpdate = function () {
            return this.cmd("checkUpdate", [], (function (_this) {
                return function (result) {
                    // console.info(result);
                    if (result) {
                        ShowDiv("MyDiv10", "fade");
                    }
                };
            })(this));
        };

        SbtcChat.prototype.updateWalletUi = function () {
            // alert("正在更新，请稍等");
            CloseDiv("MyDiv10", "fade");
            return this.cmd("updateWalletUi", [], (function (_this) {
                return function (result) {
                    if (result) {
                        alert("更新完成，请重启钱包");
                    }
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

function leftTime(blockNumber) {
    var leftTime = blockNumber * 10 * 1000;
    return timediff(leftTime);
}

function timediff(leftTime) {
    // var leftTime = (new Date(times)) - (new Date());
    var days = parseInt(leftTime / 1000 / 60 / 60 / 24, 10);
    var hours = parseInt(leftTime / 1000 / 60 / 60 % 24, 10);
    var minutes = parseInt(leftTime / 1000 / 60 % 60, 10);
    var seconds = parseInt(leftTime / 1000 % 60, 10);
    days = checkTime(days);
    hours = checkTime(hours);
    minutes = checkTime(minutes);
    seconds = checkTime(seconds);
    var timehtml = days + " days " + hours + " hour " + minutes + " minutes";
    return timehtml;
}

function checkTime(i) {
    //将0-9的数字前面加上0，例1变为01
    if (i < 10) {
        i = "0" + i;
    }
    return i;
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