import zipfile
import sys

z = zipfile.ZipFile(sys.argv[1])
try:
    sys.stdout.write(z.read(sys.argv[2]))
except:
    sys.stdout.write('')