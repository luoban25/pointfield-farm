"""Build the UI subset. Install fonttools and brotli; pass an original Noto Sans SC TTF."""
from pathlib import Path
import sys
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

root = Path(__file__).resolve().parent.parent
source = Path(sys.argv[1])
text = (root / 'index.html').read_text(encoding='utf-8')
for file in sorted((root / 'src').glob('*.js')):
    text += file.read_text(encoding='utf-8')
text += ''.join(chr(i) for i in range(32, 256)) + '→↗↻×—–·°％℃０１２３４５６７８９'
font = TTFont(source)
options = subset.Options()
options.layout_features = ['*']
options.name_IDs = ['*']
options.name_languages = ['*']
options.name_legacy = True
subsetter = subset.Subsetter(options=options)
subsetter.populate(text=text)
subsetter.subset(font)
# Keep only the weights used in the UI while retaining real variable outlines.
font = instantiateVariableFont(font, {'wght': (400, 400, 600)}, inplace=True)
for record in font['name'].names:
    names = {1:'Pointfield UI', 2:'Regular', 3:'Pointfield-UI-subset',
             4:'Pointfield UI', 6:'PointfieldUI', 16:'Pointfield UI', 17:'Regular'}
    if record.nameID in names:
        record.string = names[record.nameID].encode(record.getEncoding())
font.flavor = 'woff2'
target = root / 'src' / 'assets' / 'pointfield-ui.woff2'
target.parent.mkdir(parents=True, exist_ok=True)
font.save(target)
print(f'{len(set(text))} requested characters; {target.stat().st_size:,} bytes')
