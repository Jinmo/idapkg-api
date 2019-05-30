import zipfile
import json
import sys
import re

if sys.argv[1] == 'extract':
    z = zipfile.ZipFile(sys.argv[2])
    try:
        sys.stdout.write(z.read(sys.argv[3]))
    except:
        sys.stdout.write('')

elif sys.argv[1] == 'existsMany':
    z = zipfile.ZipFile(sys.argv[2])
    names = z.namelist()
    sys.stdout.write(
        '%d' % sum(item in names for item in sys.argv[3:])
    )
elif sys.argv[1] == 'attributes':
    z = zipfile.ZipFile(sys.argv[2])
    names = z.namelist()
    attr = []
    for type_ in 'procs', 'loaders', 'plugins':
        if any(re.match(r'^%s/.+\.(dylib|dll|so|plw|plx|p64|py|idc)$' % type_, x) for x in names):
            attr.append(type_)

    for type_ in 'til', 'sig', 'ids':
        if any(x.startswith(type_ + '/') for x in names):
            attr.append(type_)

    json.dump(attr, sys.stdout)
