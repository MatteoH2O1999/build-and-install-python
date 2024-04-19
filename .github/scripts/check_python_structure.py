from __future__ import print_function
import os
import sys
import pip
import numpy
try:
    from urllib import urlopen
except ImportError:
    from urllib.request import urlopen

print("executable: " + sys.executable)
print("os location: " + os.__file__)
print("pip location: " + pip.__file__)
print("numpy location: " + numpy.__file__)

print("Testing ssl certificates...")
urlopen("https://google.com")