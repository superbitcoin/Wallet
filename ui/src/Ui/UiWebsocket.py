# -*- coding:utf-8 -*-
import json
import time
import sys
import hashlib
import os
import shutil
import re

import gevent

from Config import config
from Site import SiteManager
from Debug import Debug
from util import QueryJson, RateLimit
from Plugin import PluginManager
from Translate import translate as _
import urllib2
import base64


@PluginManager.acceptPlugins
class UiWebsocket(object):
    def __init__(self, ws, site, server, user, request):
        self.ws = ws
        self.site = site
        self.user = user
        self.log = site.log
        self.request = request
        self.permissions = []
        self.server = server
        self.next_message_id = 1
        self.waiting_cb = {}  # Waiting for callback. Key: message_id, Value: function pointer
        self.channels = []  # Channels joined to
        self.sending = False  # Currently sending to client
        self.send_queue = []  # Messages to send to client
        self.admin_commands = (
            "sitePause", "siteResume", "siteDelete", "siteList", "siteSetLimit", "siteClone",
            "channelJoinAllsite", "serverUpdate", "serverPortcheck", "serverShutdown", "serverShowdirectory",
            "certSet", "configSet", "permissionAdd", "permissionRemove"
        )
        self.async_commands = ("fileGet", "fileList", "dirList")

    # Start listener loop
    def start(self):
        ws = self.ws
        if self.site.address == config.homepage and not self.site.page_requested:
            # Add open fileserver port message or closed port error to homepage at first request after start
            self.site.page_requested = True  # Dont add connection notification anymore
            file_server = sys.modules["main"].file_server
            if file_server.port_opened is None:
                self.site.page_requested = False  # Not ready yet, check next time
            else:
                try:
                    self.addHomepageNotifications()
                except Exception, err:
                    self.log.error("Uncaught Exception: " + Debug.formatException(err))

        for notification in self.site.notifications:  # Send pending notification messages
            # send via WebSocket
            self.cmd("notification", notification)
            # just in case, log them to terminal
            if notification[0] == "error":
                self.log.error("\n*** %s\n" % self.dedent(notification[1]))

        self.site.notifications = []

        while True:
            try:
                if ws.closed:
                    break
                else:
                    message = ws.receive()
            except Exception, err:
                self.log.error("WebSocket receive error: %s" % Debug.formatException(err))
                break

            if message:
                try:
                    self.handleRequest(message)
                except Exception, err:
                    if config.debug:  # Allow websocket errors to appear on /Debug
                        sys.modules["main"].DebugHook.handleError()
                    self.log.error("WebSocket handleRequest error: %s \n %s" % (Debug.formatException(err), message))
                    if not self.hasPlugin("Multiuser"):
                        self.cmd("error", "Internal error: %s" % Debug.formatException(err, "html"))

    def dedent(self, text):
        return re.sub("[\\r\\n\\x20\\t]+", " ", text.strip().replace("<br>", " "))

    def addHomepageNotifications(self):
        pass

    def hasPlugin(self, name):
        return name in PluginManager.plugin_manager.plugin_names

    # Has permission to run the command
    def hasCmdPermission(self, cmd):
        cmd = cmd[0].lower() + cmd[1:]

        if cmd in self.admin_commands and "ADMIN" not in self.permissions:
            return False
        else:
            return True

    # Has permission to access a site
    def hasSitePermission(self, address):
        if address != self.site.address and "ADMIN" not in self.site.settings["permissions"]:
            return False
        else:
            return True

    # Event in a channel
    def event(self, channel, *params):
        if channel in self.channels:  # We are joined to channel
            if channel == "siteChanged":
                site = params[0]  # Triggerer site
                site_info = self.formatSiteInfo(site)
                if len(params) > 1 and params[1]:  # Extra data
                    site_info.update(params[1])
                self.cmd("setSiteInfo", site_info)

    # Send response to client (to = message.id)
    def response(self, to, result):
        self.send({"cmd": "response", "to": to, "result": result})

    # Send a command
    def cmd(self, cmd, params={}, cb=None):
        self.send({"cmd": cmd, "params": params}, cb)

    # Encode to json and send message
    def send(self, message, cb=None):
        message["id"] = self.next_message_id  # Add message id to allow response
        self.next_message_id += 1
        if cb:  # Callback after client responded
            self.waiting_cb[message["id"]] = cb
        if self.sending:
            return  # Already sending
        self.send_queue.append(message)
        try:
            while self.send_queue:
                self.sending = True
                message = self.send_queue.pop(0)
                self.ws.send(json.dumps(message))
                self.sending = False
        except Exception, err:
            self.log.debug("Websocket send error: %s" % Debug.formatException(err))

    def getPermissions(self, req_id):
        permissions = self.site.settings["permissions"]
        if req_id >= 1000000:  # Its a wrapper command, allow admin commands
            permissions = permissions[:]
            permissions.append("ADMIN")
        return permissions

    def asyncWrapper(self, func):
        def asyncErrorWatcher(func, *args, **kwargs):
            try:
                func(*args, **kwargs)
            except Exception, err:
                if config.debug:  # Allow websocket errors to appear on /Debug
                    sys.modules["main"].DebugHook.handleError()
                self.log.error("WebSocket handleRequest error: %s" % Debug.formatException(err))
                self.cmd("error", "Internal error: %s" % Debug.formatException(err, "html"))

        def wrapper(*args, **kwargs):
            gevent.spawn(asyncErrorWatcher, func, *args, **kwargs)

        return wrapper

    # Handle incoming messages
    def handleRequest(self, data):
        req = json.loads(data)

        cmd = req.get("cmd")
        print(cmd)
        params = req.get("params")
        print(params)
        self.permissions = self.getPermissions(req["id"])
        if cmd == "response":  # It's a response to a command
            return self.actionResponse(req["to"], req["result"])
        # elif cmd[:6] == "wallet":
        #     func_name = "action" + cmd[0].upper() + cmd[1:]
        #     print("actoinname: " + func_name)
        #     wallet = Wallet()
        #     func = wallet.__getattr__(func_name)
        #     func = self.asyncWrapper(func)
        #     if not func:  # Unknown command
        #         self.response(req["id"], {"error": "Unknown command: %s" % cmd})
        #         return
        elif not self.hasCmdPermission(cmd):  # Admin commands
            return self.response(req["id"], {"error": "You don't have permission to run %s" % cmd})
        else:  # Normal command
            func_name = "action" + cmd[0].upper() + cmd[1:]
            func = getattr(self, func_name, None)
            if not func:  # Unknown command
                self.response(req["id"], {"error": "Unknown command: %s" % cmd})
                return

        # Execute in parallel
        if cmd in self.async_commands:
            func = self.asyncWrapper(func)

        # Support calling as named, unnamed parameters and raw first argument too
        if type(params) is dict:
            func(req["id"], **params)
        elif type(params) is list:
            func(req["id"], *params)
        elif params:
            func(req["id"], params)
        else:
            func(req["id"])

    # def actionWalletGetBalance(self, to):
    #     print("actoinWalletGetBalance")
    #     self.response(to, "123456")

    # Format site info
    def formatSiteInfo(self, site, create_user=True):
        content = site.content_manager.contents.get("content.json")
        if content:  # Remove unnecessary data transfer
            content = content.copy()
            content["files"] = len(content.get("files", {}))
            content["files_optional"] = len(content.get("files_optional", {}))
            content["includes"] = len(content.get("includes", {}))
            if "sign" in content:
                del (content["sign"])
            if "signs" in content:
                del (content["signs"])
            if "signers_sign" in content:
                del (content["signers_sign"])

        settings = site.settings.copy()
        del settings["wrapper_key"]  # Dont expose wrapper key
        del settings["auth_key"]  # Dont send auth key twice

        ret = {
            "auth_key": self.site.settings["auth_key"],  # Obsolete, will be removed
            "auth_address": self.user.getAuthAddress(site.address, create=create_user),
            "cert_user_id": self.user.getCertUserId(site.address),
            "address": site.address,
            "settings": settings,
            "content_updated": site.content_updated,
            "bad_files": len(site.bad_files),
            "size_limit": site.getSizeLimit(),
            "next_size_limit": site.getNextSizeLimit(),
            # "peers": max(site.settings.get("peers", 0), len(site.peers)),
            "started_task_num": site.worker_manager.started_task_num,
            "tasks": len(site.worker_manager.tasks),
            "workers": len(site.worker_manager.workers),
            "content": content
        }
        if site.settings["own"]:
            ret["privatekey"] = bool(self.user.getSiteData(site.address, create=create_user).get("privatekey"))
        # if site.settings["serving"] and content:
        #     ret["peers"] += 1  # Add myself if serving
        return ret

    def formatServerInfo(self):
        return {
            "ip_external": sys.modules["main"].file_server.port_opened,
            "platform": sys.platform,
            "fileserver_ip": config.fileserver_ip,
            "fileserver_port": config.fileserver_port,
            "ui_ip": config.ui_ip,
            "ui_port": config.ui_port,
            "version": config.version,
            "rev": config.rev,
            "language": config.language,
            "debug": config.debug,
            "plugins": PluginManager.plugin_manager.plugin_names
        }

    # - Actions -

    # Do callback on response {"cmd": "response", "to": message_id, "result": result}
    # def actionResponse(self, to, result):
    #     if to in self.waiting_cb:
    #         self.waiting_cb[to](result)  # Call callback function
    #     else:
    #         self.log.error("Websocket callback not found: %s, %s" % (to, result))

    # Send a simple pong answer
    # def actionPing(self, to):
    #     self.response(to, "pong")

    # Send site details
    def actionSiteInfo(self, to, file_status=None):
        # print("actionSiteInfo")
        ret = self.formatSiteInfo(self.site)
        if file_status:  # Client queries file status
            if self.site.storage.isFile(file_status):  # File exist, add event done
                ret["event"] = ("file_done", file_status)
        self.response(to, ret)

    # Server variables
    def actionServerInfo(self, to):
        # print("actionServerInfo")
        ret = self.formatServerInfo()
        self.response(to, ret)

    # def actionServerUpdate(self, to):
    #     self.cmd("updating")
    #     sys.modules["main"].update_after_shutdown = True
    #     SiteManager.site_manager.save()
    #     sys.modules["main"].file_server.stop()
    #     sys.modules["main"].ui_server.stop()

    def actionWalletGetBalance(self, to):
        print("------actionWalletGetBalance--------")
        postdata = dict(method='getbalance', id=1)
        data = self.rpcRequest(postdata)
        return self.response(to, data)

    def actionWalletGetInfo(self, to):
        print("------actionWalletGetInfo--------")
        postdata = dict(method='getinfo', params=[], id=1)
        data = self.rpcRequest(postdata)
        return self.response(to, data)

    def actionWalletSendToAddress(self, to, toAddr, amount):
        print("------actionWalletSendToAddress--------")
        postdata = dict(method='sendtoaddress', params=[toAddr, amount], id=1)
        data = self.rpcRequest(postdata)
        return self.response(to, data)

    def actionWalletGetNewAddress(self, to, label):
        print("------actionGetNewAddress--------")
        postdata = dict(method='getnewaddress', params=[label], id=1)
        data = self.rpcRequest(postdata)
        return self.response(to, data)

    # 导出私钥 address:地址
    def actionWalletDumpprivkey(self, to, address):
        print("------actionWalletDumpprivkey--------")
        postdata = dict(method='dumpprivkey', params=[address], id=1)
        data = self.rpcRequest(postdata)
        return self.response(to, data)

    # 导入私钥 privateKey:私钥明文
    def actionWalletImportPrivkey(self, to, privateKey, label):
        print("------actionWalletImportPrivkey--------")
        postdata = dict(method='importprivkey', params=[privateKey, label], id=1)
        data = self.rpcRequest(postdata)
        return self.response(to, data)

    def actionWalletListAccounts(self, to):
        print("------actionWalletListAccounts--------")
        postdata = dict(method='listaccounts', params=[], id=1)
        data = self.rpcRequest(postdata)
        return self.response(to, data)

    def actionWalletListTransactions(self, to, index):
        print("------actionListTransactions--------")
        postdata = dict(method='listtransactions', params=["*", 10, 10 * index], id=1)
        data = self.rpcRequest(postdata)
        return self.response(to, data)

    def actionWalletGetAddressesListByAccount(self, to, label):
        print("------actionWalletGetAddressesListByAccount--------")
        postdata = dict(method='getaddressesbyaccount', params=[label], id=1)
        data = self.rpcRequest(postdata)
        return self.response(to, data)

    def actionWalletGetBlockChainInfo(self, to):
        print("------actionWalletGetBlockChainInfo--------")
        postdata = dict(method='getblockchaininfo', id=1)
        data = self.rpcRequest(postdata)
        return self.response(to, data)

    def actionWalletGetWalletInfo(self, to):
        print("------actionWalletGetWalletInfo--------")
        postdata = dict(method='getwalletinfo', id=1)
        data = self.rpcRequest(postdata)
        return self.response(to, data)

    def actionWalletEncryptWallet(self, to, password):
        print("------actionWalletEncryptWallet--------")
        postdata = dict(method='encryptwallet', params=[password], id=1)
        data = self.rpcRequest(postdata)
        return self.response(to, data)

    def actionWalletPassphraseChange(self, to, pwd_now, pwd_new):
        print("------actionWalletPassphraseChange--------")
        postdata = dict(method='walletpassphrasechange', params=[pwd_now, pwd_new], id=1)
        data = self.rpcRequest(postdata)
        return self.response(to, data)

    def actionWalletDumpWallet(self, to, password):
        print("------actionWalletDumpWallet--------")
        postdata = dict(method='dumpwallet', params=[password], id=1)
        data = self.rpcRequest(postdata)
        return self.response(to, data)

    def actionWalletPassPhrase(self, to, password):
        print("------actionWalletPassPhrase--------")
        postdata = dict(method='walletpassphrase', params=[password, 50], id=1)
        data = self.rpcRequest(postdata)
        return self.response(to, data)

    def actionWalletStop(self, to):
        print("------actoinWalletStop--------")
        postdata = dict(method='stop', id=1)
        data = self.rpcRequest(postdata)
        return self.response(to, data)

    def rpcRequest(self, postdata):
        data = None
        url = "http://127.0.0.1:18334"
        # url = "http://47.104.14.35:8334"
        # url = "http://192.168.1.119:18332"
        post = []
        post.append(postdata)
        req = urllib2.Request(url, json.dumps(post))
        req.add_header('Content-Type', 'application/json;charset=utf-8')
        # auth = base64.b64encode('bitcoin:local321')
        print(config.rpcuser + ':' + config.rpcpassword)
        # auth = base64.b64encode('admin' + ':' + 'morning')
        auth = base64.b64encode(config.rpcuser + ':' + config.rpcpassword)
        req.add_header("Authorization", 'Basic ' + auth)
        try:
            response = urllib2.urlopen(req)
            data = json.loads(response.read())
        except Exception, err:
            print err
            print err.message
        print(data)
        return data

    def actionBackupWallet(self, to):
        print('--------actionBackupWallet--------')
        import os
        file_path = os.path.abspath(__file__)
        # if file_path.endswith('wallet\\ui\\src\\Ui\\UiWebsocket.py'):
        block_path = file_path.replace('ui\\src\\Ui\\UiWebsocket.py', 'block')
        os.startfile(block_path)

    def actionCheckUpdate(self, to):
        import httplib
        headers = {"Content-type": "application/x-www-form-urlencoded", "Accept": "text/plain"}
        conn = httplib.HTTPConnection("47.104.14.35")
        conn.request("GET", "", "", headers)
        response = conn.getresponse()
        data = response.read()
        print (data)
        strs = data.split('=')
        print (float(strs[1]))
        ver = float(strs[1])
        needUpdate = False
        if ver > float(config.version):
            needUpdate = True
        # print(strs[1])
        # print(float(strs[1]) > float(config.version))
        print (data)
        return self.response(to, needUpdate)

    def actionUpdateWalletUi(self, to):
        import update
        try:
            data = update.update()
            return self.response(to, data)
        except Exception, err:
            print "Update error: %s" % err
            # import atexit
            # atexit._run_exitfuncs()
