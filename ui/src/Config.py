import argparse
import sys
import os
import locale
import re
import ConfigParser


class Config(object):
    def __init__(self, argv):
        self.version = "0.3"
        self.rev = 2170
        self.argv = argv
        self.action = None
        self.config_file = "sbtc_ui.conf"
        self.createParser()
        self.createArguments()

    def createParser(self):
        # Create parser
        self.parser = argparse.ArgumentParser(formatter_class=argparse.ArgumentDefaultsHelpFormatter)
        self.parser.register('type', 'bool', self.strToBool)
        self.subparsers = self.parser.add_subparsers(title="Action to perform", dest="action")

    def __str__(self):
        return str(self.arguments).replace("Namespace", "Config")  # Using argparse str output

    # Convert string to bool
    def strToBool(self, v):
        return v.lower() in ("yes", "true", "t", "1")

    # Create command line arguments
    def createArguments(self):
        # Platform specific
        if sys.platform.startswith("win"):
            coffeescript = "type %s | tools\\coffee\\coffee.cmd"
        else:
            coffeescript = None

        try:
            language, enc = locale.getdefaultlocale()
            language = language.split("_")[0]
        except Exception:
            language = "en"

        use_openssl = True

        if repr(1483108852.565) != "1483108852.565":
            fix_float_decimals = True
        else:
            fix_float_decimals = False

        this_file = os.path.abspath(__file__).replace("\\", "/").rstrip("cd")

        if this_file.endswith("/Contents/Resources/core/src/Config.py"):
            start_dir = re.sub("/[^/]+/Contents/Resources/core/src/Config.py", "", this_file).decode(
                sys.getfilesystemencoding())
            config_file = start_dir + "/sbtc_ui.conf"
            data_dir = start_dir + "/data"
            log_dir = start_dir + "/log"
            block_dir = "../block"
        elif this_file.endswith("/core/src/Config.py"):
            # Running as exe or source is at Application Support directory, put var files to outside of core dir
            start_dir = this_file.replace("/core/src/Config.py", "").decode(sys.getfilesystemencoding())
            config_file = start_dir + "/sbtc_ui.conf"
            data_dir = start_dir + "/data"
            log_dir = start_dir + "/log"
            block_dir = "../block"
        else:
            config_file = "sbtc_ui.conf"
            data_dir = "data"
            log_dir = "log"
            block_dir = "../block"
        ip_local = ["127.0.0.1"]

        # Main
        action = self.subparsers.add_parser("main", help='Start UiServer and FileServer (default)')

        # Config parameters
        self.parser.add_argument('--verbose', help='More detailed logging', action='store_true')
        self.parser.add_argument('--debug', help='Debug mode', action='store_true')
        self.parser.add_argument('--debug_gevent', help='Debug gevent functions', action='store_true')

        self.parser.add_argument('--batch', help="Batch mode (No interactive input for commands)", action='store_true')

        self.parser.add_argument('--config_file', help='Path of config file', default=config_file, metavar="path")
        self.parser.add_argument('--data_dir', help='Path of data directory', default=data_dir, metavar="path")
        self.parser.add_argument('--log_dir', help='Path of logging directory', default=log_dir, metavar="path")
        self.parser.add_argument('--block_dir', help='Path of logging block', default=block_dir, metavar="path")

        self.parser.add_argument('--language', help='Web interface language', default=language, metavar='language')
        self.parser.add_argument('--ui_ip', help='Web interface bind address', default="127.0.0.1", metavar='ip')
        self.parser.add_argument('--ui_port', help='Web interface bind port', default=48334, type=int, metavar='port')
        self.parser.add_argument('--ui_restrict', help='Restrict web access', default=False, metavar='ip', nargs='*')
        self.parser.add_argument('--ui_host', help='Allow access using this hosts', metavar='host', nargs='*')

        self.parser.add_argument('--open_browser', help='Open homepage in web browser automatically',
                                 nargs='?', const="default_browser", metavar='browser_name')
        self.parser.add_argument('--homepage', help='Web interface Homepage',
                                 default='1Ksi6FfKERa88PD6nqBrNtS3DdfC3ChMjP',
                                 metavar='address')
        self.parser.add_argument('--updatesite', help='Source code update site',
                                 default='1UPDatEDxnvHDo7TXvq6AEBARfNkyfxsp',
                                 metavar='address')
        self.parser.add_argument('--size_limit', help='Default site size limit in MB', default=10, type=int,
                                 metavar='limit')
        self.parser.add_argument('--file_size_limit', help='Maximum per file size limit in MB', default=10, type=int,
                                 metavar='limit')

        self.parser.add_argument('--fileserver_ip', help='FileServer bind address', default="*", metavar='ip')
        self.parser.add_argument('--fileserver_port', help='FileServer bind port', default=15441, type=int,
                                 metavar='port')
        self.parser.add_argument('--ip_local', help='My local ips', default=ip_local, type=int, metavar='ip', nargs='*')

        self.parser.add_argument('--ip_external', help='Set reported external ip (tested on start if None)',
                                 metavar='ip')
        self.parser.add_argument('--use_openssl', help='Use OpenSSL liblary for speedup',
                                 type='bool', choices=[True, False], default=use_openssl)
        self.parser.add_argument('--disable_db', help='Disable database updating', action='store_true')
        self.parser.add_argument('--disable_encryption', help='Disable connection encryption', action='store_true')
        self.parser.add_argument('--disable_sslcompression', help='Disable SSL compression to save memory',
                                 type='bool', choices=[True, False], default=True)
        self.parser.add_argument('--keep_ssl_cert', help='Disable new SSL cert generation on startup',
                                 action='store_true')
        self.parser.add_argument('--max_files_opened',
                                 help='Change maximum opened files allowed by OS to this value on startup',
                                 default=2048, type=int, metavar='limit')
        self.parser.add_argument('--stack_size', help='Change thread stack size', default=None, type=int,
                                 metavar='thread_stack_size')
        self.parser.add_argument('--use_tempfiles', help='Use temporary files when downloading (experimental)',
                                 type='bool', choices=[True, False], default=False)
        self.parser.add_argument('--stream_downloads', help='Stream download directly to files (experimental)',
                                 type='bool', choices=[True, False], default=False)
        self.parser.add_argument("--msgpack_purepython", help='Use less memory, but a bit more CPU power',
                                 type='bool', choices=[True, False], default=True)
        self.parser.add_argument("--fix_float_decimals",
                                 help='Fix content.json modification date float precision on verification',
                                 type='bool', choices=[True, False], default=fix_float_decimals)
        self.parser.add_argument("--db_mode", choices=["speed", "security"], default="speed")
        self.parser.add_argument("--download_optional", choices=["manual", "auto"], default="manual")

        self.parser.add_argument('--coffeescript_compiler', help='Coffeescript compiler for developing',
                                 default=coffeescript,
                                 metavar='executable_path')

        self.parser.add_argument('--version', action='version', version='wallet %s r%s' % (self.version, self.rev))
        self.parser.add_argument('--end', help='Stop multi value argument parsing', action='store_true')

        self.parser.add_argument('--rpcuser', default='rpcuser')
        self.parser.add_argument('--rpcpassword', default='rpcpassword')

        return self.parser

    # def loadTrackersFile(self):
    #     self.trackers = []
    #     for tracker in open(self.trackers_file):
    #         if "://" in tracker:
    #             self.trackers.append(tracker.strip())

    # Find arguments specified for current action
    def getActionArguments(self):
        back = {}
        arguments = self.parser._subparsers._group_actions[0].choices[self.action]._actions[1:]  # First is --version
        for argument in arguments:
            back[argument.dest] = getattr(self, argument.dest)
        return back

    # Try to find action from argv
    def getAction(self, argv):
        actions = [action.choices.keys() for action in self.parser._actions if action.dest == "action"][
            0]  # Valid actions
        found_action = False
        for action in actions:  # See if any in argv
            if action in argv:
                found_action = action
                break
        return found_action

    # Move plugin parameters to end of argument list
    def moveUnknownToEnd(self, argv, default_action):
        valid_actions = sum([action.option_strings for action in self.parser._actions], [])
        valid_parameters = []
        plugin_parameters = []
        plugin = False
        for arg in argv:
            if arg.startswith("--"):
                if arg not in valid_actions:
                    plugin = True
                else:
                    plugin = False
            elif arg == default_action:
                plugin = False

            if plugin:
                plugin_parameters.append(arg)
            else:
                valid_parameters.append(arg)
        return valid_parameters + plugin_parameters

    # Parse arguments from config file and command line
    def parse(self, silent=False, parse_config=True):
        if silent:  # Don't display messages or quit on unknown parameter
            original_print_message = self.parser._print_message
            original_exit = self.parser.exit

            def silencer(parser, function_name):
                parser.exited = True
                return None

            self.parser.exited = False
            self.parser._print_message = lambda *args, **kwargs: silencer(self.parser, "_print_message")
            self.parser.exit = lambda *args, **kwargs: silencer(self.parser, "exit")

        argv = self.argv[:]  # Copy command line arguments
        self.parseCommandline(argv, silent)  # Parse argv
        self.setAttributes()
        if parse_config:
            argv = self.parseConfig(argv)  # Add arguments from config file

        self.parseCommandline(argv, silent)  # Parse argv
        self.setAttributes()

        if not silent:
            if self.fileserver_ip != "*" and self.fileserver_ip not in self.ip_local:
                self.ip_local.append(self.fileserver_ip)

        if silent:  # Restore original functions
            if self.parser.exited and self.action == "main":  # Argument parsing halted, don't start wallet with main action
                self.action = None
            self.parser._print_message = original_print_message
            self.parser.exit = original_exit

    # Parse command line arguments
    def parseCommandline(self, argv, silent=False):
        # Find out if action is specificed on start
        action = self.getAction(argv)
        if not action:
            argv.append("--end")
            argv.append("main")
            action = "main"
        argv = self.moveUnknownToEnd(argv, action)
        if silent:
            res = self.parser.parse_known_args(argv[1:])
            if res:
                self.arguments = res[0]
            else:
                self.arguments = {}
        else:
            self.arguments = self.parser.parse_args(argv[1:])

    # Parse config file
    def parseConfig(self, argv):
        # Find config file path from parameters
        if "--config_file" in argv:
            self.config_file = argv[argv.index("--config_file") + 1]
        # Load config file

        self.wallet_config_file = os.path.join('../block/sbtc_ui.conf')
        if os.path.isfile(self.wallet_config_file):
            config_wallet = ConfigParser.ConfigParser(allow_no_value=True)
            config_wallet.read(self.wallet_config_file)
            for section in config_wallet.sections():
                for key, val in config_wallet.items(section):
                    # if key is 'rpcuser' or key is 'rpcpassword':
                    if section != "global":  # If not global prefix key with section
                        key = section + "_" + key
                    if val:
                        for line in val.strip().split("\n"):  # Allow multi-line values
                            argv.insert(1, line)
                    argv.insert(1, "--%s" % key)

        if os.path.isfile(self.config_file):
            config = ConfigParser.ConfigParser(allow_no_value=True)
            config.read(self.config_file)
            for section in config.sections():
                for key, val in config.items(section):
                    if section != "global":  # If not global prefix key with section
                        key = section + "_" + key
                    if val:
                        for line in val.strip().split("\n"):  # Allow multi-line values
                            argv.insert(1, line)
                    argv.insert(1, "--%s" % key)
        return argv

    # Expose arguments as class attributes
    def setAttributes(self):
        # Set attributes from arguments
        if self.arguments:
            args = vars(self.arguments)
            for key, val in args.items():
                setattr(self, key, val)

    def loadPlugins(self):
        from Plugin import PluginManager

        @PluginManager.acceptPlugins
        class ConfigPlugin(object):
            def __init__(self, config):
                self.parser = config.parser
                self.createArguments()

            def createArguments(self):
                pass

        ConfigPlugin(self)

    def saveValue(self, key, value):
        if not os.path.isfile(self.config_file):
            content = ""
        else:
            content = open(self.config_file).read()
        lines = content.splitlines()

        global_line_i = None
        key_line_i = None
        i = 0
        for line in lines:
            if line.strip() == "[global]":
                global_line_i = i
            if line.startswith(key + " = "):
                key_line_i = i
            i += 1

        if value is None:  # Delete line
            if key_line_i:
                del lines[key_line_i]
        else:  # Add / update
            new_line = "%s = %s" % (key, str(value).replace("\n", "").replace("\r", ""))
            if key_line_i:  # Already in the config, change the line
                lines[key_line_i] = new_line
            elif global_line_i is None:  # No global section yet, append to end of file
                lines.append("[global]")
                lines.append(new_line)
            else:  # Has global section, append the line after it
                lines.insert(global_line_i + 1, new_line)

        open(self.config_file, "w").write("\n".join(lines))


config = Config(sys.argv)
