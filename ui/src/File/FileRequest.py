# Included modules
import os
import time
import json
import itertools

# Third party modules
import gevent

from Debug import Debug
from Config import config
from util import RateLimit
from util import StreamingMsgpack
from util import helper
from Plugin import PluginManager

FILE_BUFF = 1024 * 512


class RequestError(Exception):
    pass


# Incoming requests
@PluginManager.acceptPlugins
class FileRequest(object):
    __slots__ = ("server", "connection", "req_id", "sites", "log", "responded")

    def __init__(self, server, connection):
        self.server = server
        self.connection = connection

        self.req_id = None
        self.sites = self.server.sites
        self.log = server.log
        self.responded = False  # Responded to the request

    def send(self, msg, streaming=False):
        if not self.connection.closed:
            self.connection.send(msg, streaming)

    def sendRawfile(self, file, read_bytes):
        if not self.connection.closed:
            self.connection.sendRawfile(file, read_bytes)

    def response(self, msg, streaming=False):
        if self.responded:
            if config.verbose:
                self.log.debug("Req id %s already responded" % self.req_id)
            return
        if not isinstance(msg, dict):  # If msg not a dict create a {"body": msg}
            msg = {"body": msg}
        msg["cmd"] = "response"
        msg["to"] = self.req_id
        self.responded = True
        self.send(msg, streaming=streaming)

    # Route file requests
    def route(self, cmd, req_id, params):
        pass
        # self.req_id = req_id
        # # Don't allow other sites than locked
        # if "site" in params and self.connection.target_onion:
        #     valid_sites = self.connection.getValidSites()
        #     if params["site"] not in valid_sites:
        #         self.response({"error": "Invalid site"})
        #         self.connection.log(
        #             "Site lock violation: %s not in %s, target onion: %s" %
        #             (params["site"], valid_sites, self.connection.target_onion)
        #         )
        #         self.connection.badAction(5)
        #         return False
        #
        # if cmd == "update":
        #     event = "%s update %s %s" % (self.connection.id, params["site"], params["inner_path"])
        #     if not RateLimit.isAllowed(event):  # There was already an update for this file in the last 10 second
        #         time.sleep(5)
        #         self.response({"ok": "File update queued"})
        #     # If called more than once within 15 sec only keep the last update
        #     RateLimit.callAsync(event, max(self.connection.bad_actions, 15), self.actionUpdate, params)
        # else:
        #     func_name = "action" + cmd[0].upper() + cmd[1:]
        #     func = getattr(self, func_name, None)
        #     if cmd not in ["getFile", "streamFile"]:  # Skip IO bound functions
        #         s = time.time()
        #         if self.connection.cpu_time > 0.5:
        #             self.log.debug(
        #                 "Delay %s %s, cpu_time used by connection: %.3fs" %
        #                 (self.connection.ip, cmd, self.connection.cpu_time)
        #             )
        #             time.sleep(self.connection.cpu_time)
        #             if self.connection.cpu_time > 5:
        #                 self.connection.close("Cpu time: %.3fs" % self.connection.cpu_time)
        #     if func:
        #         func(params)
        #     else:
        #         self.actionUnknown(cmd, params)
        #
        #     if cmd not in ["getFile", "streamFile"]:
        #         taken = time.time() - s
        #         self.connection.cpu_time += taken

    # Update a site file request
    def actionUpdate(self, params):
        pass
        # site = self.sites.get(params["site"])
        # if not site or not site.settings["serving"]:  # Site unknown or not serving
        #     self.response({"error": "Unknown site"})
        #     self.connection.badAction(1)
        #     return False
        #
        # inner_path = params.get("inner_path", "")
        #
        # if not inner_path.endswith("content.json"):
        #     self.response({"error": "Only content.json update allowed"})
        #     self.connection.badAction(5)
        #     return
        #
        # try:
        #     content = json.loads(params["body"])
        # except Exception, err:
        #     self.log.debug("Update for %s is invalid JSON: %s" % (inner_path, err))
        #     self.response({"error": "File invalid JSON"})
        #     self.connection.badAction(5)
        #     return
        #
        # file_uri = "%s/%s:%s" % (site.address, inner_path, content["modified"])
        #
        # if self.server.files_parsing.get(file_uri):  # Check if we already working on it
        #     valid = None  # Same file
        # else:
        #     try:
        #         valid = site.content_manager.verifyFile(inner_path, content)
        #     except Exception, err:
        #         self.log.debug("Update for %s is invalid: %s" % (inner_path, err))
        #         valid = False
        #
        # if valid is True:  # Valid and changed
        #     site.log.info("Update for %s looks valid, saving..." % inner_path)
        #     self.server.files_parsing[file_uri] = True
        #     site.storage.write(inner_path, params["body"])
        #     del params["body"]
        #
        #     site.onFileDone(inner_path)  # Trigger filedone
        #
        #     if inner_path.endswith("content.json"):  # Download every changed file from peer
        #         peer = site.addPeer(self.connection.ip, self.connection.port, return_peer=True)  # Add or get peer
        #         # On complete publish to other peers
        #         diffs = params.get("diffs", {})
        #         site.onComplete.once(lambda: site.publish(inner_path=inner_path, diffs=diffs, limit=3), "publish_%s" % inner_path)
        #
        #         # Load new content file and download changed files in new thread
        #         def downloader():
        #             site.downloadContent(inner_path, peer=peer, diffs=params.get("diffs", {}))
        #             del self.server.files_parsing[file_uri]
        #
        #         gevent.spawn(downloader)
        #     else:
        #         del self.server.files_parsing[file_uri]
        #
        #     self.response({"ok": "Thanks, file %s updated!" % inner_path})
        #     self.connection.goodAction()
        #
        # elif valid is None:  # Not changed
        #     if params.get("peer"):
        #         peer = site.addPeer(*params["peer"], return_peer=True)  # Add or get peer
        #     else:
        #         peer = site.addPeer(self.connection.ip, self.connection.port, return_peer=True)  # Add or get peer
        #     if peer:
        #         if not peer.connection:
        #             peer.connect(self.connection)  # Assign current connection to peer
        #         if inner_path in site.content_manager.contents:
        #             peer.last_content_json_update = site.content_manager.contents[inner_path]["modified"]
        #         if config.verbose:
        #             self.log.debug(
        #                 "Same version, adding new peer for locked files: %s, tasks: %s" %
        #                 (peer.key, len(site.worker_manager.tasks))
        #             )
        #         for task in site.worker_manager.tasks:  # New peer add to every ongoing task
        #             if task["peers"] and not task["optional_hash_id"]:
        #                 # Download file from this peer too if its peer locked
        #                 site.needFile(task["inner_path"], peer=peer, update=True, blocking=False)
        #
        #     self.response({"ok": "File not changed"})
        #     self.connection.badAction()
        #
        # else:  # Invalid sign or sha hash
        #     self.response({"error": "File invalid: %s" % err})
        #     self.connection.badAction(5)

    # Send file content request
    def actionGetFile(self, params):
        pass

    # New-style file streaming out of Msgpack context
    def actionStreamFile(self, params):
        pass

    # Peer exchange request
    def actionPex(self, params):
        pass

    # Get modified content.json files since
    def actionListModified(self, params):
        pass

    def actionGetHashfield(self, params):
        pass

    def findHashIds(self, site, hash_ids, limit=100):
        pass

    def actionFindHashIds(self, params):
        pass

    def actionSetHashfield(self, params):
        pass

    def actionSiteReload(self, params):
        if self.connection.ip not in config.ip_local and self.connection.ip != config.ip_external:
            self.response({"error": "Only local host allowed"})

        site = self.sites.get(params["site"])
        site.content_manager.loadContent(params["inner_path"], add_bad_files=False)
        site.storage.verifyFiles(quick_check=True)
        site.updateWebsocket()

        self.response({"ok": "Reloaded"})

    def actionSitePublish(self, params):
        pass

    # Send a simple Pong! answer
    def actionPing(self, params):
        pass

    # Unknown command
    def actionUnknown(self, cmd, params):
        pass
