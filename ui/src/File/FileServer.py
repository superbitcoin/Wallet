import logging
import time

from Config import config
from Connection import ConnectionServer
from Site import SiteManager
from util import UpnpPunch


class FileServer(ConnectionServer):
    def __init__(self, ip=config.fileserver_ip, port=config.fileserver_port):
        self.log = logging.getLogger("FileServer")
        # ConnectionServer.__init__(self, ip, port, self.handleRequest)
        if config.ip_external:  # Ip external defined in arguments
            self.port_opened = True
            SiteManager.peer_blacklist.append((config.ip_external, self.port))  # Add myself to peer blacklist
        else:
            self.port_opened = None  # Is file server opened on router
        self.upnp_port_opened = False
        self.sites = {}
        self.last_request = time.time()
        self.files_parsing = {}

    # Check site file integrity
    def checkSite(self, site, check_files=False):
        if site.settings["serving"]:
            site.announce(mode="startup")  # Announce site to tracker
            site.update(check_files=check_files)  # Update site's content.json and download changed files
            site.sendMyHashfield()
            site.updateHashfield()
            if len(site.peers) > 5:  # Keep active connections if site having 5 or more peers
                site.needConnections()

    # Bind and start serving sites
    def start(self, check_sites=True):
        self.sites = SiteManager.site_manager.list()
        self.log = logging.getLogger("FileServer")
        if config.debug:
            # Auto reload FileRequest on change
            from Debug import DebugReloader
            DebugReloader(self.reload)

        self.log.debug("Stopped.")

    def stop(self):
        if self.running and self.upnp_port_opened:
            try:
                UpnpPunch.ask_to_close_port(self.port, protos=["TCP"])
                # self.log.info('Closed port via upnp.')
            except (UpnpPunch.UpnpError, UpnpPunch.IGDError), err:
                pass
                # self.log.info("Failed at attempt to use upnp to close port: %s" % err)
        ConnectionServer.stop(self)
