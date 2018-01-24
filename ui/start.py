#!/usr/bin/env python2.7


# Included modules
import sys

# SBTC Modules
import superbitcoin

def main():
    sys.argv = [sys.argv[0]]+["--open_browser", "default_browser"]+sys.argv[1:]
    superbitcoin.main()

if __name__ == '__main__':
    main()
