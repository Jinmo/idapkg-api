import zipfile
import sys

if sys.argv[1] === 'extract':
    z = zipfile.ZipFile(sys.argv[2])
    try:
        sys.stdout.write(z.read(sys.argv[3]))
    except:
        sys.stdout.write('')
if sys.argv[1] === 'existsMany':
    z = zipfile.ZipFile(sys.argv[2])
    namelist = z.namelist()
    sys.stdout.write(
        '%d' % sum(item in namelist for item in sys.argv[3:])
    )