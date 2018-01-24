import json
import os
import re
import time

# from Db import Db
from Config import config
from Plugin import PluginManager
from util import helper


@PluginManager.acceptPlugins
class SiteStorage(object):
    def __init__(self, site, allow_create=True):
        self.site = site
        self.directory = u"%s/%s" % (config.data_dir, self.site.address)  # Site data diretory
        self.allowed_dir = os.path.abspath(self.directory)  # Only serve file within this dir
        self.log = site.log
        # self.db = None  # Db class
        # self.db_checked = False  # Checked db tables since startup
        self.event_db_busy = None  # Gevent AsyncResult if db is working on rebuild
        # self.has_db = self.isFile("dbschema.json")  # The site has schema

        if not os.path.isdir(self.directory):
            if allow_create:
                os.mkdir(self.directory)  # Create directory if not found
            else:
                raise Exception("Directory not exists: %s" % self.directory)

    # Load db from dbschema.json
    def openDb(self, check=True):
        pass

    def closeDb(self):
        pass

    # Return db class
    def getDb(self):
        pass

    def updateDbFile(self, inner_path, file=None, cur=None):
        pass

    # Return possible db files for the site
    def getDbFiles(self):
        pass

    # Rebuild sql cache
    def rebuildDb(self, delete_db=True):
        pass

    # Execute sql query or rebuild on dberror
    def query(self, query, params=None):
        pass

    # Open file object
    def open(self, inner_path, mode="rb"):
        return open(self.getPath(inner_path), mode)

    # Open file object
    def read(self, inner_path, mode="r"):
        return open(self.getPath(inner_path), mode).read()

    # Write content to file
    def write(self, inner_path, content):
        pass

    # Remove file from filesystem
    def delete(self, inner_path):
        pass

    def deleteDir(self, inner_path):
        dir_path = self.getPath(inner_path)
        os.rmdir(dir_path)

    def rename(self, inner_path_before, inner_path_after):
        for retry in range(3):
            # To workaround "The process cannot access the file beacause it is being used by another process." error
            try:
                os.rename(self.getPath(inner_path_before), self.getPath(inner_path_after))
                err = None
                break
            except Exception, err:
                self.log.error("%s rename error: %s (retry #%s)" % (inner_path_before, err, retry))
                time.sleep(0.1 + retry)
        if err:
            raise err

    # List files from a directory
    def walk(self, dir_inner_path):
        directory = self.getPath(dir_inner_path)
        for root, dirs, files in os.walk(directory):
            root = root.replace("\\", "/")
            root_relative_path = re.sub("^%s" % re.escape(directory), "", root).lstrip("/")
            for file_name in files:
                if root_relative_path:  # Not root dir
                    yield root_relative_path + "/" + file_name
                else:
                    yield file_name

    # list directories in a directory
    def list(self, dir_inner_path):
        directory = self.getPath(dir_inner_path)
        return os.listdir(directory)

    # Site content updated
    def onUpdated(self, inner_path, file=None):
        pass

    # Load and parse json file
    def loadJson(self, inner_path):
        with self.open(inner_path) as file:
            return json.load(file)

    # Write formatted json file
    def writeJson(self, inner_path, data):
        content = json.dumps(data, indent=1, sort_keys=True)

        # Make it a little more compact by removing unnecessary white space
        def compact_dict(match):
            if "\n" in match.group(0):
                return match.group(0).replace(match.group(1), match.group(1).strip())
            else:
                return match.group(0)

        content = re.sub("\{(\n[^,\[\{]{10,100}?)\}[, ]{0,2}\n", compact_dict, content, flags=re.DOTALL)

        def compact_list(match):
            if "\n" in match.group(0):
                stripped_lines = re.sub("\n[ ]*", "", match.group(1))
                return match.group(0).replace(match.group(1), stripped_lines)
            else:
                return match.group(0)

        content = re.sub("\[([^\[\{]{2,300}?)\][, ]{0,2}\n", compact_list, content, flags=re.DOTALL)

        # Remove end of line whitespace
        content = re.sub("(?m)[ ]+$", "", content)

        # Write to disk
        self.write(inner_path, content)

    # Get file size
    def getSize(self, inner_path):
        path = self.getPath(inner_path)
        try:
            return os.path.getsize(path)
        except:
            return 0

    # File exist
    def isFile(self, inner_path):
        return os.path.isfile(self.getPath(inner_path))

    # File or directory exist
    def isExists(self, inner_path):
        return os.path.exists(self.getPath(inner_path))

    # Dir exist
    def isDir(self, inner_path):
        return os.path.isdir(self.getPath(inner_path))

    # Security check and return path of site's file
    def getPath(self, inner_path):
        inner_path = inner_path.replace("\\", "/")  # Windows separator fix
        if not inner_path:
            return self.directory

        if ".." in inner_path:
            raise Exception(u"File not allowed: %s" % inner_path)

        return u"%s/%s" % (self.directory, inner_path)

    # Get site dir relative path
    def getInnerPath(self, path):
        if path == self.directory:
            inner_path = ""
        else:
            if path.startswith(self.directory):
                inner_path = path[len(self.directory)+1:]
            else:
                raise Exception(u"File not allowed: %s" % path)
        return inner_path

    # Verify all files sha512sum using content.json
    def verifyFiles(self, quick_check=False, add_optional=False, add_changed=True):
        bad_files = []
        i = 0

        if not self.site.content_manager.contents.get("content.json"):  # No content.json, download it first
            self.log.debug("VerifyFile content.json not exists")
            self.site.needFile("content.json", update=True)  # Force update to fix corrupt file
            self.site.content_manager.loadContent()  # Reload content.json
        for content_inner_path, content in self.site.content_manager.contents.items():
            i += 1
            if i % 50 == 0:
                time.sleep(0.0001)  # Context switch to avoid gevent hangs
            if not os.path.isfile(self.getPath(content_inner_path)):  # Missing content.json file
                self.log.debug("[MISSING] %s" % content_inner_path)
                bad_files.append(content_inner_path)

            for file_relative_path in content.get("files", {}).keys():
                file_inner_path = helper.getDirname(content_inner_path) + file_relative_path  # Relative to site dir
                file_inner_path = file_inner_path.strip("/")  # Strip leading /
                file_path = self.getPath(file_inner_path)
                if not os.path.isfile(file_path):
                    self.log.debug("[MISSING] %s" % file_inner_path)
                    bad_files.append(file_inner_path)
                    continue

                if quick_check:
                    ok = os.path.getsize(file_path) == content["files"][file_relative_path]["size"]
                    if not ok:
                        err = "Invalid size"
                else:
                    try:
                        ok = self.site.content_manager.verifyFile(file_inner_path, open(file_path, "rb"))
                    except Exception, err:
                        ok = False

                if not ok:
                    self.log.debug("[INVALID] %s: %s" % (file_inner_path, err))
                    if add_changed or content.get("cert_user_id"):  # If updating own site only add changed user files
                        bad_files.append(file_inner_path)

            # Optional files
            optional_added = 0
            optional_removed = 0
            for file_relative_path in content.get("files_optional", {}).keys():
                file_node = content["files_optional"][file_relative_path]
                file_inner_path = helper.getDirname(content_inner_path) + file_relative_path  # Relative to site dir
                file_inner_path = file_inner_path.strip("/")  # Strip leading /
                file_path = self.getPath(file_inner_path)
                if not os.path.isfile(file_path):
                    if self.site.content_manager.hashfield.hasHash(file_node["sha512"]):
                        self.site.content_manager.optionalRemove(file_inner_path, file_node["sha512"], file_node["size"])
                    if add_optional:
                        bad_files.append(file_inner_path)
                    continue

                if quick_check:
                    ok = os.path.getsize(file_path) == content["files_optional"][file_relative_path]["size"]
                else:
                    try:
                        ok = self.site.content_manager.verifyFile(file_inner_path, open(file_path, "rb"))
                    except Exception, err:
                        ok = False

                if ok:
                    if not self.site.content_manager.hashfield.hasHash(file_node["sha512"]):
                        self.site.content_manager.optionalDownloaded(file_inner_path, file_node["sha512"], file_node["size"])
                        optional_added += 1
                else:
                    if self.site.content_manager.hashfield.hasHash(file_node["sha512"]):
                        self.site.content_manager.optionalRemove(file_inner_path, file_node["sha512"], file_node["size"])
                        optional_removed += 1
                    bad_files.append(file_inner_path)
                    self.log.debug("[OPTIONAL CHANGED] %s" % file_inner_path)

            if config.verbose:
                self.log.debug(
                    "%s verified: %s, quick: %s, optionals: +%s -%s" %
                    (content_inner_path, len(content["files"]), quick_check, optional_added, optional_removed)
                )

        time.sleep(0.0001)  # Context switch to avoid gevent hangs
        return bad_files

    # Check and try to fix site files integrity
    def updateBadFiles(self, quick_check=True):
        s = time.time()
        bad_files = self.verifyFiles(
            quick_check,
            add_optional=self.site.isDownloadable(""),
            add_changed=not self.site.settings.get("own")  # Don't overwrite changed files if site owned
        )
        self.site.bad_files = {}
        if bad_files:
            for bad_file in bad_files:
                self.site.bad_files[bad_file] = 1
        self.log.debug("Checked files in %.2fs... Found bad files: %s, Quick:%s" % (time.time() - s, len(bad_files), quick_check))

    # Delete site's all file
    def deleteFiles(self):
        pass
