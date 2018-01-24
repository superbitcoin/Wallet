import time

import gevent

from Debug import Debug

class Worker(object):

    def __init__(self, manager, peer):
        self.manager = manager
        self.peer = peer
        self.task = None
        self.key = None
        self.running = False
        self.thread = None

    def __str__(self):
        return "Worker %s %s" % (self.manager.site.address_short, self.key)

    def __repr__(self):
        return "<%s>" % self.__str__()

    # Downloader thread
    def downloader(self):
        pass

    # Start the worker
    def start(self):
        self.running = True
        self.thread = gevent.spawn(self.downloader)

    # Skip current task
    def skip(self):
        self.manager.log.debug("%s: Force skipping" % self.key)
        if self.thread:
            self.thread.kill(exception=Debug.Notify("Worker stopped"))
        self.start()

    # Force stop the worker
    def stop(self):
        self.manager.log.debug("%s: Force stopping" % self.key)
        self.running = False
        if self.thread:
            self.thread.kill(exception=Debug.Notify("Worker stopped"))
        del self.thread
        self.manager.removeWorker(self)
