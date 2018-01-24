import logging
import sys

import msgpack
from gevent.server import StreamServer
from gevent.pool import Pool

from Config import config
from Crypt import CryptConnection

class ConnectionServer:
    def __init__(self, ip=None, port=None, request_handler=None):
        self.ip = ip
        self.port = port
        self.last_connection_id = 1  # Connection id incrementer
        self.log = logging.getLogger("ConnServer")
        self.port_opened = None

        self.ip_incoming = {}  # Incoming connections from ip in the last minute to avoid connection flood
        self.broken_ssl_peer_ids = {}  # Peerids of broken ssl connections
        self.ips = {}  # Connection by ip
        self.has_internet = True  # Internet outage detection

        self.stream_server = None
        self.running = True

        self.bytes_recv = 0
        self.bytes_sent = 0

        # Check msgpack version
        if msgpack.version[0] == 0 and msgpack.version[1] < 4:
            self.log.error(
                "Error: Unsupported msgpack version: %s (<0.4.0), please run `sudo apt-get install python-pip; sudo pip install msgpack-python --upgrade`" %
                str(msgpack.version)
            )
            sys.exit(0)

        # if port:  # Listen server on a port
        #     self.pool = Pool(1000)  # do not accept more than 1000 connections
        #     self.stream_server = StreamServer(
        #         (ip.replace("*", "0.0.0.0"), port), self.handleIncomingConnection, spawn=self.pool, backlog=500
        #     )
        #     if request_handler:
        #         self.handleRequest = request_handler

    def start(self):
        self.running = True
        CryptConnection.manager.loadCerts()
        self.log.debug("Binding to: %s:%s, (msgpack: %s), supported crypt: %s" % (
            self.ip, self.port,
            ".".join(map(str, msgpack.version)), CryptConnection.manager.crypt_supported)
        )
        try:
            self.stream_server.serve_forever()  # Start normal connection server
        except Exception, err:
            self.log.info("StreamServer bind error, must be running already: %s" % err)

    def stop(self):
        self.running = False
        if self.stream_server:
            self.stream_server.stop()

    def onInternetOnline(self):
        self.log.info("Internet online")

    def onInternetOffline(self):
        self.log.info("Internet offline")
