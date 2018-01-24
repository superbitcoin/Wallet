# Included modules
import os
import sys
import stat
import time
import logging

# Third party modules
import gevent

from gevent import monkey

if "patch_subprocess" in dir(monkey):  # New gevent
    monkey.patch_all(thread=False, subprocess=False)
else:  # Old gevent
    import ssl

    # Fix PROTOCOL_SSLv3 not defined
    if "PROTOCOL_SSLv3" not in dir(ssl):
        ssl.PROTOCOL_SSLv3 = ssl.PROTOCOL_SSLv23
    monkey.patch_all(thread=False)
# Not thread: pyfilesystem and systray icon, Not subprocess: Gevent 1.1+

update_after_shutdown = False  # If set True then update and restart wallet after main loop ended

# Load config
from Config import config

config.parse(silent=True)  # Plugins need to access the configuration
if not config.arguments:  # Config parse failed, show the help screen and exit
    config.parse()

# Create necessary files and dirs
if not os.path.isdir(config.log_dir):
    os.mkdir(config.log_dir)
    try:
        os.chmod(config.log_dir, stat.S_IRUSR | stat.S_IWUSR | stat.S_IXUSR)
    except Exception as err:
        print "Can't change permission of %s: %s" % (config.log_dir, err)

if not os.path.isdir(config.data_dir):
    os.mkdir(config.data_dir)
    try:
        os.chmod(config.data_dir, stat.S_IRUSR | stat.S_IWUSR | stat.S_IXUSR)
    except Exception as err:
        print "Can't change permission of %s: %s" % (config.data_dir, err)

if not os.path.isfile("%s/sites.json" % config.data_dir):
    open("%s/sites.json" % config.data_dir, "w").write("{}")
if not os.path.isfile("%s/users.json" % config.data_dir):
    open("%s/users.json" % config.data_dir, "w").write("{}")

# Setup logging
if config.action == "main":
    from util import helper

    log_file_path = "%s/debug.log" % config.log_dir
    try:
        lock = helper.openLocked("%s/lock.pid" % config.data_dir, "w")
        lock.write("%s" % os.getpid())
    except IOError as err:
        print "Can't open lock file, your wallet client is probably already running, exiting... (%s)" % err
        if config.open_browser:
            print "Opening browser: %s...", config.open_browser
            import webbrowser

            if config.open_browser == "default_browser":
                browser = webbrowser.get()
            else:
                browser = webbrowser.get(config.open_browser)
            browser.open("http://%s:%s/%s" % (
                config.ui_ip if config.ui_ip != "*" else "127.0.0.1", config.ui_port, config.homepage), new=2)
        sys.exit()

    if os.path.isfile("%s/debug.log" % config.log_dir):  # Simple logrotate
        if os.path.isfile("%s/debug-last.log" % config.log_dir):
            os.unlink("%s/debug-last.log" % config.log_dir)
        os.rename("%s/debug.log" % config.log_dir, "%s/debug-last.log" % config.log_dir)
    logging.basicConfig(
        format='[%(asctime)s] %(levelname)-8s %(name)s %(message)s',
        level=logging.DEBUG, stream=open(log_file_path, "a")
    )
else:
    log_file_path = "%s/cmd.log" % config.log_dir
    if config.silent:
        level = logging.ERROR
    else:
        level = logging.DEBUG
    logging.basicConfig(
        format='[%(asctime)s] %(levelname)-8s %(name)s %(message)s',
        level=level, stream=open(log_file_path, "w")
    )

# Console logger
console_log = logging.StreamHandler()
if config.action == "main":  # Add time if main action
    console_log.setFormatter(logging.Formatter('[%(asctime)s] %(name)s %(message)s', "%H:%M:%S"))
else:
    console_log.setFormatter(logging.Formatter('%(name)s %(message)s', "%H:%M:%S"))

logging.getLogger('').addHandler(console_log)  # Add console logger
logging.getLogger('').name = "-"  # Remove root prefix

# Debug dependent configuration
# from Debug import DebugHook

if config.debug:
    console_log.setLevel(logging.DEBUG)  # Display everything to console
else:
    console_log.setLevel(logging.INFO)  # Display only important info to console

# Load plugins
from Plugin import PluginManager

PluginManager.plugin_manager.loadPlugins()
config.loadPlugins()
config.parse()  # Parse again to add plugin configuration options

# Modify stack size on special hardwares
if config.stack_size:
    import threading

    threading.stack_size(config.stack_size)

# Use pure-python implementation of msgpack to save CPU
if config.msgpack_purepython:
    os.environ["MSGPACK_PUREPYTHON"] = "True"

# Socket monkey patch
# if config.proxy:
#     from util import SocksProxy
#     import urllib2
#
#     logging.info("Patching sockets to socks proxy: %s" % config.proxy)
#     if config.fileserver_ip == "*":
#         config.fileserver_ip = '127.0.0.1'  # Do not accept connections anywhere but localhost
#     SocksProxy.monkeyPatch(*config.proxy.split(":"))
# elif config.bind:
#     bind = config.bind
#     if ":" not in config.bind:
#         bind += ":0"
#     from util import helper
#
#     helper.socketBindMonkeyPatch(*bind.split(":"))


# -- Actions --


@PluginManager.acceptPlugins
class Actions(object):
    def call(self, function_name, kwargs):
        func = getattr(self, function_name, None)
        func(**kwargs)

    # Default action: Start serving UiServer and FileServer
    def main(self):
        global ui_server, file_server
        from File import FileServer
        from Ui import UiServer
        file_server = FileServer()
        ui_server = UiServer()

        from Crypt import CryptConnection
        CryptConnection.manager.removeCerts()

        gevent.joinall([gevent.spawn(ui_server.start), gevent.spawn(file_server.start)])

    # Site commands
    def siteVerify(self, address):
        import time
        from Site import Site
        from Site import SiteManager
        SiteManager.site_manager.load()

        s = time.time()
        site = Site(address)
        bad_files = []

        for content_inner_path in site.content_manager.contents:
            s = time.time()
            try:
                file_correct = site.content_manager.verifyFile(
                    content_inner_path, site.storage.open(content_inner_path, "rb"), ignore_same=False
                )
            except Exception, err:
                file_correct = False

            if file_correct is True:
                logging.info("[OK] %s (Done in %.3fs)" % (content_inner_path, time.time() - s))
            else:
                logging.error("[ERROR] %s: invalid file: %s!" % (content_inner_path, err))
                raw_input("Continue?")
                bad_files += content_inner_path

        logging.info("Verifying site files...")
        bad_files += site.storage.verifyFiles()
        if not bad_files:
            logging.info("[OK] All file sha512sum matches! (%.3fs)" % (time.time() - s))
        else:
            logging.error("[ERROR] Error during verifying site files!")



actions = Actions()

def start():
    # Call function
    action_kwargs = config.getActionArguments()
    actions.call(config.action, action_kwargs)
