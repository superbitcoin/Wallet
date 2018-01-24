import json
import logging
import re
import sys

import util
from Config import config
from Content import ContentManager
from Crypt import CryptHash
from Plugin import PluginManager
from Worker import WorkerManager

from SiteStorage import SiteStorage


@PluginManager.acceptPlugins
class Site(object):
    def __init__(self, address, allow_create=True, settings=None):
        self.address = re.sub("[^A-Za-z0-9]", "", address)  # Make sure its correct address
        self.address_short = "%s..%s" % (self.address[:6], self.address[-4:])  # Short address for logging
        self.log = logging.getLogger("Site:%s" % self.address_short)
        self.addEventListeners()

        self.content = None  # Load content.json
        self.worker_manager = WorkerManager(self)  # Handle site download from other peers
        self.bad_files = {}  # SHA check failed files, need to redownload {"inner.content": 1} (key: file, value: failed accept)
        self.content_updated = None  # Content.js update time
        self.notifications = []  # Pending notifications displayed once on page load [error|ok|info, message, timeout]
        self.page_requested = False  # Page viewed in browser
        self.websockets = []  # Active site websocket connections

        self.connection_server = None
        self.storage = SiteStorage(self, allow_create=allow_create)  # Save and load site files
        self.loadSettings(settings)  # Load settings from sites.json
        self.content_manager = ContentManager(self)
        self.content_manager.loadContents()  # Load content.json files
        if "main" in sys.modules and "file_server" in dir(
                sys.modules["main"]):  # Use global file server by default if possible
            self.connection_server = sys.modules["main"].file_server
        else:
            self.connection_server = None
        if not self.settings.get("auth_key"):  # To auth user in site (Obsolete, will be removed)
            self.settings["auth_key"] = CryptHash.random()
            self.log.debug("New auth key: %s" % self.settings["auth_key"])

        if not self.settings.get("wrapper_key"):  # To auth websocket permissions
            self.settings["wrapper_key"] = CryptHash.random()
            self.log.debug("New wrapper key: %s" % self.settings["wrapper_key"])

    def __str__(self):
        return "Site %s" % self.address_short

    def __repr__(self):
        return "<%s>" % self.__str__()

    # Load site settings from data/sites.json
    def loadSettings(self, settings=None):
        if not settings:
            settings = json.load(open("%s/sites.json" % config.data_dir)).get(self.address)
        if settings:
            self.settings = settings
        return

    def saveSettings(self):
        pass

    # Max site size in MB
    def getSizeLimit(self):
        return self.settings.get("size_limit", int(config.size_limit))

    # Next size limit based on current size
    def getNextSizeLimit(self):
        size_limits = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000]
        size = self.settings.get("size", 0)
        for size_limit in size_limits:
            if size * 1.2 < size_limit * 1024 * 1024:
                return size_limit
        return 999999

    # Download all file from content.json
    def downloadContent(self, inner_path, download_files=True, peer=None, check_modifications=False, diffs={}):
        pass

    # Download all files of the site
    @util.Noparallel(blocking=False)
    def download(self, check_size=False, blind_includes=False):
        pass

    def pooledDownloadContent(self, inner_paths, pool_size=100, only_if_bad=False):
        pass

    def pooledDownloadFile(self, inner_paths, pool_size=100, only_if_bad=False):
        pass

    # Update worker, try to find client that supports listModifications command
    def updater(self, peers_try, queried, since):
        pass

    # Check modified content.json files from peers and add modified files to bad_files
    # Return: Successfully queried peers [Peer, Peer...]
    def checkModifications(self, since=None):
        pass

    # Update content.json from peers and download changed files
    # Return: None
    @util.Noparallel()
    def update(self, announce=False, check_files=False, since=None):
        pass

    # Update site by redownload all content.json
    def redownloadContents(self):
        pass

    # Publish worker
    def publisher(self, inner_path, peers, published, limit, diffs={}, event_done=None, cb_progress=None):
        pass

    # - Events -
    # Add event listeners
    def addEventListeners(self):
        pass

    def getReachableBadFiles(self):
        pass


