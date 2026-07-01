import zipfile
import xml.etree.ElementTree as ET
import os
import sys

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'

def extract_docx(path):
    if not os.path.exists(path):
        return f'NOT FOUND: {path}'
    with zipfile.ZipFile(path) as z:
        xml = z.read('word/document.xml')
    root = ET.fromstring(xml)
    paras = []
    for p in root.iter(f'{W}p'):
        texts = [t.text or '' for t in p.iter(f'{W}t')]
        line = ''.join(texts).strip()
        if line:
            paras.append(line)
    return '\n'.join(paras)

if __name__ == '__main__':
    out_dir = os.path.join(os.path.dirname(__file__), '_extracted')
    os.makedirs(out_dir, exist_ok=True)
    for f in sys.argv[1:]:
        text = extract_docx(f)
        base = os.path.splitext(os.path.basename(f))[0]
        out_path = os.path.join(out_dir, base + '.txt')
        with open(out_path, 'w', encoding='utf-8') as fp:
            fp.write(text)
        print(out_path, len(text))
